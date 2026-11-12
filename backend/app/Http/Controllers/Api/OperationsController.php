<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\AuditLog;
use App\Models\Charger;
use App\Models\ChargingSession;
use App\Models\Location;
use App\Models\Payment;
use App\Models\Port;
use App\Models\StationOperator;
use App\Models\Tarif;
use App\Models\User;
use App\Models\UserProfile;
use App\Services\TariffScheduleService;
use Carbon\Carbon;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;

/** Menyediakan operasi station/tarif serta pengelolaan admin dan operator. */
class OperationsController extends Controller
{
    /** Menggabungkan data station, charger, operator, dan ringkasan untuk dashboard staff. */
    public function dashboard(Request $request): JsonResponse
    {
        $this->ensureStaff($request);

        $locationIds = $this->accessibleLocationIds($request);

        $locations = Location::with([
            'chargers.ports',
            'tarifs' => fn ($query) => $query->latest('periode_mulai'),
        ])
            ->when($locationIds !== null, fn ($query) => $query->whereIn('id_location', $locationIds))
            ->orderBy('nama_lokasi')
            ->get();

        $successfulCharging = Payment::query()
            ->where('jenis_pembayaran', 'charging')
            ->where('status_pembayaran', 'Sukses')
            ->when($locationIds !== null, fn ($query) => $query->whereHas('session.charger', fn ($chargerQuery) => $chargerQuery->whereIn('id_location', $locationIds)));

        $sessions = ChargingSession::query()
            ->when($locationIds !== null, fn ($query) => $query->whereHas('charger', fn ($chargerQuery) => $chargerQuery->whereIn('id_location', $locationIds)));

        return response()->json([
            'data' => [
                'role' => $request->user()->peran,
                'summary' => [
                    'total_station' => $locations->count(),
                    'total_charger' => $locations->sum(fn (Location $location) => $location->chargers->count()),
                    // Disesuaikan dengan enum status_mesin ('Active')
                    'charger_tersedia' => Charger::where('status_mesin', 'Active')->when($locationIds !== null, fn ($query) => $query->whereIn('id_location', $locationIds))->count(),
                    // Disesuaikan dengan enum status_mesin ('Maintenance', 'Offline')
                    'charger_gangguan' => Charger::whereIn('status_mesin', ['Maintenance', 'Offline'])->when($locationIds !== null, fn ($query) => $query->whereIn('id_location', $locationIds))->count(),
                    'sesi_berjalan' => (clone $sessions)->where('status', 'Berlangsung')->count(),
                    'pendapatan_bulan_ini' => (clone $successfulCharging)
                        ->whereMonth('waktu_pembayaran', now()->month)
                        ->whereYear('waktu_pembayaran', now()->year)
                        ->sum('total_bayar'),
                ],
                'stations' => $locations->map(fn (Location $location) => $this->presentStation($location))->values(),
                'reports' => [
                    'pendapatan_hari_ini' => (clone $successfulCharging)->whereDate('waktu_pembayaran', today())->sum('total_bayar'),
                    'sesi_selesai' => (clone $sessions)->where('status', 'Selesai')->count(),
                    'sesi_gagal' => (clone $sessions)->whereIn('status', ['Gagal', 'Dibatalkan', 'gagal', 'dibatalkan'])->count(),
                    'energi_terjual_kwh' => round((float) (clone $sessions)->where('status', 'Selesai')->sum('total_energi_kwh'), 2),
                ],
                'operators' => $request->user()->peran === 'admin' ? $this->operators() : [],
            ],
        ]);
    }

