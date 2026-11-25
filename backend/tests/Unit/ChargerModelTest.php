<?php

namespace Tests\Unit;

use App\Models\Charger;
use App\Models\Location;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ChargerModelTest extends TestCase
{
    use RefreshDatabase;

    public function test_charger_can_be_created(): void
    {
        $location = Location::create([
            'nama_lokasi' => 'Loc',
            'alamat' => 'Jl',
            'latitude' => -7.8,
            'longitude' => 110.36,
            'jam_buka' => '00:00',
            'jam_tutup' => '23:59',
            'status_loc' => 'Aktif',
        ]);
        $charger = Charger::create([
            'id_location' => $location->id_location,
            'kode_perangkat' => 'CHG001',
            'merek_model' => 'ACME',
            'kap_tot_kw' => 22,
            'status_mesin' => 'Active',
        ]);

        $this->assertNotNull($charger->id_charger);
        $this->assertSame('CHG001', $charger->kode_perangkat);
    }

    public function test_charger_relations_exist(): void
    {
        $this->assertTrue(method_exists(Charger::class, 'ports'));
        $this->assertTrue(method_exists(Charger::class, 'location'));
        $this->assertTrue(method_exists(Charger::class, 'sessions'));
        $this->assertTrue(method_exists(Charger::class, 'errorLogs'));
    }
}
