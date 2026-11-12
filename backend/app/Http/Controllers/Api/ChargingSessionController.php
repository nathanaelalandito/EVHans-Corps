<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Concerns\ChecksWalletPin;
use App\Http\Controllers\Controller;
use App\Models\AuditLog;
use App\Models\Charger;
use App\Models\ChargingSession;
use App\Models\Dompet;
use App\Models\ErrorLog;
use App\Models\Location;
use App\Models\MetodePembayaran;
use App\Models\Payment;
use App\Models\Port;
use App\Models\Tarif;
use App\Models\User;
use App\Models\Vehicle;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

/**
 * Alur memulai sesi charging (satu sesi = satu PORT):
 *   prepare  -> validasi port + kedatangan di station, deteksi baterai awal (diacak sementara)
 *   estimate -> hitung estimasi biaya dari jumlah kWh yang dipilih + cek saldo
 *   start    -> verifikasi PIN, hold saldo (saldo_hold), klaim port, mulai sesi
 * Penyelesaian (finish / stop / interrupt) menghitung biaya aktual, melepas hold,
 * dan menerbitkan invoice.
 */
class ChargingSessionController extends Controller
{
    use ChecksWalletPin;

    /** Membagikan aturan kedatangan yang sedang dipakai backend kepada Driver. */
    public function settings(): JsonResponse
    {
        return response()->json([
            'data' => [
                'require_arrival' => (bool) config('charging.require_arrival', true),
                'arrival_radius_m' => (int) config('charging.arrival_radius_m', 200),
            ],
        ]);
    }

    /** Jumlah energi terkecil yang bisa dipilih dalam satu sesi (kWh). */
    private const MIN_TARGET_KWH = 0.5;

    private const MAX_TARGET_KWH = 100;

    private const RELATIONS = ['charger.location', 'port', 'vehicle', 'tarif', 'payment.method'];

    // ------------------------------------------------------------------
    // Endpoint baca
    // ------------------------------------------------------------------

    /** Mengambil riwayat sesi charging milik pengemudi yang sedang login. */
    public function history(Request $request): JsonResponse
    {
        $sessions = ChargingSession::with(self::RELATIONS)
            ->where('id_user', $request->user()->id_user)
            ->latest('waktu_mulai')
            ->limit(10)
            ->get()
            ->map(fn (ChargingSession $session) => $this->presentTransactionSummary($session))
            ->values();

        return response()->json(['data' => $sessions]);
    }

    /** Menampilkan invoice sesi setelah memeriksa kepemilikan sesi. */
    public function invoice(Request $request, ChargingSession $session): JsonResponse
    {
        $session = ChargingSession::with(self::RELATIONS)
            ->whereKey($session->id_session)
            ->where('id_user', $request->user()->id_user)
            ->firstOrFail();

        return response()->json(['data' => $this->presentInvoice($session)]);
    }

    /** Sesi charging milik user yang masih berjalan (data null jika tidak ada). */
    public function active(Request $request): JsonResponse
    {
        $session = $this->activeSessionOf($request->user());

        return response()->json([
            'data' => $session ? $this->presentSession($session) : null,
        ]);
    }

    // ------------------------------------------------------------------
    // Langkah memulai sesi
    // ------------------------------------------------------------------

    /** Memeriksa port, konektor kendaraan, station, dan status sebelum charging. */
    public function validateCharger(Request $request): JsonResponse
    {
        $data = $request->validate([
            'id_port' => ['required', 'integer', 'exists:ports,id_port'],
            'id_vehicle' => ['required', 'integer', 'exists:vehicle,id_vehicle'],
            'target_kwh' => ['required', 'numeric', 'min:'.self::MIN_TARGET_KWH, 'max:'.self::MAX_TARGET_KWH],
        ]);

        $vehicle = $this->driverVehicle($request->user(), (int) $data['id_vehicle']);
        if ($vehicle instanceof JsonResponse) {
            return $vehicle;
        }

        $ctx = $this->loadPort((int) $data['id_port']);
        if ($ctx instanceof JsonResponse) {
            return $ctx;
        }

        if ($error = $this->ensureCanUsePort($ctx['port'], $vehicle)) {
            return $error;
        }
        $tarif = $this->activeTarif($ctx['location']);
        if ($tarif instanceof JsonResponse) {
            return $tarif;
        }

        return response()->json([
            'message' => 'Port tersedia dan valid untuk kendaraan aktif.',
            'data' => $this->presentValidation($ctx, $vehicle, $tarif, (float) $data['target_kwh']),
        ]);
    }