    /** Menyusun laporan charging yang dapat difilter oleh rentang tanggal, station, dan charger. */
    public function reports(Request $request): JsonResponse
    {
        $this->ensureStaff($request);

        $filters = $request->validate([
            'from' => ['required', 'date_format:Y-m-d'],
            'to' => ['required', 'date_format:Y-m-d', 'after_or_equal:from'],
            'id_location' => ['nullable', 'integer', 'exists:location,id_location'],
            'id_charger' => ['nullable', 'integer', 'exists:charger,id_charger'],
        ]);
        $allowedLocationIds = $this->accessibleLocationIds($request);
        if (isset($filters['id_location']) && $allowedLocationIds !== null && ! in_array((int) $filters['id_location'], $allowedLocationIds, true)) {
            abort(403, 'Station berada di luar penugasan akun ini.');
        }

        $sessionQuery = ChargingSession::query()
            ->whereDate('waktu_mulai', '>=', $filters['from'])
            ->whereDate('waktu_mulai', '<=', $filters['to'])
            ->when(isset($filters['id_charger']), fn ($query) => $query->where('id_charger', $filters['id_charger']))
            ->when(isset($filters['id_location']), fn ($query) => $query->whereHas('charger', fn ($chargerQuery) => $chargerQuery->where('id_location', $filters['id_location'])))
            ->when($allowedLocationIds !== null, fn ($query) => $query->whereHas('charger', fn ($chargerQuery) => $chargerQuery->whereIn('id_location', $allowedLocationIds)));

        $paymentQuery = Payment::query()
            ->where('jenis_pembayaran', 'charging')
            ->where('status_pembayaran', 'Sukses')
            ->whereDate('waktu_pembayaran', '>=', $filters['from'])
            ->whereDate('waktu_pembayaran', '<=', $filters['to'])
            ->when(isset($filters['id_charger']), fn ($query) => $query->whereHas('session', fn ($session) => $session->where('id_charger', $filters['id_charger'])))
            ->when(isset($filters['id_location']), fn ($query) => $query->whereHas('session.charger', fn ($charger) => $charger->where('id_location', $filters['id_location'])))
            ->when($allowedLocationIds !== null, fn ($query) => $query->whereHas('session.charger', fn ($charger) => $charger->whereIn('id_location', $allowedLocationIds)));

        $stationQuery = Location::query()
            ->with(['chargers.ports'])
            ->when(isset($filters['id_location']), fn ($query) => $query->where('id_location', $filters['id_location']))
            ->when(isset($filters['id_charger']), fn ($query) => $query->whereHas('chargers', fn ($charger) => $charger->where('id_charger', $filters['id_charger'])))
            ->when($allowedLocationIds !== null, fn ($query) => $query->whereIn('id_location', $allowedLocationIds))
            ->orderBy('nama_lokasi')
            ->get();

        return response()->json([
            'data' => [
                'filters' => $filters,
                'summary' => [
                    'pendapatan' => (clone $paymentQuery)->sum('total_bayar'),
                    'sesi_selesai' => (clone $sessionQuery)->where('status', 'Selesai')->count(),
                    'sesi_terhenti' => (clone $sessionQuery)->whereIn('status', ['Gagal', 'Dibatalkan'])->count(),
                    'energi_kwh' => round((float) (clone $sessionQuery)->where('status', 'Selesai')->sum('total_energi_kwh'), 2),
                ],
                'stations' => $stationQuery->map(function (Location $station) use ($filters, $allowedLocationIds): array {
                    $reportChargers = $station->chargers->when(
                        isset($filters['id_charger']),
                        fn ($chargers) => $chargers->where('id_charger', (int) $filters['id_charger'])
                    );
                    $stationSessions = ChargingSession::query()
                        ->whereDate('waktu_mulai', '>=', $filters['from'])
                        ->whereDate('waktu_mulai', '<=', $filters['to'])
                        ->whereHas('charger', function ($chargerQuery) use ($station, $filters): void {
                            $chargerQuery->where('id_location', $station->id_location)
                                ->when(isset($filters['id_charger']), fn ($query) => $query->where('id_charger', $filters['id_charger']));
                        })
                        ->when($allowedLocationIds !== null, fn ($query) => $query->whereHas('charger', fn ($charger) => $charger->whereIn('id_location', $allowedLocationIds)));

                    $stationPayments = Payment::query()
                        ->where('jenis_pembayaran', 'charging')
                        ->where('status_pembayaran', 'Sukses')
                        ->whereDate('waktu_pembayaran', '>=', $filters['from'])
                        ->whereDate('waktu_pembayaran', '<=', $filters['to'])
                        ->whereHas('session.charger', function ($chargerQuery) use ($station, $filters): void {
                            $chargerQuery->where('id_location', $station->id_location)
                                ->when(isset($filters['id_charger']), fn ($query) => $query->where('id_charger', $filters['id_charger']));
                        });

                    return [
                        'id_location' => $station->id_location,
                        'nama_lokasi' => $station->nama_lokasi,
                        'status' => $station->status_loc,
                        'jumlah_charger' => $reportChargers->count(),
                        'port_tersedia' => $station->status_loc === 'Aktif'
                            ? $reportChargers->where('status_mesin', 'Active')->flatMap->ports->where('status_port', Port::AVAILABLE)->count()
                            : 0,
                        'sesi_selesai' => (clone $stationSessions)->where('status', 'Selesai')->count(),
                        'energi_kwh' => round((float) (clone $stationSessions)->where('status', 'Selesai')->sum('total_energi_kwh'), 2),
                        'pendapatan' => (clone $stationPayments)->sum('total_bayar'),
                    ];
                })->values(),
            ],
        ]);
    }

    /** Memvalidasi lalu memperbarui informasi dan status sebuah lokasi station. */
    public function updateStation(Request $request, Location $station): JsonResponse
    {
        $this->ensureStaff($request);
        $this->ensureStationAccess($request, $station);

        $rules = [
            'nama_lokasi' => ['sometimes', 'string', 'max:255'],
            'alamat' => ['sometimes', 'string'],
            'latitude' => ['sometimes', 'numeric', 'between:-90,90'],
            'longitude' => ['sometimes', 'numeric', 'between:-180,180'],
            'jam_buka' => ['sometimes', 'date_format:H:i'],
            'jam_tutup' => ['sometimes', 'date_format:H:i'],
            'status_loc' => ['sometimes', Rule::in(['Aktif', 'Nonaktif', 'Maintenance'])],
            'alasan' => ['required', 'string', 'min:5', 'max:500'],
        ];
        if ($request->user()->peran !== 'admin') {
            $rules = ['status_loc' => $rules['status_loc'], 'alasan' => $rules['alasan']];
        }
        $data = $request->validate($rules);
        // Station hanya dapat diaktifkan bila sekurangnya satu akun Operator aktif ditugaskan.
        if (($data['status_loc'] ?? null) === 'Aktif' && ! StationOperator::where('id_location', $station->id_location)
            ->whereHas('user', fn ($query) => $query->where('peran', 'operator')->where('status_akun', 'Aktif'))
            ->exists()) {
            throw ValidationException::withMessages([
                'status_loc' => 'Station harus memiliki sekurangnya satu Operator aktif sebelum dapat diaktifkan.',
            ]);
        }
        $before = $station->only(['nama_lokasi', 'alamat', 'latitude', 'longitude', 'jam_buka', 'jam_tutup', 'status_loc']);
        $reason = $data['alasan'];
        unset($data['alasan']);

        $station->update($data);
        if ($before !== $station->fresh()->only(array_keys($before))) {
            AuditLog::create([
                'id_user' => $request->user()->id_user,
                'id_location' => $station->id_location,
                'aksi' => 'ubah_station',
                'entitas' => 'station',
                'id_entitas' => (string) $station->id_location,
                'data_sebelum' => $before,
                'data_sesudah' => $station->fresh()->only(array_keys($before)),
                'alasan' => $reason,
            ]);
        }

        return response()->json([
            'message' => 'Data station berhasil diperbarui.',
            'data' => $this->presentStation($station->fresh(['chargers.ports', 'tarifs'])),
        ]);
    }

