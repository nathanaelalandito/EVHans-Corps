<?php

namespace Tests\Unit;

use App\Models\ChargingSession;
use App\Models\Dompet;
use App\Models\Notifikasi;
use App\Models\Port;
use Tests\TestCase;

class ModelHelperTest extends TestCase
{
    public function test_port_connector_key_normalizes_input(): void
    {
        $this->assertSame('type2', Port::connectorKey('Type 2'));
        $this->assertSame('ccs2', Port::connectorKey('CCS2'));
        $this->assertSame('gbt', Port::connectorKey('GB/T'));
    }

    public function test_port_matches_connector(): void
    {
        $port = new Port(['tipe_konektor' => 'ccs2', 'status_port' => 'Available']);
        $this->assertTrue($port->matchesConnector('CCS2'));
        $this->assertFalse($port->matchesConnector('Type 2'));
    }

    public function test_port_is_available(): void
    {
        $port = new Port(['status_port' => 'Available']);
        $this->assertTrue($port->isAvailable());
        $port->status_port = 'Charging';
        $this->assertFalse($port->isAvailable());
    }

    public function test_dompet_saldo_tersedia(): void
    {
        $dompet = new Dompet(['saldo' => 100000, 'saldo_hold' => 27000]);
        $this->assertSame(73000, $dompet->saldoTersedia());
    }

    public function test_dompet_has_pin_and_locked(): void
    {
        $dompet = new Dompet(['pin_transaksi' => null]);
        $this->assertFalse($dompet->hasPin());

        $dompet->pin_transaksi = 'hashed';
        $this->assertTrue($dompet->hasPin());

        $dompet->locked_until = now()->addMinutes(5);
        $this->assertTrue($dompet->isLocked());
    }

    public function test_charging_session_estimasi_biaya(): void
    {
        $session = new ChargingSession([
            'estimasi_biaya_charging' => 25000,
            'estimasi_biaya_parkir' => 2000,
        ]);
        $this->assertSame(27000, $session->estimasiBiaya());
    }

    public function test_notifikasi_is_unread(): void
    {
        $notif = new Notifikasi(['dibaca_pada' => null]);
        $this->assertTrue($notif->isUnread());
        $notif->dibaca_pada = now();
        $this->assertFalse($notif->isUnread());
    }
}
