<?php

namespace Tests\Feature;

use App\Models\Charger;
use App\Models\ChargingSession;
use App\Models\Dompet;
use App\Models\ErrorLog;
use App\Models\Location;
use App\Models\Port;
use App\Models\Tarif;
use App\Models\User;
use App\Models\Vehicle;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class ChargingIncidentTest extends TestCase
{
    use RefreshDatabase;

    private User $driver;

    private ChargingSession $session;

    private Port $port;

    protected function setUp(): void
    {
        parent::setUp();

        $this->driver = User::create([
            'id_user' => 'DRV0000000001',
            'email' => 'driver@example.test',
            'password' => Hash::make('password123'),
            'peran' => 'driver',
            'status_akun' => 'Aktif',
        ]);

        Dompet::create([
            'id_user' => $this->driver->id_user,
            'saldo' => 500_000,
            'saldo_hold' => 100_000,
            'pin_transaksi' => Hash::make('123456'),
            'status_dompet' => 'Aktif',
        ]);

        $vehicle = Vehicle::create([
            'id_user' => $this->driver->id_user,
            'merek' => 'Toyota',
            'model' => 'bZ4X',
            'nomor_polisi' => 'R 1234 AB',
            'tipe_konektor' => 'ccs2',
            'kapasitas_baterai_kwh' => 71.4,
        ]);

        $location = Location::create([
            'nama_lokasi' => 'Stasiun Uji',
            'alamat' => 'Jl. Uji No. 1',
            'latitude' => -6.2,
            'longitude' => 106.8,
            'jam_buka' => '00:00:00',
            'jam_tutup' => '23:59:00',
            'status_loc' => 'Aktif',
        ]);

        $tarif = Tarif::create([
            'id_location' => $location->id_location,
            'harga_per_kwh' => 2_000,
            'biaya_minimum' => 10_000,
            'biaya_parkir_pjam' => 5_000,
            'periode_mulai' => now()->subDay(),
            'periode_berakhir' => now()->addDay(),
        ]);

        $charger = Charger::forceCreate([
            'id_location' => $location->id_location,
            'kode_perangkat' => 'CHG000000001',
            'merek_model' => 'Tesla Wall',
            'kap_tot_kw' => 50,
            'status_mesin' => 'Active',
        ]);

        $this->port = Port::create([
            'id_charger' => $charger->id_charger,
            'nomor_port' => 'Port 1',
            'tipe_konektor' => 'ccs2',
            'tipe_charging' => 'DC',
            'daya_maks_kw' => 50,
            'status_port' => 'Charging',
        ]);

        $this->session = ChargingSession::create([
            'id_user' => $this->driver->id_user,
            'id_charger' => $charger->id_charger,
            'id_port' => $this->port->id_port,
            'id_tarif' => $tarif->id_tarif,
            'id_vehicle' => $vehicle->id_vehicle,
            'waktu_mulai' => now()->subMinutes(5),
            'total_energi_kwh' => 0,
            'status' => 'Berlangsung',
            'soc_awal' => 30,
            'target_energi_kwh' => 20,
            'estimasi_biaya_charging' => 40_000,
            'estimasi_biaya_parkir' => 5_000,
            'saldo_hold' => 100_000,
            'heartbeat_terakhir' => now()->subMinutes(5),
        ]);
    }

    public function test_heartbeat_updates_last_seen_timestamp(): void
    {
        Sanctum::actingAs($this->driver);

        $this->session->forceFill(['heartbeat_terakhir' => now()->subMinutes(5)])->save();

        $this->postJson("/api/charging-sessions/{$this->session->id_session}/heartbeat")
            ->assertOk()
            ->assertJsonPath('data.id_session', $this->session->id_session);

        $this->assertTrue(
            $this->session->fresh()->heartbeat_terakhir->gt(now()->subMinute())
        );
    }

    public function test_driver_report_marks_session_failed_and_notifies_operator(): void
    {
        Sanctum::actingAs($this->driver);

        $this->postJson("/api/charging-sessions/{$this->session->id_session}/interrupt", [
            'status' => 'gagal',
            'kategori' => 'listrik',
            'catatan' => 'Listrik di station padam.',
            'energi_kwh' => 5,
        ])
            ->assertOk()
            ->assertJsonPath('data.kegagalan.kategori', 'listrik')
            ->assertJsonPath('data.kegagalan.sumber', 'driver');

        $session = $this->session->fresh();
        $this->assertSame('Gagal', $session->status);
        $this->assertFalse($session->deteksi_otomatis);
        $this->assertSame('Out of Order', $this->port->fresh()->status_port);

        $wallet = Dompet::where('id_user', $this->driver->id_user)->first();
        $this->assertSame(0, $wallet->saldo_hold);
        $this->assertLessThan(500_000, $wallet->saldo);

        $log = ErrorLog::where('id_session', $this->session->id_session)->first();
        $this->assertNotNull($log);
        $this->assertSame('listrik', $log->kategori);
        $this->assertSame('driver', $log->sumber);
    }

    public function test_watchdog_detects_session_without_heartbeat(): void
    {
        config([
            'charging.simulation_speed' => 1,
            'charging.heartbeat_timeout_seconds' => 120,
            'charging.failure_detection_enabled' => true,
        ]);

        $this->session->forceFill([
            'heartbeat_terakhir' => now()->subMinutes(10),
            'target_energi_kwh' => 100,
        ])->save();

        $this->artisan('charging:detect-failures')->assertSuccessful();

        $session = $this->session->fresh();
        $this->assertSame('Gagal', $session->status);
        $this->assertTrue($session->deteksi_otomatis);
        $this->assertSame('perangkat', $session->kegagalan_kategori);

        $log = ErrorLog::where('id_session', $this->session->id_session)->first();
        $this->assertNotNull($log);
        $this->assertSame('sistem', $log->sumber);
    }

    public function test_watchdog_ignores_session_with_recent_heartbeat(): void
    {
        config([
            'charging.simulation_speed' => 1,
            'charging.heartbeat_timeout_seconds' => 120,
            'charging.failure_detection_enabled' => true,
        ]);

        $this->session->forceFill([
            'heartbeat_terakhir' => now(),
            'target_energi_kwh' => 100,
        ])->save();

        $this->artisan('charging:detect-failures')->assertSuccessful();

        $this->assertSame('Berlangsung', $this->session->fresh()->status);
        $this->assertSame(0, ErrorLog::count());
    }
}