    /** Membuat lokasi station baru beserta data awal yang diperlukan. */
    public function createStation(Request $request): JsonResponse
    {
        $this->ensureAdmin($request);

        $data = $request->validate([
            'nama_lokasi' => ['required', 'string', 'max:255'],
            'alamat' => ['required', 'string'],
            'latitude' => ['required', 'numeric', 'between:-90,90'],
            'longitude' => ['required', 'numeric', 'between:-180,180'],
            'jam_buka' => ['required', 'date_format:H:i'],
            'jam_tutup' => ['required', 'date_format:H:i'],
            'status_loc' => ['required', Rule::in(['Aktif', 'Nonaktif', 'Maintenance'])], // Format Kapital
        ]);

        return DB::transaction(function () use ($data, $request): JsonResponse {
            $lastCodeNumber = (int) Location::query()
                ->whereNotNull('kode_station')
                ->selectRaw('MAX(CAST(SUBSTRING(kode_station, 7) AS UNSIGNED)) as last_code_number')
                ->value('last_code_number');
            $data['status_loc'] = 'Nonaktif';
            $data['kode_station'] = sprintf('SPKLU-%04d', $lastCodeNumber + 1);
            $station = Location::create($data);

            AuditLog::create([
                'id_user' => $request->user()->id_user,
                'id_location' => $station->id_location,
                'aksi' => 'buat_station',
                'entitas' => 'station',
                'id_entitas' => (string) $station->id_location,
                'data_sebelum' => [],
                'data_sesudah' => $station->only(['kode_station', 'nama_lokasi', 'alamat', 'latitude', 'longitude', 'jam_buka', 'jam_tutup', 'status_loc']),
            ]);

            return response()->json([
                'message' => 'Station baru berhasil ditambahkan.',
                'data' => $this->presentStation($station->fresh(['chargers.ports', 'tarifs'])),
            ], 201);
        });
    }

    /** Mencari alamat secara eksplisit melalui proxy geocoding yang dibatasi dan menyimpan hasil di cache. */
    public function searchStationLocations(Request $request): JsonResponse
    {
        $this->ensureAdmin($request);
        $data = $request->validate(['query' => ['required', 'string', 'min:3', 'max:200']]);
        $query = trim($data['query']);
        $cacheKey = 'station-geocode:'.sha1(mb_strtolower($query));

        if (Cache::has($cacheKey)) {
            return response()->json(['data' => Cache::get($cacheKey)]);
        }

        $rateLimitKey = 'nominatim-geocode-global';
        if (RateLimiter::tooManyAttempts($rateLimitKey, 1)) {
            return response()->json(['message' => 'Tunggu sebentar sebelum mencari lokasi lagi.'], 429)
                ->header('Retry-After', (string) RateLimiter::availableIn($rateLimitKey));
        }
        RateLimiter::hit($rateLimitKey, 1);

        try {
            $places = Http::timeout(8)
                ->withUserAgent('EVChargeHub/1.0 ('.config('app.url').')')
                ->withHeaders(['Accept-Language' => 'id-ID'])
                ->get('https://nominatim.openstreetmap.org/search', [
                    'format' => 'jsonv2',
                    'countrycodes' => 'id',
                    'limit' => 5,
                    'q' => $query,
                ])
                ->throw()
                ->json();
        } catch (\Throwable $exception) {
            report($exception);

            return response()->json(['message' => 'Pencarian lokasi sedang tidak tersedia. Kamu tetap bisa memilih titik langsung pada peta.'], 502);
        }

        $results = collect($places)->map(fn (array $place): array => [
            'label' => $place['display_name'] ?? 'Lokasi ditemukan',
            'latitude' => (float) ($place['lat'] ?? 0),
            'longitude' => (float) ($place['lon'] ?? 0),
        ])->values()->all();
        Cache::put($cacheKey, $results, now()->addDay());

        return response()->json(['data' => $results]);
    }

    /** Membuat charger pada station staf dan mencatat alasan penambahan di audit. */
    public function createCharger(Request $request, Location $station): JsonResponse
    {
        $this->ensureStaff($request);
        $this->ensureStationAccess($request, $station);
        $data = $request->validate([
            'kode_perangkat' => ['required', 'string', 'max:12', 'unique:charger,kode_perangkat'],
            'merek_model' => ['required', 'string', 'max:255'],
            'kap_tot_kw' => ['required', 'numeric', 'min:1'],
            'status_mesin' => ['sometimes', Rule::in(['Active', 'Maintenance', 'Offline'])],
            'alasan' => ['required', 'string', 'min:5', 'max:500'],
        ]);
        $reason = $data['alasan'];
        unset($data['alasan']);
        $charger = DB::transaction(function () use ($data, $reason, $request, $station): Charger {
            $charger = Charger::create($data + ['id_location' => $station->id_location, 'status_mesin' => $data['status_mesin'] ?? 'Active']);
            AuditLog::create(['id_user' => $request->user()->id_user, 'id_location' => $station->id_location, 'aksi' => 'buat_charger', 'entitas' => 'charger', 'id_entitas' => (string) $charger->id_charger, 'data_sebelum' => [], 'data_sesudah' => $charger->only(['kode_perangkat', 'merek_model', 'kap_tot_kw', 'status_mesin']), 'alasan' => $reason]);

            return $charger;
        });

        return response()->json(['message' => 'Charger berhasil ditambahkan.', 'data' => $this->presentCharger($charger->fresh('ports'))], 201);
    }

    /** Membuat port pada charger yang berada dalam lingkup station staf dan mencatat audit. */
    public function createPort(Request $request, Charger $charger): JsonResponse
    {
        $this->ensureStaff($request);
        $this->ensureStationAccess($request, Location::findOrFail($charger->id_location));
        $data = $request->validate([
            'nomor_port' => ['required', 'string', 'max:50'],
            'tipe_konektor' => ['required', 'string', 'max:50'],
            'tipe_charging' => ['required', Rule::in(['AC', 'DC'])],
            'daya_maks_kw' => ['required', 'numeric', 'min:1'],
            'alasan' => ['required', 'string', 'min:5', 'max:500'],
        ]);
        $reason = $data['alasan'];
        unset($data['alasan']);
        $port = DB::transaction(function () use ($data, $reason, $request, $charger): Port {
            $port = Port::create($data + ['id_charger' => $charger->id_charger, 'status_port' => Port::AVAILABLE]);
            AuditLog::create(['id_user' => $request->user()->id_user, 'id_location' => $charger->id_location, 'aksi' => 'buat_port', 'entitas' => 'port', 'id_entitas' => (string) $port->id_port, 'data_sebelum' => [], 'data_sesudah' => $port->only(['nomor_port', 'tipe_konektor', 'tipe_charging', 'daya_maks_kw', 'status_port']), 'alasan' => $reason]);

            return $port;
        });

        return response()->json(['message' => 'Port berhasil ditambahkan.', 'data' => $port], 201);
    }