    /**
     * Langkah setelah kabel dicolokkan: validasi port & kedatangan, lalu
     * kembalikan persen baterai awal. Belum membuat sesi / mengunci port.
     */
    /** Memvalidasi pilihan driver dan menyiapkan data estimasi sesi. */
    public function prepare(Request $request): JsonResponse
    {
        $data = $request->validate([
            'id_port' => ['required', 'integer', 'exists:ports,id_port'],
            'id_vehicle' => ['required', 'integer', 'exists:vehicle,id_vehicle'],
            'latitude' => ['required', 'numeric', 'between:-90,90'],
            'longitude' => ['required', 'numeric', 'between:-180,180'],
        ]);

        $ctx = $this->checkStartable($request->user(), $data);
        if ($ctx instanceof JsonResponse) {
            return $ctx;
        }

        $port = $ctx['port'];
        $charger = $ctx['charger'];

        // Sementara: persen baterai awal diacak (belum ada data asli dari mobil/charger).
        $initialSoc = random_int(10, 80);
        [$batteryCapacityKwh, $usesDefaultCapacity] = $this->batteryCapacity($ctx['vehicle']);
        $maxTargetKwh = $this->maxTargetKwh($batteryCapacityKwh, $initialSoc);

        if ($maxTargetKwh < self::MIN_TARGET_KWH) {
            return $this->fail('Baterai mobil sudah hampir penuh, tidak perlu charging.', 422, ['kode' => 'baterai_penuh']);
        }

        return response()->json([
            'data' => [
                'soc_awal' => $initialSoc,
                'kapasitas_baterai_kwh' => $batteryCapacityKwh,
                'kapasitas_default' => $usesDefaultCapacity,
                'min_target_kwh' => self::MIN_TARGET_KWH,
                'max_target_kwh' => $maxTargetKwh, // jumlah kWh agar baterai mencapai 100%
                'id_port' => $port->id_port,
                'nomor_port' => $port->nomor_port,
                'id_charger' => $charger->id_charger,
                'kode_charger' => $charger->kode_perangkat,
                'tipe_konektor' => $port->connectorLabel(),
                'daya_kw' => $port->daya_maks_kw,
                'nama_lokasi' => $ctx['location']->nama_lokasi,
            ],
        ]);
    }

    /** Hitung estimasi biaya untuk jumlah kWh yang dipilih + cek saldo dompet. */
    public function estimate(Request $request): JsonResponse
    {
        $data = $request->validate([
            'id_port' => ['required', 'integer', 'exists:ports,id_port'],
            'id_vehicle' => ['required', 'integer', 'exists:vehicle,id_vehicle'],
            'soc_awal' => ['required', 'integer', 'between:0,100'],
            'target_kwh' => ['required', 'numeric', 'min:'.self::MIN_TARGET_KWH, 'max:'.self::MAX_TARGET_KWH],
        ]);

        $user = $request->user();

        $vehicle = $this->driverVehicle($user, (int) $data['id_vehicle']);
        if ($vehicle instanceof JsonResponse) {
            return $vehicle;
        }
        [$batteryCapacityKwh] = $this->batteryCapacity($vehicle);
        if ($over = $this->exceedsBattery((float) $data['target_kwh'], $batteryCapacityKwh, (int) $data['soc_awal'])) {
            return $over;
        }

        $ctx = $this->loadPort((int) $data['id_port']);
        if ($ctx instanceof JsonResponse) {
            return $ctx;
        }
        $tarif = $this->activeTarif($ctx['location']);
        if ($tarif instanceof JsonResponse) {
            return $tarif;
        }

        $cost = $tarif->costFor((float) $data['target_kwh'], (float) $ctx['port']->daya_maks_kw);
        $wallet = $this->walletOf($user);
        $available = $wallet->saldoTersedia();

        return response()->json([
            'data' => $cost + [
                'soc_estimasi' => $this->socAfter($batteryCapacityKwh, (int) $data['soc_awal'], $cost['target_kwh']),
                'saldo_tersedia' => $available,
                'saldo_cukup' => $available >= $cost['total'],
                'kekurangan' => max(0, $cost['total'] - $available),
                'pin_sudah_diset' => $wallet->hasPin(),
            ],
        ]);
    }

