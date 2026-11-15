<?php

namespace Tests\Feature;

use App\Models\Charger;
use App\Models\ChargingSession;
use App\Models\Dompet;
use App\Models\Location;
use App\Models\MetodePembayaran;
use App\Models\Port;
use App\Models\Tarif;
use App\Models\User;
use App\Models\UserProfile;
use App\Models\Vehicle;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class CostConsistencyVerificationTest extends TestCase
{
    use RefreshDatabase;

    private function makeSession(int $hold): array
    {
        $driver = User::create(['id_user' => 'DRV0000000001', 'email' => 'd@test.com', 'password' => bcrypt('password'), 'peran' => 'driver', 'status_akun' => 'Aktif']);
        UserProfile::create(['id_user' => $driver->id_user, 'nama_lengkap' => 'Driver', 'nomor_telepon' => '081234567890', 'alamat' => 'Jl. Test', 'tanggal_lahir' => '1995-01-01']);
        $wallet = Dompet::create(['id_user' => $driver->id_user, 'saldo' => 100000, 'saldo_hold' => 0, 'status_dompet' => 'Aktif']);
        $vehicle = Vehicle::create(['id_user' => $driver->id_user, 'merek' => 'T', 'model' => 'EV', 'nomor_polisi' => 'B1EV', 'tipe_konektor' => 'ccs2', 'kapasitas_baterai_kwh' => 50]);
        $location = Location::create(['nama_lokasi' => 'Station', 'alamat' => 'Jl. Test', 'latitude' => -7.8, 'longitude' => 110.36, 'jam_buka' => '00:00', 'jam_tutup' => '23:59', 'status_loc' => 'Aktif']);
        $charger = Charger::create(['id_location' => $location->id_location, 'kode_perangkat' => 'CHG-1', 'merek_model' => 'Test', 'kap_tot_kw' => 50, 'status_mesin' => 'Active']);
        $port = Port::create(['id_charger' => $charger->id_charger, 'nomor_port' => 'Port 1', 'tipe_konektor' => 'ccs2', 'tipe_charging' => 'DC', 'daya_maks_kw' => 50, 'status_port' => 'Charging']);
        $tarif = Tarif::create(['id_location' => $location->id_location, 'harga_per_kwh' => 2500, 'biaya_minimum' => 0, 'biaya_parkir_flat' => 2000, 'periode_mulai' => now()->subDay(), 'periode_berakhir' => now()->addYears(10)]);
        $session = ChargingSession::create(['id_user' => $driver->id_user, 'id_charger' => $charger->id_charger, 'id_port' => $port->id_port, 'id_tarif' => $tarif->id_tarif, 'id_vehicle' => $vehicle->id_vehicle, 'waktu_mulai' => now()->subMinutes(5), 'total_energi_kwh' => 0, 'target_energi_kwh' => 10, 'estimasi_biaya_charging' => 25000, 'estimasi_biaya_parkir' => 2000, 'saldo_hold' => $hold, 'status' => 'Berlangsung', 'soc_awal' => 20]);
        $metode = MetodePembayaran::create(['nama_metode' => 'Dompet Digital', 'biaya_layanan' => 0, 'status_metode' => 'Aktif']);
        \App\Models\Payment::create(['id_session' => $session->id_session, 'id_metode' => $metode->id_metode, 'jenis_pembayaran' => 'charging', 'total_bayar' => $hold, 'status_pembayaran' => 'Pending', 'waktu_pembayaran' => now(), 'referensi_gateway' => 'HOLD']);
        $wallet->saldo_hold = $hold;
        $wallet->save();
        return [$driver, $wallet, $session, $location];
    }

    public function test_case1_normal(): void
    {
        [$driver, $wallet, $session, $location] = $this->makeSession(27000);
        Sanctum::actingAs($driver);
        $res = $this->postJson("/api/charging-sessions/{$session->id_session}/finish", ['energi_kwh' => 6]);
        $res->assertOk();
        $this->assertSame(83000, (int) $driver->dompet->fresh()->saldo);
        $this->assertSame(0, (int) $driver->dompet->fresh()->saldo_hold);
        $this->assertSame(17000, (int) $res->json('data.biaya_aktual'));
        $this->assertSame(17000, (int) $res->json('data.biaya_aktual'));
        $history = $this->getJson('/api/charging-sessions/history');
        $history->assertOk();
        $this->assertSame(17000.0, (float) $history->json('data.0.total'));
        $invoice = $this->getJson("/api/charging-sessions/{$session->id_session}/invoice");
        $invoice->assertOk();
        $this->assertSame(17000, (int) $invoice->json('data.biaya_aktual'));
    }

    public function test_case2_failed_3kwh(): void
    {
        [$driver, $wallet, $session, $location] = $this->makeSession(27000);
        Sanctum::actingAs($driver);
        $res = $this->postJson("/api/charging-sessions/{$session->id_session}/interrupt", ['status' => 'gagal', 'energi_kwh' => 3, 'alasan' => 'Gangguan']);
        $res->assertOk();
        $this->assertSame(90500, (int) $driver->dompet->fresh()->saldo);
        $this->assertSame(9500, (int) $res->json('data.biaya_aktual'));
    }

    public function test_case3_failed_zero(): void
    {
        [$driver, $wallet, $session, $location] = $this->makeSession(27000);
        Sanctum::actingAs($driver);
        $res = $this->postJson("/api/charging-sessions/{$session->id_session}/interrupt", ['status' => 'gagal', 'energi_kwh' => 0, 'alasan' => 'Gangguan']);
        $res->assertOk();
        $this->assertSame(98000, (int) $driver->dompet->fresh()->saldo);
        $this->assertSame(2000, (int) $res->json('data.biaya_aktual'));
    }

    public function test_case4_actual_greater_than_hold(): void
    {
        [$driver, $wallet, $session, $location] = $this->makeSession(10000);
        Sanctum::actingAs($driver);
        $res = $this->postJson("/api/charging-sessions/{$session->id_session}/finish", ['energi_kwh' => 100]);
        $res->assertOk();
        $this->assertSame(90000, (int) $driver->dompet->fresh()->saldo);
        $this->assertSame(0, (int) $driver->dompet->fresh()->saldo_hold);
        $this->assertSame(10000, (int) $res->json('data.biaya_aktual'));
    }

    public function test_case5_tariff_snapshot(): void
    {
        [$driver, $wallet, $session, $location] = $this->makeSession(27000);
        // change tarif
        $newTarif = Tarif::create(['id_location' => $location->id_location, 'harga_per_kwh' => 9999, 'biaya_minimum' => 0, 'biaya_parkir_flat' => 9999, 'periode_mulai' => now()->subMinute(), 'periode_berakhir' => now()->addYears(10)]);
        $session->update(['id_tarif' => $session->id_tarif]); // keep old
        Sanctum::actingAs($driver);
        $res = $this->postJson("/api/charging-sessions/{$session->id_session}/finish", ['energi_kwh' => 6]);
        $res->assertOk();
        $this->assertSame(17000, (int) $res->json('data.biaya_aktual'));
    }
}
