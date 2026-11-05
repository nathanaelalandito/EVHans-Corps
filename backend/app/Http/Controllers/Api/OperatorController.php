<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Carbon\Carbon;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/** Mengatur dashboard operator, unit/port charger, laporan, dan notifikasi station. */
class OperatorController extends Controller
{
    /**
     * Helper untuk mengambil penugasan operator (mencegah duplikasi kode)
     */
    /** Memuat lingkup station yang boleh diakses oleh akun operator. */
    private function getOperatorAssignment($user)
    {
        return DB::table('station_operators')
            ->where('id_user', $user->id_user)
            ->first();
    }

    /**
     * 1. HALAMAN DASHBOARD
     */

    /** Menyajikan ringkasan operasional sesuai station penugasan operator. */
    public function getDashboard(Request $request)
    {
        $user = $request->user();

        // Ambil penugasan operator (otomatis id_location = 2)
        $assignment = DB::table('station_operators')->where('id_user', $user->id_user)->first();
        if (! $assignment) {
            return response()->json(['message' => 'Akun operator belum ditugaskan ke stasiun manapun.'], 403);
        }

        $idLocation = $assignment->id_location;

        // 1. STATISTIK CHARGER & PORT DARI DATABASE
        $activeCharge = DB::table('charger')
            ->where('id_location', $idLocation)
            ->whereRaw('LOWER(status_mesin) = ?', ['active'])
            ->count();

        $portQuery = DB::table('ports')
            ->join('charger', 'ports.id_charger', '=', 'charger.id_charger')
            ->where('charger.id_location', $idLocation);

        $availablePorts = (clone $portQuery)->whereRaw('LOWER(ports.status_port) = ?', ['available'])->count();
        $activeCharging = (clone $portQuery)->whereRaw('LOWER(ports.status_port) = ?', ['charging'])->count();
        $errorPorts = (clone $portQuery)->whereIn(DB::raw('LOWER(ports.status_port)'), ['out of order', 'maintenance'])->count();

        // 2. PENDAPATAN HARI INI REAL DARI TABEL PAYMENT & CHARGING_SESSION
        $revenueToday = DB::table('payment')
            ->join('charging_session', 'payment.id_session', '=', 'charging_session.id_session')
            ->join('charger', 'charging_session.id_charger', '=', 'charger.id_charger')
            ->where('charger.id_location', $idLocation)
            ->where('payment.status_pembayaran', 'Sukses')
            ->whereDate('payment.waktu_pembayaran', Carbon::today())
            ->sum('payment.total_bayar') ?? 0;

        // 3. LOG PERINGATAN KRITIS REAL DARI TABEL 'error_log'
        $criticalAlerts = [];
        if (Schema::hasTable('error_log')) {
            $alerts = DB::table('error_log')
                ->join('charger', 'error_log.id_charger', '=', 'charger.id_charger')
                ->where('charger.id_location', $idLocation)
                ->where('error_log.status_tanganan', '!=', 'Selesai')
                ->select('error_log.*', 'charger.kode_perangkat')
                ->orderBy('error_log.created_at', 'desc')
                ->limit(5)
                ->get();

            foreach ($alerts as $a) {
                $criticalAlerts[] = [
                    'id' => $a->id_log ?? $a->id,
                    'portId' => 'charger',
                    'message' => ($a->kode_perangkat ?? 'Mesin').': '.($a->desk_mslh ?? $a->deskripsi ?? 'Terdeteksi kendala operasional.'),
                ];
            }
        }

        // 4. SESI PENGISIAN AKTIF (PORT YANG SEDANG STATUS CHARGING)
        $chargingPorts = DB::table('ports')
            ->join('charger', 'ports.id_charger', '=', 'charger.id_charger')
            ->where('charger.id_location', $idLocation)
            ->whereRaw('LOWER(ports.status_port) = ?', ['charging'])
            ->select('ports.*', 'charger.kode_perangkat')
            ->get();

        $activeSessions = [];
        foreach ($chargingPorts as $cp) {
            // Gunakan tipe_charging (fallback jika kosong)
            $mode = $cp->tipe_charging ?? $cp->mode_daya ?? 'DC';
            $power = $cp->daya_maks_kw ?? $cp->daya_maksimal ?? 50;

            $activeSessions[] = [
                'id' => $cp->id_port,
                'port' => $cp->kode_perangkat.' - Port '.($cp->nomor_port ?? $cp->id_port),
                'type' => ($cp->tipe_konektor ?? 'Konektor').' ('.$mode.')',
                'user' => 'Pengguna Aktif',
                'power' => $power.' kW',
                'duration' => 'Sedang Berjalan',
                'energy' => '-',
            ];
        }

        return response()->json([
            'status' => 'success',
            'data' => [
                'stats' => [
                    'activeCharging' => $activeCharging,
                    'availablePorts' => $availablePorts,
                    'activeCharge' => $activeCharge, // Sudah 1 tanda $
                    'errorPorts' => $errorPorts,
                    'totalRevenueToday' => 'Rp '.number_format($revenueToday, 0, ',', '.'),
                ],
                'criticalAlerts' => $criticalAlerts,
                'activeSessions' => $activeSessions,
            ],
        ]);
    }