    /** Memperbarui unit charger dengan pemeriksaan sesi aktif sebelum perubahan status. */
    public function updateCharger(Request $request, Charger $charger): JsonResponse
    {
        $this->ensureStaff($request);
        $this->ensureStationAccess($request, Location::findOrFail($charger->id_location));

        $data = $request->validate([
            'kode_perangkat' => ['sometimes', 'string', 'max:12', Rule::unique('charger', 'kode_perangkat')->ignore($charger->id_charger, 'id_charger')],
            'merek_model' => ['sometimes', 'string', 'max:255'],
            'kap_tot_kw' => ['sometimes', 'integer', 'min:1'],
            'status_mesin' => ['sometimes', Rule::in(['Active', 'Maintenance', 'Offline'])],
            'alasan' => ['required', 'string', 'min:5', 'max:500'],
        ]);

        if (isset($data['status_mesin']) && $charger->status_mesin === 'Active' && $data['status_mesin'] !== 'Active') {
            $activeSessions = ChargingSession::whereHas('port.charger', function ($query) use ($charger) {
                $query->where('id_charger', $charger->id_charger);
            })->where('status', 'Berlangsung')->get();

            foreach ($activeSessions as $activeSession) {
                $settlement = app(ChargingSessionController::class)->stopByOperator($request, $activeSession);
                if ($settlement->getStatusCode() >= 400) {
                    throw ValidationException::withMessages(['sesi' => $settlement->getData()->message ?? 'Sesi aktif tidak dapat diselesaikan.']);
                }
            }
        }

        $reason = $data['alasan'];
        unset($data['alasan']);
        $before = $charger->only(['kode_perangkat', 'merek_model', 'kap_tot_kw', 'status_mesin']);
        $charger->update($data);
        $after = $charger->fresh()->only(array_keys($before));
        if ($before !== $after) {
            AuditLog::create([
                'id_user' => $request->user()->id_user,
                'id_location' => $charger->id_location,
                'aksi' => 'ubah_data_charger',
                'entitas' => 'charger',
                'id_entitas' => (string) $charger->id_charger,
                'data_sebelum' => $before,
                'data_sesudah' => $after,
                'alasan' => $reason,
            ]);
        }

        return response()->json([
            'message' => 'Status unit charger berhasil diperbarui.',
            'data' => $this->presentCharger($charger->fresh('ports')),
        ]);
    }

    /** Memperbarui detail teknis port dengan alasan dan jejak audit wajib. */
    public function updatePort(Request $request, Port $port): JsonResponse
    {
        $this->ensureStaff($request);
        $charger = Charger::findOrFail($port->id_charger);
        $this->ensureStationAccess($request, Location::findOrFail($charger->id_location));

        $data = $request->validate([
            'nomor_port' => ['sometimes', 'string', 'max:50'],
            'tipe_konektor' => ['sometimes', 'string', 'max:50'],
            'tipe_charging' => ['sometimes', Rule::in(['AC', 'DC'])],
            'daya_maks_kw' => ['sometimes', 'numeric', 'min:1'],
            'status_port' => ['sometimes', Rule::in(['Available', 'Out of Order', 'Maintenance'])],
            'alasan' => ['required', 'string', 'min:5', 'max:500'],
        ]);

        if (isset($data['status_port']) && $data['status_port'] !== $port->status_port && $data['status_port'] !== Port::AVAILABLE) {
            $activeSession = ChargingSession::where('id_port', $port->id_port)->where('status', 'Berlangsung')->first();
            if ($activeSession) {
                $settlement = app(ChargingSessionController::class)->stopByOperator($request, $activeSession);
                if ($settlement->getStatusCode() >= 400) {
                    throw ValidationException::withMessages(['sesi' => $settlement->getData()->message ?? 'Sesi aktif tidak dapat diselesaikan.']);
                }
            }
        }

        $reason = $data['alasan'];
        unset($data['alasan']);
        $before = $port->only(['nomor_port', 'tipe_konektor', 'tipe_charging', 'daya_maks_kw', 'status_port']);
        $port->update($data);
        $after = $port->fresh()->only(array_keys($before));

        if ($before !== $after) {
            AuditLog::create([
                'id_user' => $request->user()->id_user,
                'id_location' => $charger->id_location,
                'aksi' => 'ubah_data_port',
                'entitas' => 'port',
                'id_entitas' => (string) $port->id_port,
                'data_sebelum' => $before,
                'data_sesudah' => $after,
                'alasan' => $reason,
            ]);
        }

        return response()->json([
            'message' => 'Data teknis port berhasil diperbarui.',
            'data' => $port->fresh(),
        ]);
    }

    /** Menjadwalkan tarif baru untuk lokasi tanpa mengubah tarif sesi yang sudah berjalan. */
    public function updateTarif(Request $request, Location $station): JsonResponse
    {
        $this->ensureStaff($request);
        $this->ensureStationAccess($request, $station);

        $data = $request->validate([
            'harga_per_kwh' => ['required', 'integer', 'min:100'],
            'biaya_minimum' => ['sometimes', 'nullable', 'integer', 'min:0'],
            'biaya_parkir_flat' => ['required', 'integer', 'min:0'],
            'mode' => ['required', Rule::in(['immediate', 'scheduled'])],
            'effective_at' => ['required_if:mode,scheduled', 'date', 'after:now'],
        ]);
        $data['biaya_minimum'] = (int) ($data['biaya_minimum'] ?? 0);
        $tarif = app(TariffScheduleService::class)->create($station, $request->user(), $data);

        return response()->json([
            'message' => 'Tarif baru berhasil disimpan.',
            'data' => $tarif,
        ], 201);
    }

