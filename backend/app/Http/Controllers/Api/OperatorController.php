<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Carbon\Carbon;

class OperatorController extends Controller
{
    /**
     * Memantau status station dan port berdasarkan lokasi penugasan operator yang login.
     */
    public function getStationStatus(Request $request)
    {
        $user = $request->user();

        // Mengambil id_location dari profil operator yang ditugaskan oleh admin
        // (Pastikan tabel user_profile atau users memiliki kolom id_location penugasan)
        $profile = DB::table('user_profile')->where('id_user', $user->id_user)->first();
        
        if (!$profile || !$profile->id_location) {
            return response()->json([
                'status' => 'error',
                'message' => 'Akun operator belum ditugaskan ke station manapun oleh Admin.'
            ], 403);
        }

        // Ambil data lokasi sesuai penugasan admin
        $location = DB::table('location')->where('id_location', $profile->id_location)->first();

        if (!$location) {
            return response()->json(['message' => 'Data lokasi penugasan tidak ditemukan.'], 404);
        }

        // Ambil daftar charger/port pada lokasi tersebut
        $chargers = DB::table('charger')
            ->where('id_location', $location->id_location)
            ->get();

        // Ambil error log / kendala fisik yang belum selesai di station tersebut
        $errorLogs = DB::table('error_log')
            ->join('charger', 'error_log.id_charger', '=', 'charger.id_charger')
            ->where('charger.id_location', $location->id_location)
            ->where('error_log.status_tanganan', '!=', 'Selesai')
            ->select('error_log.*', 'charger.kode_perangkat')
            ->get();

        return response()->json([
            'status' => 'success',
            'data' => [
                'operator_profile' => $profile,
                'location' => $location,
                'chargers' => $chargers,
                'error_logs' => $errorLogs
            ]
        ]);
    }

    /**
 * Operator menambahkan port/charger baru ke station penugasannya
 */
    public function storeCharger(Request $request)
    {
        $request->validate([
            'kode_perangkat' => 'required|string|unique:charger,kode_perangkat',
            'tipe_konektor' => 'required|string',
            'daya_kwh' => 'required|numeric',
            'tipe_charging' => 'required|string',
        ]);

        $user = $request->user();
        $profile = DB::table('user_profile')->where('id_user', $user->id_user)->first();

        if (!$profile || !$profile->id_location) {
            return response()->json([
                'status' => 'error',
                'message' => 'Akun operator belum ditugaskan ke station manapun.'
            ], 403);
        }

        // Masukkan data charger baru otomatis terikat ke location operator
        $chargerId = DB::table('charger')->insertGetId([
            'id_location' => $profile->id_location,
            'kode_perangkat' => $request->kode_perangkat,
            'tipe_konektor' => $request->tipe_konektor,
            'daya_kwh' => $request->daya_kwh,
            'tipe_charging' => $request->tipe_charging,
            'status' => 'tersedia', // Default port baru statusnya tersedia
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        return response()->json([
            'status' => 'success',
            'message' => 'Port/charger baru berhasil ditambahkan ke station.',
            'data' => [
                'id_charger' => $chargerId,
                'kode_perangkat' => $request->kode_perangkat
            ]
        ]);
    }

    /**
     * Laporan Operasional Harian & Bulanan khusus untuk station yang diampu operator
     */
    public function getOperationalReports(Request $request)
    {
        $user = $request->user();
        $profile = DB::table('user_profile')->where('id_user', $user->id_user)->first();

        if (!$profile || !$profile->id_location) {
            return response()->json(['message' => 'Lokasi penugasan tidak valid.'], 403);
        }

        $chargerIds = DB::table('charger')
            ->where('id_location', $profile->id_location)
            ->pluck('id_charger');

        // Statistik Harian
        $today = Carbon::today();
        $dailySessions = DB::table('charging_session')
            ->whereIn('id_charger', $chargerIds)
            ->whereDate('waktu_mulai', $today)
            ->get();

        $dailyKwh = $dailySessions->sum('total_energi_kwh');
        $dailyRevenue = DB::table('payment')
            ->join('charging_session', 'payment.id_session', '=', 'charging_session.id_session')
            ->whereIn('charging_session.id_charger', $chargerIds)
            ->whereDate('payment.created_at', $today)
            ->sum('payment.total_bayar');

        // Statistik Bulanan
        $startOfMonth = Carbon::now()->startOfMonth();
        $monthlySessions = DB::table('charging_session')
            ->whereIn('id_charger', $chargerIds)
            ->where('waktu_mulai', '>=', $startOfMonth)
            ->get();

        $monthlyKwh = $monthlySessions->sum('total_energi_kwh');
        $monthlyRevenue = DB::table('payment')
            ->join('charging_session', 'payment.id_session', '=', 'charging_session.id_session')
            ->whereIn('charging_session.id_charger', $chargerIds)
            ->where('payment.created_at', '>=', $startOfMonth)
            ->sum('payment.total_bayar');

        return response()->json([
            'status' => 'success',
            'data' => [
                'harian' => [
                    'total_sesi' => $dailySessions->count(),
                    'total_kwh' => round($dailyKwh, 2),
                    'total_pendapatan' => $dailyRevenue,
                ],
                'bulanan' => [
                    'total_sesi' => $monthlySessions->count(),
                    'total_kwh' => round($monthlyKwh, 2),
                    'total_pendapatan' => $monthlyRevenue,
                ]
            ]
        ]);
    }
}