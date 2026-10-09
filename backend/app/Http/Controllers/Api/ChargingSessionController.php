<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Charger;
use App\Models\ChargingSession;
use App\Models\Dompet;
use App\Models\MetodePembayaran;
use App\Models\Payment;
use App\Models\Refund;
use App\Models\Tarif;
use App\Models\Vehicle;
use Illuminate\Database\Eloquent\ModelNotFoundException;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\ValidationException;

class ChargingSessionController extends Controller
{
    private const CONNECTOR_LABELS = [
        'type_2' => 'Type 2',
        'ccs2' => 'CCS2',
        'chademo' => 'CHAdeMO',
        'gbt' => 'GB/T',
    ];

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

    public function invoice(Request $request, ChargingSession $session): JsonResponse
    {
        $session = ChargingSession::with(['charger.location', 'vehicle', 'tarif', 'payment.method', 'payment.refund'])
            ->whereKey($session->id_session)
            ->where('id_user', $request->user()->id_user)
            ->firstOrFail();

        return response()->json(['data' => $this->presentInvoice($session)]);
    }

    public function active(Request $request): JsonResponse
    {
        $session = ChargingSession::with(['charger.location', 'vehicle', 'tarif', 'payment.method'])
            ->where('id_user', $request->user()->id_user)
            ->whereIn('status', ['pending', 'berlangsung'])
            ->latest('waktu_mulai')
            ->first();

        return response()->json([
            'data' => $session ? $this->presentSession($session) : null,
        ]);
    }

    public function validateCharger(Request $request): JsonResponse
    {
        $data = $request->validate([
            'id_charger' => ['required', 'integer', 'exists:charger,id_charger'],
            'id_vehicle' => ['required', 'integer', 'exists:vehicle,id_vehicle'],
            'target_kwh' => ['required', 'numeric', 'min:5', 'max:100'],
        ]);

        $charger = Charger::with('location')->findOrFail($data['id_charger']);
        $vehicle = $this->driverVehicle($request, (int) $data['id_vehicle']);
        $tarif = $this->activeTarif($charger);

        $this->ensureCanUseCharger($charger, $vehicle);

        return response()->json([
            'message' => 'Charger tersedia dan valid untuk kendaraan aktif.',
            'data' => $this->presentValidation($charger, $vehicle, $tarif, (float) $data['target_kwh']),
        ]);
    }

    public function start(Request $request): JsonResponse
    {
        $data = $request->validate([
            'id_charger' => ['required', 'integer', 'exists:charger,id_charger'],
            'id_vehicle' => ['required', 'integer', 'exists:vehicle,id_vehicle'],
            'target_kwh' => ['required', 'numeric', 'min:5', 'max:100'],
            'pin' => ['required', 'digits:6'],
            'soc_awal' => ['nullable', 'integer', 'min:0', 'max:100'],
        ]);

        $session = DB::transaction(function () use ($request, $data): ChargingSession {
            $user = $request->user();

            $activeSessionExists = ChargingSession::where('id_user', $user->id_user)
                ->whereIn('status', ['pending', 'berlangsung'])
                ->lockForUpdate()
                ->exists();

            if ($activeSessionExists) {
                throw ValidationException::withMessages([
                    'session' => 'Masih ada sesi charging yang berjalan.',
                ]);
            }

            $charger = Charger::with('location')
                ->whereKey($data['id_charger'])
                ->lockForUpdate()
                ->firstOrFail();

            $vehicle = $this->driverVehicle($request, (int) $data['id_vehicle']);
            $tarif = $this->activeTarif($charger);
            $wallet = Dompet::where('id_user', $user->id_user)->lockForUpdate()->firstOrFail();

            $this->ensureCanUseCharger($charger, $vehicle);
            $this->ensureWalletCanPay($wallet, (string) $data['pin']);

            $estimate = $this->estimateCost((float) $data['target_kwh'], $tarif);
            $availableBalance = max(0, $wallet->saldo - $wallet->saldo_ditahan);

            if ($availableBalance < $estimate) {
                throw ValidationException::withMessages([
                    'saldo' => 'Saldo Dompet Digital belum mencukupi untuk estimasi transaksi.',
                ]);
            }

            $wallet->saldo_ditahan += $estimate;
            $wallet->percobaan_pin_gagal = 0;
            $wallet->locked_until = null;
            $wallet->save();

            $charger->status_mesin = 'sedang digunakan';
            $charger->save();

            $session = ChargingSession::create([
                'id_user' => $user->id_user,
                'id_charger' => $charger->id_charger,
                'id_tarif' => $tarif->id_tarif,
                'id_vehicle' => $vehicle->id_vehicle,
                'waktu_mulai' => now(),
                'total_energi_kwh' => 0,
                'target_energi_kwh' => $data['target_kwh'],
                'estimasi_biaya' => $estimate,
                'jumlah_hold' => $estimate,
                'status' => 'berlangsung',
                'soc_awal' => $data['soc_awal'] ?? 0,
            ]);

            Payment::create([
                'id_session' => $session->id_session,
                'id_metode' => $this->paymentMethod('Dompet Digital')->id_metode,
                'jenis_pembayaran' => 'charging',
                'total_bayar' => $estimate,
                'status_pembayaran' => 'pending',
                'waktu_pembayaran' => now(),
                'referensi_gateway' => $this->paymentReference('HOLD', $session->id_session),
            ]);

            return $session->load(['charger.location', 'vehicle', 'tarif', 'payment.method']);
        });

        return response()->json([
            'message' => 'Sesi charging dimulai. Saldo estimasi berhasil di-hold.',
            'data' => $this->presentSession($session),
        ], 201);
    }

