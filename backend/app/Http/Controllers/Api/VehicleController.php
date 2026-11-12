<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Vehicle;
use Illuminate\Database\QueryException;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;
use Illuminate\Validation\Rule;

class VehicleController extends Controller
{
    private const KONEKTOR = ['type_2', 'ccs2', 'chademo', 'gbt'];

    public function index(Request $request): JsonResponse
    {
        $vehicles = $request->user()->vehicles()->orderBy('id_vehicle')->get();

        return response()->json([
            'data' => $vehicles->map(fn (Vehicle $v) => $this->present($v))->values(),
        ]);
    }

    public function store(Request $request): JsonResponse
    {
        $data = $this->validated($request);

        $vehicle = $request->user()->vehicles()->create($data);

        return response()->json([
            'message' => 'Kendaraan berhasil ditambahkan.',
            'data' => $this->present($vehicle),
        ], 201);
    }

    public function update(Request $request, string $id): JsonResponse
    {
        $vehicle = $request->user()->vehicles()->findOrFail($id);
        $data = $this->validated($request, $vehicle);

        $vehicle->update($data);

        return response()->json([
            'message' => 'Kendaraan berhasil diperbarui.',
            'data' => $this->present($vehicle->fresh()),
        ]);
    }

    public function destroy(Request $request, string $id): JsonResponse
    {
        $vehicle = $request->user()->vehicles()->findOrFail($id);

        try {
            $vehicle->delete();
        } catch (QueryException $e) {
            // Kendaraan masih dirujuk data lain (mis. riwayat charging session).
            return response()->json([
                'message' => 'Kendaraan tidak dapat dihapus karena masih memiliki riwayat charging.',
            ], 409);
        }

        return response()->json(['message' => 'Kendaraan berhasil dihapus.']);
    }

    /** Validasi + normalisasi input (plat: huruf besar, tanpa spasi). */
    private function validated(Request $request, ?Vehicle $current = null): array
    {
        $request->merge([
            'nomor_polisi' => strtoupper(preg_replace('/\s+/', '', (string) $request->input('nomor_polisi'))),
        ]);

        $validator = Validator::make($request->all(), [
            'merek' => 'required|string|max:100',
            'model' => 'required|string|max:50',
            'nomor_polisi' => [
                'required',
                'regex:/^[A-Z]{1,2}\d{1,4}[A-Z]{0,3}$/',
                Rule::unique('vehicle', 'nomor_polisi')->ignore($current?->id_vehicle, 'id_vehicle'),
            ],
            'tipe_konektor' => ['required', Rule::in(self::KONEKTOR)],
        ], [
            'nomor_polisi.regex' => 'Format nomor polisi tidak valid (contoh: B 1234 EV).',
            'nomor_polisi.unique' => 'Nomor polisi ini sudah terdaftar.',
            'tipe_konektor.in' => 'Tipe konektor tidak valid.',
        ]);

        return $validator->validate();
    }

    /** Bentuk respons: plat diberi spasi lagi untuk tampilan (B1234EV -> B 1234 EV). */
    private function present(Vehicle $v): array
    {
        $plat = $v->nomor_polisi;
        if (preg_match('/^([A-Z]{1,2})(\d{1,4})([A-Z]{0,3})$/', $plat, $m)) {
            $plat = trim("{$m[1]} {$m[2]} {$m[3]}");
        }

        return [
            'id_vehicle' => $v->id_vehicle,
            'merek' => $v->merek,
            'model' => $v->model,
            'nomor_polisi' => $plat,
            'tipe_konektor' => $v->tipe_konektor,
        ];
    }
}