<?php

namespace App\Services;

use App\Models\ChargingSession;
use App\Models\Dompet;
use App\Models\ErrorLog;
use App\Models\MetodePembayaran;
use App\Models\Payment;
use App\Models\Port;
use App\Models\Refund;
use Illuminate\Support\Facades\DB;

/**
 * Menyelesaikan sesi charging: menghitung biaya aktual, melepas hold,
 * menerbitkan pembayaran/refund, membebaskan port, dan mencatat insiden.
 *
 * Dipakai oleh ChargingSessionController (selesai/stop/interrupt) dan
 * command watchdog (charging:detect-failures) supaya aturan finansial
 * tetap satu sumber.
 */
class ChargingSessionSettler
{
    /**
     * @param  array{
     *     energi_kwh?: float|int|string|null,
     *     soc_akhir?: int|string|null,
     *     alasan?: string|null,
     *     kegagalan?: array{
     *         kategori?: string|null,
     *         sumber?: string|null,
     *         catatan?: string|null,
     *         jenis_error?: string|null,
     *         tingkat?: string|null,
     *         deteksi_otomatis?: bool
     *     }|null
     * }  $options
     */
    public function settle(ChargingSession $session, string $finalStatus, array $options = []): ?ChargingSession
    {
        return DB::transaction(function () use ($session, $finalStatus, $options) {
            $session = ChargingSession::with(['charger.location', 'port', 'vehicle', 'tarif'])
                ->whereKey($session->id_session)
                ->lockForUpdate()
                ->first();

            if (! $session || $session->status !== 'Berlangsung') {
                return null;
            }

            $wallet = Dompet::where('id_user', $session->id_user)->lockForUpdate()->firstOrFail();
            $port = $session->id_port ? Port::whereKey($session->id_port)->lockForUpdate()->first() : null;

            $simulation = $this->simulate($session);
            $actualKwh = isset($options['energi_kwh'])
                ? round((float) $options['energi_kwh'], 2)
                : $simulation['energi_kwh'];
            $finalSoc = $options['soc_akhir'] ?? $simulation['soc_sekarang'];

            $hold = (int) $session->saldo_hold;
            $actualCost = $actualKwh > 0
                ? min($hold, $session->tarif->costFor($actualKwh, $this->powerOf($session))['total'])
                : 0;
            $refundAmount = max(0, $hold - $actualCost);

            $wallet->saldo = max(0, (int) $wallet->saldo - $actualCost);
            $wallet->saldo_hold = max(0, (int) $wallet->saldo_hold - $hold);
            $wallet->save();

            // Port kembali tersedia; kalau gagal, tandai rusak supaya operator memeriksanya.
            if ($port) {
                $port->status_port = $finalStatus === 'Gagal' ? 'Out of Order' : Port::AVAILABLE;
                $port->save();
            }

            $session->total_energi_kwh = $actualKwh;
            $session->waktu_selesai = now();
            $session->status = $finalStatus;
            $session->soc_akhir = $finalSoc;

            $failure = $options['kegagalan'] ?? null;
            if ($failure) {
                $session->kegagalan_kategori = $failure['kategori'] ?? null;
                $session->kegagalan_sumber = $failure['sumber'] ?? null;
                $session->kegagalan_catatan = $failure['catatan'] ?? $options['alasan'] ?? null;
                $session->deteksi_otomatis = (bool) ($failure['deteksi_otomatis'] ?? false);
            }

            $session->save();

            $payment = Payment::where('id_session', $session->id_session)->lockForUpdate()->first();
            if (! $payment) {
                $payment = new Payment([
                    'id_session' => $session->id_session,
                    'id_metode' => $this->paymentMethod('Dompet Digital')->id_metode,
                    'jenis_pembayaran' => 'charging',
                ]);
            }

            $payment->total_bayar = $actualCost;
            $payment->status_pembayaran = $finalStatus === 'Gagal' && $actualCost === 0 ? 'Gagal' : 'Sukses';
            $payment->waktu_pembayaran = now();
            $payment->referensi_gateway = $payment->referensi_gateway ?: $this->paymentReference('PAY', $session->id_session);
            $payment->save();

            if ($refundAmount > 0) {
                Refund::updateOrCreate(
                    ['id_payment' => $payment->id_payment],
                    [
                        'nominal' => $refundAmount,
                        'waktu_execute' => now(),
                        'status_refund' => 'Sukses',
                    ]
                );
            }

            // Laporan gangguan -> muncul di notifikasi operator station.
            if ($finalStatus === 'Gagal') {
                ErrorLog::create([
                    'id_charger' => $session->id_charger,
                    'id_session' => $session->id_session,
                    'id_port' => $session->id_port,
                    'id_user' => $session->id_user,
                    'jenis_error' => $failure['jenis_error'] ?? 'Gangguan dilaporkan driver',
                    'kategori' => $failure['kategori'] ?? null,
                    'sumber' => $failure['sumber'] ?? 'driver',
                    'tingkat' => $failure['tingkat'] ?? 'Tinggi',
                    'desk_mslh' => $failure['catatan'] ?? $options['alasan'] ?? 'Gangguan charger dilaporkan oleh driver.',
                    'waktu_terjadi' => now(),
                    'status_tanganan' => 'Menunggu',
                ]);
            }

            return $session->fresh(['charger.location', 'port', 'vehicle', 'tarif', 'payment.method', 'payment.refund']);
        });
    }

