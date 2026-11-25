<?php

namespace Tests\Unit;

use App\Models\Location;
use App\Models\Tarif;
use Carbon\Carbon;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class TarifModelTest extends TestCase
{
    use RefreshDatabase;

    public function test_cost_for_basic(): void
    {
        $tarif = new Tarif([
            'harga_per_kwh' => 2000,
            'biaya_minimum' => 1000,
            'biaya_parkir_flat' => 500,
        ]);
        $res = $tarif->costFor(10, 7);
        $this->assertSame(20000, $res['biaya_charging']);
        $this->assertSame(500, $res['biaya_parkir']);
        $this->assertSame(20500, $res['total']);
        $this->assertSame(86, $res['durasi_menit']);
    }

    public function test_cost_for_minimum(): void
    {
        $tarif = new Tarif([
            'harga_per_kwh' => 100,
            'biaya_minimum' => 5000,
            'biaya_parkir_flat' => 0,
        ]);
        $res = $tarif->costFor(1, 7);
        $this->assertSame(5000, $res['biaya_charging']);
    }

    public function test_scope_aktif(): void
    {
        $loc = Location::create([
            'nama_lokasi' => 'L',
            'alamat' => 'Jl',
            'latitude' => -7.8,
            'longitude' => 110.36,
            'jam_buka' => '00:00',
            'jam_tutup' => '23:59',
            'status_loc' => 'Aktif',
        ]);
        Tarif::create([
            'id_location' => $loc->id_location,
            'harga_per_kwh' => 1000,
            'biaya_minimum' => 1000,
            'biaya_parkir_flat' => 0,
            'periode_mulai' => Carbon::now()->subDay(),
            'periode_berakhir' => Carbon::now()->addDay(),
        ]);
        $this->assertCount(1, Tarif::aktif()->get());
    }
}