    /** Mengunci port, memvalidasi saldo/PIN, membuat sesi, dan menahan saldo. */
    public function start(Request $request): JsonResponse
    {
        $data = $request->validate([
            'id_port' => ['required', 'integer', 'exists:ports,id_port'],
            'id_vehicle' => ['required', 'integer', 'exists:vehicle,id_vehicle'],
            'soc_awal' => ['required', 'integer', 'between:0,100'],
            'target_kwh' => ['required', 'numeric', 'min:'.self::MIN_TARGET_KWH, 'max:'.self::MAX_TARGET_KWH],
            'pin' => ['required', 'digits:6'],
            'latitude' => ['required', 'numeric', 'between:-90,90'],
            'longitude' => ['required', 'numeric', 'between:-180,180'],
        ]);

        $user = $request->user();

        // Pemeriksaan di luar transaksi: kegagalan PIN harus tetap tersimpan
        // (penghitung percobaan salah), tidak ikut di-rollback.
        $ctx = $this->checkStartable($user, $data);
        if ($ctx instanceof JsonResponse) {
            return $ctx;
        }
        $port = $ctx['port'];
        $charger = $ctx['charger'];
        $tarif = $ctx['tarif'];
        $vehicle = $ctx['vehicle'];

        [$batteryCapacityKwh] = $this->batteryCapacity($vehicle);
        if ($over = $this->exceedsBattery((float) $data['target_kwh'], $batteryCapacityKwh, (int) $data['soc_awal'])) {
            return $over;
        }

        $cost = $tarif->costFor((float) $data['target_kwh'], (float) $port->daya_maks_kw);
        $total = $cost['total'];

        $wallet = $this->walletOf($user);
        if ($wallet->status_dompet !== 'Aktif') {
            return $this->fail('Dompet Digital sedang tidak aktif.', 422);
        }
        if ($wallet->saldoTersedia() < $total) {
            return $this->insufficient($wallet, $total);
        }
        if ($pinError = $this->checkWalletPin($wallet, (string) $data['pin'], 'PIN Dompet salah.')) {
            return $pinError;
        }

        $result = DB::transaction(function () use ($user, $data, $cost, $total, $tarif, $vehicle, $port, $charger) {
            $activeSessionExists = ChargingSession::where('id_user', $user->id_user)
                ->whereIn('status', ChargingSession::AKTIF)
                ->lockForUpdate()
                ->exists();

            if ($activeSessionExists) {
                return ['response' => $this->fail('Masih ada sesi charging yang berjalan.', 409)];
            }

            $wallet = Dompet::where('id_user', $user->id_user)->lockForUpdate()->firstOrFail();
            if ($wallet->saldoTersedia() < $total) {
                return ['response' => $this->insufficient($wallet, $total)];
            }

            // Kunci port & cek ulang: dua driver tidak boleh mengambil port yang sama.
            $claimed = Port::where('id_port', $port->id_port)
                ->where('status_port', Port::AVAILABLE)
                ->update(['status_port' => Port::CHARGING]);

            if ($claimed === 0) {
                return ['response' => $this->portTaken()];
            }

            $wallet->saldo_hold = (int) $wallet->saldo_hold + $total;
            $wallet->percobaan_pin_gagal = 0;
            $wallet->locked_until = null;
            $wallet->save();

            $session = ChargingSession::create([
                'id_user' => $user->id_user,
                'id_charger' => $charger->id_charger,
                'id_port' => $port->id_port,
                'id_tarif' => $tarif->id_tarif,
                'id_vehicle' => $vehicle->id_vehicle,
                'waktu_mulai' => now(),
                'total_energi_kwh' => 0,
                'target_energi_kwh' => $cost['target_kwh'],
                'estimasi_biaya_charging' => $cost['biaya_charging'],
                'estimasi_biaya_parkir' => $cost['biaya_parkir'],
                'saldo_hold' => $total,
                'status' => 'Berlangsung',
                'soc_awal' => $data['soc_awal'],
            ]);

            Payment::create([
                'id_session' => $session->id_session,
                'id_metode' => $this->paymentMethod('Dompet Digital')->id_metode,
                'jenis_pembayaran' => 'charging',
                'total_bayar' => $total,
                'status_pembayaran' => 'Pending',
                'waktu_pembayaran' => now(),
                'referensi_gateway' => $this->paymentReference('HOLD', $session->id_session),
            ]);

            return ['session' => $session->load(self::RELATIONS)];
        });

        if (isset($result['response'])) {
            return $result['response'];
        }

        return response()->json([
            'message' => 'Sesi charging dimulai. Saldo estimasi berhasil di-hold.',
            'data' => $this->presentSession($result['session']),
        ], 201);
    }

    // ------------------------------------------------------------------
    // Penyelesaian sesi
    // ------------------------------------------------------------------

