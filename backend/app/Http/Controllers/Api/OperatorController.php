<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use App\Models\Charger;
use Carbon\Carbon;

class OperatorController extends Controller
{
    /**
     * 1. HALAMAN DASHBOARD: Ringkasan status stasiun, statistik port, dan error log aktif
     */
    public function getDashboard(Request $request)
    {
        $user = $request->user();

        $assignment = DB::table('station_operators')->where('id_user', $user->id_user)->first();
        if (!$assignment) {
            return response()->json(['message' => 'Akun operator belum ditugaskan ke station manapun.'], 403);
        }

        $location = DB::table('location')->where('id_location', $assignment->id_location)->first();
        
        // Ambil semua charger di lokasi ini
        $chargers = DB::table('charger')->where('id_location', $location->id_location)->get();
        
        $totalChargers = $chargers->count();
        $totalPorts = 0;
        $portStats = [
            'available' => 0,
            'charging' => 0,
            'reserved' => 0,
            'out_of_order' => 0,
        ];

        foreach ($chargers as $charger) {
            $ports = DB::table('ports')->where('id_charger', $charger->id_charger)->get();
            $totalPorts += $ports->count();
            
            foreach ($ports as $port) {
                $status = strtolower($port->status_port);
                if (isset($portStats[$status])) {
                    $portStats[$status]++;
                }
            }
        }

        // Error log yang belum selesai di lokasi ini
        $errorLogs = DB::table('error_log')
            ->join('charger', 'error_log.id_charger', '=', 'charger.id_charger')
            ->where('charger.id_location', $location->id_location)
            ->where('error_log.status_tanganan', '!=', 'Selesai')
            ->select('error_log.*', 'charger.kode_perangkat')
            ->get();

        return response()->json([
            'status' => 'success',
            'data' => [
                'location' => $location,
                'summary' => [
                    'total_chargers' => $totalChargers,
                    'total_ports' => $totalPorts,
                    'port_stats' => $portStats,
                ],
                'active_error_logs' => $errorLogs,
            ]
        ]);
    }

    /**
     * 2. HALAMAN MANAJEMEN CHARGER (Mesin Fisik): CRUD Data Mesin Charger
     */
    public function getChargers(Request $request)
    {
        $user = $request->user();
        $assignment = DB::table('station_operators')->where('id_user', $user->id_user)->first();

        if (!$assignment) {
            return response()->json(['message' => 'Akun operator belum ditugaskan ke station manapun.'], 403);
        }

        $chargers = DB::table('charger')
            ->where('id_location', $assignment->id_location)
            ->get();

        foreach ($chargers as $charger) {
            $charger->total_ports = DB::table('ports')->where('id_charger', $charger->id_charger)->count();
        }

        return response()->json([
            'status' => 'success',
            'data' => $chargers
        ]);
    }

