<?php
namespace Tests\Unit;
use App\Models\ChargingSession;
use PHPUnit\Framework\TestCase;
class ChargingSessionAktifExtraTest extends TestCase
{
    public function test_const(){ $this->assertSame(['Pending','Berlangsung'], ChargingSession::AKTIF); }
}