    /** Dipakai route /finish dan alias /stop (nama lama di frontend EVH). */
    public function finish(Request $request, ChargingSession $session): JsonResponse
    {
        $data = $request->validate([
            'energi_kwh' => ['nullable', 'numeric', 'min:0.1', 'max:'.self::MAX_TARGET_KWH],
            'soc_akhir' => ['nullable', 'integer', 'min:0', 'max:100'],
        ]);

        $settled = $this->settleSession($request, $session, $data, 'Selesai');
        if ($settled instanceof JsonResponse) {
            return $settled;
        }

        return response()->json([
            'message' => 'Sesi charging selesai. Invoice digital berhasil diterbitkan.',
            'data' => $this->presentInvoice($settled),
        ]);
    }

    /** Menghentikan sesi atas permintaan pengemudi. */
    public function stop(Request $request, ChargingSession $session): JsonResponse
    {
        return $this->finish($request, $session);
    }

    /** Menghentikan sesi oleh Operator, menyelesaikan saldo, dan merekam alasannya. */
    public function stopByOperator(Request $request, ChargingSession $session): JsonResponse
    {
        abort_unless(in_array($request->user()?->peran, ['operator', 'admin'], true), 403);

        $data = $request->validate([
            'alasan' => ['required', 'string', 'min:5', 'max:500'],
        ]);

        $settled = $this->settleSession($request, $session, [], 'Selesai', $data['alasan']);
        if ($settled instanceof JsonResponse) {
            return $settled;
        }

        return response()->json([
            'message' => 'Sesi dihentikan oleh Operator. Biaya aktual dihitung dan sisa saldo hold dikembalikan.',
            'data' => $this->presentInvoice($settled),
        ]);
    }

    /** Sesi dihentikan karena dibatalkan / gangguan (laporan driver). */
    public function interrupt(Request $request, ChargingSession $session): JsonResponse
    {
        $data = $request->validate([
            'status' => ['required', 'in:dibatalkan,gagal,Dibatalkan,Gagal'],
            'energi_kwh' => ['nullable', 'numeric', 'min:0', 'max:'.self::MAX_TARGET_KWH],
            'soc_akhir' => ['nullable', 'integer', 'min:0', 'max:100'],
            'alasan' => ['nullable', 'string', 'max:160'],
        ]);

        $finalStatus = ucfirst(strtolower($data['status']));
        $settled = $this->settleSession($request, $session, $data, $finalStatus);
        if ($settled instanceof JsonResponse) {
            return $settled;
        }

        $message = $finalStatus === 'Gagal'
            ? 'Sesi charging gagal ditangani. Biaya aktual dihitung dan sisa hold dikembalikan.'
            : 'Sesi charging dibatalkan. Biaya aktual dihitung dan sisa hold dikembalikan.';

        return response()->json([
            'message' => $message,
            'data' => $this->presentInvoice($settled),
        ]);
    }

    /** Menutup sesi, menghitung biaya aktual, melepas hold, dan mencatat pembayaran. */
    private function settleSession(Request $request, ChargingSession $session, array $data, string $finalStatus, ?string $operatorReason = null): ChargingSession|JsonResponse
    {
        return DB::transaction(function () use ($request, $session, $data, $finalStatus, $operatorReason) {
            $session = ChargingSession::with(['charger.location', 'port', 'vehicle', 'tarif'])
                ->whereKey($session->id_session)
                ->lockForUpdate()
                ->firstOrFail();

            if ($operatorReason !== null) {
                $assignment = DB::table('station_operators')
                    ->where('id_user', $request->user()->id_user)
                    ->where('id_location', $session->charger->id_location)
                    ->when($request->header('X-Station-Id'), fn ($query, $stationId) => $query->where('id_location', $stationId))
                    ->exists();
                if (! $assignment) {
                    abort(404);
                }
            } elseif ($session->id_user !== $request->user()->id_user) {
                abort(404);
            }

            if ($session->status !== 'Berlangsung') {
                return $this->fail('Sesi charging tidak sedang berjalan.', 422);
            }

            $wallet = Dompet::where('id_user', $session->id_user)->lockForUpdate()->firstOrFail();
            $port = $session->id_port ? Port::whereKey($session->id_port)->lockForUpdate()->first() : null;

            $simulation = $this->simulate($session);
            $actualKwh = isset($data['energi_kwh'])
                ? round((float) $data['energi_kwh'], 2)
                : $simulation['energi_kwh'];
            $finalSoc = $data['soc_akhir'] ?? $simulation['soc_sekarang'];

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

            if ($operatorReason !== null) {
                AuditLog::create([
                    'id_user' => $request->user()->id_user,
                    'id_location' => $session->charger->id_location,
                    'aksi' => 'hentikan_sesi_oleh_operator',
                    'entitas' => 'charging_session',
                    'id_entitas' => (string) $session->id_session,
                    'data_sebelum' => [
                        'status' => 'Berlangsung',
                        'saldo_hold' => $hold,
                    ],
                    'data_sesudah' => [
                        'status' => $finalStatus,
                        'energi_kwh' => $actualKwh,
                        'biaya_aktual' => $actualCost,
                        'saldo_dikembalikan' => $refundAmount,
                    ],
                    'alasan' => $operatorReason,
                ]);
            }

            // Laporan gangguan driver -> muncul di notifikasi operator station.
            if ($finalStatus === 'Gagal') {
                ErrorLog::create([
                    'id_charger' => $session->id_charger,
                    'id_session' => $session->id_session,
                    'id_user' => $session->id_user,
                    'jenis_error' => 'Gangguan dilaporkan driver',
                    'desk_mslh' => $data['alasan'] ?? 'Gangguan charger dilaporkan oleh driver.',
                    'waktu_terjadi' => now(),
                    'status_tanganan' => 'Menunggu',
                ]);
            }

            return $session->fresh(self::RELATIONS);
        });
    }

