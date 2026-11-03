<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Charger;
use App\Models\ChargingSession;
use App\Models\Location;
use App\Models\Payment;
use App\Models\StationOperator;
use App\Models\Tarif;
use App\Models\User;
use App\Models\UserProfile;
use Carbon\Carbon;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;

class OperationsController extends Controller
{
    public function dashboard(Request $request): JsonResponse
    {
        $this->ensureStaff($request);

        $locations = Location::with([
            'chargers.ports',
            'tarifs' => fn ($query) => $query->latest('periode_mulai'),
        ])
            ->orderBy('nama_lokasi')
            ->get();

        $successfulCharging = Payment::query()
            ->where('jenis_pembayaran', 'charging')
            ->where('status_pembayaran', 'Sukses');

        $sessions = ChargingSession::query();

        return response()->json([
            'data' => [
                'role' => $request->user()->peran,
                'summary' => [
                    'total_station' => $locations->count(),
                    'total_charger' => $locations->sum(fn (Location $location) => $location->chargers->count()),
                    // Disesuaikan dengan enum status_mesin ('Active')
                    'charger_tersedia' => Charger::where('status_mesin', 'Active')->count(),
                    // Disesuaikan dengan enum status_mesin ('Maintenance', 'Offline')
                    'charger_gangguan' => Charger::whereIn('status_mesin', ['Maintenance', 'Offline'])->count(),
                    'sesi_berjalan' => ChargingSession::where('status', 'Berlangsung')->count(),
                    'pendapatan_bulan_ini' => (clone $successfulCharging)
                        ->whereMonth('waktu_pembayaran', now()->month)
                        ->whereYear('waktu_pembayaran', now()->year)
                        ->sum('total_bayar'),
                ],
                'stations' => $locations->map(fn (Location $location) => $this->presentStation($location))->values(),
                'reports' => [
                    'pendapatan_hari_ini' => (clone $successfulCharging)->whereDate('waktu_pembayaran', today())->sum('total_bayar'),
                    'sesi_selesai' => (clone $sessions)->where('status', 'Selesai')->count(),
                    'sesi_gagal' => ChargingSession::whereIn('status', ['gagal', 'dibatalkan'])->count(),
                    'energi_terjual_kwh' => round((float) ChargingSession::where('status', 'Selesai')->sum('total_energi_kwh'), 2),
                ],
                'operators' => $request->user()->peran === 'admin' ? $this->operators() : [],
            ],
        ]);
    }

    public function updateStation(Request $request, Location $station): JsonResponse
    {
        $this->ensureStaff($request);

        $data = $request->validate([
            'nama_lokasi' => ['sometimes', 'string', 'max:255'],
            'alamat' => ['sometimes', 'string'],
            'latitude' => ['sometimes', 'numeric', 'between:-90,90'],
            'longitude' => ['sometimes', 'numeric', 'between:-180,180'],
            'jam_buka' => ['sometimes', 'date_format:H:i'],
            'jam_tutup' => ['sometimes', 'date_format:H:i'],
            'status_loc' => ['sometimes', Rule::in(['Aktif', 'Nonaktif', 'Maintenance'])], // Disesuaikan ke status_loc & Format Kapital
        ]);

        $station->update($data);

        return response()->json([
            'message' => 'Data station berhasil diperbarui.',
            'data' => $this->presentStation($station->fresh(['chargers.ports', 'tarifs'])),
        ]);
    }

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

        $station = Location::create($data);