    /** Mengubah jadwal tarif yang belum berlaku pada station yang dapat dikelola staf. */
    public function rescheduleTarif(Request $request, Tarif $tarif): JsonResponse
    {
        $this->ensureStaff($request);
        $station = Location::findOrFail($tarif->id_location);
        $this->ensureStationAccess($request, $station);
        $data = $request->validate([
            'harga_per_kwh' => ['required', 'integer', 'min:100'],
            'biaya_minimum' => ['sometimes', 'nullable', 'integer', 'min:0'],
            'biaya_parkir_flat' => ['required', 'integer', 'min:0'],
            'effective_at' => ['required', 'date', 'after:now'],
        ]);
        $data['biaya_minimum'] = (int) ($data['biaya_minimum'] ?? $tarif->biaya_minimum ?? 0);

        $updatedTariff = app(TariffScheduleService::class)->reschedule($tarif, $request->user(), $data);

        return response()->json(['message' => 'Jadwal tarif berhasil diperbarui.', 'data' => $updatedTariff]);
    }

    /** Membatalkan tarif terjadwal sebelum waktu berlakunya. */
    public function cancelTarif(Request $request, Tarif $tarif): JsonResponse
    {
        $this->ensureStaff($request);
        $this->ensureStationAccess($request, Location::findOrFail($tarif->id_location));
        app(TariffScheduleService::class)->cancelScheduled($tarif, $request->user());

        return response()->json(['message' => 'Jadwal tarif berhasil dibatalkan.']);
    }

    /** Membuat akun operator dan data penugasannya dalam transaksi database. */
    public function createOperator(Request $request): JsonResponse
    {
        $this->ensureAdmin($request);

        $data = $request->validate([
            'nama_lengkap' => ['required', 'string', 'max:255'],
            'email' => ['required', 'email', 'regex:/^[A-Za-z0-9]+(?:[._-][A-Za-z0-9]+)*@ops\.ac\.id$/i', 'unique:users,email'],
            'password' => ['required', 'string', 'min:6'],
            'nomor_telepon' => ['required', 'string', 'regex:/^[0-9]{1,13}$/'],
            'id_locations' => ['sometimes', 'array'],
            'id_locations.*' => ['integer', 'distinct', 'exists:location,id_location'],
        ]);

        $operator = DB::transaction(function () use ($data, $request): User {
            $user = User::create([
                'id_user' => $this->nextUserId('OPS'),
                'email' => $data['email'],
                'password' => Hash::make($data['password']),
                'peran' => 'operator',
                'status_akun' => 'Aktif', // Format Kapital
            ]);

            UserProfile::create([
                'id_user' => $user->id_user,
                'nama_lengkap' => $data['nama_lengkap'],
                'nomor_telepon' => $data['nomor_telepon'],
                'alamat' => 'Belum diisi',
                'tanggal_lahir' => '2000-01-01',
            ]);

            foreach ($data['id_locations'] ?? [] as $locationId) {
                StationOperator::create([
                    'id_user' => $user->id_user,
                    'id_location' => $locationId,
                ]);
            }

            AuditLog::create([
                'id_user' => $request->user()->id_user,
                'aksi' => 'buat_operator',
                'entitas' => 'operator',
                'id_entitas' => $user->id_user,
                'data_sebelum' => [],
                'data_sesudah' => [
                    'id_user' => $user->id_user,
                    'email' => $user->email,
                    'status_akun' => $user->status_akun,
                    'id_locations' => $data['id_locations'] ?? [],
                ],
            ]);

            return $user->load('profile');
        });

        return response()->json([
            'message' => 'Akun operator berhasil dibuat.',
            'data' => $operator,
        ], 201);
    }

    /** Mengubah lokasi kerja yang ditugaskan kepada operator. */
    public function assignOperator(Request $request, string $operator): JsonResponse
    {
        $this->ensureAdmin($request);

        $user = User::where('id_user', $operator)->where('peran', 'operator')->firstOrFail();

        $data = $request->validate([
            'id_locations' => ['required', 'array'],
            'id_locations.*' => ['integer', 'distinct', 'exists:location,id_location'],
        ]);
        DB::transaction(function () use ($data, $request, $user): void {
            $before = StationOperator::where('id_user', $user->id_user)
                ->pluck('id_location')
                ->map(fn ($id) => (int) $id)
                ->all();
            StationOperator::where('id_user', $user->id_user)->delete();
            foreach ($data['id_locations'] as $locationId) {
                StationOperator::create(['id_user' => $user->id_user, 'id_location' => $locationId]);
            }
            AuditLog::create([
                'id_user' => $request->user()->id_user,
                'aksi' => 'ubah_penugasan_operator',
                'entitas' => 'operator',
                'id_entitas' => $user->id_user,
                'data_sebelum' => ['id_locations' => $before],
                'data_sesudah' => ['id_locations' => $data['id_locations']],
            ]);
        });

        return response()->json([
            'message' => 'Penugasan station operator berhasil diperbarui.',
            'data' => collect($this->operators())->firstWhere('id_user', $user->id_user),
        ]);
    }

