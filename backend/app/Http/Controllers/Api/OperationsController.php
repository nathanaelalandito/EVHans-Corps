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