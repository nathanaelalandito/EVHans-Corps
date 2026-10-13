<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Location;
use Illuminate\Http\JsonResponse;

class StationController extends Controller
{
    /** Daftar semua station (ringkas, untuk peta & daftar). */
    public function index(): JsonResponse
    {
        $stations = Location::with(['chargers', 'tarif'])
            ->orderBy('id_location')
            ->get();

        return response()->json([
            'data' => $stations->map(fn (Location $l) => $this->present($l))->values(),
        ]);
    }

    /** Detail satu station: info lokasi, tarif aktif, dan semua port/charger. */
    public function show(string $id): JsonResponse
    {
        $station = Location::with(['chargers', 'tarif'])->findOrFail($id);

        return response()->json([
            'data' => $this->present($station, true),
        ]);
    }

    private function present(Location $l, bool $detail = false): array
    {
        $chargers = $l->chargers->sortBy('kode_perangkat')->values();
        $tarif = $this->activeTarif($l);

        $data = [
            'id_location' => $l->id_location,
            'nama_lokasi' => $l->nama_lokasi,
            'alamat' => $l->alamat,
            'latitude' => $l->latitude,
            'longitude' => $l->longitude,
            'jam_buka' => substr((string) $l->jam_buka, 0, 5),
            'jam_tutup' => substr((string) $l->jam_tutup, 0, 5),
            'status' => $l->status,
            'charger_total' => $chargers->count(),
            'charger_tersedia' => $chargers->where('status', 'tersedia')->count(),
            'tipe_konektor' => $chargers->pluck('tipe_konektor')->unique()->values(),
            'daya_kw_max' => $chargers->max('daya_kwh') ?? 0,
            'tarif' => $tarif ? [
                'harga_per_kwh' => $tarif->harga_per_kwh,
                'biaya_minimum' => $tarif->biaya_minimum,
                'biaya_parkir_per_jam' => $tarif->biaya_parkir_pjam,
            ] : null,
        ];

        if ($detail) {
            // Kolom DB bernama `daya_kwh`, tapi isinya daya charger (kW).
            $data['chargers'] = $chargers->map(fn ($c) => [
                'id_charger' => $c->id_charger,
                'kode_perangkat' => $c->kode_perangkat,
                'tipe_konektor' => $c->tipe_konektor,
                'daya_kw' => $c->daya_kwh,
                'tipe_charging' => $c->tipe_charging,
                'status' => $c->status,
            ])->values();
        }

        return $data;
    }

    /** Tarif yang periodenya mencakup saat ini (yang terbaru jika ada beberapa). */
    private function activeTarif(Location $l)
    {
        $now = now();

        return $l->tarif
            ->filter(fn ($t) => $t->periode_mulai->lte($now) && $t->periode_berakhir->gte($now))
            ->sortByDesc('periode_mulai')
            ->first();
    }
}
