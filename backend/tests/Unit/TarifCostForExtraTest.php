<?php
namespace Tests\Unit;
use App\Models\Tarif;
use PHPUnit\Framework\TestCase;
class TarifCostForExtraTest extends TestCase
{
    public function test_basic(){
        $t=new Tarif(['harga_per_kwh'=>2000,'biaya_minimum'=>1000,'biaya_parkir_flat'=>500]);
        $r=$t->costFor(10,7);
        $this->assertSame(20000,$r['biaya_charging']);
        $this->assertSame(20500,$r['total']);
    }
    public function test_minimum(){
        $t=new Tarif(['harga_per_kwh'=>100,'biaya_minimum'=>5000,'biaya_parkir_flat'=>0]);
        $r=$t->costFor(1,7);
        $this->assertSame(5000,$r['biaya_charging']);
    }
}
