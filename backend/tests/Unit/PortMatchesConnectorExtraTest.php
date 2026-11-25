<?php
namespace Tests\Unit;
use App\Models\Port;
use PHPUnit\Framework\TestCase;
class PortMatchesConnectorExtraTest extends TestCase
{
    public function test_match(){ $p=new Port(['tipe_konektor'=>'ccs2']); $this->assertTrue($p->matchesConnector('CCS2')); }
    public function test_no_match(){ $p=new Port(['tipe_konektor'=>'ccs2']); $this->assertFalse($p->matchesConnector('Type 2')); }
}