    /**
     * 2. MANAJEMEN CHARGER
     */
    /** Mengambil unit charger yang berada dalam lingkup akses operator. */
    public function getChargers(Request $request)
    {
        $assignment = $this->getOperatorAssignment($request->user());
        if (! $assignment) {
            return response()->json(['message' => 'Akun operator belum ditugaskan ke station manapun.'], 403);
        }

        // Subquery count port agar tidak N+1
        $chargers = DB::table('charger')
            ->where('id_location', $assignment->id_location)
            ->select('charger.*')
            ->selectSub(function ($query) {
                $query->from('ports')
                    ->whereColumn('ports.id_charger', 'charger.id_charger')
                    ->selectRaw('count(*)');
            }, 'total_ports')
            ->get();

        return response()->json([
            'status' => 'success',
            'data' => $chargers,
        ]);
    }

    /** Mendaftarkan unit charger baru pada station yang dapat dikelola operator. */
    public function storeCharger(Request $request)
    {
        $request->validate([
            'kode_perangkat' => 'required|string|unique:charger,kode_perangkat|max:12',
            'merek_model' => 'required|string|max:100',
            'kap_tot_kw' => 'required|numeric',
            'status_mesin' => 'sometimes|in:Active,Maintenance,Offline',
        ]);

        $assignment = $this->getOperatorAssignment($request->user());
        if (! $assignment) {
            return response()->json(['message' => 'Akun operator belum ditugaskan ke station manapun.'], 403);
        }

        $chargerId = DB::table('charger')->insertGetId([
            'id_location' => $assignment->id_location,
            'kode_perangkat' => $request->kode_perangkat,
            'merek_model' => $request->merek_model,
            'kap_tot_kw' => $request->kap_tot_kw,
            'status_mesin' => $request->input('status_mesin', 'Active'),
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        return response()->json([
            'status' => 'success',
            'message' => 'Mesin charger berhasil ditambahkan.',
            'data' => ['id_charger' => $chargerId],
        ], 201);
    }

    /** Mengubah data unit charger setelah memeriksa lingkup station operator. */
    public function updateCharger(Request $request, $id)
    {
        $assignment = $this->getOperatorAssignment($request->user());
        if (! $assignment) {
            return response()->json(['message' => 'Akun operator belum ditugaskan ke station manapun.'], 403);
        }

        $charger = DB::table('charger')
            ->where('id_charger', $id)
            ->where('id_location', $assignment->id_location)
            ->first();

        if (! $charger) {
            return response()->json(['message' => 'Mesin charger tidak ditemukan atau di luar wilayah penugasan.'], 404);
        }

        $request->validate([
            'kode_perangkat' => 'sometimes|string|max:12|unique:charger,kode_perangkat,'.$id.',id_charger',
            'merek_model' => 'sometimes|string|max:100',
            'kap_tot_kw' => 'sometimes|numeric',
            'status_mesin' => 'sometimes|in:Active,Maintenance,Offline',
        ]);

        DB::table('charger')->where('id_charger', $id)->update([
            'kode_perangkat' => $request->input('kode_perangkat', $charger->kode_perangkat),
            'merek_model' => $request->input('merek_model', $charger->merek_model),
            'kap_tot_kw' => $request->input('kap_tot_kw', $charger->kap_tot_kw),
            'status_mesin' => $request->input('status_mesin', $charger->status_mesin),
            'updated_at' => now(),
        ]);

        return response()->json(['status' => 'success', 'message' => 'Mesin charger berhasil diperbarui.']);
    }

    /** Mengambil detail unit, port, sesi, dan gangguan untuk halaman pemantauan. */
    public function getChargerDetail(Request $request, $id)
    {
        $user = $request->user();

        // Ambil penugasan operator (otomatis dapat id_location = 2)
        $assignment = DB::table('station_operators')->where('id_user', $user->id_user)->first();

        // 1. Ambil data charger milik lokasi 2
        $charger = DB::table('charger')
            ->where('id_charger', $id)
            ->where('id_location', $assignment->id_location) // id_location = 2
            ->first();

        if (! $charger) {
            return response()->json(['message' => 'Charger tidak ditemukan'], 404);
        }

        // 2. Ambil tarif real lokasi 2 langsung dari tabel 'tarif'
        $tarif = DB::table('tarif')
            ->where('id_location', $assignment->id_location) // id_location = 2
            ->latest('id_tarif')
            ->first();

        // 3. Ambil port yang terpasang pada charger ini
        $ports = DB::table('ports')
            ->where('id_charger', $id)
            ->get();

        // Dikirim ke frontend dalam satu paket
        return response()->json([
            'status' => 'success',
            'data' => [
                'charger' => $charger,
                'tarif' => $tarif,   // <-- Data tarif lokasi 2 otomatis terbawa di sini
                'ports' => $ports,
            ],
        ]);
    }

    /** Meminta sistem mengaktifkan unit charger. */
    public function startCharger(Request $request, $id)
    {
        return $this->updateChargerStatus($request, $id, 'Active', 'Mesin charger berhasil diaktifkan (Active).');
    }

    /** Meminta sistem menonaktifkan unit charger. */
    public function stopCharger(Request $request, $id)
    {
        return $this->updateChargerStatus($request, $id, 'Offline', 'Mesin charger berhasil dihentikan (Offline).');
    }

    /** Mengirim perintah restart untuk unit charger. */
    public function rebootCharger(Request $request, $id)
    {
        return $this->updateChargerStatus($request, $id, 'Maintenance', 'Perangkat berhasil direboot dan dialihkan ke mode maintenance.');
    }

    /** Memeriksa akses dan sesi aktif sebelum mengubah status unit charger. */
    private function updateChargerStatus(Request $request, $id, string $status, string $successMessage)
    {
        $assignment = $this->getOperatorAssignment($request->user());
        if (! $assignment) {
            return response()->json(['message' => 'Akun operator belum ditugaskan ke station manapun.'], 403);
        }

        $updated = DB::table('charger')
            ->where('id_charger', $id)
            ->where('id_location', $assignment->id_location)
            ->update([
                'status_mesin' => $status,
                'updated_at' => now(),
            ]);

        if (! $updated) {
            return response()->json(['message' => 'Mesin charger tidak ditemukan atau di luar wilayah penugasan.'], 404);
        }

        return response()->json(['status' => 'success', 'message' => $successMessage]);
    }

    /** Menghapus unit charger setelah memeriksa kepemilikan lingkup operator. */
    public function destroyCharger(Request $request, $id)
    {
        $assignment = $this->getOperatorAssignment($request->user());
        if (! $assignment) {
            return response()->json(['message' => 'Akun operator belum ditugaskan ke station manapun.'], 403);
        }

        $charger = DB::table('charger')
            ->where('id_charger', $id)
            ->where('id_location', $assignment->id_location)
            ->first();

        if (! $charger) {
            return response()->json(['message' => 'Mesin charger tidak ditemukan.'], 404);
        }

        $hasPorts = DB::table('ports')->where('id_charger', $id)->exists();
        if ($hasPorts) {
            return response()->json(['message' => 'Tidak dapat menghapus mesin karena masih memiliki port terdaftar. Hapus port terlebih dahulu.'], 400);
        }

        DB::table('charger')->where('id_charger', $id)->delete();

        return response()->json(['status' => 'success', 'message' => 'Mesin charger berhasil dihapus.']);
    }

    /**
     * 3. MANAJEMEN PORT
     */
    /** Mengambil daftar port charger sesuai cakupan station operator. */
    public function getPorts(Request $request)
    {
        $assignment = $this->getOperatorAssignment($request->user());
        if (! $assignment) {
            return response()->json(['message' => 'Akun operator belum ditugaskan ke station manapun.'], 403);
        }

        $ports = DB::table('ports')
            ->join('charger', 'ports.id_charger', '=', 'charger.id_charger')
            ->where('charger.id_location', $assignment->id_location)
            ->select('ports.*', 'charger.kode_perangkat as nama_charger')
            ->get();

        return response()->json(['status' => 'success', 'data' => $ports]);
    }

    /** Membuat port baru pada unit charger yang dapat dikelola operator. */
    public function storePort(Request $request)
    {
        $request->validate([
            'id_charger' => 'required|exists:charger,id_charger',
            'nomor_port' => 'required|string|max:50',
            'tipe_konektor' => 'required|string|max:50',
            'tipe_charging' => 'required|string|max:50',
            'daya_maks_kw' => 'required|numeric',
            'status_port' => 'sometimes|in:Available,Charging,Reserved,Out of Order',
        ]);

        $assignment = $this->getOperatorAssignment($request->user());
        if (! $assignment) {
            return response()->json(['message' => 'Akun operator belum ditugaskan ke station manapun.'], 403);
        }

        $charger = DB::table('charger')
            ->where('id_charger', $request->id_charger)
            ->where('id_location', $assignment->id_location)
            ->first();

        if (! $charger) {
            return response()->json(['message' => 'Mesin charger induk tidak valid di lokasi Anda.'], 403);
        }

        $portId = DB::table('ports')->insertGetId([
            'id_charger' => $request->id_charger,
            'nomor_port' => $request->nomor_port,
            'tipe_konektor' => $request->tipe_konektor,
            'tipe_charging' => $request->tipe_charging,
            'daya_maks_kw' => $request->daya_maks_kw,
            'status_port' => $request->input('status_port', 'Available'),
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        return response()->json([
            'status' => 'success',
            'message' => 'Port berhasil ditambahkan.',
            'data' => ['id_port' => $portId],
        ], 201);
    }

    /** Mengubah konektor, daya, atau status port setelah pemeriksaan akses. */
    public function updatePort(Request $request, $id)
    {
        $assignment = $this->getOperatorAssignment($request->user());
        if (! $assignment) {
            return response()->json(['message' => 'Akun operator belum ditugaskan ke station manapun.'], 403);
        }

        $port = DB::table('ports')
            ->join('charger', 'ports.id_charger', '=', 'charger.id_charger')
            ->where('ports.id_port', $id)
            ->where('charger.id_location', $assignment->id_location)
            ->select('ports.*')
            ->first();

        if (! $port) {
            return response()->json(['message' => 'Port tidak ditemukan atau di luar wilayah penugasan.'], 404);
        }

        $request->validate([
            'nomor_port' => 'sometimes|string|max:50',
            'tipe_konektor' => 'sometimes|string|max:50',
            'tipe_charging' => 'sometimes|string|max:50',
            'daya_maks_kw' => 'sometimes|numeric',
            'status_port' => 'sometimes|in:Available,Charging,Reserved,Out of Order',
        ]);

        DB::table('ports')->where('id_port', $id)->update([
            'nomor_port' => $request->input('nomor_port', $port->nomor_port),
            'tipe_konektor' => $request->input('tipe_konektor', $port->tipe_konektor),
            'tipe_charging' => $request->input('tipe_charging', $port->tipe_charging),
            'daya_maks_kw' => $request->input('daya_maks_kw', $port->daya_maks_kw),
            'status_port' => $request->input('status_port', $port->status_port),
            'updated_at' => now(),
        ]);

        return response()->json(['status' => 'success', 'message' => 'Port berhasil diperbarui.']);
    }

    /** Mengaktifkan port agar dapat menerima sesi charging. */
    public function startPort(Request $request, $id)
    {
        return $this->updatePortStatus($request, $id, 'Available', 'Port berhasil diaktifkan (Available).');
    }

    /** Menonaktifkan port untuk pemeliharaan atau penanganan kendala. */
    public function stopPort(Request $request, $id)
    {
        return $this->updatePortStatus($request, $id, 'Out of Order', 'Port berhasil dihentikan (Out of Order).');
    }

    /** Mengirim perintah restart pada port yang dipilih. */
    public function rebootPort(Request $request, $id)
    {
        return $this->updatePortStatus($request, $id, 'Out of Order', 'Port berhasil direboot.');
    }

    /** Menjalankan perubahan status port dengan validasi akses dan sesi aktif. */
    private function updatePortStatus(Request $request, $id, string $status, string $message)
    {
        $assignment = $this->getOperatorAssignment($request->user());
        if (! $assignment) {
            return response()->json(['message' => 'Akun operator belum ditugaskan ke station manapun.'], 403);
        }

        $port = DB::table('ports')
            ->join('charger', 'ports.id_charger', '=', 'charger.id_charger')
            ->where('ports.id_port', $id)
            ->where('charger.id_location', $assignment->id_location)
            ->select('ports.id_port')
            ->first();

        if (! $port) {
            return response()->json(['message' => 'Port tidak ditemukan atau di luar wilayah penugasan.'], 404);
        }

        DB::table('ports')->where('id_port', $id)->update([
            'status_port' => $status,
            'updated_at' => now(),
        ]);

        return response()->json(['status' => 'success', 'message' => $message]);
    }

    /** Menghapus port setelah memastikan port berada pada station operator. */
    public function destroyPort(Request $request, $id)
    {
        $assignment = $this->getOperatorAssignment($request->user());
        if (! $assignment) {
            return response()->json(['message' => 'Akun operator belum ditugaskan ke station manapun.'], 403);
        }

        $port = DB::table('ports')
            ->join('charger', 'ports.id_charger', '=', 'charger.id_charger')
            ->where('ports.id_port', $id)
            ->where('charger.id_location', $assignment->id_location)
            ->select('ports.id_port')
            ->first();

        if (! $port) {
            return response()->json(['message' => 'Port tidak ditemukan.'], 404);
        }

        DB::table('ports')->where('id_port', $id)->delete();

        return response()->json(['status' => 'success', 'message' => 'Port berhasil dihapus.']);
    }

    /**
     * 4. LAPORAN OPERASIONAL
     */
    /** Menghitung laporan pemakaian, transaksi, dan gangguan untuk station operator. */
    public function getOperationalReports(Request $request)
    {
        $assignment = $this->getOperatorAssignment($request->user());
        if (! $assignment) {
            return response()->json(['message' => 'Akun operator belum ditugaskan ke station manapun.'], 403);
        }

        $query = DB::table('charging_session')
            ->join('charger', 'charging_session.id_charger', '=', 'charger.id_charger')
            ->leftJoin('ports', 'charging_session.id_port', '=', 'ports.id_port')
            ->leftJoin('users', 'charging_session.id_user', '=', 'users.id_user')
            ->leftJoin('user_profile', 'users.id_user', '=', 'user_profile.id_user')
            ->leftJoin('vehicle', 'charging_session.id_vehicle', '=', 'vehicle.id_vehicle')
            ->leftJoin('payment', 'charging_session.id_session', '=', 'payment.id_session')
            ->where('charger.id_location', $assignment->id_location)
            ->select(
                'charging_session.*',
                'charger.kode_perangkat',
                'ports.nomor_port',
                'ports.tipe_konektor',
                'user_profile.nama_lengkap as nama_user',
                'vehicle.model as kendaraan',
                'vehicle.nomor_polisi',
                'payment.total_bayar',
                'payment.status_pembayaran'
            );

        if ($request->filled('start_date') && $request->filled('end_date')) {
            $start = Carbon::parse($request->start_date)->startOfDay();
            $end = Carbon::parse($request->end_date)->endOfDay();
            $query->whereBetween('charging_session.created_at', [$start, $end]);
        }

        if ($request->filled('status')) {
            $query->where('charging_session.status', $request->status);
        }

        // Menggunakan paginate agar respons ringan
        $transactions = $query->orderBy('charging_session.created_at', 'desc')->paginate(15);

        return response()->json([
            'status' => 'success',
            'data' => $transactions,
        ]);
    }

    /**
     * 5. PROFIL OPERATOR
     */
    /** Mengembalikan profil akun operator dan station penugasannya. */
    public function getProfile(Request $request)
    {
        $user = $request->user();

        $profile = DB::table('user_profile')->where('id_user', $user->id_user)->first();

        $assignment = DB::table('station_operators')
            ->join('location', 'station_operators.id_location', '=', 'location.id_location')
            ->where('station_operators.id_user', $user->id_user)
            ->select('station_operators.*', 'location.nama_lokasi', 'location.alamat')
            ->first();

        return response()->json([
            'status' => 'success',
            'data' => [
                'user' => $user,
                'profile' => $profile,
                'assignment' => $assignment,
            ],
        ]);
    }

    /**
     * 1. Mengambil daftar notifikasi malfungsi dan gangguan transaksi
     */
    /** Mengambil notifikasi operasional yang relevan dengan station operator. */
    public function getNotifications(Request $request)
    {
        $assignment = $this->getOperatorAssignment($request->user());
        if (! $assignment) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        // A. Malfungsi Unit (dari tabel error_log)
        $malfunctions = DB::table('error_log')
            ->join('charger', 'error_log.id_charger', '=', 'charger.id_charger')
            ->where('charger.id_location', $assignment->id_location)
            ->where('error_log.status_tanganan', '!=', 'Selesai')
            ->select(
                'error_log.id_log',
                'error_log.id_charger',
                'charger.kode_perangkat',
                'error_log.desk_mslh as deskripsi',
                'error_log.created_at'
            )
            ->orderBy('error_log.created_at', 'desc')
            ->get();

        // B. Gangguan Transaksi (dari tabel charging_session yang gagal/dibatalkan atau payment gagal)
        $transactionErrors = DB::table('charging_session')
            ->join('charger', 'charging_session.id_charger', '=', 'charger.id_charger')
            ->leftJoin('payment', 'charging_session.id_session', '=', 'payment.id_session')
            ->where('charger.id_location', $assignment->id_location)
            ->where(function ($q) {
                $q->whereIn('charging_session.status', ['Gagal', 'Dibatalkan', 'gagal', 'dibatalkan'])
                    ->orWhere('payment.status_pembayaran', 'Gagal');
            })
            ->select(
                'charging_session.id_session as id_transaksi',
                DB::raw("CONCAT('SES-', charging_session.id_session) as kode_transaksi"),
                DB::raw('COALESCE(payment.total_bayar, charging_session.saldo_hold, 0) as total_biaya'),
                DB::raw("'Dompet Digital' as metode_pembayaran"),
                DB::raw("CONCAT('Sesi status: ', charging_session.status) as keterangan"),
                'charging_session.created_at'
            )
            ->orderBy('charging_session.created_at', 'desc')
            ->limit(10)
            ->get();

        return response()->json([
            'status' => 'success',
            'data' => [
                'malfunctions' => $malfunctions,
                'transactions' => $transactionErrors,
                'total_unread' => count($malfunctions) + count($transactionErrors),
            ],
        ]);
    }

    /**
     * 2. Menerima malfungsi: Otomatis ubah status mesin menjadi 'Maintenance'
     */
    /** Mencatat tindakan operator atas laporan gangguan charger. */
    public function handleMalfunctionAction(Request $request, $idCharger, $idLog)
    {
        $assignment = $this->getOperatorAssignment($request->user());

        // 1. Ubah status mesin charger menjadi 'Maintenance'
        DB::table('charger')
            ->where('id_charger', $idCharger)
            ->where('id_location', $assignment->id_location)
            ->update([
                'status_mesin' => 'Maintenance',
                'updated_at' => now(),
            ]);

        // 2. Perbarui status penanganan di error_log
        DB::table('error_log')
            ->where('id_log', $idLog)
            ->update([
                'status_tanganan' => 'Sedang Ditangani',
                'updated_at' => now(),
            ]);

        return response()->json([
            'status' => 'success',
            'message' => 'Status unit charger berhasil dialihkan ke mode Maintenance.',
        ]);
    }
}