    // ------------------------------------------------------------------
    // Validasi & aturan bisnis
    // ------------------------------------------------------------------

    /** Mencari sesi pengguna yang statusnya masih berjalan. */
    private function activeSessionOf(User $user): ?ChargingSession
    {
        return ChargingSession::with(self::RELATIONS)
            ->where('id_user', $user->id_user)
            ->whereIn('status', ChargingSession::AKTIF)
            ->latest('waktu_mulai')
            ->first();
    }

    /** Memastikan kendaraan yang dipilih benar-benar milik pengguna. */
    private function driverVehicle(User $user, int $idVehicle): Vehicle|JsonResponse
    {
        $vehicle = $user->vehicles()->whereKey($idVehicle)->first();

        return $vehicle ?? $this->fail('Kendaraan tidak ditemukan.', 422);
    }

    /** Muat port beserta mesin & station-nya. */
    private function loadPort(int $idPort): array|JsonResponse
    {
        $port = Port::with('charger.location')->find($idPort);

        if (! $port || ! $port->charger || ! $port->charger->location) {
            return $this->fail('Port charger tidak ditemukan.', 404);
        }

        return [
            'port' => $port,
            'charger' => $port->charger,
            'location' => $port->charger->location,
        ];
    }

    /** Memilih tarif aktif di lokasi atau mengembalikan error bila belum tersedia. */
    private function activeTarif(Location $location): Tarif|JsonResponse
    {
        return $location->activeTarif()
            ?? $this->fail('Tarif aktif untuk station ini belum tersedia.', 422);
    }

    /** Port harus tersedia, mesinnya aktif, dan konektornya cocok dengan kendaraan. */
    private function ensureCanUsePort(Port $port, Vehicle $vehicle): ?JsonResponse
    {
        if ($port->charger->status_mesin !== 'Active' || ! $port->isAvailable()) {
            return $this->portTaken();
        }

        if (! $port->matchesConnector($vehicle->tipe_konektor)) {
            return $this->fail('Konektor port tidak cocok dengan kendaraan Anda.', 422, ['kode' => 'konektor_tidak_cocok']);
        }

        return null;
    }

    /**
     * Pemeriksaan bersama prepare & start: sesi aktif, kendaraan, port,
     * station beroperasi (status + jam buka), kedatangan, konektor, tarif.
     */
    /** Mengumpulkan konteks yang valid untuk memulai sesi charging. */
    private function checkStartable(User $user, array $data): array|JsonResponse
    {
        if ($this->activeSessionOf($user)) {
            return $this->fail('Anda masih memiliki sesi charging yang berlangsung.', 409);
        }

        $vehicle = $this->driverVehicle($user, (int) $data['id_vehicle']);
        if ($vehicle instanceof JsonResponse) {
            return $vehicle;
        }

        $ctx = $this->loadPort((int) $data['id_port']);
        if ($ctx instanceof JsonResponse) {
            return $ctx;
        }
        $location = $ctx['location'];

        if ($location->status_loc !== 'Aktif') {
            return $this->fail('Station sedang tidak beroperasi.', 422);
        }
        if (! $this->isOpenNow($location->jam_buka, $location->jam_tutup)) {
            return $this->fail('Station sedang tutup.', 422);
        }

        if ($arrival = $this->ensureArrived($location, (float) $data['latitude'], (float) $data['longitude'])) {
            return $arrival;
        }

        if ($error = $this->ensureCanUsePort($ctx['port'], $vehicle)) {
            return $error;
        }

        $tarif = $this->activeTarif($location);
        if ($tarif instanceof JsonResponse) {
            return $tarif;
        }

        return $ctx + ['vehicle' => $vehicle, 'tarif' => $tarif];
    }

