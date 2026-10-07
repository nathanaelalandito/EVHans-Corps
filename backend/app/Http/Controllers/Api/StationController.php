<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Charger;
use App\Models\Location;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Collection;

class StationController extends Controller
{
    private const CONNECTOR_LABELS = [
        'type_2' => 'Type 2',
        'ccs2' => 'CCS2',
        'chademo' => 'CHAdeMO',
        'gbt' => 'GB/T',
    ];

    public function index(Request $request): JsonResponse
    {
        $connector = strtolower((string) $request->query('connector', ''));
        $driverLat = (float) $request->query('lat', -7.8014);
        $driverLng = (float) $request->query('lng', 110.3644);

        $stations = Location::query()
            ->with([
                'chargers' => fn ($query) => $query->orderBy('kode_perangkat'),
                'tarifs' => fn ($query) => $query->latest('periode_mulai'),
            ])
            ->when($connector, function ($query) use ($connector): void {
                $query->whereHas('chargers', fn ($chargerQuery) => $chargerQuery->where('tipe_konektor', $connector));
            })
            ->orderBy('nama_lokasi')
            ->get()
            ->map(fn (Location $location) => $this->presentStation($location, $driverLat, $driverLng))
            ->sortBy('jarak_km')
            ->values();

        return response()->json(['data' => $stations]);
    }

    private function presentStation(Location $location, float $driverLat, float $driverLng): array
    {
        $chargers = $location->chargers;
        $tarif = $location->tarifs->first();
        $availableCount = $chargers->where('status', 'tersedia')->count();

        return [
            'id_location' => $location->id_location,
            'nama_lokasi' => $location->nama_lokasi,
            'alamat' => $location->alamat,
            'lat' => (float) $location->latitude,
            'lng' => (float) $location->longitude,
            'jarak_km' => $this->distanceKm($driverLat, $driverLng, (float) $location->latitude, (float) $location->longitude),
            'rating' => 4.8,
            'status' => $this->stationStatus($location, $availableCount),
            'charger_tersedia' => $availableCount,
            'charger_total' => $chargers->count(),
            'tipe_konektor' => $this->connectorLabels($chargers),
            'daya_kw_max' => $chargers->max('daya_kwh') ?? 0,
            'tarif_per_kwh' => $tarif?->harga_per_kwh ?? 0,
            'biaya_parkir' => $tarif?->biaya_parkir_pjam ?? 0,
            'jam_operasional' => [
                'buka' => substr((string) $location->jam_buka, 0, 5),
                'tutup' => substr((string) $location->jam_tutup, 0, 5),
            ],
            'chargers' => $chargers->map(fn (Charger $charger) => $this->presentCharger($charger))->values(),
        ];
    }

    private function presentCharger(Charger $charger): array
    {
        return [
            'id_charger' => $charger->id_charger,
            'kode_perangkat' => $charger->kode_perangkat,
            'tipe_konektor' => self::CONNECTOR_LABELS[$charger->tipe_konektor] ?? $charger->tipe_konektor,
            'daya_kw' => $charger->daya_kwh,
            'tipe_charging' => $charger->tipe_charging,
            'status' => $charger->status,
        ];
    }

    private function connectorLabels(Collection $chargers): array
    {
        return $chargers
            ->pluck('tipe_konektor')
            ->unique()
            ->map(fn (string $connector) => self::CONNECTOR_LABELS[$connector] ?? $connector)
            ->values()
            ->all();
    }

    private function stationStatus(Location $location, int $availableCount): string
    {
        if ($location->status === 'maintenance') {
            return 'Dalam Perawatan';
        }

        if ($location->status === 'nonaktif') {
            return 'Tutup Sementara';
        }

        return $availableCount > 0 ? 'Aktif' : 'Penuh';
    }

    private function distanceKm(float $fromLat, float $fromLng, float $toLat, float $toLng): float
    {
        $earthRadiusKm = 6371;
        $latDelta = deg2rad($toLat - $fromLat);
        $lngDelta = deg2rad($toLng - $fromLng);

        $a = sin($latDelta / 2) ** 2
            + cos(deg2rad($fromLat)) * cos(deg2rad($toLat)) * sin($lngDelta / 2) ** 2;

        return round($earthRadiusKm * 2 * atan2(sqrt($a), sqrt(1 - $a)), 1);
    }
}
