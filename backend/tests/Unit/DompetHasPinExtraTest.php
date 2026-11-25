<?php
namespace Tests\Unit;
use App\Models\Dompet;
use PHPUnit\Framework\TestCase;
class DompetHasPinExtraTest extends TestCase
{
    public function test_null(){ $d=new Dompet(['pin_transaksi'=>null]); $this->assertFalse($d->hasPin()); }
    public function test_set(){ $d=new Dompet(['pin_transaksi'=>'hashed']); $this->assertTrue($d->hasPin()); }
}
