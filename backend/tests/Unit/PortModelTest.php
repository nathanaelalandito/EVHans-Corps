<?php

namespace Tests\Unit;

use App\Models\Port;
use Tests\TestCase;

class PortModelTest extends TestCase
{
    public function test_connector_key(): void
    {
        $this->assertSame('type2', Port::connectorKey('Type 2'));
        $this->assertSame('ccs2', Port::connectorKey('CCS2'));
        $this->assertSame('gbt', Port::connectorKey('GB/T'));
        $this->assertSame('', Port::connectorKey(null));
    }

    public function test_matches_connector(): void
    {
        $port = new Port(['tipe_konektor' => 'ccs2']);
        $this->assertTrue($port->matchesConnector('CCS2'));
        $this->assertFalse($port->matchesConnector('Type 2'));
    }

    public function test_is_available(): void
    {
        $port = new Port(['status_port' => 'Available']);
        $this->assertTrue($port->isAvailable());
        $port->status_port = 'Charging';
        $this->assertFalse($port->isAvailable());
    }

    public function test_connector_label(): void
    {
        $port = new Port(['tipe_konektor' => 'ccs2']);
        $this->assertSame('CCS2', $port->connectorLabel());
        $port2 = new Port(['tipe_konektor' => 'unknown']);
        $this->assertSame('unknown', $port2->connectorLabel());
    }

    public function test_available_constant(): void
    {
        $this->assertSame('Available', Port::AVAILABLE);
    }
}
