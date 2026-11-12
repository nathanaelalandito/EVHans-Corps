<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Charger;
use App\Models\Location;
use App\Models\Port;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Collection;

/** Menyediakan pencarian station dan detail ketersediaan charger bagi pengemudi. */
class StationController extends Controller
{
    /** Daftar station; jarak hanya dihitung bila pasangan koordinat GPS valid dikirim. */
    public function index(Request $request): JsonResponse
    {
        $connector = strtolower(trim((string) $request->query('connector', '')));
        $driverLat = is_numeric($request->query('lat')) ? (float) $request->query('lat') : null;
        $driverLng = is_numeric($request->query('lng')) ? (float) $request->query('lng') : null;

        $stations = Location::query()
            ->with([
                'chargers.ports' => fn ($query) => $query->orderBy('nomor_port'),
                'tarifs' => fn ($query) => $query->latest('periode_mulai'),
            ])
            ->when($connector, function ($query) use ($connector): void {
                $cleanConnector = strtolower(str_replace(' ', '', $connector));
                $query->whereHas('chargers.ports', function ($portQuery) use ($cleanConnector) {
                    $portQuery->whereRaw("LOWER(REPLACE(tipe_konektor, ' ', '')) = ?", [$cleanConnector]);
                });
            })
            ->orderBy('nama_lokasi')
            ->get()
            ->map(fn (Location $location) => $this->presentStation($location, $driverLat, $driverLng))
            ->sortBy('jarak_km')
            ->values();

        return response()->json(['data' => $stations]);
    }

    /** Detail satu station berdasarkan ID. */
    public function show(string $id, Request $request): JsonResponse
    {
        $driverLat = is_numeric($request->query('lat')) ? (float) $request->query('lat') : null;
        $driverLng = is_numeric($request->query('lng')) ? (float) $request->query('lng') : null;

        $location = Location::query()
            ->with([
                'chargers.ports' => fn ($query) => $query->orderBy('nomor_port'),
                'tarifs' => fn ($query) => $query->latest('periode_mulai'),
            ])
            ->findOrFail($id);

        return response()->json([
            'data' => $this->presentStation($location, $driverLat, $driverLng, true),
        ]);
    }

    /** Membentuk data lokasi untuk respons daftar maupun detail station. */
    private function presentStation(Location $location, ?float $driverLat, ?float $driverLng, bool $detail = false): array
    {
        $chargers = $location->chargers;
        $tarif = $location->tarifs->first();

        // Kumpulkan semua port dari setiap charger di lokasi ini
        $allPorts = $chargers->flatMap(fn (Charger $charger) => $charger->ports);

        // Hitung port yang tersedia secara case-insensitive
        $availablePorts = $chargers
            ->where('status_mesin', 'Active')
            ->flatMap(fn (Charger $charger) => $charger->ports);

        $availableCount = $availablePorts->filter(function ($port) {
            $status = strtolower(trim($port->status_port ?? ''));

            return $status === 'available' || $status === 'tersedia';
        })->count();

        $totalPorts = $allPorts->count();

        $data = [
            'id_location' => $location->id_location,
            'kode_station' => $location->kode_station,
            'nama_lokasi' => $location->nama_lokasi,
            'alamat' => $location->alamat,
            'latitude' => (float) $location->latitude,
            'longitude' => (float) $location->longitude,
            'jarak_km' => $driverLat !== null && $driverLng !== null
                ? $this->distanceKm($driverLat, $driverLng, (float) $location->latitude, (float) $location->longitude)
                : null,
            'status' => $this->stationStatus($location, $availableCount),
            'charger_tersedia' => $availableCount,
            'charger_total' => $totalPorts > 0 ? $totalPorts : $chargers->count(),
            'tipe_konektor' => $this->connectorLabels($allPorts),
            'daya_kw_max' => $allPorts->max('daya_maks_kw') ?? $chargers->max('kap_tot_kw') ?? 0,
            'tarif_per_kwh' => $tarif?->harga_per_kwh ?? 0,
            'biaya_parkir_flat' => $tarif?->biaya_parkir_flat ?? 0,
            'jam_operasional' => [
                'buka' => substr((string) $location->jam_buka, 0, 5),
                'tutup' => substr((string) $location->jam_tutup, 0, 5),
            ],
        ];

        // Daftar charger + port selalu disertakan: dashboard driver memakainya untuk
        // memilih port langsung dari daftar station.
        $data['chargers'] = $chargers->map(fn (Charger $charger) => $this->presentCharger($charger))->values();

        if ($detail) {
            $data['tarif'] = $tarif ? [
                'harga_per_kwh' => $tarif->harga_per_kwh,
                'biaya_minimum' => $tarif->biaya_minimum,
                'biaya_parkir_flat' => $tarif->biaya_parkir_flat,
            ] : null;
        }

        return $data;
    }

    /** Membentuk ringkasan unit charger dan daftar port untuk API driver. */
    private function presentCharger(Charger $charger): array
    {
        return [
            'id_charger' => $charger->id_charger,
            'kode_perangkat' => $charger->kode_perangkat,
            'merek_model' => $charger->merek_model,
            'kap_tot_kw' => $charger->kap_tot_kw,
            'status_mesin' => $charger->status_mesin,
            'ports' => $charger->ports->map(fn (Port $port) => [
                'id_port' => $port->id_port,
                'nomor_port' => $port->nomor_port,
                'tipe_konektor' => Port::CONNECTOR_LABELS[$port->tipe_konektor] ?? $port->tipe_konektor,
                'tipe_charging' => $port->tipe_charging,
                'daya_maks_kw' => $port->daya_maks_kw,
                'status_port' => $port->status_port,
            ])->values(),
        ];
    }

    /** Menghasilkan daftar unik label konektor yang tersedia di station. */
    private function connectorLabels(Collection $ports): array
    {
        return $ports
            ->pluck('tipe_konektor')
            ->unique()
            ->map(fn (string $connector) => Port::CONNECTOR_LABELS[$connector] ?? $connector)
            ->values()
            ->all();
    }

    /** Menentukan status station dari status lokasi dan jumlah port yang tersedia. */
    private function stationStatus(Location $location, int $availableCount): string
    {
        if ($location->status_loc === 'Maintenance') {
            return 'Dalam Perawatan';
        }

        if ($location->status_loc === 'Nonaktif') {
            return 'Tutup Sementara';
        }

        return $availableCount > 0 ? 'Aktif' : 'Penuh';
    }

    /** Menghitung jarak garis lurus antara koordinat pengemudi dan station. */
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