    /** Mengganti seluruh daftar Operator pada satu station tanpa mengubah penugasan station lain. */
    public function assignStationOperators(Request $request, Location $station): JsonResponse
    {
        $this->ensureAdmin($request);
        $data = $request->validate([
            'id_operators' => ['present', 'array'],
            'id_operators.*' => ['string', 'distinct', Rule::exists('users', 'id_user')->where(fn ($query) => $query->where('peran', 'operator'))],
        ]);
        $operatorIds = collect($data['id_operators'])->values()->all();
        if ($station->status_loc === 'Aktif' && $operatorIds === []) {
            throw ValidationException::withMessages([
                'id_operators' => 'Station aktif harus memiliki minimal satu Operator. Nonaktifkan station atau tetapkan petugas pengganti terlebih dahulu.',
            ]);
        }
        $inactiveSelected = User::whereIn('id_user', $operatorIds)->where('status_akun', '!=', 'Aktif')->exists();
        if ($inactiveSelected) {
            throw ValidationException::withMessages(['id_operators' => 'Hanya akun Operator aktif yang dapat ditugaskan ke station.']);
        }

        $before = StationOperator::where('id_location', $station->id_location)->pluck('id_user')->all();
        DB::transaction(function () use ($operatorIds, $before, $request, $station): void {
            StationOperator::where('id_location', $station->id_location)->delete();
            foreach ($operatorIds as $operatorId) {
                StationOperator::create(['id_user' => $operatorId, 'id_location' => $station->id_location]);
            }
            $after = StationOperator::where('id_location', $station->id_location)->pluck('id_user')->all();
            if (collect($before)->sort()->values()->all() !== collect($after)->sort()->values()->all()) {
                AuditLog::create([
                    'id_user' => $request->user()->id_user,
                    'id_location' => $station->id_location,
                    'aksi' => 'ubah_petugas_station',
                    'entitas' => 'station',
                    'id_entitas' => (string) $station->id_location,
                    'data_sebelum' => ['id_operators' => $before],
                    'data_sesudah' => ['id_operators' => $after],
                ]);
            }
        });

        return response()->json(['message' => 'Daftar petugas station berhasil diperbarui.']);
    }

    /** Mengaktifkan atau menonaktifkan akun operator dari panel admin. */
    public function updateOperatorStatus(Request $request, string $operator): JsonResponse
    {
        $this->ensureAdmin($request);

        $user = User::where('id_user', $operator)->where('peran', 'operator')->firstOrFail();

        $data = $request->validate([
            'status_akun' => ['required', Rule::in(['Aktif', 'Nonaktif', 'Suspend', 'Banned'])],
        ]);

        $oldStatus = $user->status_akun;
        $user->update(['status_akun' => $data['status_akun']]);
        AuditLog::create([
            'id_user' => $request->user()->id_user,
            'aksi' => 'ubah_status_operator',
            'entitas' => 'operator',
            'id_entitas' => $user->id_user,
            'data_sebelum' => ['status_akun' => $oldStatus],
            'data_sesudah' => ['status_akun' => $user->status_akun],
        ]);

        return response()->json([
            'message' => "Status akun operator berhasil diubah menjadi {$data['status_akun']}.",
            'data' => collect($this->operators())->firstWhere('id_user', $user->id_user),
        ]);
    }

    /** Mengumpulkan aktivitas transaksi, charging, dan gangguan untuk audit admin. */
    public function auditLogs(Request $request): JsonResponse
    {
        $this->ensureAdmin($request);

        // 1. Audit Transaksi Sesi Pengisian & Pembayaran
        $transaksiLogs = ChargingSession::with(['charger.location', 'user.profile', 'payment'])
            ->latest('created_at')
            ->limit(30)
            ->get()
            ->map(function ($s) {
                return [
                    'id' => 'TRX-'.$s->id_session,
                    'kategori' => 'Transaksi Charging',
                    'aktor' => $s->user?->profile?->nama_lengkap ?? $s->id_user,
                    'stasiun' => $s->charger?->location?->nama_lokasi ?? 'Stasiun SPKLU',
                    'detail' => "Sesi di {$s->charger?->kode_perangkat} ({$s->total_energi_kwh} kWh, status: {$s->status})",
                    'nominal' => $s->payment?->total_bayar ?? $s->saldo_hold,
                    'status' => $s->status,
                    'timestamp' => $s->created_at ? $s->created_at->format('Y-m-d H:i:s') : '-',
                ];
            });

        // 2. Audit Perubahan Tarif
        $tarifLogs = AuditLog::with(['user.profile', 'location'])
            ->where('entitas', 'tarif')
            ->latest('created_at')
            ->limit(30)
            ->get()
            ->map(function (AuditLog $log) {
                return [
                    'id' => 'AUD-'.$log->id_audit,
                    'kategori' => 'Perubahan Tarif',
                    'aktor' => $log->user?->profile?->nama_lengkap ?? $log->user?->email ?? 'Akun dihapus',
                    'stasiun' => $log->location?->nama_lokasi ?? 'Station dihapus',
                    'detail' => $log->aksi.' · sebelum: '.json_encode($log->data_sebelum, JSON_UNESCAPED_UNICODE).' · sesudah: '.json_encode($log->data_sesudah, JSON_UNESCAPED_UNICODE),
                    'nominal' => ($log->data_sesudah ?? [])['harga_per_kwh'] ?? 0,
                    'status' => str_replace('_', ' ', $log->aksi),
                    'timestamp' => $log->created_at?->format('Y-m-d H:i:s') ?? '-',
                ];
            });

        $changeLogs = AuditLog::with(['user.profile', 'location'])
            ->whereIn('entitas', ['station', 'charger', 'port', 'operator', 'charging_session', 'system_config'])
            ->latest('created_at')
            ->limit(50)
            ->get()
            ->map(fn (AuditLog $log): array => [
                'id' => 'AUD-'.$log->id_audit,
                'kategori' => str_replace('_', ' ', $log->aksi),
                'aktor' => $log->user?->profile?->nama_lengkap ?? $log->user?->email ?? 'Akun dihapus',
                'stasiun' => $log->location?->nama_lokasi ?? '—',
                'detail' => 'Sebelum: '.json_encode($log->data_sebelum, JSON_UNESCAPED_UNICODE).' · Sesudah: '.json_encode($log->data_sesudah, JSON_UNESCAPED_UNICODE).($log->alasan ? ' · Alasan: '.$log->alasan : ''),
                'nominal' => 0,
                'status' => 'Tercatat',
                'timestamp' => $log->created_at?->format('Y-m-d H:i:s') ?? '-',
            ]);

        // 3. Audit Gangguan Perangkat (Error Log)
        $gangguanLogs = DB::table('error_log')
            ->join('charger', 'error_log.id_charger', '=', 'charger.id_charger')
            ->leftJoin('location', 'charger.id_location', '=', 'location.id_location')
            ->leftJoin('users', 'error_log.id_user', '=', 'users.id_user')
            ->leftJoin('user_profile', 'users.id_user', '=', 'user_profile.id_user')
            ->select('error_log.*', 'charger.kode_perangkat', 'location.nama_lokasi', 'user_profile.nama_lengkap as nama_pelapor')
            ->latest('error_log.created_at')
            ->limit(20)
            ->get()
            ->map(function ($g) {
                return [
                    'id' => 'ERR-'.$g->id_log,
                    'kategori' => 'Gangguan Perangkat',
                    'aktor' => $g->nama_pelapor ?? 'Sistem / Sensor',
                    'stasiun' => $g->nama_lokasi ?? 'Stasiun SPKLU',
                    'detail' => "{$g->kode_perangkat}: {$g->jenis_error} - ".($g->desk_mslh ?? '-'),
                    'nominal' => 0,
                    'status' => $g->status_tanganan,
                    'timestamp' => Carbon::parse($g->created_at)->format('Y-m-d H:i:s'),
                ];
            });

        return response()->json([
            'status' => 'success',
            'data' => [
                'transaksi' => $transaksiLogs,
                'tarif' => $tarifLogs,
                'gangguan' => $gangguanLogs,
                'perubahan' => $changeLogs,
            ],
        ]);
    }