    /** Verifikasi kedatangan di sisi server — jangan percaya klien saja. */
    private function ensureArrived(Location $location, float $driverLat, float $driverLng): ?JsonResponse
    {
        if (! config('charging.require_arrival')) {
            return null;
        }

        $distanceM = $this->distanceMeters($driverLat, $driverLng, (float) $location->latitude, (float) $location->longitude);
        $radiusM = (int) config('charging.arrival_radius_m');

        if ($distanceM > $radiusM) {
            return $this->fail(
                'Anda belum sampai di station. Mulai charging bisa dilakukan setelah Anda berada di lokasi.',
                422,
                ['jarak_m' => (int) round($distanceM), 'radius_m' => $radiusM]
            );
        }

        return null;
    }

    /** Memuat dompet pengguna untuk pemeriksaan dan penyelesaian saldo. */
    private function walletOf(User $user): Dompet
    {
        return Dompet::firstOrCreate(
            ['id_user' => $user->id_user],
            ['saldo' => 0, 'status_dompet' => 'Aktif']
        );
    }

    /** Membentuk respons saldo tidak cukup beserta rincian saldo tersedia. */
    private function insufficient(Dompet $wallet, int $total): JsonResponse
    {
        return $this->fail(
            'Saldo Dompet Digital belum mencukupi untuk estimasi transaksi. Lakukan top up atau kurangi jumlah charging.',
            422,
            ['kode' => 'saldo_tidak_cukup', 'kekurangan' => max(0, $total - $wallet->saldoTersedia())]
        );
    }

    /** Membentuk respons konflik saat port sudah dipakai sesi lain. */
    private function portTaken(): JsonResponse
    {
        return $this->fail('Port ini sedang tidak tersedia atau baru saja digunakan. Pilih port lain.', 409, ['kode' => 'port_dipakai']);
    }

    /** Menyeragamkan bentuk respons JSON untuk kegagalan proses charging. */
    private function fail(string $message, int $status, array $extra = []): JsonResponse
    {
        return response()->json(['message' => $message] + $extra, $status);
    }

    // ------------------------------------------------------------------
    // Baterai & simulasi
    // ------------------------------------------------------------------

    /** [kapasitas kWh, apakah memakai nilai default]. */
    private function batteryCapacity(Vehicle $vehicle): array
    {
        $own = (float) ($vehicle->kapasitas_baterai_kwh ?? 0);

        return $own > 0 ? [$own, false] : [(float) config('charging.default_battery_kwh', 50), true];
    }

    /** kWh maksimum yang bisa masuk agar baterai tepat 100% (dibulatkan ke bawah, kelipatan 0,5). */
    private function maxTargetKwh(float $capacity, int $soc): float
    {
        return floor($capacity * (100 - $soc) / 100 * 2) / 2;
    }

    /** Persen baterai setelah menambah $kwh (maks. 100). */
    private function socAfter(float $capacity, int $soc, float $kwh): int
    {
        return (int) min(100, round($soc + $kwh / max(0.1, $capacity) * 100));
    }

    /** Tolak target yang melebihi ruang kosong di baterai. */
    private function exceedsBattery(float $kwh, float $capacity, int $soc): ?JsonResponse
    {
        $max = $this->maxTargetKwh($capacity, $soc);

        if ($kwh <= $max) {
            return null;
        }

        return $this->fail(
            "Jumlah energi melebihi kapasitas baterai. Maksimal {$max} kWh agar baterai tidak lebih dari 100%.",
            422,
            ['kode' => 'melebihi_baterai', 'max_target_kwh' => $max]
        );
    }

    /** Daya port (kW) untuk sesi; cadangan: kapasitas mesin, lalu 1 kW. */
    private function powerOf(ChargingSession $session): float
    {
        return (float) ($session->port?->daya_maks_kw ?? $session->charger?->kap_tot_kw ?? 1);
    }