        return response()->json([
            'message' => 'Station baru berhasil ditambahkan.',
            'data' => $this->presentStation($station->fresh(['chargers.ports', 'tarifs'])),
        ], 201);
    }

    public function updateCharger(Request $request, Charger $charger): JsonResponse
    {
        $this->ensureStaff($request);

        $data = $request->validate([
            // Disesuaikan dengan pilihan ENUM pada tabel charger: Active, Maintenance, Offline
            'status_mesin' => ['required', Rule::in(['Active', 'Maintenance', 'Offline'])],
        ]);

        if ($charger->status_mesin === 'Active' && $data['status_mesin'] !== 'Active') {
            $activeSessionExists = ChargingSession::whereHas('port.charger', function ($query) use ($charger) {
                $query->where('id_charger', $charger->id_charger);
            })->where('status', 'Berlangsung')->exists();

            if ($activeSessionExists) {
                throw ValidationException::withMessages([
                    'status' => 'Charger masih memiliki sesi berjalan. Selesaikan sesi terlebih dahulu.',
                ]);
            }
        }

        $charger->update($data);

        return response()->json([
            'message' => 'Status unit charger berhasil diperbarui.',
            'data' => $this->presentCharger($charger->fresh('ports')),
        ]);
    }

    public function updateTarif(Request $request, Location $station): JsonResponse
    {
        $this->ensureStaff($request);

        $data = $request->validate([
            'harga_per_kwh' => ['required', 'integer', 'min:100'],
            'biaya_minimum' => ['required', 'integer', 'min:0'],
            'biaya_parkir_pjam' => ['required', 'integer', 'min:0'],
        ]);

        $tarif = Tarif::create([
            'id_location' => $station->id_location,
            'harga_per_kwh' => $data['harga_per_kwh'],
            'biaya_minimum' => $data['biaya_minimum'],
            'biaya_parkir_pjam' => $data['biaya_parkir_pjam'],
            'periode_mulai' => now(),
            'periode_berakhir' => now()->addYear(),
        ]);

        return response()->json([
            'message' => 'Tarif baru berhasil disimpan.',
            'data' => $tarif,
        ], 201);
    }

    public function createOperator(Request $request): JsonResponse
    {
        $this->ensureAdmin($request);

        $data = $request->validate([
            'nama_lengkap' => ['required', 'string', 'max:255'],
            'email' => ['required', 'email', 'unique:users,email'],
            'password' => ['required', 'string', 'min:6'],
            'nomor_telepon' => ['required', 'string', 'max:13'],
            'id_location' => ['nullable', 'integer', 'exists:location,id_location'],
        ]);

        $operator = DB::transaction(function () use ($data): User {
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

            // Satu operator hanya ditugaskan ke satu station.
            if (! empty($data['id_location'])) {
                StationOperator::create([
                    'id_user' => $user->id_user,
                    'id_location' => $data['id_location'],
                ]);
            }

            return $user->load('profile');
        });

        return response()->json([
            'message' => 'Akun operator berhasil dibuat.',
            'data' => $operator,
        ], 201);
    }

    public function assignOperator(Request $request, string $operator): JsonResponse
    {
        $this->ensureAdmin($request);

        $user = User::where('id_user', $operator)->where('peran', 'operator')->firstOrFail();

        $data = $request->validate([
            // null = cabut penugasan
            'id_location' => ['present', 'nullable', 'integer', 'exists:location,id_location'],
        ]);

        if ($data['id_location'] === null) {
            StationOperator::where('id_user', $user->id_user)->delete();
            $message = 'Penugasan operator berhasil dicabut.';
        } else {
            // Satu operator satu station: ganti penugasan lama jika ada.
            StationOperator::updateOrCreate(
                ['id_user' => $user->id_user],
                ['id_location' => $data['id_location']]
            );
            $message = 'Operator berhasil ditugaskan ke station.';
        }

        return response()->json([
            'message' => $message,
            'data' => collect($this->operators())->firstWhere('id_user', $user->id_user),
        ]);
    }

    public function updateOperatorStatus(Request $request, string $operator): JsonResponse
    {
        $this->ensureAdmin($request);

        $user = User::where('id_user', $operator)->where('peran', 'operator')->firstOrFail();

        $data = $request->validate([
            'status_akun' => ['required', Rule::in(['Aktif', 'Nonaktif', 'Suspend', 'Banned'])],
        ]);

        $user->update(['status_akun' => $data['status_akun']]);

        return response()->json([
            'message' => "Status akun operator berhasil diubah menjadi {$data['status_akun']}.",
            'data' => collect($this->operators())->firstWhere('id_user', $user->id_user),
        ]);
    }

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
                    'id' => 'TRX-' . $s->id_session,
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
        $tarifLogs = Tarif::with('location')
            ->latest('created_at')
            ->limit(20)
            ->get()
            ->map(function ($t) {
                return [
                    'id' => 'TRF-' . $t->id_tarif,
                    'kategori' => 'Perubahan Tarif',
                    'aktor' => 'Admin / Operator',
                    'stasiun' => $t->location?->nama_lokasi ?? 'Stasiun SPKLU',
                    'detail' => "Tarif baru: Rp " . number_format($t->harga_per_kwh, 0, ',', '.') . "/kWh, Minimum: Rp " . number_format($t->biaya_minimum, 0, ',', '.') . ", Parkir: Rp " . number_format($t->biaya_parkir_pjam, 0, ',', '.') . "/jam",
                    'nominal' => $t->harga_per_kwh,
                    'status' => 'Berlaku',
                    'timestamp' => $t->created_at ? $t->created_at->format('Y-m-d H:i:s') : '-',
                ];
            });

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
                    'id' => 'ERR-' . $g->id_log,
                    'kategori' => 'Gangguan Perangkat',
                    'aktor' => $g->nama_pelapor ?? 'Sistem / Sensor',
                    'stasiun' => $g->nama_lokasi ?? 'Stasiun SPKLU',
                    'detail' => "{$g->kode_perangkat}: {$g->jenis_error} - " . ($g->desk_mslh ?? '-'),
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
            ]
        ]);
    }

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
            ]
        ]);
    }

    public function updateSystemConfig(Request $request): JsonResponse
    {
        $this->ensureAdmin($request);

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
                $env = preg_replace('/^CHARGING_REQUIRE_ARRIVAL=.*/m', "CHARGING_REQUIRE_ARRIVAL=" . ($data['require_arrival'] ? 'true' : 'false'), $env);
            } else {
                $env .= "\nCHARGING_REQUIRE_ARRIVAL=" . ($data['require_arrival'] ? 'true' : 'false');
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

        return response()->json([
            'status' => 'success',
            'message' => 'Konfigurasi sistem berhasil diperbarui.',
            'data' => $data,
        ]);
    }

    private function ensureStaff(Request $request): void
    {
        if (! in_array($request->user()->peran, ['operator', 'admin'], true)) {
            abort(403, 'Hanya operator atau admin yang dapat mengakses dashboard operasional.');
        }
    }

    private function ensureAdmin(Request $request): void
    {
        if ($request->user()->peran !== 'admin') {
            abort(403, 'Hanya admin yang dapat mengelola akun operator.');
        }
    }

    private function presentStation(Location $location): array
    {
        $chargers = $location->chargers;
        $tarif = $location->tarifs->first();

        return [
            'id_location' => $location->id_location,
            'nama_lokasi' => $location->nama_lokasi,
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
                'biaya_parkir_pjam' => $tarif->biaya_parkir_pjam,
            ] : null,
            'chargers' => $chargers->map(fn (Charger $charger) => $this->presentCharger($charger))->values(),
        ];
    }

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

    private function operators(): array
    {
        $assignments = DB::table('station_operators')
            ->join('location', 'station_operators.id_location', '=', 'location.id_location')
            ->select('station_operators.id_user', 'station_operators.id_location', 'location.nama_lokasi')
            ->get()
            ->keyBy('id_user');

        return User::with('profile')
            ->where('peran', 'operator')
            ->orderBy('id_user')
            ->get()
            ->map(fn (User $user) => [
                'id_location' => $assignments[$user->id_user]->id_location ?? null,
                'nama_lokasi' => $assignments[$user->id_user]->nama_lokasi ?? null,
                'id_user' => $user->id_user,
                'email' => $user->email,
                'status_akun' => $user->status_akun,
                'nama_lengkap' => $user->profile?->nama_lengkap ?? $user->email,
                'nomor_telepon' => $user->profile?->nomor_telepon,
            ])
            ->values()
            ->all();
    }

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