    /** Membaca konfigurasi sistem yang berlaku. */
    public function getSystemConfig(Request $request): JsonResponse
    {
        $this->ensureAdmin($request);

        return response()->json([
            'status' => 'success',
            'data' => [
                'arrival_radius_m' => (int) config('charging.arrival_radius_m', 200),
                'require_arrival' => (bool) config('charging.require_arrival', true),
                'default_battery_kwh' => (float) config('charging.default_battery_kwh', 50),
                'simulation_speed' => (float) config('charging.simulation_speed', 60),
                'app_name' => config('app.name', 'EVChargeHub'),
            ],
        ]);
    }

    /** Memvalidasi dan menyimpan perubahan konfigurasi sistem oleh admin. */
    public function updateSystemConfig(Request $request): JsonResponse
    {
        $this->ensureAdmin($request);

        $before = [
            'arrival_radius_m' => (int) config('charging.arrival_radius_m', 200),
            'require_arrival' => (bool) config('charging.require_arrival', true),
            'default_battery_kwh' => (float) config('charging.default_battery_kwh', 50),
            'simulation_speed' => (float) config('charging.simulation_speed', 60),
        ];

        $data = $request->validate([
            'arrival_radius_m' => ['required', 'integer', 'min:10', 'max:5000'],
            'require_arrival' => ['required', 'boolean'],
            'default_battery_kwh' => ['required', 'numeric', 'min:10', 'max:200'],
            'simulation_speed' => ['required', 'numeric', 'min:1', 'max:3600'],
        ]);

        config(['charging.arrival_radius_m' => $data['arrival_radius_m']]);
        config(['charging.require_arrival' => $data['require_arrival']]);
        config(['charging.default_battery_kwh' => $data['default_battery_kwh']]);
        config(['charging.simulation_speed' => $data['simulation_speed']]);

        $envPath = base_path('.env');
        if (file_exists($envPath)) {
            $env = file_get_contents($envPath);
            if (str_contains($env, 'CHARGING_ARRIVAL_RADIUS_M=')) {
                $env = preg_replace('/^CHARGING_ARRIVAL_RADIUS_M=.*/m', "CHARGING_ARRIVAL_RADIUS_M={$data['arrival_radius_m']}", $env);
            } else {
                $env .= "\nCHARGING_ARRIVAL_RADIUS_M={$data['arrival_radius_m']}";
            }
            if (str_contains($env, 'CHARGING_REQUIRE_ARRIVAL=')) {
                $env = preg_replace('/^CHARGING_REQUIRE_ARRIVAL=.*/m', 'CHARGING_REQUIRE_ARRIVAL='.($data['require_arrival'] ? 'true' : 'false'), $env);
            } else {
                $env .= "\nCHARGING_REQUIRE_ARRIVAL=".($data['require_arrival'] ? 'true' : 'false');
            }
            if (str_contains($env, 'CHARGING_DEFAULT_BATTERY_KWH=')) {
                $env = preg_replace('/^CHARGING_DEFAULT_BATTERY_KWH=.*/m', "CHARGING_DEFAULT_BATTERY_KWH={$data['default_battery_kwh']}", $env);
            } else {
                $env .= "\nCHARGING_DEFAULT_BATTERY_KWH={$data['default_battery_kwh']}";
            }
            if (str_contains($env, 'CHARGING_SIMULATION_SPEED=')) {
                $env = preg_replace('/^CHARGING_SIMULATION_SPEED=.*/m', "CHARGING_SIMULATION_SPEED={$data['simulation_speed']}", $env);
            } else {
                $env .= "\nCHARGING_SIMULATION_SPEED={$data['simulation_speed']}";
            }
            file_put_contents($envPath, $env);
        }

        AuditLog::create([
            'id_user' => $request->user()->id_user,
            'aksi' => 'ubah_konfigurasi_sistem',
            'entitas' => 'system_config',
            'id_entitas' => 'charging',
            'data_sebelum' => $before,
            'data_sesudah' => $data,
        ]);

        return response()->json([
            'status' => 'success',
            'message' => 'Konfigurasi sistem berhasil diperbarui.',
            'data' => $data,
        ]);
    }

    /** Menolak akses jika pemanggil bukan admin atau operator aktif. */
    private function ensureStaff(Request $request): void
    {
        if (! in_array($request->user()->peran, ['operator', 'admin'], true)) {
            abort(403, 'Hanya operator atau admin yang dapat mengakses dashboard operasional.');
        }
    }

