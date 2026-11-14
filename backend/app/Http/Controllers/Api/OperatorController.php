<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\AuditLog;
use App\Models\ChargingSession;
use App\Models\Location;
use App\Models\Tarif;
use App\Services\TariffScheduleService;
use Carbon\Carbon;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Illuminate\Validation\ValidationException;

/** Mengatur dashboard operator, unit/port charger, laporan, dan notifikasi station. */
class OperatorController extends Controller
{
    /**
     * Helper untuk mengambil penugasan operator (mencegah duplikasi kode)
     */
    /** Memuat lingkup station yang boleh diakses oleh akun operator. */
    private function getOperatorAssignment($user)
    {
        // DNA operasional: semua data operator selalu dibatasi oleh station aktif.
        // Jika belum dipilih, penugasan pertama menjadi default yang deterministik.
        $stationId = request()->header('X-Station-Id');
        $query = DB::table('station_operators')
            ->where('id_user', $user->id_user)
            ->orderBy('id_station_operator');

        if ($stationId) {
            $query->where('id_location', $stationId);
        }

        return $query->first();
    }

    /** Mengirim seluruh station yang boleh dikelola; urutan pertama menjadi default UI. */
    public function getAssignedStations(Request $request)
    {
        $stations = DB::table('station_operators')
            ->join('location', 'station_operators.id_location', '=', 'location.id_location')
            ->where('station_operators.id_user', $request->user()->id_user)
            ->orderBy('station_operators.id_station_operator')
            ->select('location.id_location', 'location.kode_station', 'location.nama_lokasi', 'location.alamat')
            ->get();

        return response()->json(['status' => 'success', 'data' => $stations]);
    }

    /** Membaca tarif aktif station terpilih; tarif adalah konteks station, bukan mesin. */
    public function getActiveTarif(Request $request)
    {
        $assignment = $this->getOperatorAssignment($request->user());
        if (! $assignment) {
            return response()->json(['message' => 'Station aktif tidak ditemukan dalam penugasan operator.'], 403);
        }
        $tarifs = Tarif::where('id_location', $assignment->id_location)->orderBy('periode_mulai')->get();
        $activeTariff = $tarifs->first(fn (Tarif $tarif): bool => $tarif->periode_mulai->lessThanOrEqualTo(now()) && $tarif->periode_berakhir->greaterThan(now())
        );
        $scheduledTariffs = $tarifs->filter(fn (Tarif $tarif): bool => $tarif->periode_mulai->isFuture())->values();

        return response()->json(['status' => 'success', 'data' => ['active' => $activeTariff, 'scheduled' => $scheduledTariffs]]);
    }

    /** Menyimpan periode tarif baru untuk station aktif setelah validasi penugasan. */
    public function storeTarif(Request $request)
    {
        $assignment = $this->getOperatorAssignment($request->user());
        if (! $assignment) {
            return response()->json(['message' => 'Station aktif tidak ditemukan dalam penugasan operator.'], 403);
        }
        $data = $request->validate([
            'harga_per_kwh' => 'required|integer|min:100',
            'biaya_minimum' => 'sometimes|nullable|integer|min:0',
            'biaya_parkir_flat' => 'required|integer|min:0',
            'mode' => 'required|in:immediate,scheduled',
            'effective_at' => 'required_if:mode,scheduled|date|after:now',
        ]);
        $data['biaya_minimum'] = (int) ($data['biaya_minimum'] ?? 0);
        $tariff = app(TariffScheduleService::class)->create(
            Location::findOrFail($assignment->id_location),
            $request->user(),
            $data
        );

        return response()->json(['status' => 'success', 'message' => 'Tarif berhasil disimpan.', 'data' => $tariff], 201);
    }

    /** Mengubah jadwal tarif selama station masih termasuk penugasan Operator. */
    public function rescheduleTarif(Request $request, string $tarif)
    {
        $assignment = $this->getOperatorAssignment($request->user());
        $scheduledTariff = Tarif::where('id_tarif', $tarif)
            ->where('id_location', $assignment?->id_location)
            ->firstOrFail();
        $data = $request->validate([
            'harga_per_kwh' => 'required|integer|min:100',
            'biaya_minimum' => 'sometimes|nullable|integer|min:0',
            'biaya_parkir_flat' => 'required|integer|min:0',
            'effective_at' => 'required|date|after:now',
        ]);
        $data['biaya_minimum'] = (int) ($data['biaya_minimum'] ?? $scheduledTariff->biaya_minimum ?? 0);
        $updatedTariff = app(TariffScheduleService::class)->reschedule($scheduledTariff, $request->user(), $data);

        return response()->json(['status' => 'success', 'message' => 'Jadwal tarif berhasil diperbarui.', 'data' => $updatedTariff]);
    }