    /**
     * SIMULASI pengisian: energi bertambah linear seiring waktu sesi berjalan
     * (daya port x waktu x kecepatan simulasi) dan berhenti di target kWh.
     * Tidak disimpan ke DB; dihitung ulang tiap request, jadi tetap konsisten
     * setelah refresh. Ganti dengan data asli Perangkat Charger kalau sudah ada.
     */
    /** Menghasilkan telemetri simulasi selama perangkat charger belum terintegrasi. */
    private function simulate(ChargingSession $session): array
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
            // Durasi berhenti bertambah begitu target tercapai.
            'durasi_detik' => $isFull ? (int) ceil($target / $power * 3600) : (int) $simSeconds,
            'sudah_penuh' => $isFull,
            'kecepatan' => $speed,
        ];
    }

    // ------------------------------------------------------------------
    // Presenter
    // ------------------------------------------------------------------

    /** Menyusun hasil validasi dan estimasi agar dapat ditampilkan frontend. */
    private function presentValidation(array $ctx, Vehicle $vehicle, Tarif $tarif, float $targetKwh): array
    {
        $location = $ctx['location'];
        $port = $ctx['port'];

        return [
            'station' => [
                'id_location' => $location->id_location,
                'nama_lokasi' => $location->nama_lokasi,
                'alamat' => $location->alamat,
            ],
            'port' => $this->presentPort($port),
            'vehicle' => [
                'id_vehicle' => $vehicle->id_vehicle,
                'nama' => "{$vehicle->merek} {$vehicle->model}",
                'nomor_polisi' => $vehicle->nomor_polisi,
                'tipe_konektor' => Port::CONNECTOR_LABELS[$vehicle->tipe_konektor] ?? $vehicle->tipe_konektor,
            ],
            'estimasi' => [
                'target_kwh' => $targetKwh,
                'tarif_per_kwh' => $tarif->harga_per_kwh,
                'biaya_parkir_flat' => $tarif->biaya_parkir_flat,
                'total' => $tarif->costFor($targetKwh, (float) $port->daya_maks_kw)['total'],
            ],
        ];
    }

    /** Menyajikan identitas, tipe konektor, daya, dan status port. */
    private function presentPort(Port $port): array
    {
        return [
            'id_port' => $port->id_port,
            'nomor_port' => $port->nomor_port,
            'id_charger' => $port->id_charger,
            'kode_perangkat' => $port->charger?->kode_perangkat,
            'tipe_konektor' => $port->connectorLabel(),
            'daya_kw' => $port->daya_maks_kw,
            'tipe_charging' => $port->tipe_charging,
            'status_port' => $port->status_port,
        ];
    }

    /** Menyajikan status sesi dan progres yang diperlukan dashboard driver. */
    private function presentSession(ChargingSession $session): array
    {
        $sim = $this->simulate($session);
        $power = $this->powerOf($session);
        $hold = (int) $session->saldo_hold;
        $runningCost = $sim['energi_kwh'] > 0
            ? min($hold, $session->tarif->costFor($sim['energi_kwh'], $power)['total'])
            : 0;

        return [
            'id_session' => $session->id_session,
            'id_location' => $session->charger->location->id_location,
            'nama_lokasi' => $session->charger->location->nama_lokasi,
            'id_charger' => $session->id_charger,
            'kode_charger' => $session->charger->kode_perangkat,
            'id_port' => $session->id_port,
            'nomor_port' => $session->port?->nomor_port,
            'daya_kw' => $power,
            'status' => 'Charging',
            'sudah_penuh' => $sim['sudah_penuh'],
            'energi_kwh' => $sim['energi_kwh'],
            'target_energi_kwh' => (float) $session->target_energi_kwh,
            'soc_awal' => $session->soc_awal,
            'soc_sekarang' => $sim['soc_sekarang'],
            'durasi_detik' => $sim['durasi_detik'],
            'tarif_per_kwh' => $session->tarif->harga_per_kwh,
            'biaya_parkir_flat' => $session->tarif->biaya_parkir_flat,
            'estimasi_biaya' => $session->estimasiBiaya(),
            'estimasi_biaya_charging' => (int) $session->estimasi_biaya_charging,
            'estimasi_biaya_parkir' => (int) $session->estimasi_biaya_parkir,
            'biaya_berjalan' => $runningCost,
            'saldo_hold' => $hold,
            'waktu_mulai' => $session->waktu_mulai?->getTimestampMs(),
            'id_payment' => $session->payment?->id_payment,
            'status_pembayaran' => $session->payment?->status_pembayaran,
        ];
    }

    /** Biaya yang benar-benar ditagih: dari payment bila sudah settle, selain itu nilai hold. */
    private function sessionTotal(ChargingSession $session): int
    {
        $payment = $session->payment;

        if ($payment && $payment->status_pembayaran !== 'Pending') {
            return (int) $payment->total_bayar;
        }

        return (int) $session->saldo_hold;
    }

    /** Membentuk rincian biaya dan identitas untuk invoice digital. */
    private function presentInvoice(ChargingSession $session): array
    {
        $actualKwh = (float) $session->total_energi_kwh;
        $actualCost = $this->sessionTotal($session);
        $cost = $session->tarif->costFor($actualKwh, $this->powerOf($session));
        $hold = (int) $session->saldo_hold;

        return [
            'id_session' => $session->id_session,
            'nama_lokasi' => $session->charger->location->nama_lokasi,
            'alamat' => $session->charger->location->alamat,
            'kode_charger' => $session->charger->kode_perangkat,
            'nomor_port' => $session->port?->nomor_port,
            'kendaraan' => [
                'nama' => "{$session->vehicle->merek} {$session->vehicle->model}",
                'nomor_polisi' => $session->vehicle->nomor_polisi,
                'tipe_konektor' => Port::CONNECTOR_LABELS[$session->vehicle->tipe_konektor] ?? $session->vehicle->tipe_konektor,
            ],
            'energi_kwh' => $actualKwh,
            'tarif_per_kwh' => $session->tarif->harga_per_kwh,
            'biaya_charging' => $actualKwh > 0 ? $cost['biaya_charging'] : 0,
            'biaya_parkir' => $actualKwh > 0 ? $cost['biaya_parkir'] : 0,
            'biaya_aktual' => $actualCost,
            'saldo_hold' => $hold,
            'jumlah_hold' => $hold,
            'selisih_dikembalikan' => max(0, $hold - $actualCost),
            'id_payment' => $session->payment?->id_payment,
            'metode_pembayaran' => $session->payment?->method?->nama_metode,
            'status_pembayaran' => $session->payment?->status_pembayaran,
            'referensi_gateway' => $session->payment?->referensi_gateway,
            'status' => $this->sessionStatusLabel($session->status),
            'waktu_mulai' => $session->waktu_mulai?->toISOString(),
            'waktu_selesai' => $session->waktu_selesai?->toISOString(),
        ];
    }

    /** Membuat ringkasan pembayaran untuk daftar transaksi pengemudi. */
    private function presentTransactionSummary(ChargingSession $session): array
    {
        return [
            'id_session' => $session->id_session,
            'nama_lokasi' => $session->charger->location->nama_lokasi,
            'kode_charger' => $session->charger->kode_perangkat,
            'nomor_port' => $session->port?->nomor_port,
            'tanggal' => $session->waktu_mulai?->timezone('Asia/Jakarta')->translatedFormat('d M Y, H:i'),
            'energi_kwh' => (float) $session->total_energi_kwh,
            'total' => $this->sessionTotal($session),
            'status' => $this->sessionStatusLabel($session->status),
            'id_payment' => $session->payment?->id_payment,
            'status_pembayaran' => $session->payment?->status_pembayaran,
        ];
    }

    /** Memetakan kode status sesi menjadi teks yang mudah dipahami. */
    private function sessionStatusLabel(string $status): string
    {
        return match (strtolower($status)) {
            'pending' => 'Estimasi',
            'berlangsung' => 'Berjalan',
            'selesai' => 'Selesai',
            'dibatalkan' => 'Dibatalkan',
            'gagal' => 'Gagal',
            default => ucfirst($status),
        };
    }

    /** Mengambil atau membuat record metode pembayaran internal. */
    private function paymentMethod(string $name): MetodePembayaran
    {
        return MetodePembayaran::firstOrCreate(
            ['nama_metode' => $name],
            ['biaya_layanan' => 0, 'status_metode' => 'Aktif']
        );
    }

    /** Membuat kode referensi transaksi yang dapat ditampilkan pada bukti bayar. */
    private function paymentReference(string $prefix, int $id): string
    {
        return $prefix.'-'.now()->format('YmdHis').'-'.$id;
    }

    // ------------------------------------------------------------------
    // Util lokasi & jam operasional
    // ------------------------------------------------------------------

    /** Jarak garis lurus (haversine) dalam meter. */
    private function distanceMeters(float $fromLat, float $fromLng, float $toLat, float $toLng): float
    {
        $earthRadiusM = 6371000;
        $latDelta = deg2rad($toLat - $fromLat);
        $lngDelta = deg2rad($toLng - $fromLng);

        $a = sin($latDelta / 2) ** 2
            + cos(deg2rad($fromLat)) * cos(deg2rad($toLat)) * sin($lngDelta / 2) ** 2;

        return $earthRadiusM * 2 * asin(min(1, sqrt($a)));
    }

    /** 00:00–23:59 = 24 jam; jam tutup <= jam buka berarti lewat tengah malam. */
    private function isOpenNow(?string $openTime, ?string $closeTime): bool
    {
        if (! $openTime || ! $closeTime) {
            return true;
        }

        $openTime = substr($openTime, 0, 5);
        $closeTime = substr($closeTime, 0, 5);

        if ($openTime === '00:00' && in_array($closeTime, ['23:59', '00:00'], true)) {
            return true;
        }

        $now = now()->format('H:i');

        return $closeTime > $openTime
            ? ($now >= $openTime && $now < $closeTime)
            : ($now >= $openTime || $now < $closeTime);
    }
}