    /** Menolak akses ke operasi khusus jika pemanggil bukan admin. */
    private function ensureAdmin(Request $request): void
    {
        if ($request->user()->peran !== 'admin') {
            abort(403, 'Hanya admin yang dapat mengelola akun operator.');
        }
    }

    /** Mengubah model lokasi beserta charger menjadi format dashboard. */
    private function presentStation(Location $location): array
    {
        $chargers = $location->chargers;
        $tarif = $location->tarifs->first(fn (Tarif $candidate): bool => $candidate->periode_mulai->lessThanOrEqualTo(now()) && $candidate->periode_berakhir->greaterThan(now())
        );
        $scheduledTariffs = $location->tarifs
            ->filter(fn (Tarif $candidate): bool => $candidate->periode_mulai->isFuture())
            ->values()
            ->map(fn (Tarif $candidate): array => [
                'id_tarif' => $candidate->id_tarif,
                'harga_per_kwh' => $candidate->harga_per_kwh,
                'biaya_minimum' => $candidate->biaya_minimum,
                'biaya_parkir_flat' => $candidate->biaya_parkir_flat,
                'periode_mulai' => $candidate->periode_mulai,
                'periode_berakhir' => $candidate->periode_berakhir,
            ]);

        return [
            'id_location' => $location->id_location,
            'nama_lokasi' => $location->nama_lokasi,
            'kode_station' => $location->kode_station,
            'alamat' => $location->alamat,
            'latitude' => (float) $location->latitude,
            'longitude' => (float) $location->longitude,
            'status' => $location->status_loc,
            'jam_buka' => substr((string) $location->jam_buka, 0, 5),
            'jam_tutup' => substr((string) $location->jam_tutup, 0, 5),
            'charger_total' => $chargers->count(),
            'charger_tersedia' => $chargers->where('status_mesin', 'Active')->count(),
            'charger_gangguan' => $chargers->whereIn('status_mesin', ['Maintenance', 'Offline'])->count(),
            'tarif' => $tarif ? [
                'id_tarif' => $tarif->id_tarif,
                'harga_per_kwh' => $tarif->harga_per_kwh,
                'biaya_minimum' => $tarif->biaya_minimum,
                'biaya_parkir_flat' => $tarif->biaya_parkir_flat,
            ] : null,
            'tarif_terjadwal' => $scheduledTariffs,
            'chargers' => $chargers->map(fn (Charger $charger) => $this->presentCharger($charger))->values(),
        ];
    }

    /** Menyusun data unit charger, port, sesi aktif, dan gangguannya. */
    private function presentCharger(Charger $charger): array
    {
        return [
            'id_charger' => $charger->id_charger,
            'kode_perangkat' => $charger->kode_perangkat,
            'merek_model' => $charger->merek_model,
            'kap_tot_kw' => $charger->kap_tot_kw,
            'status' => $charger->status_mesin,
            // Menyertakan relasi ports agar dasbor operasional tahu port apa saja di dalam mesin ini
            'ports' => $charger->relationLoaded('ports') ? $charger->ports->map(fn ($port) => [
                'id_port' => $port->id_port,
                'nomor_port' => $port->nomor_port,
                'tipe_konektor' => $port->tipe_konektor,
                'tipe_charging' => $port->tipe_charging,
                'daya_maks_kw' => $port->daya_maks_kw,
                'status_port' => $port->status_port,
            ])->values() : [],
        ];
    }

    /** Menghasilkan daftar operator beserta station penugasannya. */
    private function operators(): array
    {
        $assignments = DB::table('station_operators')
            ->join('location', 'station_operators.id_location', '=', 'location.id_location')
            ->select('station_operators.id_user', 'station_operators.id_location', 'location.nama_lokasi')
            ->get()
            ->groupBy('id_user');

        return User::with('profile')
            ->where('peran', 'operator')
            ->orderBy('id_user')
            ->get()
            ->map(fn (User $user) => [
                'id_locations' => $assignments->get($user->id_user, collect())->pluck('id_location')->map(fn ($id) => (int) $id)->values(),
                'nama_lokasi' => $assignments->get($user->id_user, collect())->pluck('nama_lokasi')->values(),
                'id_user' => $user->id_user,
                'email' => $user->email,
                'status_akun' => $user->status_akun,
                'nama_lengkap' => $user->profile?->nama_lengkap ?? $user->email,
                'nomor_telepon' => $user->profile?->nomor_telepon,
            ])
            ->values()
            ->all();
    }

    /** Mengembalikan lingkup station untuk staf; null berarti Admin memiliki lingkup global. */
    private function accessibleLocationIds(Request $request): ?array
    {
        if ($request->user()->peran === 'admin') {
            return null;
        }

        return StationOperator::where('id_user', $request->user()->id_user)
            ->pluck('id_location')
            ->map(fn ($id) => (int) $id)
            ->all();
    }

    /** Menolak perubahan jika Operator tidak ditugaskan pada station tersebut. */
    private function ensureStationAccess(Request $request, Location $station): void
    {
        if ($request->user()->peran === 'admin') {
            return;
        }

        $assigned = StationOperator::where('id_user', $request->user()->id_user)
            ->where('id_location', $station->id_location)
            ->exists();
        if (! $assigned) {
            abort(403, 'Station ini tidak termasuk penugasan akun Anda.');
        }
    }

    /** Membuat ID akun berikutnya dengan prefix peran yang diberikan. */
    private function nextUserId(string $prefix): string
    {
        $year = date('Y');
        $lastUser = User::where('id_user', 'LIKE', "{$prefix}-{$year}-%")
            ->orderBy('id_user', 'desc')
            ->first();
        $lastNumber = $lastUser ? (int) substr($lastUser->id_user, -4) : 0;

        return "{$prefix}-{$year}-".str_pad((string) ($lastNumber + 1), 4, '0', STR_PAD_LEFT);
    }
}
