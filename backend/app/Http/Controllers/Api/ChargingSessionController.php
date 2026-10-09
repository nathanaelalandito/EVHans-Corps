<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Concerns\ChecksWalletPin;
use App\Http\Controllers\Controller;
use App\Models\Charger;
use App\Models\ChargingSession;
use App\Models\Dompet;
use App\Models\User;
use App\Models\Vehicle;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

/**
 * Alur memulai sesi charging (mengikuti dokumen "Alur Proses Utama" bagian C–E):
 *   prepare  -> validasi charger + kedatangan, deteksi baterai awal (diacak sementara)
 *   estimate -> hitung estimasi biaya dari jumlah kWh yang dipilih driver
 *   start    -> cek saldo, verifikasi PIN, hold saldo, lalu mulai sesi
 */
class ChargingSessionController extends Controller
{
    use ChecksWalletPin;

    /** Jumlah energi terkecil yang bisa dipilih dalam satu sesi (kWh). */
    private const MIN_TARGET_KWH = 0.5;

    /** Sesi charging milik user yang masih berjalan (null jika tidak ada). */
    public function active(Request $request): JsonResponse
    {
        $session = $this->activeSessionOf($request->user()->id_user);

        return response()->json([
            'data' => $session ? $this->present($session) : null,
        ]);
    }

