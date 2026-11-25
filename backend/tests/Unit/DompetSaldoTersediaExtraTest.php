<?php
namespace Tests\Unit;
use App\Models\Dompet;
use PHPUnit\Framework\TestCase;
class DompetSaldoTersediaExtraTest extends TestCase
{
    public function test_basic(){ $d=new Dompet(['saldo'=>100000,'saldo_hold'=>27000]); $this->assertSame(73000,$d->saldoTersedia()); }
    public function test_clamped(){ $d=new Dompet(['saldo'=>5000,'saldo_hold'=>10000]); $this->assertSame(0,$d->saldoTersedia()); }
}
