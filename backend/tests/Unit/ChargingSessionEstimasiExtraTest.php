<?php
namespace Tests\Unit;
use App\Models\ChargingSession;
use PHPUnit\Framework\TestCase;
class ChargingSessionEstimasiExtraTest extends TestCase
{
    public function test_sum(){ $s=new ChargingSession(['estimasi_biaya_charging'=>25000,'estimasi_biaya_parkir'=>2000]); $this->assertSame(27000,$s->estimasiBiaya()); }
    public function test_zero(){ $s=new ChargingSession([]); $this->assertSame(0,$s->estimasiBiaya()); }
}