    /** Daya port (kW) untuk sesi; cadangan: kapasitas mesin, lalu 1 kW. */
    public function powerOf(ChargingSession $session): float
    {
        return (float) ($session->port?->daya_maks_kw ?? $session->charger?->kap_tot_kw ?? 1);
    }

    /**
     * SIMULASI pengisian: energi bertambah linear seiring waktu sesi berjalan
     * (daya port x waktu x kecepatan simulasi) dan berhenti di target kWh.
     */
    public function simulate(ChargingSession $session): array
    {
        $target = (float) ($session->target_energi_kwh ?? 0);
        $power = max(1, $this->powerOf($session));
        $speed = max(0.1, (float) config('charging.simulation_speed', 60));

        $realSeconds = $session->waktu_mulai
            ? max(0, now()->getTimestamp() - $session->waktu_mulai->getTimestamp())
            : 0;
        $simSeconds = $realSeconds * $speed;
        $kwh = min($target, $power * $simSeconds / 3600);
        $isFull = $target > 0 && $kwh >= $target;

        $capacity = $session->vehicle
            ? $this->batteryCapacity($session->vehicle)[0]
            : (float) config('charging.default_battery_kwh', 50);

        return [
            'energi_kwh' => round($kwh, 2),
            'soc_sekarang' => $this->socAfter($capacity, (int) $session->soc_awal, $kwh),
            'durasi_detik' => $isFull ? (int) ceil($target / $power * 3600) : (int) $simSeconds,
            'sudah_penuh' => $isFull,
            'kecepatan' => $speed,
        ];
    }

    /** [kapasitas kWh, apakah memakai nilai default]. */
    private function batteryCapacity($vehicle): array
    {
        $own = (float) ($vehicle->kapasitas_baterai_kwh ?? 0);

        return $own > 0 ? [$own, false] : [(float) config('charging.default_battery_kwh', 50), true];
    }

    /** Persen baterai setelah menambah $kwh (maks. 100). */
    private function socAfter(float $capacity, int $soc, float $kwh): int
    {
        return (int) min(100, round($soc + $kwh / max(0.1, $capacity) * 100));
    }

    private function paymentMethod(string $name): MetodePembayaran
    {
        return MetodePembayaran::firstOrCreate(
            ['nama_metode' => $name],
            ['biaya_layanan' => 0, 'status_metode' => 'Aktif']
        );
    }

    private function paymentReference(string $prefix, int $id): string
    {
        return $prefix.'-'.now()->format('YmdHis').'-'.$id;
    }
}