    public function finish(Request $request, ChargingSession $session): JsonResponse
    {
        $data = $request->validate([
            'energi_kwh' => ['nullable', 'numeric', 'min:0.1', 'max:100'],
            'soc_akhir' => ['nullable', 'integer', 'min:0', 'max:100'],
        ]);

        $finishedSession = $this->settleSession($request, $session, $data, 'selesai');

        return response()->json([
            'message' => 'Sesi charging selesai. Invoice digital berhasil diterbitkan.',
            'data' => $this->presentInvoice($finishedSession),
        ]);
    }

    public function interrupt(Request $request, ChargingSession $session): JsonResponse
    {
        $data = $request->validate([
            'status' => ['required', 'in:dibatalkan,gagal'],
            'energi_kwh' => ['nullable', 'numeric', 'min:0', 'max:100'],
            'soc_akhir' => ['nullable', 'integer', 'min:0', 'max:100'],
            'alasan' => ['nullable', 'string', 'max:160'],
        ]);

        $finishedSession = $this->settleSession($request, $session, $data, $data['status']);
        $message = $data['status'] === 'gagal'
            ? 'Sesi charging gagal ditangani. Biaya aktual dihitung dan sisa hold dikembalikan.'
            : 'Sesi charging dibatalkan. Biaya aktual dihitung dan sisa hold dikembalikan.';

        return response()->json([
            'message' => $message,
            'data' => $this->presentInvoice($finishedSession),
        ]);
    }

    private function driverVehicle(Request $request, int $idVehicle): Vehicle
    {
        $vehicle = $request->user()->vehicles()->whereKey($idVehicle)->first();

        if (! $vehicle) {
            throw (new ModelNotFoundException)->setModel(Vehicle::class, [$idVehicle]);
        }

        return $vehicle;
    }

    private function activeTarif(Charger $charger): Tarif
    {
        $tarif = Tarif::where('id_location', $charger->id_location)
            ->where('periode_mulai', '<=', now())
            ->where('periode_berakhir', '>=', now())
            ->latest('periode_mulai')
            ->first();

        if (! $tarif) {
            throw ValidationException::withMessages([
                'tarif' => 'Tarif aktif untuk station ini belum tersedia.',
            ]);
        }

        return $tarif;
    }

    private function ensureCanUseCharger(Charger $charger, Vehicle $vehicle): void
    {
        if ($charger->status_mesin !== 'tersedia') {
            throw ValidationException::withMessages([
                'charger' => 'Charger sudah digunakan atau belum siap.',
            ]);
        }

        if ($charger->tipe_konektor !== $vehicle->tipe_konektor) {
            throw ValidationException::withMessages([
                'charger' => 'Tipe konektor charger tidak sesuai dengan kendaraan aktif.',
            ]);
        }
    }

    private function ensureWalletCanPay(Dompet $wallet, string $pin): void
    {
        if ($wallet->status_dompet !== 'aktif') {
            throw ValidationException::withMessages([
                'wallet' => 'Dompet Digital sedang tidak aktif.',
            ]);
        }

        if (! $wallet->hasPin()) {
            throw ValidationException::withMessages([
                'pin' => 'PIN Dompet belum diatur.',
            ]);
        }

        if ($wallet->isLocked()) {
            throw ValidationException::withMessages([
                'pin' => 'Dompet terkunci sementara karena terlalu banyak percobaan PIN salah.',
            ]);
        }

        if (Hash::check($pin, $wallet->pin_transaksi)) {
            return;
        }

        $wallet->percobaan_pin_gagal += 1;

        if ($wallet->percobaan_pin_gagal >= 5) {
            $wallet->percobaan_pin_gagal = 0;
            $wallet->locked_until = now()->addMinutes(15);
        }

        $wallet->save();

        throw ValidationException::withMessages([
            'pin' => 'PIN Dompet salah.',
        ]);
    }

