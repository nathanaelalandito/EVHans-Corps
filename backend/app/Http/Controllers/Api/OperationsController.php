<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Charger;
use App\Models\ChargingSession;
use App\Models\Location;
use App\Models\Payment;
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
            'chargers' => fn ($query) => $query->orderBy('kode_perangkat'),
            'tarifs' => fn ($query) => $query->latest('periode_mulai'),
        ])
            ->orderBy('nama_lokasi')
            ->get();

        $successfulCharging = Payment::query()
            ->where('jenis_pembayaran', 'charging')
            ->where('status_pembayaran', 'sukses');

        $sessions = ChargingSession::query();

        return response()->json([
            'data' => [
                'role' => $request->user()->peran,
                'summary' => [
                    'total_station' => $locations->count(),
                    'total_charger' => $locations->sum(fn (Location $location) => $location->chargers->count()),
                    'charger_tersedia' => Charger::where('status_mesin', 'tersedia')->count(),
                    'charger_gangguan' => Charger::whereIn('status_mesin', ['maintenance', 'rusak', 'offline'])->count(),
                    'sesi_berjalan' => ChargingSession::where('status', 'berlangsung')->count(),
                    'pendapatan_bulan_ini' => (clone $successfulCharging)
                        ->whereMonth('waktu_pembayaran', now()->month)
                        ->whereYear('waktu_pembayaran', now()->year)
                        ->sum('total_bayar'),
                ],
                'stations' => $locations->map(fn (Location $location) => $this->presentStation($location))->values(),
                'reports' => [
                    'pendapatan_hari_ini' => (clone $successfulCharging)->whereDate('waktu_pembayaran', today())->sum('total_bayar'),
                    'sesi_selesai' => (clone $sessions)->where('status', 'selesai')->count(),
                    'sesi_gagal' => ChargingSession::whereIn('status', ['gagal', 'dibatalkan'])->count(),
                    'energi_terjual_kwh' => round((float) ChargingSession::where('status', 'selesai')->sum('total_energi_kwh'), 2),
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
            'status' => ['sometimes', Rule::in(['aktif', 'nonaktif', 'maintenance'])],
        ]);

        $station->update($data);

        return response()->json([
            'message' => 'Data station berhasil diperbarui.',
            'data' => $this->presentStation($station->fresh(['chargers', 'tarifs'])),
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
            'status' => ['required', Rule::in(['aktif', 'nonaktif', 'maintenance'])],
        ]);

        $station = Location::create($data);

        return response()->json([
            'message' => 'Station baru berhasil ditambahkan.',
            'data' => $this->presentStation($station->fresh(['chargers', 'tarifs'])),
        ], 201);
    }

    public function updateCharger(Request $request, Charger $charger): JsonResponse
    {
        $this->ensureStaff($request);

        $data = $request->validate([
            'status_mesin' => ['required', Rule::in(['tersedia', 'sedang digunakan', 'maintenance', 'rusak', 'offline'])],
        ]);

        if ($charger->status_mesin === 'sedang digunakan' && $data['status_mesin'] !== 'sedang digunakan') {
            $activeSessionExists = ChargingSession::where('id_charger', $charger->id_charger)
                ->where('status', 'berlangsung')
                ->exists();

            if ($activeSessionExists) {
                throw ValidationException::withMessages([
                    'status' => 'Charger masih memiliki sesi berjalan. Selesaikan sesi terlebih dahulu.',
                ]);
            }
        }

        $charger->update($data);

        return response()->json([
            'message' => 'Status charger berhasil diperbarui.',
            'data' => $this->presentCharger($charger->fresh()),
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
        ]);

        $operator = DB::transaction(function () use ($data): User {
            $user = User::create([
                'id_user' => $this->nextUserId('OPS'),
                'email' => $data['email'],
                'password' => Hash::make($data['password']),
                'peran' => 'operator',
                'status_akun' => 'aktif',
            ]);

            UserProfile::create([
                'id_user' => $user->id_user,
                'nama_lengkap' => $data['nama_lengkap'],
                'nomor_telepon' => $data['nomor_telepon'],
                'alamat' => 'Belum diisi',
                'tanggal_lahir' => '2000-01-01',
            ]);

            return $user->load('profile');
        });

        return response()->json([
            'message' => 'Akun operator berhasil dibuat.',
            'data' => $operator,
        ], 201);
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
            'status' => $location->status,
            'jam_buka' => substr((string) $location->jam_buka, 0, 5),
            'jam_tutup' => substr((string) $location->jam_tutup, 0, 5),
            'charger_total' => $chargers->count(),
            'charger_tersedia' => $chargers->where('status_mesin', 'tersedia')->count(),
            'charger_gangguan' => $chargers->whereIn('status_mesin', ['maintenance', 'rusak', 'offline'])->count(),
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
            'tipe_konektor' => $charger->tipe_konektor,
            'daya_kw' => $charger->daya_kwh,
            'tipe_charging' => $charger->tipe_charging,
            'status' => $charger->status_mesin,
        ];
    }

    private function operators(): array
    {
        return User::with('profile')
            ->where('peran', 'operator')
            ->orderBy('id_user')
            ->get()
            ->map(fn (User $user) => [
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
