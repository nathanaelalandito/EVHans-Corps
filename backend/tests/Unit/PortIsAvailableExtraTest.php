<?php
namespace Tests\Unit;
use App\Models\Port;
use PHPUnit\Framework\TestCase;
class PortIsAvailableExtraTest extends TestCase
{
    public function test_available(){ $p=new Port(['status_port'=>'Available']); $this->assertTrue($p->isAvailable()); }
    public function test_not(){ $p=new Port(['status_port'=>'Charging']); $this->assertFalse($p->isAvailable()); }
}
