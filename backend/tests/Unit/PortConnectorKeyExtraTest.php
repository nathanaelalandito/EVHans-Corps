<?php
namespace Tests\Unit;
use App\Models\Port;
use PHPUnit\Framework\TestCase;
class PortConnectorKeyExtraTest extends TestCase
{
    public function test_type2(){ $this->assertSame('type2', Port::connectorKey('Type 2')); }
    public function test_ccs2(){ $this->assertSame('ccs2', Port::connectorKey('CCS2')); }
    public function test_gbt(){ $this->assertSame('gbt', Port::connectorKey('GB/T')); }
    public function test_empty(){ $this->assertSame('', Port::connectorKey(null)); }
}
