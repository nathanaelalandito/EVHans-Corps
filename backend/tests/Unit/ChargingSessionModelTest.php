<?php

namespace Tests\Unit;

use App\Models\ChargingSession;
use Tests\TestCase;

class ChargingSessionModelTest extends TestCase
{
    public function test_aktif_constant(): void
    {
        $this->assertSame(['Pending', 'Berlangsung'], ChargingSession::AKTIF);
    }

    public function test_estimasi_biaya(): void
    {
        $session = new ChargingSession([
            'estimasi_biaya_charging' => 10000,
            'estimasi_biaya_parkir' => 3000,
        ]);
        $this->assertSame(13000, $session->estimasiBiaya());
    }

    public function test_estimasi_biaya_zero(): void
    {
        $session = new ChargingSession([]);
        $this->assertSame(0, $session->estimasiBiaya());
    }
}