    public function storeCharger(Request $request)
    {
        $request->validate([
            'kode_perangkat' => 'required|string|unique:charger,kode_perangkat|max:12',
            'merek_model' => 'required|string|max:100',
            'kap_tot_kw' => 'required|numeric',
            'status_mesin' => 'sometimes|in:Active,Maintenance,Offline',
        ]);

        $user = $request->user();
        $assignment = DB::table('station_operators')->where('id_user', $user->id_user)->first();

        if (!$assignment) {
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
            'data' => ['id_charger' => $chargerId]
        ], 201);
    }

    public function updateCharger(Request $request, $id)
    {
        $user = $request->user();
        $assignment = DB::table('station_operators')->where('id_user', $user->id_user)->first();

        if (!$assignment) {
            return response()->json(['message' => 'Akun operator belum ditugaskan ke station manapun.'], 403);
        }

        $charger = DB::table('charger')
            ->where('id_charger', $id)
            ->where('id_location', $assignment->id_location)
            ->first();

        if (!$charger) {
            return response()->json(['message' => 'Mesin charger tidak ditemukan atau di luar wilayah penugasan.'], 404);
        }

        $request->validate([
            'kode_perangkat' => 'sometimes|string|max:12|unique:charger,kode_perangkat,' . $id . ',id_charger',
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

    public function startCharger(Request $request, $id)
    {
        $user = $request->user();
        $assignment = DB::table('station_operators')->where('id_user', $user->id_user)->first();

        if (!$assignment) {
            return response()->json(['message' => 'Akun operator belum ditugaskan ke station manapun.'], 403);
        }

        $charger = DB::table('charger')
            ->where('id_charger', $id)
            ->where('id_location', $assignment->id_location)
            ->first();

        if (!$charger) {
            return response()->json(['message' => 'Mesin charger tidak ditemukan atau di luar wilayah penugasan.'], 404);
        }

        DB::table('charger')->where('id_charger', $id)->update([
            'status_mesin' => 'Active',
            'updated_at' => now(),
        ]);

        return response()->json([
            'status' => 'success',
            'message' => 'Mesin charger berhasil diaktifkan (Active).'
        ]);
    }

    public function stopCharger(Request $request, $id)
    {
        $user = $request->user();
        $assignment = DB::table('station_operators')->where('id_user', $user->id_user)->first();

        if (!$assignment) {
            return response()->json(['message' => 'Akun operator belum ditugaskan ke station manapun.'], 403);
        }

        $charger = DB::table('charger')
            ->where('id_charger', $id)
            ->where('id_location', $assignment->id_location)
            ->first();

        if (!$charger) {
            return response()->json(['message' => 'Mesin charger tidak ditemukan atau di luar wilayah penugasan.'], 404);
        }

        DB::table('charger')->where('id_charger', $id)->update([
            'status_mesin' => 'Offline',
            'updated_at' => now(),
        ]);

        return response()->json([
            'status' => 'success',
            'message' => 'Mesin charger berhasil dihentikan (Offline).'
        ]);
    }

    public function rebootCharger($id)
    {
        $charger = Charger::findOrFail($id);
        
        $charger->update([
            'status_mesin' => 'Maintenance'
        ]);

        return response()->json([
            'message' => 'Perangkat berhasil direboot dan dialihkan ke mode maintenance/offline',
            'data' => $charger
        ]);
    }

    public function destroyCharger(Request $request, $id)
    {
        $user = $request->user();
        $assignment = DB::table('station_operators')->where('id_user', $user->id_user)->first();

        if (!$assignment) {
            return response()->json(['message' => 'Akun operator belum ditugaskan ke station manapun.'], 403);
        }

        $charger = DB::table('charger')
            ->where('id_charger', $id)
            ->where('id_location', $assignment->id_location)
            ->first();

        if (!$charger) {
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
     * 3. HALAMAN MANAJEMEN PORT: CRUD Data Port / Nozzle Colokan & Kontrol Port
     */
    public function getPorts(Request $request)
    {
        $user = $request->user();
        $assignment = DB::table('station_operators')->where('id_user', $user->id_user)->first();

        if (!$assignment) {
            return response()->json(['message' => 'Akun operator belum ditugaskan ke station manapun.'], 403);
        }

        $ports = DB::table('ports')
            ->join('charger', 'ports.id_charger', '=', 'charger.id_charger')
            ->where('charger.id_location', $assignment->id_location)
            ->select('ports.*', 'charger.kode_perangkat as nama_charger')
            ->get();

        return response()->json([
            'status' => 'success',
            'data' => $ports
        ]);
    }

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

        $user = $request->user();
        $assignment = DB::table('station_operators')->where('id_user', $user->id_user)->first();

        if (!$assignment) {
            return response()->json(['message' => 'Akun operator belum ditugaskan ke station manapun.'], 403);
        }

        $charger = DB::table('charger')
            ->where('id_charger', $request->id_charger)
            ->where('id_location', $assignment->id_location)
            ->first();

        if (!$charger) {
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
            'data' => ['id_port' => $portId]
        ], 201);
    }

    public function updatePort(Request $request, $id)
    {
        $user = $request->user();
        $assignment = DB::table('station_operators')->where('id_user', $user->id_user)->first();

        if (!$assignment) {
            return response()->json(['message' => 'Akun operator belum ditugaskan ke station manapun.'], 403);
        }

        $port = DB::table('ports')
            ->join('charger', 'ports.id_charger', '=', 'charger.id_charger')
            ->where('ports.id_port', $id)
            ->where('charger.id_location', $assignment->id_location)
            ->select('ports.*')
            ->first();

        if (!$port) {
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

    /**
     * Mengaktifkan Port (Tombol Start)
     */
    public function startPort(Request $request, $id)
    {
        $user = $request->user();
        $assignment = DB::table('station_operators')->where('id_user', $user->id_user)->first();

        if (!$assignment) {
            return response()->json(['message' => 'Akun operator belum ditugaskan ke station manapun.'], 403);
        }

        $port = DB::table('ports')
            ->join('charger', 'ports.id_charger', '=', 'charger.id_charger')
            ->where('ports.id_port', $id)
            ->where('charger.id_location', $assignment->id_location)
            ->select('ports.*')
            ->first();

        if (!$port) {
            return response()->json(['message' => 'Port tidak ditemukan atau di luar wilayah penugasan.'], 404);
        }

        DB::table('ports')->where('id_port', $id)->update([
            'status_port' => 'Available', // Atau status aktif pengisian sesuai alur bisnis Anda
            'updated_at' => now(),
        ]);

        return response()->json([
            'status' => 'success',
            'message' => 'Port berhasil diaktifkan (Available).'
        ]);
    }

    /**
     * Mematikan Port (Tombol Stop)
     */
    public function stopPort(Request $request, $id)
    {
        $user = $request->user();
        $assignment = DB::table('station_operators')->where('id_user', $user->id_user)->first();

        if (!$assignment) {
            return response()->json(['message' => 'Akun operator belum ditugaskan ke station manapun.'], 403);
        }

        $port = DB::table('ports')
            ->join('charger', 'ports.id_charger', '=', 'charger.id_charger')
            ->where('ports.id_port', $id)
            ->where('charger.id_location', $assignment->id_location)
            ->select('ports.*')
            ->first();

        if (!$port) {
            return response()->json(['message' => 'Port tidak ditemukan atau di luar wilayah penugasan.'], 404);
        }

        DB::table('ports')->where('id_port', $id)->update([
            'status_port' => 'Out of Order',
            'updated_at' => now(),
        ]);

        return response()->json([
            'status' => 'success',
            'message' => 'Port berhasil dihentikan (Out of Order).'
        ]);
    }

    /**
     * Reboot Port
     */
    public function rebootPort(Request $request, $id)
    {
        $user = $request->user();
        $assignment = DB::table('station_operators')->where('id_user', $user->id_user)->first();

        if (!$assignment) {
            return response()->json(['message' => 'Akun operator belum ditugaskan ke station manapun.'], 403);
        }

        $port = DB::table('ports')
            ->join('charger', 'ports.id_charger', '=', 'charger.id_charger')
            ->where('ports.id_port', $id)
            ->where('charger.id_location', $assignment->id_location)
            ->select('ports.*')
            ->first();

        if (!$port) {
            return response()->json(['message' => 'Port tidak ditemukan atau di luar wilayah penugasan.'], 404);
        }

        DB::table('ports')->where('id_port', $id)->update([
            'status_port' => 'Out of Order',
            'updated_at' => now(),
        ]);

        return response()->json([
            'status' => 'success',
            'message' => 'Port berhasil direboot.',
            'data' => DB::table('ports')->where('id_port', $id)->first()
        ]);
    }

    public function destroyPort(Request $request, $id)
    {
        $user = $request->user();
        $assignment = DB::table('station_operators')->where('id_user', $user->id_user)->first();

        if (!$assignment) {
            return response()->json(['message' => 'Akun operator belum ditugaskan ke station manapun.'], 403);
        }

        $port = DB::table('ports')
            ->join('charger', 'ports.id_charger', '=', 'charger.id_charger')
            ->where('ports.id_port', $id)
            ->where('charger.id_location', $assignment->id_location)
            ->select('ports.id_port')
            ->first();

        if (!$port) {
            return response()->json(['message' => 'Port tidak ditemukan.'], 404);
        }

        DB::table('ports')->where('id_port', $id)->delete();

        return response()->json(['status' => 'success', 'message' => 'Port berhasil dihapus.']);
    }

    /**
     * 4. HALAMAN MANAJEMEN REPORT: Laporan / Histori Transaksi Sesi Pengisian
     */
    public function getOperationalReports(Request $request)
    {
        $user = $request->user();
        $assignment = DB::table('station_operators')->where('id_user', $user->id_user)->first();

        if (!$assignment) {
            return response()->json(['message' => 'Akun operator belum ditugaskan ke station manapun.'], 403);
        }

        $startDate = $request->input('start_date');
        $endDate = $request->input('end_date');
        $status = $request->input('status');

        $query = DB::table('charging_session')
            ->join('charger', 'charging_session.id_charger', '=', 'charger.id_charger')
            ->where('charger.id_location', $assignment->id_location)
            ->select('charging_session.*', 'charger.kode_perangkat');

        if ($startDate && $endDate) {
            $query->whereBetween('charging_session.created_at', [$startDate, $endDate]);
        }

        if ($status) {
            $query->where('charging_session.status', $status);
        }

        $transactions = $query->orderBy('charging_session.created_at', 'desc')->get();

        return response()->json([
            'status' => 'success',
            'data' => $transactions
        ]);
    }

    /**
     * 5. HALAMAN PROFIL: Informasi Profil Operator & Lokasi Penugasan
     */
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
            ]
        ]);
    }
}