    /**
     * Langkah setelah kabel dicolokkan: validasi port & kedatangan, lalu
     * kembalikan persen baterai awal. Belum membuat sesi / mengunci port.
     */
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
        // Sementara: persen baterai awal diacak (belum ada data asli dari mobil/charger).
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
                'max_target_kwh' => $maxKwh, // jumlah kWh agar baterai mencapai 100%
                'id_charger' => $charger->id_charger,
                'kode_charger' => $charger->kode_perangkat,
                'tipe_konektor' => $charger->tipe_konektor,
                'daya_kw' => $charger->daya_kwh, // kolom DB `daya_kwh` berisi daya (kW)
                'nama_lokasi' => $ctx['location']->nama_lokasi,
            ],
        ]);
    }

    /** Hitung estimasi biaya untuk jumlah kWh yang dipilih + cek saldo dompet. */
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

    /**
     * Mulai sesi charging: cek saldo -> verifikasi PIN -> hold saldo ->
     * klaim port -> buat sesi. Kedatangan diverifikasi ulang di server.
     */
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

        // Jumlah energi tidak boleh membuat baterai melewati 100%.
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

        // Otorisasi (dokumen no. 37): PIN dompet.
        if ($pinError = $this->checkWalletPin($wallet, $data['pin'])) {
            return $pinError;
        }

        $result = DB::transaction(function () use ($wallet, $total, $charger, $user, $ctx, $tarif, $estimate, $data) {
            // Kunci baris dompet & cek ulang saldo (mencegah dua sesi menahan dana yang sama).
            $w = Dompet::where('id_wallet', $wallet->id_wallet)->lockForUpdate()->first();
            if (! $w || $w->saldoTersedia() < $total) {
                return ['response' => $this->insufficient($w ?? $wallet, $total)];
            }

            // Klaim port secara atomik: hanya berhasil kalau masih 'tersedia',
            // jadi dua driver tidak bisa mengambil port yang sama.
            $claimed = Charger::where('id_charger', $charger->id_charger)
                ->where('status', 'tersedia')
                ->update(['status' => 'sedang digunakan']);
            if ($claimed === 0) {
                return ['response' => $this->portTaken()];
            }

            // Hold saldo senilai total estimasi (dokumen no. 34).
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
                'saldo_hold' => $total,
            ]);

            return ['session' => $session];
        });

        if (isset($result['response'])) {
            return $result['response'];
        }

        return response()->json([
            'message' => 'Sesi charging dimulai.',
            'data' => $this->present($result['session']->load(['charger.location', 'tarif', 'vehicle'])),
        ], 201);
    }

    /**
     * Akhiri sesi: tutup sesi, bebaskan port, dan lepas dana yang di-hold.
     * TODO: energi aktual (total_energi_kwh, soc_akhir) belum ada — menunggu data
     * Perangkat Charger. Penyelesaian transaksi (biaya aktual, struk, tabel
     * payment) belum dibuat, jadi untuk sementara seluruh hold dilepas penuh.
     */
    /**
 * Akhiri sesi: hitung biaya aktual, lepas hold, potong saldo sebesar biaya
 * aktual, catat payment, tutup sesi, dan bebaskan port.
 */
   public function stop(Request $request, string $id): JsonResponse
{
    $idUser = $request->user()->id_user;

    $result = DB::transaction(function () use ($id, $idUser) {
        // Kunci sesi supaya klik ganda tidak memotong saldo dua kali.
        $session = ChargingSession::with(['charger', 'tarif', 'vehicle'])
            ->where('id_user', $idUser)
            ->where('id_session', $id)
            ->lockForUpdate()
            ->first();

        if (! $session || ! in_array($session->status, ChargingSession::AKTIF, true)) {
            return null;
        }

        $sim = $this->simulate($session);
        $tarif = $session->tarif;

        // Rumus sama dengan calculateEstimate(), tapi memakai energi & durasi aktual.
        $kwh = (float) $sim['energi_kwh'];
        $biayaCharging = max((int) round($kwh * (int) $tarif->harga_per_kwh), (int) $tarif->biaya_minimum);
        $jamParkir = max(1, (int) ceil($sim['durasi_detik'] / 3600));
        $biayaParkir = $jamParkir * (int) $tarif->biaya_parkir_pjam;

        $total = $biayaCharging + $biayaParkir;
        // Tidak boleh melebihi dana yang di-hold (kalau ada hold).
        if ((int) $session->saldo_hold > 0) {
            $total = min($total, (int) $session->saldo_hold);
        }

        $w = Dompet::where('id_user', $idUser)->lockForUpdate()->first();
        $total = min($total, (int) ($w->saldo ?? 0)); // jaga-jaga agar saldo tidak minus

        $session->update([
            'status' => 'selesai',
            'waktu_selesai' => now(),
            'total_energi_kwh' => $kwh,
            'soc_akhir' => $sim['soc_sekarang'],
        ]);

        Charger::where('id_charger', $session->id_charger)
            ->where('status', 'sedang digunakan')
            ->update(['status' => 'tersedia']);

        if ($w) {
            // Lepas hold, lalu potong biaya aktual dari saldo.
            $w->saldo_hold = max(0, (int) $w->saldo_hold - (int) $session->saldo_hold);
            $w->saldo = (int) $w->saldo - $total;
            $w->save();
        }

        if ($total > 0) {
            // Ambil id metode "Saldo Dompet"; kalau belum ada di tabel, dibuat otomatis.
            $idMetode = DB::table('metode_pembayaran')
                ->where('nama_metode', 'Saldo Dompet')
                ->value('id_metode');

            if (! $idMetode) {
                $idMetode = DB::table('metode_pembayaran')->insertGetId([
                    'nama_metode' => 'Saldo Dompet',
                    'biaya_layanan' => 0,
                    'status_metode' => 'aktif',
                    'created_at' => now(),
                    'updated_at' => now(),
                ]);
            }

            DB::table('payment')->insert([
                'id_session' => $session->id_session,
                'id_metode' => $idMetode,
                'total_bayar' => $total,
                'status_pembayaran' => 'sukses',
                'waktu_pembayaran' => now(),
                'created_at' => now(),
                'updated_at' => now(),
            ]);
        }

        return [
            'session' => $session,
            'biaya_charging' => $biayaCharging,
            'biaya_parkir' => $biayaParkir,
            'total' => $total,
            'saldo' => (int) ($w->saldo ?? 0),
        ];
    });

    if ($result === null) {
        return $this->fail('Sesi charging yang berlangsung tidak ditemukan.', 404);
    }

    return response()->json([
        'message' => 'Sesi charging selesai dan pembayaran berhasil.',
        'data' => $this->present($result['session']->fresh(['charger.location', 'tarif', 'vehicle'])) + [
            'biaya_charging_aktual' => $result['biaya_charging'],
            'biaya_parkir_aktual' => $result['biaya_parkir'],
            'total_bayar' => $result['total'],
            'saldo' => $result['saldo'],
        ],
    ]);
}

    // ------------------------------------------------------------------
    // Helper
    // ------------------------------------------------------------------

    /**
     * Semua syarat agar sebuah sesi boleh dimulai di port ini.
     * Mengembalikan array konteks, atau JsonResponse (error) kalau tidak lolos.
     */
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
        if (! $this->isOpenNow($location->jam_buka, $location->jam_tutup)) {
            return $this->fail('Station sedang tutup.', 422);
        }

        // Verifikasi kedatangan di sisi server — jangan percaya klien saja.
        $jarakM = $this->distanceMeters(
            (float) $data['latitude'], (float) $data['longitude'],
            (float) $location->latitude, (float) $location->longitude
        );
        $radius = config('charging.arrival_radius_m');
        if (config('charging.require_arrival') && $jarakM > $radius) {
            return response()->json([
                'message' => 'Anda belum sampai di station. Mulai charging bisa dilakukan setelah Anda berada di lokasi.',
                'jarak_m' => (int) round($jarakM),
                'radius_m' => $radius,
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

        return [
            'vehicle' => $vehicle,
            'charger' => $charger,
            'location' => $location,
            'tarif' => $tarif,
        ];
    }

    /**
     * Estimasi biaya (dokumen no. 24–26):
     *  - biaya charging = kWh × tarif/kWh, minimal biaya minimum
     *  - biaya parkir   = tarif parkir × jam berjalan (dibulatkan ke atas, min. 1 jam)
     *  - durasi         = kWh ÷ daya port (kW); durasi nyata tergantung mobil
     */
    private function calculateEstimate(Charger $charger, $tarif, float $kwh): array
    {
        $kwh = round($kwh, 2);
        $daya = max(1, (int) $charger->daya_kwh);
        $durasiMenit = (int) ceil($kwh / $daya * 60);

        $hargaPerKwh = (int) $tarif->harga_per_kwh;
        $biayaMinimum = (int) $tarif->biaya_minimum;
        $biayaCharging = max((int) round($kwh * $hargaPerKwh), $biayaMinimum);

        $jamParkir = max(1, (int) ceil($durasiMenit / 60));
        $parkirPerJam = (int) $tarif->biaya_parkir_pjam;
        $biayaParkir = $jamParkir * $parkirPerJam;

        return [
            'target_kwh' => $kwh,
            'daya_kw' => $daya,
            'durasi_menit' => $durasiMenit,
            'harga_per_kwh' => $hargaPerKwh,
            'biaya_minimum' => $biayaMinimum,
            'biaya_charging' => $biayaCharging,
            'jam_parkir' => $jamParkir,
            'biaya_parkir_per_jam' => $parkirPerJam,
            'biaya_parkir' => $biayaParkir,
            'total' => $biayaCharging + $biayaParkir,
        ];
    }

    /** [kapasitas kWh, apakah memakai nilai default]. */
    private function batteryCapacity(Vehicle $vehicle): array
    {
        $own = (float) ($vehicle->kapasitas_baterai_kwh ?? 0);

        return $own > 0
            ? [$own, false]
            : [(float) config('charging.default_battery_kwh'), true];
    }

    /** kWh maksimum yang bisa masuk agar baterai tepat 100% (dibulatkan ke bawah, kelipatan 0,5). */
    private function maxTargetKwh(float $kapasitas, int $soc): float
    {
        return floor($kapasitas * (100 - $soc) / 100 * 2) / 2;
    }

    /** Persen baterai setelah menambah $kwh (maks. 100). */
    private function socAfter(float $kapasitas, int $soc, float $kwh): int
    {
        return (int) min(100, round($soc + $kwh / max(0.1, $kapasitas) * 100));
    }

    /** Error 422 kalau target melebihi ruang kosong di baterai; null kalau aman. */
    private function exceedsBattery(float $kwh, float $kapasitas, int $soc): ?JsonResponse
    {
        $max = $this->maxTargetKwh($kapasitas, $soc);
        if ($kwh <= $max) {
            return null;
        }

        return response()->json([
            'message' => "Jumlah energi melebihi kapasitas baterai. Maksimal {$max} kWh agar baterai tidak lebih dari 100%.",
            'kode' => 'melebihi_baterai',
            'max_target_kwh' => $max,
        ], 422);
    }

    private function walletOf(User $user): Dompet
    {
        return Dompet::firstOrCreate(
            ['id_user' => $user->id_user],
            ['saldo' => 0, 'status_dompet' => 'aktif']
        );
    }

    private function walletSummary(Dompet $wallet, int $total): array
    {
        $tersedia = $wallet->saldoTersedia();

        return [
            'saldo_tersedia' => $tersedia,
            'saldo_cukup' => $tersedia >= $total,
            'kekurangan' => max(0, $total - $tersedia),
        ];
    }

    private function insufficient(Dompet $wallet, int $total): JsonResponse
    {
        $summary = $this->walletSummary($wallet, $total);

        return response()->json([
            'message' => 'Saldo dompet tidak cukup untuk estimasi biaya ini. Lakukan Top Up atau kurangi jumlah charging.',
            'kode' => 'saldo_tidak_cukup',
            'kekurangan' => $summary['kekurangan'],
        ], 422);
    }

    private function portTaken(): JsonResponse
    {
        return response()->json([
            'message' => 'Port ini sedang tidak tersedia atau baru saja digunakan. Pilih port lain.',
            'kode' => 'port_dipakai',
        ], 409);
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
        $hasEstimate = $s->estimasi_biaya_charging !== null;
        $sim = $this->simulate($s);

        return [
            'id_session' => $s->id_session,
            'id_location' => $location?->id_location,
            'nama_lokasi' => $location?->nama_lokasi,
            'id_charger' => $s->id_charger,
            'kode_charger' => $charger?->kode_perangkat,
            'tipe_konektor' => $charger?->tipe_konektor,
            'daya_kw' => $charger?->daya_kwh, // kolom DB `daya_kwh` berisi daya (kW)
            'id_vehicle' => $s->id_vehicle,
            'status' => $s->status,
            'energi_kwh' => $sim['energi_kwh'],
            'soc_sekarang' => $sim['soc_sekarang'],
            'durasi_detik' => $sim['durasi_detik'],
            'sudah_penuh' => $sim['selesai'],
            'kecepatan_simulasi' => $sim['kecepatan'],
            'target_energi_kwh' => $s->target_energi_kwh !== null ? (float) $s->target_energi_kwh : null,
            'estimasi_biaya' => $hasEstimate
                ? (int) $s->estimasi_biaya_charging + (int) $s->estimasi_biaya_parkir
                : null,
            'saldo_hold' => (int) $s->saldo_hold,
            'soc_awal' => $s->soc_awal,
            'waktu_mulai' => $s->waktu_mulai?->toIso8601String(),
            'waktu_selesai' => $s->waktu_selesai?->toIso8601String(),
            'tarif_per_kwh' => $s->tarif?->harga_per_kwh,
            'biaya_parkir_per_jam' => $s->tarif?->biaya_parkir_pjam,
        ];
    }

    /**
     * SIMULASI pengisian: energi bertambah linear seiring waktu sesi berjalan
     * (daya port x waktu x kecepatan simulasi) dan berhenti di target kWh
     * (= 100% kalau driver memilih jumlah maksimal). Tidak disimpan ke DB;
     * dihitung ulang tiap request, jadi tetap konsisten setelah refresh.
     * Ganti dengan data asli Perangkat Charger kalau sudah tersedia.
     */
    private function simulate(ChargingSession $s): array
    {
        $target = (float) ($s->target_energi_kwh ?? 0);
        $daya = max(1, (int) ($s->charger?->daya_kwh ?? 1));
        $speed = max(0.1, (float) config('charging.simulation_speed'));

        // Sesi yang sudah ditutup memakai angka yang tersimpan.
        if ($s->status === 'selesai') {
            return [
                'energi_kwh' => round((float) $s->total_energi_kwh, 2),
                'soc_sekarang' => (int) ($s->soc_akhir ?? $s->soc_awal),
                'durasi_detik' => $s->waktu_selesai && $s->waktu_mulai
                    ? (int) $s->waktu_mulai->diffInSeconds($s->waktu_selesai, true) : 0,
                'selesai' => true,
                'kecepatan' => $speed,
            ];
        }

        $realSec = max(0, $s->waktu_mulai ? $s->waktu_mulai->diffInSeconds(now(), true) : 0);
        $simSec = $realSec * $speed;
        $energi = min($target, $daya * $simSec / 3600);
        $selesai = $target > 0 && $energi >= $target;

        $kapasitas = $s->vehicle ? $this->batteryCapacity($s->vehicle)[0] : (float) config('charging.default_battery_kwh');
        $soc = $this->socAfter($kapasitas, (int) $s->soc_awal, $energi);

        // Durasi berhenti bertambah begitu target tercapai.
        $durasi = $selesai ? (int) ceil($target / $daya * 3600) : (int) $simSec;

        return [
            'energi_kwh' => round($energi, 2),
            'soc_sekarang' => $soc,
            'durasi_detik' => $durasi,
            'selesai' => $selesai,
            'kecepatan' => $speed,
        ];
    }

    private function fail(string $message, int $status): JsonResponse
    {
        return response()->json(['message' => $message], $status);
    }

    /** Jarak garis lurus (haversine) dalam meter. */
    private function distanceMeters(float $lat1, float $lng1, float $lat2, float $lng2): float
    {
        $rad = fn (float $d) => deg2rad($d);
        $dLat = $rad($lat2 - $lat1);
        $dLng = $rad($lng2 - $lng1);
        $h = sin($dLat / 2) ** 2 + cos($rad($lat1)) * cos($rad($lat2)) * sin($dLng / 2) ** 2;

        return 2 * 6371000 * asin(min(1, sqrt($h)));
    }

    /** Sama dengan aturan di frontend: 00:00–23:59 = 24 jam; tutup <= buka = lewat tengah malam. */
    private function isOpenNow(?string $buka, ?string $tutup): bool
    {
        if (! $buka || ! $tutup) {
            return true;
        }
        $buka = substr($buka, 0, 5);
        $tutup = substr($tutup, 0, 5);
        if ($buka === '00:00' && in_array($tutup, ['23:59', '00:00'], true)) {
            return true;
        }

        $cur = now()->format('H:i');

        return $tutup > $buka
            ? ($cur >= $buka && $cur < $tutup)
            : ($cur >= $buka || $cur < $tutup);
    }
}
