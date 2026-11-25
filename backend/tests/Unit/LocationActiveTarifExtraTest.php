<?php
namespace Tests\Unit;
use App\Models\Location;
use App\Models\Tarif;
use Carbon\Carbon;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;
class LocationActiveTarifExtraTest extends TestCase
{
    use RefreshDatabase;
    public function test_active(){
        $loc=Location::create(['nama_lokasi'=>'L','alamat'=>'Jl','latitude'=>-7,'longitude'=>110,'jam_buka'=>'00:00','jam_tutup'=>'23:59','status_loc'=>'Aktif']);
        Tarif::create(['id_location'=>$loc->id_location,'harga_per_kwh'=>1000,'biaya_minimum'=>1000,'biaya_parkir_flat'=>0,'periode_mulai'=>Carbon::now()->subDay(),'periode_berakhir'=>Carbon::now()->addDay()]);
        $this->assertNotNull($loc->fresh()->activeTarif());
    }
    public function test_none(){
        $loc=Location::create(['nama_lokasi'=>'L2','alamat'=>'Jl','latitude'=>-7,'longitude'=>110,'jam_buka'=>'00:00','jam_tutup'=>'23:59','status_loc'=>'Aktif']);
        $this->assertNull($loc->activeTarif());
    }
}
