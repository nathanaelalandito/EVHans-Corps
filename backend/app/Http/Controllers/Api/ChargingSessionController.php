<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Concerns\ChecksWalletPin;
use App\Http\Controllers\Controller;
use App\Models\Charger;
use App\Models\ChargingSession;
use App\Models\Dompet;
use App\Models\MetodePembayaran;
use App\Models\Payment;
use App\Models\Refund;
use App\Models\User;
use App\Models\Vehicle;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class ChargingSessionController extends Controller
{
    use ChecksWalletPin;

    private const MIN_TARGET_KWH = 0.5;

    private const CONNECTOR_LABELS = [
        'type_2' => 'Type 2',
        'ccs2' => 'CCS2',
        'chademo' => 'CHAdeMO',
        'gbt' => 'GB/T',
    ];

    /** Riwayat transaksi charging user (dari versi lama). */
    public function history(Request $request): JsonResponse
    {
        $sessions = ChargingSession::with(['charger.location', 'vehicle', 'tarif', 'payment.method', 'payment.refund'])
            ->where('id_user', $request->user()->id_user)
            ->latest('waktu_mulai')
            ->limit(10)
            ->get()
            ->map(fn (ChargingSession $session) => $this->presentTransactionSummary($session))
            ->values();

        return response()->json(['data' => $sessions]);
    }

    /** Detail invoice digital berdasarkan sesi (dari versi lama). */
    public function invoice(Request $request, ChargingSession $session): JsonResponse
    {
        $session = ChargingSession::with(['charger.location', 'vehicle', 'tarif', 'payment.method', 'payment.refund'])
            ->whereKey($session->id_session)
            ->where('id_user', $request->user()->id_user)
            ->firstOrFail();

        return response()->json(['data' => $this->presentInvoice($session)]);
    }

    /** Sesi charging aktif milik user. */
    public function active(Request $request): JsonResponse
    {
        $session = $this->activeSessionOf($request->user()->id_user);

        return response()->json([
            'data' => $session ? $this->present($session) : null,
        ]);
    }

    /** Langkah persiapan: validasi port, jarak GPS, & kapasitas baterai awal. */
    public function prepare(Request $request): JsonResponse
    {
        $data = $request->validate([
            'id_charger' => ['required', 'integer'],
            'id_vehicle' => ['required', 'integer'],
            'latitude' => ['required', 'numeric', 'between:-90,90'],
            'longitude' => ['required', 'numeric', 'between:-180,180'],
        ]);

        $ctx = $this->checkStartable($request->user(), $data);
        if ($ctx instanceof JsonResponse) {
            return $ctx;
        }

        $charger = $ctx['charger'];
        $soc = random_int(10, 80);
        [$kapasitas, $kapasitasDefault] = $this->batteryCapacity($ctx['vehicle']);
        $maxKwh = $this->maxTargetKwh($kapasitas, $soc);

        if ($maxKwh < self::MIN_TARGET_KWH) {
            return response()->json([
                'message' => 'Baterai mobil sudah hampir penuh, tidak perlu charging.',
                'kode' => 'baterai_penuh',
            ], 422);
        }

        return response()->json([
            'data' => [
                'soc_awal' => $soc,
                'kapasitas_baterai_kwh' => $kapasitas,
                'kapasitas_default' => $kapasitasDefault,
                'min_target_kwh' => self::MIN_TARGET_KWH,
                'max_target_kwh' => $maxKwh,
                'id_charger' => $charger->id_charger,
                'kode_charger' => $charger->kode_perangkat,
                'tipe_konektor' => self::CONNECTOR_LABELS[$charger->tipe_konektor] ?? $charger->tipe_konektor,
                'daya_kw' => $charger->daya_kwh,
                'nama_lokasi' => $ctx['location']->nama_lokasi,
            ],
        ]);
    }

    /** Hitung estimasi biaya sebelum mulai. */
    public function estimate(Request $request): JsonResponse
    {
        $data = $request->validate([
            'id_charger' => ['required', 'integer'],
            'id_vehicle' => ['required', 'integer'],
            'soc_awal' => ['required', 'integer', 'between:0,100'],
            'target_kwh' => ['required', 'numeric', 'min:' . self::MIN_TARGET_KWH],
        ]);

        $vehicle = $request->user()->vehicles()->find($data['id_vehicle']);
        if (! $vehicle) {
            return $this->fail('Kendaraan tidak ditemukan.', 422);
        }
        [$kapasitas] = $this->batteryCapacity($vehicle);
        if ($over = $this->exceedsBattery((float) $data['target_kwh'], $kapasitas, (int) $data['soc_awal'])) {
            return $over;
        }

        $charger = Charger::with('location.tarif')->find($data['id_charger']);
        if (! $charger || ! $charger->location) {
            return $this->fail('Port charger tidak ditemukan.', 404);
        }

        $tarif = $charger->location->activeTarif();
        if (! $tarif) {
            return $this->fail('Tarif belum tersedia untuk station ini.', 422);
        }

        $estimate = $this->calculateEstimate($charger, $tarif, (float) $data['target_kwh']);
        $wallet = $this->walletOf($request->user());
        $estimate['soc_estimasi'] = $this->socAfter($kapasitas, (int) $data['soc_awal'], $estimate['target_kwh']);

        return response()->json([
            'data' => $estimate + $this->walletSummary($wallet, $estimate['total']),
        ]);
    }

    /** Mulai sesi: verifikasi PIN, hold saldo, buat payment pending, & klaim port. */
    public function start(Request $request): JsonResponse
    {
        $data = $request->validate([
            'id_charger' => ['required', 'integer'],
            'id_vehicle' => ['required', 'integer'],
            'soc_awal' => ['required', 'integer', 'between:0,100'],
            'target_kwh' => ['required', 'numeric', 'min:' . self::MIN_TARGET_KWH],
            'pin' => ['required', 'digits:6'],
            'latitude' => ['required', 'numeric', 'between:-90,90'],
            'longitude' => ['required', 'numeric', 'between:-180,180'],
        ]);

        $user = $request->user();
        $ctx = $this->checkStartable($user, $data);
        if ($ctx instanceof JsonResponse) {
            return $ctx;
        }
        $charger = $ctx['charger'];
        $tarif = $ctx['tarif'];

        [$kapasitas] = $this->batteryCapacity($ctx['vehicle']);
        if ($over = $this->exceedsBattery((float) $data['target_kwh'], $kapasitas, (int) $data['soc_awal'])) {
            return $over;
        }

        $estimate = $this->calculateEstimate($charger, $tarif, (float) $data['target_kwh']);
        $total = $estimate['total'];

        $wallet = $this->walletOf($user);
        if ($wallet->status_dompet !== 'aktif') {
            return $this->fail('Dompet digital Anda tidak aktif.', 422);
        }
        if ($wallet->saldoTersedia() < $total) {
            return $this->insufficient($wallet, $total);
        }

        if ($pinError = $this->checkWalletPin($wallet, $data['pin'])) {
            return $pinError;
        }

        $result = DB::transaction(function () use ($wallet, $total, $charger, $user, $ctx, $tarif, $estimate, $data) {
            $w = Dompet::where('id_wallet', $wallet->id_wallet)->lockForUpdate()->first();
            if (! $w || $w->saldoTersedia() < $total) {
                return ['response' => $this->insufficient($w ?? $wallet, $total)];
            }

            $claimed = Charger::where('id_charger', $charger->id_charger)
                ->where('status', 'tersedia')
                ->update(['status' => 'sedang digunakan']);

            if ($claimed === 0) {
                return ['response' => $this->portTaken()];
            }

            $w->saldo_hold = (int) $w->saldo_hold + $total;
            $w->save();

            $session = ChargingSession::create([
                'id_user' => $user->id_user,
                'id_charger' => $charger->id_charger,
                'id_tarif' => $tarif->id_tarif,
                'id_vehicle' => $ctx['vehicle']->id_vehicle,
                'waktu_mulai' => now(),
                'total_energi_kwh' => 0,
                'status' => 'berlangsung',
                'soc_awal' => $data['soc_awal'],
                'target_energi_kwh' => $estimate['target_kwh'],
                'estimasi_biaya_charging' => $estimate['biaya_charging'],
                'estimasi_biaya_parkir' => $estimate['biaya_parkir'],
                'jumlah_hold' => $total, // Kompatibel dengan kolom versi lama
                'saldo_hold' => $total,
            ]);

            // Catat ke tabel Payments (dari versi lama)
            Payment::create([
                'id_session' => $session->id_session,
                'id_metode' => $this->paymentMethod('Dompet Digital')->id_metode,
                'jenis_pembayaran' => 'charging',
                'total_bayar' => $total,
                'status_pembayaran' => 'pending',
                'waktu_pembayaran' => now(),
                'referensi_gateway' => $this->paymentReference('HOLD', $session->id_session),
            ]);

            return ['session' => $session->load(['charger.location', 'tarif', 'vehicle', 'payment.method'])];
        });

        if (isset($result['response'])) {
            return $result['response'];
        }

        return response()->json([
            'message' => 'Sesi charging dimulai. Saldo hold berhasil dicatat.',
            'data' => $this->present($result['session']),
        ], 201);
    }

    /** Akhiri sesi: hitung biaya aktual, potong saldo, buat refund jika ada sisa hold. */
    public function stop(Request $request, string $id): JsonResponse
    {
        $session = ChargingSession::where('id_user', $request->user()->id_user)
            ->whereIn('status', ChargingSession::AKTIF)
            ->find($id);

        if (! $session) {
            return $this->fail('Sesi charging yang berlangsung tidak ditemukan.', 404);
        }

        $sim = $this->simulate($session);

        $finishedSession = DB::transaction(function () use ($session, $sim) {
            $session = ChargingSession::with(['charger.location', 'vehicle', 'tarif'])
                ->whereKey($session->id_session)
                ->lockForUpdate()
                ->firstOrFail();

            $wallet = Dompet::where('id_user', $session->id_user)->lockForUpdate()->firstOrFail();
            $charger = Charger::whereKey($session->id_charger)->lockForUpdate()->firstOrFail();

            $actualKwh = $sim['energi_kwh'];
            $holdAmount = (int) ($session->jumlah_hold ?? $session->saldo_hold);
            
            // Hitung biaya aktual berdasarkan tarif
            $actualCost = $actualKwh > 0 ? min($holdAmount, $this->calculateActualCost($actualKwh, $session->tarif)) : 0;
            $refundAmount = max(0, $holdAmount - $actualCost);

            // Potong saldo asli dan lepaskan saldo hold
            $wallet->saldo = max(0, (int) $wallet->saldo - $actualCost);
            $wallet->saldo_hold = max(0, (int) $wallet->saldo_hold - $holdAmount);
            $wallet->save();

            $charger->status = 'tersedia';
            $charger->save();

            $session->update([
                'status' => 'selesai',
                'waktu_selesai' => now(),
                'total_energi_kwh' => $actualKwh,
                'soc_akhir' => $sim['soc_sekarang'],
            ]);

            // Update status Payment
            $payment = Payment::where('id_session', $session->id_session)->lockForUpdate()->first();
            if (! $payment) {
                $payment = Payment::create([
                    'id_session' => $session->id_session,
                    'id_metode' => $this->paymentMethod('Dompet Digital')->id_metode,
                    'jenis_pembayaran' => 'charging',
                ]);
            }

            $payment->total_bayar = $actualCost;
            $payment->status_pembayaran = $actualCost === 0 ? 'gagal' : 'sukses';
            $payment->waktu_pembayaran = now();
            $payment->referensi_gateway = $payment->referensi_gateway ?: $this->paymentReference('PAY', $session->id_session);
            $payment->save();

            // Buat record Refund jika ada sisa dana hold
            if ($refundAmount > 0) {
                Refund::updateOrCreate(
                    ['id_payment' => $payment->id_payment],
                    [
                        'nominal' => $refundAmount,
                        'waktu_execute' => now(),
                        'status_refund' => 'sukses',
                    ]
                );
            }

            return $session->fresh(['charger.location', 'vehicle', 'tarif', 'payment.method', 'payment.refund']);
        });

        return response()->json([
            'message' => 'Sesi charging selesai. Invoice berhasil diterbitkan.',
            'data' => $this->presentInvoice($finishedSession),
        ]);
    }

    // ------------------------------------------------------------------
    // Helper Methods & Presenters
    // ------------------------------------------------------------------

    private function calculateActualCost(float $kwh, $tarif): int
    {
        $hargaPerKwh = (int) $tarif->harga_per_kwh;
        $biayaMinimum = (int) ($tarif->biaya_minimum ?? 0);
        $biayaCharging = max((int) round($kwh * $hargaPerKwh), $biayaMinimum);
        $biayaParkir = (int) $tarif->biaya_parkir_pjam;

        return $biayaCharging + $biayaParkir;
    }

    private function checkStartable(User $user, array $data): array|JsonResponse
    {
        if ($this->activeSessionOf($user->id_user)) {
            return $this->fail('Anda masih memiliki sesi charging yang berlangsung.', 409);
        }

        $vehicle = $user->vehicles()->find($data['id_vehicle']);
        if (! $vehicle) {
            return $this->fail('Kendaraan tidak ditemukan.', 422);
        }

        $charger = Charger::with('location.tarif')->find($data['id_charger']);
        if (! $charger || ! $charger->location) {
            return $this->fail('Port charger tidak ditemukan.', 404);
        }
        $location = $charger->location;

        if ($location->status !== 'aktif') {
            return $this->fail('Station sedang tidak beroperasi.', 422);
        }

        $jarakM = $this->distanceMeters(
            (float) $data['latitude'], (float) $data['longitude'],
            (float) $location->latitude, (float) $location->longitude
        );
        $radius = config('charging.arrival_radius_m', 50);
        if (config('charging.require_arrival', false) && $jarakM > $radius) {
            return response()->json([
                'message' => 'Anda belum sampai di station.',
                'jarak_m' => (int) round($jarakM),
            ], 422);
        }

        if ($charger->tipe_konektor !== $vehicle->tipe_konektor) {
            return $this->fail('Konektor port tidak cocok dengan kendaraan Anda.', 422);
        }

        if ($charger->status !== 'tersedia') {
            return $this->portTaken();
        }

        $tarif = $location->activeTarif();
        if (! $tarif) {
            return $this->fail('Tarif belum tersedia untuk station ini.', 422);
        }

        return ['vehicle' => $vehicle, 'charger' => $charger, 'location' => $location, 'tarif' => $tarif];
    }

    private function calculateEstimate(Charger $charger, $tarif, float $kwh): array
    {
        $kwh = round($kwh, 2);
        $daya = max(1, (int) $charger->daya_kwh);
        $durasiMenit = (int) ceil($kwh / $daya * 60);

        $hargaPerKwh = (int) $tarif->harga_per_kwh;
        $biayaMinimum = (int) ($tarif->biaya_minimum ?? 0);
        $biayaCharging = max((int) round($kwh * $hargaPerKwh), $biayaMinimum);

        $jamParkir = max(1, (int) ceil($durasiMenit / 60));
        $parkirPerJam = (int) $tarif->biaya_parkir_pjam;
        $biayaParkir = $jamParkir * $parkirPerJam;

        return [
            'target_kwh' => $kwh,
            'daya_kw' => $daya,
            'durasi_menit' => $durasiMenit,
            'biaya_charging' => $biayaCharging,
            'biaya_parkir' => $biayaParkir,
            'total' => $biayaCharging + $biayaParkir,
        ];
    }

    private function batteryCapacity(Vehicle $vehicle): array
    {
        $own = (float) ($vehicle->kapasitas_baterai_kwh ?? 0);
        return $own > 0 ? [$own, false] : [(float) config('charging.default_battery_kwh', 60), true];
    }

    private function maxTargetKwh(float $kapasitas, int $soc): float
    {
        return floor($kapasitas * (100 - $soc) / 100 * 2) / 2;
    }

    private function socAfter(float $kapasitas, int $soc, float $kwh): int
    {
        return (int) min(100, round($soc + $kwh / max(0.1, $kapasitas) * 100));
    }

    private function exceedsBattery(float $kwh, float $kapasitas, int $soc): ?JsonResponse
    {
        $max = $this->maxTargetKwh($kapasitas, $soc);
        if ($kwh <= $max) {
            return null;
        }
        return response()->json(['message' => "Jumlah energi melebihi kapasitas baterai. Maksimal {$max} kWh."], 422);
    }

    private function walletOf(User $user): Dompet
    {
        return Dompet::firstOrCreate(['id_user' => $user->id_user], ['saldo' => 0, 'status_dompet' => 'aktif']);
    }

    private function walletSummary(Dompet $wallet, int $total): array
    {
        $tersedia = $wallet->saldoTersedia();
        return ['saldo_tersedia' => $tersedia, 'saldo_cukup' => $tersedia >= $total, 'kekurangan' => max(0, $total - $tersedia)];
    }

    private function insufficient(Dompet $wallet, int $total): JsonResponse
    {
        return response()->json(['message' => 'Saldo dompet tidak cukup.'], 422);
    }

    private function portTaken(): JsonResponse
    {
        return response()->json(['message' => 'Port sedang tidak tersedia.'], 409);
    }

    private function activeSessionOf(string $idUser): ?ChargingSession
    {
        return ChargingSession::with(['charger.location', 'tarif', 'vehicle'])
            ->where('id_user', $idUser)
            ->whereIn('status', ChargingSession::AKTIF)
            ->latest('waktu_mulai')
            ->first();
    }

    private function present(ChargingSession $s): array
    {
        $charger = $s->charger;
        $location = $charger?->location;
        $sim = $this->simulate($s);

        return [
            'id_session' => $s->id_session,
            'nama_lokasi' => $location?->nama_lokasi,
            'kode_charger' => $charger?->kode_perangkat,
            'status' => $s->status,
            'energi_kwh' => $sim['energi_kwh'],
            'soc_sekarang' => $sim['soc_sekarang'],
            'durasi_detik' => $sim['durasi_detik'],
            'sudah_penuh' => $sim['selesai'],
            'target_energi_kwh' => (float) $s->target_energi_kwh,
            'saldo_hold' => (int) ($s->jumlah_hold ?? $s->saldo_hold),
        ];
    }

    private function presentInvoice(ChargingSession $session): array
    {
        $hold = (int) ($session->jumlah_hold ?? $session->saldo_hold);
        $actualCost = $this->calculateActualCost((float) $session->total_energi_kwh, $session->tarif);
        $actualCost = min($hold, $actualCost);

        return [
            'id_session' => $session->id_session,
            'nama_lokasi' => $session->charger->location->nama_lokasi,
            'energi_kwh' => (float) $session->total_energi_kwh,
            'biaya_aktual' => $actualCost,
            'jumlah_hold' => $hold,
            'selisih_dikembalikan' => max(0, $hold - $actualCost),
            'status_pembayaran' => $session->payment?->status_pembayaran,
            'referensi_gateway' => $session->payment?->referensi_gateway,
            'status' => $session->status,
        ];
    }

    private function presentTransactionSummary(ChargingSession $session): array
    {
        $hold = (int) ($session->jumlah_hold ?? $session->saldo_hold);
        $total = $session->status === 'selesai'
            ? min($hold, $this->calculateActualCost((float) $session->total_energi_kwh, $session->tarif))
            : $hold;

        return [
            'id_session' => $session->id_session,
            'nama_lokasi' => $session->charger->location->nama_lokasi,
            'tanggal' => $session->waktu_mulai?->timezone('Asia/Jakarta')->translatedFormat('d M Y, H:i'),
            'energi_kwh' => (float) $session->total_energi_kwh,
            'total' => $total,
            'status' => $session->status,
        ];
    }

    private function simulate(ChargingSession $s): array
    {
        $target = (float) ($s->target_energi_kwh ?? 0);
        $daya = max(1, (int) ($s->charger?->daya_kwh ?? 1));
        $speed = max(0.1, (float) config('charging.simulation_speed', 1));

        if ($s->status === 'selesai') {
            return [
                'energi_kwh' => round((float) $s->total_energi_kwh, 2),
                'soc_sekarang' => (int) ($s->soc_akhir ?? $s->soc_awal),
                'durasi_detik' => $s->waktu_selesai && $s->waktu_mulai ? (int) $s->waktu_mulai->diffInSeconds($s->waktu_selesai, true) : 0,
                'selesai' => true,
                'kecepatan' => $speed,
            ];
        }

        $realSec = max(0, $s->waktu_mulai ? $s->waktu_mulai->diffInSeconds(now(), true) : 0);
        $simSec = $realSec * $speed;
        $energi = min($target, $daya * $simSec / 3600);
        $selesai = $target > 0 && $energi >= $target;

        $kapasitas = $s->vehicle ? $this->batteryCapacity($s->vehicle)[0] : 60;
        $soc = $this->socAfter($kapasitas, (int) $s->soc_awal, $energi);

        return [
            'energi_kwh' => round($energi, 2),
            'soc_sekarang' => $soc,
            'durasi_detik' => $selesai ? (int) ceil($target / $daya * 3600) : (int) $simSec,
            'selesai' => $selesai,
            'kecepatan' => $speed,
        ];
    }

    private function fail(string $message, int $status): JsonResponse
    {
        return response()->json(['message' => $message], $status);
    }

    private function distanceMeters(float $lat1, float $lng1, float $lat2, float $lng2): float
    {
        $rad = fn (float $d) => deg2rad($d);
        $dLat = $rad($lat2 - $lat1);
        $dLng = $rad($lng2 - $lng1);
        $h = sin($dLat / 2) ** 2 + cos($rad($lat1)) * cos($rad($lat2)) * sin($dLng / 2) ** 2;
        return 2 * 6371000 * asin(min(1, sqrt($h)));
    }

    private function paymentMethod(string $name): MetodePembayaran
    {
        return MetodePembayaran::firstOrCreate(
            ['nama_metode' => $name],
            ['biaya_layanan' => 0, 'status_metode' => 'aktif']
        );
    }

    private function paymentReference(string $prefix, int $id): string
    {
        return $prefix.'-'.now()->format('YmdHis').'-'.$id;
    }
}