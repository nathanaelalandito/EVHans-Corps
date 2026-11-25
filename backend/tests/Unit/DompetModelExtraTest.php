<?php

namespace Tests\Unit;

use App\Models\Dompet;
use Carbon\Carbon;
use Tests\TestCase;

class DompetModelExtraTest extends TestCase
{
    public function test_saldo_tersedia_never_negative(): void
    {
        $dompet = new Dompet(['saldo' => 5000, 'saldo_hold' => 10000]);
        $this->assertSame(0, $dompet->saldoTersedia());
    }

    public function test_has_pin(): void
    {
        $dompet = new Dompet(['pin_transaksi' => null]);
        $this->assertFalse($dompet->hasPin());
        $dompet->pin_transaksi = 'x';
        $this->assertTrue($dompet->hasPin());
    }

    public function test_is_locked_future(): void
    {
        $dompet = new Dompet(['locked_until' => Carbon::now()->addMinute()]);
        $this->assertTrue($dompet->isLocked());
    }

    public function test_is_locked_past(): void
    {
        $dompet = new Dompet(['locked_until' => Carbon::now()->subMinute()]);
        $this->assertFalse($dompet->isLocked());
    }

    public function test_is_locked_null(): void
    {
        $dompet = new Dompet(['locked_until' => null]);
        $this->assertFalse($dompet->isLocked());
    }
}