    /** Membatalkan jadwal tarif yang belum berlaku pada station aktif Operator. */
    public function cancelTarif(Request $request, string $tarif)
    {
        $assignment = $this->getOperatorAssignment($request->user());
        $scheduledTariff = Tarif::where('id_tarif', $tarif)
            ->where('id_location', $assignment?->id_location)
            ->firstOrFail();
        app(TariffScheduleService::class)->cancelScheduled($scheduledTariff, $request->user());

        return response()->json(['status' => 'success', 'message' => 'Jadwal tarif berhasil dibatalkan.']);
    }

    /**
     * 1. HALAMAN DASHBOARD
     */

    /** Menyajikan ringkasan operasional sesuai station penugasan operator. */
    public function getDashboard(Request $request)
    {
        $user = $request->user();

        $assignment = $this->getOperatorAssignment($user);
        if (! $assignment) {
            return response()->json(['message' => 'Akun operator belum ditugaskan ke stasiun manapun.'], 403);
        }

        $idLocation = $assignment->id_location;
        $station = Location::select('id_location', 'nama_lokasi', 'alamat')->find($idLocation);

        // 1. STATISTIK CHARGER & PORT DARI DATABASE
        $activeCharge = DB::table('charger')
            ->where('id_location', $idLocation)
            ->whereRaw('LOWER(status_mesin) = ?', ['active'])
            ->count();

        $portQuery = DB::table('ports')
            ->join('charger', 'ports.id_charger', '=', 'charger.id_charger')
            ->where('charger.id_location', $idLocation);

        $availablePorts = (clone $portQuery)
            ->whereRaw('LOWER(ports.status_port) = ?', ['available'])
            ->whereRaw('LOWER(charger.status_mesin) = ?', ['active'])
            ->count();
        $activeCharging = (clone $portQuery)->whereRaw('LOWER(ports.status_port) = ?', ['charging'])->count();
        $errorPorts = (clone $portQuery)
            ->where(function ($query) {
                $query->whereIn(DB::raw('LOWER(ports.status_port)'), ['out of order', 'maintenance'])
                    ->orWhere(function ($inactiveCharger) {
                        $inactiveCharger->whereRaw('LOWER(charger.status_mesin) <> ?', ['active'])
                            ->whereRaw('LOWER(ports.status_port) <> ?', ['charging']);
                    });
            })
            ->count();

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
                    'idCharger' => $a->id_charger,
                    'chargerCode' => $a->kode_perangkat,
                    'occurredAt' => $a->waktu_terjadi ?? $a->created_at,
                    'message' => ($a->kode_perangkat ?? 'Mesin').': '.($a->desk_mslh ?? $a->deskripsi ?? 'Terdeteksi kendala operasional.'),
                ];
            }
        }

        // 4. SESI PENGISIAN AKTIF (PORT YANG SEDANG STATUS CHARGING)
        $chargingPorts = DB::table('ports')
            ->join('charger', 'ports.id_charger', '=', 'charger.id_charger')
            ->leftJoin('charging_session', function ($join) {
                $join->on('charging_session.id_port', '=', 'ports.id_port')
                    ->where('charging_session.status', '=', 'Berlangsung');
            })
            ->leftJoin('vehicle', 'charging_session.id_vehicle', '=', 'vehicle.id_vehicle')
            ->where('charger.id_location', $idLocation)
            ->whereRaw('LOWER(ports.status_port) = ?', ['charging'])
            ->select(
                'ports.*',
                'charger.kode_perangkat',
                'charging_session.id_session',
                'charging_session.waktu_mulai',
                'charging_session.total_energi_kwh',
                'vehicle.model as vehicle_model',
                'vehicle.nomor_polisi'
            )
            ->get();

        $activeSessions = [];
        foreach ($chargingPorts as $cp) {
            // Gunakan tipe_charging (fallback jika kosong)
            $mode = $cp->tipe_charging ?? $cp->mode_daya ?? 'DC';
            $power = $cp->daya_maks_kw ?? $cp->daya_maksimal ?? 50;

            $activeSessions[] = [
                'id' => $cp->id_port,
                'id_session' => $cp->id_session,
                'id_port' => $cp->id_port,
                'port' => $cp->kode_perangkat.' - Port '.($cp->nomor_port ?? $cp->id_port),
                'type' => ($cp->tipe_konektor ?? 'Konektor').' ('.$mode.')',
                'vehicle' => trim(($cp->vehicle_model ?? '').' '.($cp->nomor_polisi ?? '')) ?: 'Sesi aktif',
                'power' => $power.' kW',
                'startedAt' => $cp->waktu_mulai,
                'energy' => $cp->total_energi_kwh !== null ? number_format($cp->total_energi_kwh, 2, ',', '.').' kWh' : 'Belum tersedia',
            ];
        }

        return response()->json([
            'status' => 'success',
            'data' => [
                'station' => $station,
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

        $data = $request->validate([
            'kode_perangkat' => 'sometimes|string|max:12|unique:charger,kode_perangkat,'.$id.',id_charger',
            'merek_model' => 'sometimes|string|max:100',
            'kap_tot_kw' => 'sometimes|numeric',
            'status_mesin' => 'sometimes|in:Active,Maintenance,Offline',
        ]);

        if (($data['status_mesin'] ?? $charger->status_mesin) !== $charger->status_mesin) {
            AuditLog::create([
                'id_user' => $request->user()->id_user,
                'id_location' => $charger->id_location,
                'aksi' => 'ubah_status_charger',
                'entitas' => 'charger',
                'id_entitas' => (string) $charger->id_charger,
                'data_sebelum' => ['status' => $charger->status_mesin],
                'data_sesudah' => ['status' => $data['status_mesin']],
            ]);
        }

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
        // Detail charger mengikuti station aktif yang sama dengan dashboard dan daftar unit.
        $assignment = $this->getOperatorAssignment($user);
        if (! $assignment) {
            return response()->json(['message' => 'Station aktif tidak ditemukan dalam penugasan operator.'], 403);
        }

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

    /** Menyelesaikan sesi aktif beserta hold sebelum mengubah status unit charger. */
    private function updateChargerStatus(Request $request, $id, string $status, string $successMessage)
    {
        $reason = $request->validate([
            'alasan' => ['required', 'string', 'min:5', 'max:500'],
        ])['alasan'];

        $assignment = $this->getOperatorAssignment($request->user());
        if (! $assignment) {
            return response()->json(['message' => 'Akun operator belum ditugaskan ke station manapun.'], 403);
        }

        $charger = DB::table('charger')->where('id_charger', $id)->where('id_location', $assignment->id_location)->first();
        if (! $charger) {
            return response()->json(['message' => 'Charger tidak ditemukan atau di luar station penugasan.'], 404);
        }

        DB::transaction(function () use ($request, $id, $status, $charger, $assignment, $reason): void {
            $sessions = $reason === null ? collect() : ChargingSession::where('id_charger', $id)
                ->where('status', 'Berlangsung')
                ->lockForUpdate()
                ->get();
            foreach ($sessions as $session) {
                $settlement = app(ChargingSessionController::class)->stopByOperator($request, $session);
                if ($settlement->getStatusCode() >= 400) {
                    throw ValidationException::withMessages([
                        'sesi' => $settlement->getData()->message ?? 'Sesi aktif tidak dapat diselesaikan.',
                    ]);
                }
            }

            DB::table('charger')->where('id_charger', $id)->where('id_location', $assignment->id_location)->update([
                'status_mesin' => $status,
                'updated_at' => now(),
            ]);
            if ($status === 'Active') {
                DB::table('error_log')
                    ->where('id_charger', $id)
                    ->where('status_tanganan', '!=', 'Selesai')
                    ->update([
                        'status_tanganan' => 'Selesai',
                        'updated_at' => now(),
                    ]);
            }
            if ($charger->status_mesin !== $status) {
                AuditLog::create([
                    'id_user' => $request->user()->id_user,
                    'id_location' => $assignment->id_location,
                    'aksi' => 'ubah_status_charger',
                    'entitas' => 'charger',
                    'id_entitas' => (string) $id,
                    'data_sebelum' => ['status' => $charger->status_mesin],
                    'data_sesudah' => ['status' => $status],
                    'alasan' => $reason,
                ]);
            }
        });

        return response()->json([
            'status' => 'success',
            'message' => $successMessage.($reason ? ' Jika ada sesi aktif, biaya aktual diselesaikan dan sisa saldo hold dikembalikan.' : ''),
        ]);
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
            'status_port' => 'Available',
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        return response()->json([
            'status' => 'success',
            'message' => 'Port berhasil ditambahkan.',
            'data' => ['id_port' => $portId],
        ], 201);
    }

    /** Mengubah spesifikasi port tanpa mengizinkan perubahan manual saat sesi berlangsung. */
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
        ]);

        DB::table('ports')->where('id_port', $id)->update([
            'nomor_port' => $request->input('nomor_port', $port->nomor_port),
            'tipe_konektor' => $request->input('tipe_konektor', $port->tipe_konektor),
            'tipe_charging' => $request->input('tipe_charging', $port->tipe_charging),
            'daya_maks_kw' => $request->input('daya_maks_kw', $port->daya_maks_kw),
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

    /** Menyelesaikan sesi aktif pada port sebelum mengubah status operasionalnya. */
    private function updatePortStatus(Request $request, $id, string $status, string $message)
    {
        $reason = $request->validate([
            'alasan' => ['required', 'string', 'min:5', 'max:500'],
        ])['alasan'];

        $assignment = $this->getOperatorAssignment($request->user());
        if (! $assignment) {
            return response()->json(['message' => 'Akun operator belum ditugaskan ke station manapun.'], 403);
        }

        $port = DB::table('ports')
            ->join('charger', 'ports.id_charger', '=', 'charger.id_charger')
            ->where('ports.id_port', $id)
            ->where('charger.id_location', $assignment->id_location)
            ->select('ports.id_port', 'ports.status_port', 'charger.id_location')
            ->first();

        if (! $port) {
            return response()->json(['message' => 'Port tidak ditemukan atau di luar wilayah penugasan.'], 404);
        }

        DB::transaction(function () use ($request, $id, $status, $assignment, $port, $reason): void {
            $session = ChargingSession::where('id_port', $id)
                ->where('status', 'Berlangsung')
                ->lockForUpdate()
                ->first();
            if ($session) {
                $settlement = app(ChargingSessionController::class)->stopByOperator($request, $session);
                if ($settlement->getStatusCode() >= 400) {
                    throw ValidationException::withMessages([
                        'sesi' => $settlement->getData()->message ?? 'Sesi aktif tidak dapat diselesaikan.',
                    ]);
                }
            }

            DB::table('ports')->where('id_port', $id)->update([
                'status_port' => $status,
                'updated_at' => now(),
            ]);
            if ($port->status_port !== $status) {
                AuditLog::create([
                    'id_user' => $request->user()->id_user,
                    'id_location' => $assignment->id_location,
                    'aksi' => 'ubah_status_port',
                    'entitas' => 'port',
                    'id_entitas' => (string) $id,
                    'data_sebelum' => ['status' => $port->status_port],
                    'data_sesudah' => ['status' => $status],
                    'alasan' => $reason,
                ]);
            }
        });

        return response()->json([
            'status' => 'success',
            'message' => $message.($reason ? ' Sesi aktif diselesaikan dan saldo hold direkonsiliasi.' : ''),
        ]);
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

        // Ringkasan mengikuti rentang tanggal dan status yang sedang dipilih operator.
        // Clone dipakai agar agregasi tidak mengubah query pagination di bawahnya.
        $summaryQuery = clone $query;
        $summary = [
            'total' => (clone $summaryQuery)->count('charging_session.id_session'),
            'ongoing' => (clone $summaryQuery)->where('charging_session.status', 'Berlangsung')->count('charging_session.id_session'),
            'completed' => (clone $summaryQuery)->where('charging_session.status', 'Selesai')->count('charging_session.id_session'),
            'cancelled' => (clone $summaryQuery)->whereIn('charging_session.status', ['Dibatalkan', 'Gagal'])->count('charging_session.id_session'),
            'revenue' => (clone $summaryQuery)
                ->where('payment.status_pembayaran', 'Sukses')
                ->sum('payment.total_bayar'),
        ];

        // Menggunakan paginate agar respons ringan
        $transactions = $query->orderBy('charging_session.created_at', 'desc')->paginate(15);

        return response()->json([
            'status' => 'success',
            'data' => [
                'transactions' => $transactions,
                'summary' => $summary,
            ],
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

        $activeAssignment = $this->getOperatorAssignment($user);
        $assignmentQuery = DB::table('station_operators')
            ->join('location', 'station_operators.id_location', '=', 'location.id_location')
            ->where('station_operators.id_user', $user->id_user)
            ->orderBy('station_operators.id_station_operator')
            ->select('station_operators.*', 'location.kode_station', 'location.nama_lokasi', 'location.alamat');

        if ($activeAssignment) {
            $assignmentQuery->where('station_operators.id_location', $activeAssignment->id_location);
        }

        $assignment = $assignmentQuery->first();

        return response()->json([
            'status' => 'success',
            'data' => [
                'user' => $user,
                'profile' => $profile,
                'assignment' => $assignment,
            ],
        ]);
    }

    /** Mengubah data kontak operator tanpa membuka perubahan identitas, role, email, atau penugasan. */
    public function updateProfile(Request $request)
    {
        $data = $request->validate([
            'nomor_telepon' => ['required', 'string', 'regex:/^[0-9]{1,15}$/'],
            'alamat' => 'nullable|string|max:1000',
        ], [
            'nomor_telepon.regex' => 'Nomor telepon hanya boleh berisi angka, maksimal 15 digit.',
        ]);
        DB::table('user_profile')->updateOrInsert(
            ['id_user' => $request->user()->id_user],
            $data + ['updated_at' => now(), 'created_at' => now()]
        );

        return response()->json(['status' => 'success', 'message' => 'Informasi akun berhasil diperbarui.']);
    }

    /**
     * 1. Mengambil daftar notifikasi malfungsi dan aktivitas transaksi stasiun
     */
    /** Mengambil notifikasi operasional (gangguan unit & transaksi driver) pada station operator. */
    public function getNotifications(Request $request)
    {
        $assignment = $this->getOperatorAssignment($request->user());
        if (! $assignment) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        // A. Malfungsi Unit (dari tabel error_log)
        $malfunctions = DB::table('error_log')
            ->join('charger', 'error_log.id_charger', '=', 'charger.id_charger')
            ->leftJoin('charging_session', 'error_log.id_session', '=', 'charging_session.id_session')
            ->leftJoin('ports', 'charging_session.id_port', '=', 'ports.id_port')
            ->where('charger.id_location', $assignment->id_location)
            ->where('error_log.status_tanganan', '!=', 'Selesai')
            ->select(
                'error_log.id_log',
                'error_log.id_charger',
                'error_log.id_session',
                'charger.kode_perangkat',
                'charger.status_mesin',
                'ports.nomor_port',
                'error_log.jenis_error',
                'error_log.desk_mslh as deskripsi',
                'error_log.status_tanganan',
                'error_log.waktu_terjadi',
                'error_log.created_at'
            )
            ->orderByDesc('error_log.created_at')
            ->get()
            ->map(function ($row) {
                $occurredAt = $row->waktu_terjadi ?? $row->created_at;

                return [
                    'id_log' => (int) $row->id_log,
                    'id_charger' => (int) $row->id_charger,
                    'id_session' => $row->id_session ? (int) $row->id_session : null,
                    'kode_perangkat' => $row->kode_perangkat,
                    'status_mesin' => $row->status_mesin,
                    'nomor_port' => $row->nomor_port,
                    'jenis_error' => $row->jenis_error,
                    'deskripsi' => $row->deskripsi,
                    'status_tanganan' => $row->status_tanganan,
                    'waktu_terjadi' => $occurredAt ? Carbon::parse($occurredAt)->toIso8601String() : null,
                    'created_at' => $row->created_at ? Carbon::parse($row->created_at)->toIso8601String() : null,
                ];
            })
            ->values();

        // B. Aktivitas Transaksi Driver pada stasiun (mulai, selesai, maupun gagal/dibatalkan)
        $transactions = DB::table('charging_session')
            ->join('charger', 'charging_session.id_charger', '=', 'charger.id_charger')
            ->leftJoin('ports', 'charging_session.id_port', '=', 'ports.id_port')
            ->leftJoin('users', 'charging_session.id_user', '=', 'users.id_user')
            ->leftJoin('user_profile', 'users.id_user', '=', 'user_profile.id_user')
            ->leftJoin('vehicle', 'charging_session.id_vehicle', '=', 'vehicle.id_vehicle')
            ->leftJoin('payment', 'charging_session.id_session', '=', 'payment.id_session')
            ->leftJoin('metode_pembayaran', 'payment.id_metode', '=', 'metode_pembayaran.id_metode')
            ->where('charger.id_location', $assignment->id_location)
            ->select(
                'charging_session.id_session as id_transaksi',
                'charging_session.status as status_sesi',
                'charging_session.total_energi_kwh',
                'charging_session.saldo_hold',
                'charging_session.waktu_mulai',
                'charging_session.waktu_selesai',
                'charging_session.created_at',
                'charging_session.updated_at',
                'charger.kode_perangkat',
                'ports.nomor_port',
                'user_profile.nama_lengkap as nama_driver',
                'users.email as email_driver',
                'vehicle.model as kendaraan_model',
                'vehicle.nomor_polisi',
                'payment.total_bayar',
                'payment.status_pembayaran',
                'payment.waktu_pembayaran',
                'metode_pembayaran.nama_metode as metode_pembayaran'
            )
            ->orderByRaw('COALESCE(payment.waktu_pembayaran, charging_session.waktu_selesai, charging_session.waktu_mulai, charging_session.created_at) DESC')
            ->limit(25)
            ->get()
            ->map(function ($row) {
                $statusSesi = (string) ($row->status_sesi ?? 'Pending');
                $statusPembayaran = $row->status_pembayaran ? (string) $row->status_pembayaran : null;
                $isIssue = in_array(strtolower($statusSesi), ['gagal', 'dibatalkan'], true) || $statusPembayaran === 'Gagal';
                $totalBiaya = (int) ($row->total_bayar ?? $row->saldo_hold ?? 0);
                $energiKwh = round((float) ($row->total_energi_kwh ?? 0), 2);
                $metode = $row->metode_pembayaran ?? 'Dompet Digital';
                $driverName = $row->nama_driver ?: ($row->email_driver ?: 'Pengemudi');
                $vehicleText = trim(($row->kendaraan_model ?? '').' '.($row->nomor_polisi ?? ''));
                $activityTime = $row->waktu_pembayaran ?? $row->waktu_selesai ?? $row->waktu_mulai ?? $row->created_at;

                if ($isIssue) {
                    $keterangan = "Sesi {$statusSesi}".($statusPembayaran ? " · Pembayaran: {$statusPembayaran}" : '');
                } elseif ($statusSesi === 'Berlangsung') {
                    $keterangan = 'Sesi charging baru dimulai · Dana hold Rp '.number_format($row->saldo_hold ?? $totalBiaya, 0, ',', '.');
                } elseif ($statusSesi === 'Selesai') {
                    $keterangan = 'Transaksi selesai ('.number_format($energiKwh, 2, ',', '.').' kWh) · Pembayaran '.($statusPembayaran ?? 'Sukses');
                } else {
                    $keterangan = "Status sesi: {$statusSesi}";
                }

                return [
                    'id_transaksi' => (int) $row->id_transaksi,
                    'kode_transaksi' => 'SES-'.$row->id_transaksi,
                    'status_sesi' => $statusSesi,
                    'status_pembayaran' => $statusPembayaran,
                    'is_issue' => $isIssue,
                    'kode_perangkat' => $row->kode_perangkat,
                    'nomor_port' => $row->nomor_port,
                    'nama_driver' => $driverName,
                    'kendaraan' => $vehicleText ?: null,
                    'energi_kwh' => $energiKwh,
                    'total_biaya' => $totalBiaya,
                    'metode_pembayaran' => $metode,
                    'keterangan' => $keterangan,
                    'waktu_aktivitas' => $activityTime ? Carbon::parse($activityTime)->toIso8601String() : null,
                    'created_at' => $row->created_at ? Carbon::parse($row->created_at)->toIso8601String() : null,
                ];
            })
            ->values();

        return response()->json([
            'status' => 'success',
            'data' => [
                'id_location' => (int) $assignment->id_location,
                'malfunctions' => $malfunctions,
                'transactions' => $transactions,
                'total_unread' => $malfunctions->count() + $transactions->count(),
            ],
        ]);
    }

    /**
     * 2. Menerima malfungsi: Otomatis ubah status mesin menjadi 'Maintenance'
     */
    /** Mencatat tindakan operator atas laporan gangguan charger. */
    public function handleMalfunctionAction(Request $request, $idCharger, $idLog)
    {
        $reason = $request->validate([
            'alasan' => ['required', 'string', 'min:5', 'max:500'],
        ])['alasan'];
        $assignment = $this->getOperatorAssignment($request->user());
        if (! $assignment) {
            return response()->json(['message' => 'Akun operator belum ditugaskan ke station manapun.'], 403);
        }

        $charger = DB::table('charger')
            ->where('id_charger', $idCharger)
            ->where('id_location', $assignment->id_location)
            ->first();
        $errorLog = DB::table('error_log')
            ->where('id_log', $idLog)
            ->where('id_charger', $idCharger)
            ->first();
        if (! $charger || ! $errorLog) {
            return response()->json(['message' => 'Laporan gangguan tidak ditemukan pada station penugasan.'], 404);
        }

        // Settlement sesi dan perubahan status berjalan dalam satu transaksi.
        DB::transaction(function () use ($request, $assignment, $charger, $errorLog, $idCharger, $idLog, $reason): void {
            $statusResponse = $this->updateChargerStatus(
                $request,
                $idCharger,
                'Maintenance',
                'Status unit charger berhasil dialihkan ke mode Maintenance.'
            );
            if ($statusResponse->getStatusCode() >= 400) {
                throw ValidationException::withMessages([
                    'status' => $statusResponse->getData()->message ?? 'Status charger tidak dapat diperbarui.',
                ]);
            }

            // Perbarui status laporan gangguan dan rekam konteks tindak lanjut.
            DB::table('error_log')->where('id_log', $idLog)->update([
                'status_tanganan' => 'Sedang Ditangani',
                'updated_at' => now(),
            ]);
            AuditLog::create([
                'id_user' => $request->user()->id_user,
                'id_location' => $assignment->id_location,
                'aksi' => 'tangani_gangguan_charger',
                'entitas' => 'charger',
                'id_entitas' => (string) $idCharger,
                'data_sebelum' => ['status' => $charger->status_mesin, 'status_laporan' => $errorLog->status_tanganan],
                'data_sesudah' => ['status' => 'Maintenance', 'status_laporan' => 'Sedang Ditangani'],
                'alasan' => $reason,
            ]);
        });

        return response()->json([
            'status' => 'success',
            'message' => 'Status unit charger berhasil dialihkan ke mode Maintenance.',
        ]);
    }

    /** Menandai laporan gangguan telah selesai ditangani tanpa memaksa perubahan status unit lain. */
    public function resolveMalfunctionAction(Request $request, $idCharger, $idLog)
    {
        $reason = $request->validate([
            'alasan' => ['required', 'string', 'min:5', 'max:500'],
        ])['alasan'];
        $assignment = $this->getOperatorAssignment($request->user());
        if (! $assignment) {
            return response()->json(['message' => 'Akun operator belum ditugaskan ke station manapun.'], 403);
        }

        $charger = DB::table('charger')
            ->where('id_charger', $idCharger)
            ->where('id_location', $assignment->id_location)
            ->first();
        $errorLog = DB::table('error_log')
            ->where('id_log', $idLog)
            ->where('id_charger', $idCharger)
            ->first();
        if (! $charger || ! $errorLog) {
            return response()->json(['message' => 'Laporan gangguan tidak ditemukan pada station penugasan.'], 404);
        }

        DB::transaction(function () use ($request, $assignment, $errorLog, $idCharger, $idLog, $reason): void {
            DB::table('error_log')->where('id_log', $idLog)->update([
                'status_tanganan' => 'Selesai',
                'updated_at' => now(),
            ]);

            AuditLog::create([
                'id_user' => $request->user()->id_user,
                'id_location' => $assignment->id_location,
                'aksi' => 'selesaikan_gangguan_charger',
                'entitas' => 'charger',
                'id_entitas' => (string) $idCharger,
                'data_sebelum' => ['status_laporan' => $errorLog->status_tanganan],
                'data_sesudah' => ['status_laporan' => 'Selesai'],
                'alasan' => $reason,
            ]);
        });

        return response()->json([
            'status' => 'success',
            'message' => 'Laporan gangguan ditandai selesai.',
        ]);
    }
}
