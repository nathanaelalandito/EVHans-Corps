<?php

namespace Tests\Unit;

use App\Models\Location;
use App\Models\Tarif;
use Carbon\Carbon;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class LocationModelTest extends TestCase
{
    use RefreshDatabase;

    private function makeLocation(string $code): Location
    {
        return Location::create([
            'kode_station' => $code,
            'nama_lokasi' => 'Station '.$code,
            'alamat' => 'Jl. Test',
            'latitude' => -7.8,
            'longitude' => 110.36,
            'jam_buka' => '00:00',
            'jam_tutup' => '23:59',
            'status_loc' => 'Aktif',
        ]);
    }

    public function test_location_can_be_created(): void
    {
        $loc = $this->makeLocation('LOC1');
        $this->assertNotNull($loc->id_location);
    }

    public function test_active_tarif_returns_latest_active(): void
    {
        $loc = $this->makeLocation('LOC2');
        Tarif::create([
            'id_location' => $loc->id_location,
            'harga_per_kwh' => 1000,
            'biaya_minimum' => 1000,
            'biaya_parkir_flat' => 0,
            'periode_mulai' => Carbon::now()->subDay(),
            'periode_berakhir' => Carbon::now()->addDay(),
        ]);
        $this->assertNotNull($loc->fresh()->activeTarif());
    }

    public function test_active_tarif_null_when_none(): void
    {
        $loc = $this->makeLocation('LOC3');
        $this->assertNull($loc->activeTarif());
    }

    public function test_transliterator_alias_relation(): void
    {
        $this->assertTrue(method_exists(Location::class, 'transliterator_create_from_rules'));
    }
}