    private function settleSession(Request $request, ChargingSession $session, array $data, string $finalStatus): ChargingSession
    {
        return DB::transaction(function () use ($request, $session, $data, $finalStatus): ChargingSession {
            $session = ChargingSession::with(['charger.location', 'vehicle', 'tarif'])
                ->whereKey($session->id_session)
                ->lockForUpdate()
                ->firstOrFail();

            if ($session->id_user !== $request->user()->id_user) {
                throw (new ModelNotFoundException)->setModel(ChargingSession::class, [$session->id_session]);
            }

            if ($session->status !== 'berlangsung') {
                throw ValidationException::withMessages([
                    'session' => 'Sesi charging tidak sedang berjalan.',
                ]);
            }

            $wallet = Dompet::where('id_user', $session->id_user)->lockForUpdate()->firstOrFail();
            $charger = Charger::whereKey($session->id_charger)->lockForUpdate()->firstOrFail();
            $actualKwh = $this->actualEnergy($session, $data, $finalStatus);
            $actualCost = $actualKwh > 0 ? min($session->jumlah_hold, $this->estimateCost($actualKwh, $session->tarif)) : 0;
            $refundAmount = max(0, $session->jumlah_hold - $actualCost);

            $wallet->saldo = max(0, $wallet->saldo - $actualCost);
            $wallet->saldo_ditahan = max(0, $wallet->saldo_ditahan - $session->jumlah_hold);
            $wallet->save();

            $charger->status_mesin = $finalStatus === 'gagal' ? 'maintenance' : 'tersedia';
            $charger->save();

            $session->total_energi_kwh = $actualKwh;
            $session->waktu_selesai = now();
            $session->status = $finalStatus;
            $session->soc_akhir = $data['soc_akhir'] ?? null;
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
            $payment->status_pembayaran = $finalStatus === 'gagal' && $actualCost === 0 ? 'gagal' : 'sukses';
            $payment->waktu_pembayaran = now();
            $payment->referensi_gateway = $payment->referensi_gateway ?: $this->paymentReference('PAY', $session->id_session);
            $payment->save();

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
    }

    private function actualEnergy(ChargingSession $session, array $data, string $finalStatus): float
    {
        if (array_key_exists('energi_kwh', $data) && $data['energi_kwh'] !== null) {
            return round((float) $data['energi_kwh'], 2);
        }

        if ($finalStatus === 'gagal') {
            return max(0, round(((float) $session->target_energi_kwh) * 0.32, 2));
        }

        if ($finalStatus === 'dibatalkan') {
            return max(0, round(((float) $session->target_energi_kwh) * 0.18, 2));
        }

        return max(1, round(((float) $session->target_energi_kwh) * 0.72, 2));
    }

    private function estimateCost(float $targetKwh, Tarif $tarif): int
    {
        return (int) round($targetKwh * $tarif->harga_per_kwh + $tarif->biaya_parkir_pjam);
    }

    private function presentValidation(Charger $charger, Vehicle $vehicle, Tarif $tarif, float $targetKwh): array
    {
        return [
            'station' => [
                'id_location' => $charger->location->id_location,
                'nama_lokasi' => $charger->location->nama_lokasi,
                'alamat' => $charger->location->alamat,
            ],
            'charger' => $this->presentCharger($charger),
            'vehicle' => [
                'id_vehicle' => $vehicle->id_vehicle,
                'nama' => "{$vehicle->merek} {$vehicle->model}",
                'nomor_polisi' => $vehicle->nomor_polisi,
                'tipe_konektor' => self::CONNECTOR_LABELS[$vehicle->tipe_konektor] ?? $vehicle->tipe_konektor,
            ],
            'estimasi' => [
                'target_kwh' => $targetKwh,
                'tarif_per_kwh' => $tarif->harga_per_kwh,
                'biaya_parkir' => $tarif->biaya_parkir_pjam,
                'total' => $this->estimateCost($targetKwh, $tarif),
            ],
        ];
    }

    private function presentSession(ChargingSession $session): array
    {
        return [
            'id_session' => $session->id_session,
            'id_location' => $session->charger->location->id_location,
            'nama_lokasi' => $session->charger->location->nama_lokasi,
            'kode_charger' => $session->charger->kode_perangkat,
            'status' => 'Charging',
            'energi_kwh' => (float) $session->total_energi_kwh,
            'target_kwh' => (float) $session->target_energi_kwh,
            'tarif_per_kwh' => $session->tarif->harga_per_kwh,
            'biaya_parkir' => $session->tarif->biaya_parkir_pjam,
            'jumlah_hold' => $session->jumlah_hold,
            'waktu_mulai' => $session->waktu_mulai?->getTimestampMs(),
            'id_payment' => $session->payment?->id_payment,
            'status_pembayaran' => $session->payment?->status_pembayaran,
        ];
    }

    private function presentInvoice(ChargingSession $session): array
    {
        $actualCost = $this->estimateCost((float) $session->total_energi_kwh, $session->tarif);
        $actualCost = min($session->jumlah_hold, $actualCost);
        $chargingCost = (int) round((float) $session->total_energi_kwh * $session->tarif->harga_per_kwh);

        return [
            'id_session' => $session->id_session,
            'nama_lokasi' => $session->charger->location->nama_lokasi,
            'alamat' => $session->charger->location->alamat,
            'kode_charger' => $session->charger->kode_perangkat,
            'kendaraan' => [
                'nama' => "{$session->vehicle->merek} {$session->vehicle->model}",
                'nomor_polisi' => $session->vehicle->nomor_polisi,
                'tipe_konektor' => self::CONNECTOR_LABELS[$session->vehicle->tipe_konektor] ?? $session->vehicle->tipe_konektor,
            ],
            'energi_kwh' => (float) $session->total_energi_kwh,
            'tarif_per_kwh' => $session->tarif->harga_per_kwh,
            'biaya_charging' => $chargingCost,
            'biaya_parkir' => $session->tarif->biaya_parkir_pjam,
            'biaya_aktual' => $actualCost,
            'jumlah_hold' => $session->jumlah_hold,
            'selisih_dikembalikan' => max(0, $session->jumlah_hold - $actualCost),
            'id_payment' => $session->payment?->id_payment,
            'metode_pembayaran' => $session->payment?->method?->nama_metode,
            'status_pembayaran' => $session->payment?->status_pembayaran,
            'referensi_gateway' => $session->payment?->referensi_gateway,
            'refund' => $session->payment?->refund ? [
                'nominal' => $session->payment->refund->nominal,
                'status' => $session->payment->refund->status_refund,
                'waktu_execute' => $session->payment->refund->waktu_execute?->toISOString(),
            ] : null,
            'status' => $this->sessionStatusLabel($session->status),
            'waktu_mulai' => $session->waktu_mulai?->toISOString(),
            'waktu_selesai' => $session->waktu_selesai?->toISOString(),
        ];
    }

    private function presentTransactionSummary(ChargingSession $session): array
    {
        $total = $session->status === 'selesai'
            ? min($session->jumlah_hold, $this->estimateCost((float) $session->total_energi_kwh, $session->tarif))
            : $session->jumlah_hold;

        return [
            'id_session' => $session->id_session,
            'nama_lokasi' => $session->charger->location->nama_lokasi,
            'kode_charger' => $session->charger->kode_perangkat,
            'tanggal' => $session->waktu_mulai?->timezone('Asia/Jakarta')->translatedFormat('d M Y, H:i'),
            'energi_kwh' => (float) $session->total_energi_kwh,
            'total' => $total,
            'status' => $this->sessionStatusLabel($session->status),
            'id_payment' => $session->payment?->id_payment,
            'status_pembayaran' => $session->payment?->status_pembayaran,
        ];
    }

    private function sessionStatusLabel(string $status): string
    {
        return match ($status) {
            'pending' => 'Estimasi',
            'berlangsung' => 'Berjalan',
            'selesai' => 'Selesai',
            'dibatalkan' => 'Dibatalkan',
            'gagal' => 'Gagal',
            default => ucfirst($status),
        };
    }

    private function presentCharger(Charger $charger): array
    {
        return [
            'id_charger' => $charger->id_charger,
            'kode_perangkat' => $charger->kode_perangkat,
            'tipe_konektor' => self::CONNECTOR_LABELS[$charger->tipe_konektor] ?? $charger->tipe_konektor,
            'daya_kw' => $charger->daya_kwh,
            'tipe_charging' => $charger->tipe_charging,
            'status' => $charger->status_mesin,
        ];
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
