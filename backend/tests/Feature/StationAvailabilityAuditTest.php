<?php

namespace Tests\Feature;

use App\Models\Charger;
use App\Models\Location;
use App\Models\Port;
use App\Models\Tarif;
use App\Models\User;
use App\Models\Vehicle;
use App\Support\StationOperatingHours;
use Carbon\Carbon;
use Carbon\CarbonImmutable;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Illuminate\Testing\TestResponse;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class StationAvailabilityAuditTest extends TestCase
{
    use RefreshDatabase;

    private User $driver;

    private Vehicle $vehicle;

    protected function setUp(): void
    {
        parent::setUp();

        $this->driver = User::create([
            'id_user' => 'DRV0000000012',
            'email' => 'station-audit@test.com',
            'password' => bcrypt('password'),
            'peran' => 'driver',
            'status_akun' => 'Aktif',
        ]);
        $this->vehicle = Vehicle::create([
            'id_user' => $this->driver->id_user,
            'merek' => 'Test',
            'model' => 'EV',
            'nomor_polisi' => 'B12EV',
            'tipe_konektor' => 'ccs2',
            'kapasitas_baterai_kwh' => 50,
        ]);

        Sanctum::actingAs($this->driver);
    }

    public function test_driver_station_list_hides_inactive_and_excludes_closed_and_malfunction_from_availability(): void
    {
        $this->travelTo(Carbon::parse('2026-11-17 12:00:00', 'Asia/Jakarta'));

        $active = $this->makeStation('Aktif', '00:00', '23:59');
        $inactive = $this->makeStation('Nonaktif', '00:00', '23:59');
        $maintenance = $this->makeStation('Maintenance', '00:00', '23:59');
        $malfunction = $this->makeStation('Gangguan', '00:00', '23:59');
        $full = $this->makeStation('Aktif', '00:00', '23:59', 'Active', 'Charging');
        $afterHours = $this->makeStation('Aktif', '08:00', '10:00');

        $response = $this->getJson('/api/stations')->assertOk();
        $stations = collect($response->json('data'))->keyBy('id_location');

        $this->assertCount(5, $stations);
        $this->assertArrayNotHasKey($inactive['location']->id_location, $stations);
        $this->assertSame('Aktif', $stations[$active['location']->id_location]['status']);
        $this->assertSame('Dalam Perawatan', $stations[$maintenance['location']->id_location]['status']);
        $this->assertSame('Gangguan', $stations[$malfunction['location']->id_location]['status']);
        $this->assertFalse($stations[$malfunction['location']->id_location]['can_start']);
        $this->assertSame('Penuh', $stations[$full['location']->id_location]['status']);
        $this->assertSame('Tutup Sementara', $stations[$afterHours['location']->id_location]['status']);
        $this->assertFalse($stations[$afterHours['location']->id_location]['is_open']);
        $this->assertFalse($stations[$afterHours['location']->id_location]['can_start']);
        $this->assertSame('08:00', $stations[$afterHours['location']->id_location]['buka_berikutnya']);
        $this->assertSame(0, $stations[$afterHours['location']->id_location]['charger_tersedia']);
    }

    public function test_prepare_rejects_nonactive_locations_and_closed_hours_but_accepts_overnight_hours(): void
    {
        $this->travelTo(Carbon::parse('2026-11-17 12:00:00', 'Asia/Jakarta'));

        foreach (['Nonaktif', 'Maintenance', 'Gangguan'] as $status) {
            $station = $this->makeStation($status, '00:00', '23:59');
            $this->prepare($station['port'])->assertStatus(422);
        }

        $closed = $this->makeStation('Aktif', '08:00', '10:00');
        $this->prepare($closed['port'])
            ->assertStatus(422)
            ->assertJsonPath('message', 'Station sedang tutup.');

        $this->travelTo(Carbon::parse('2026-11-18 00:30:00', 'Asia/Jakarta'));
        $overnight = $this->makeStation('Aktif', '23:00', '01:00', withTariff: true);
        $this->prepare($overnight['port'])->assertOk();
        $this->assertTrue(StationOperatingHours::isOpen('23:00', '01:00', CarbonImmutable::parse('2026-11-18 00:30', 'Asia/Jakarta')));
    }

    public function test_missing_operating_hours_mean_open_24_hours(): void
    {
        $now = CarbonImmutable::parse('2026-11-17 12:00', 'Asia/Jakarta');
        $this->assertTrue(StationOperatingHours::isOpen(null, null, $now));
        $this->assertTrue(StationOperatingHours::isOpen('', '', $now));
        $this->assertNull(StationOperatingHours::nextOpenTime(null, null, $now));
    }

    public function test_station_detail_keeps_legacy_counts_and_adds_explicit_port_count_and_tariff(): void
    {
        $station = $this->makeStation('Aktif', '00:00', '23:59', withTariff: true);
        $detail = $this->getJson('/api/stations/'.$station['location']->id_location)
            ->assertOk()->json('data');

        $this->assertSame($detail['charger_tersedia'], $detail['port_tersedia']);
        $this->assertSame($detail['charger_total'], $detail['jumlah_port']);
        $this->assertSame(1, $detail['chargers'][0]['jumlah_port']);
        $this->assertSame(2500, $detail['chargers'][0]['ports'][0]['tarif_per_kwh']);
        $this->assertSame('DC', $detail['chargers'][0]['ports'][0]['tipe_charging']);
    }

    public function test_prepare_rejects_unavailable_charger_and_port_statuses(): void
    {
        foreach (['Maintenance', 'Offline'] as $chargerStatus) {
            $station = $this->makeStation('Aktif', '00:00', '23:59', $chargerStatus);
            $this->prepare($station['port'])->assertStatus(409);
        }

        foreach (['Charging', 'Reserved', 'Out of Order', 'Maintenance'] as $portStatus) {
            $station = $this->makeStation('Aktif', '00:00', '23:59', 'Active', $portStatus);
            $this->prepare($station['port'])->assertStatus(409);
        }
    }

    /** @return array{location: Location, charger: Charger, port: Port} */
    private function makeStation(
        string $locationStatus,
        string $open,
        string $close,
        string $chargerStatus = 'Active',
        string $portStatus = 'Available',
        bool $withTariff = false,
    ): array {
        static $sequence = 0;
        $sequence++;

        if ($locationStatus === 'Gangguan') {
            // SQLite's enum check remains old because the MySQL ALTER is skipped in tests.
            DB::statement('PRAGMA ignore_check_constraints = ON');
        }

        try {
            $location = Location::create([
                'nama_lokasi' => "Station Audit {$sequence}",
                'alamat' => 'Jl. Test',
                'latitude' => -7.8,
                'longitude' => 110.36,
                'jam_buka' => $open,
                'jam_tutup' => $close,
                'status_loc' => $locationStatus,
            ]);
        } finally {
            if ($locationStatus === 'Gangguan') {
                DB::statement('PRAGMA ignore_check_constraints = OFF');
            }
        }
        $charger = Charger::create([
            'id_location' => $location->id_location,
            'kode_perangkat' => "CA{$sequence}",
            'merek_model' => 'Audit charger',
            'kap_tot_kw' => 50,
            'status_mesin' => $chargerStatus,
        ]);
        $port = Port::create([
            'id_charger' => $charger->id_charger,
            'nomor_port' => 'Port 1',
            'tipe_konektor' => 'ccs2',
            'tipe_charging' => 'DC',
            'daya_maks_kw' => 50,
            'status_port' => $portStatus,
        ]);

        if ($withTariff) {
            Tarif::create([
                'id_location' => $location->id_location,
                'harga_per_kwh' => 2500,
                'biaya_minimum' => 0,
                'biaya_parkir_flat' => 2000,
                'periode_mulai' => now()->subDay(),
                'periode_berakhir' => now()->addDay(),
            ]);
        }

        return compact('location', 'charger', 'port');
    }

    private function prepare(Port $port): TestResponse
    {
        return $this->postJson('/api/charging-sessions/prepare', [
            'id_port' => $port->id_port,
            'id_vehicle' => $this->vehicle->id_vehicle,
            'latitude' => -7.8,
            'longitude' => 110.36,
        ]);
    }
}
