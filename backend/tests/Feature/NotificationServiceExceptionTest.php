<?php

namespace Tests\Feature;

use App\Models\ChargingSession;
use App\Models\Dompet;
use App\Models\Location;
use App\Models\MetodePembayaran;
use App\Models\Port;
use App\Models\Tarif;
use App\Models\Topup;
use App\Models\User;
use App\Models\UserProfile;
use App\Models\Vehicle;
use App\Services\NotificationService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Mockery;
use Tests\TestCase;

class NotificationServiceExceptionTest extends TestCase
{
    use RefreshDatabase;

    public function test_settle_succeeds_when_notification_service_throws(): void
    {
        $mock = Mockery::mock(NotificationService::class);
        $mock->shouldReceive('notifySessionCompleted')->andThrow(new \RuntimeException('boom'));
        $this->app->instance(NotificationService::class, $mock);

        $user = User::create(['id_user' => 'DRV0000000001', 'email' => 'd@test.com', 'password' => bcrypt('p'), 'peran' => 'driver', 'status_akun' => 'Aktif']);
        UserProfile::create(['id_user' => $user->id_user, 'nama_lengkap' => 'D', 'nomor_telepon' => '081234567890', 'alamat' => 'Jl', 'tanggal_lahir' => '1995-01-01']);
        $wallet = Dompet::create(['id_user' => $user->id_user, 'saldo' => 100000, 'saldo_hold' => 27000, 'status_dompet' => 'Aktif']);
        $vehicle = Vehicle::create(['id_user' => $user->id_user, 'merek' => 'T', 'model' => 'EV', 'nomor_polisi' => 'B1EV', 'tipe_konektor' => 'ccs2', 'kapasitas_baterai_kwh' => 50]);
        $location = Location::create(['nama_lokasi' => 'S', 'alamat' => 'Jl', 'latitude' => -7.8, 'longitude' => 110.36, 'jam_buka' => '00:00', 'jam_tutup' => '23:59', 'status_loc' => 'Aktif']);
        $charger = \App\Models\Charger::create(['id_location' => $location->id_location, 'kode_perangkat' => 'CHG-X', 'merek_model' => 'T', 'kap_tot_kw' => 50, 'status_mesin' => 'Active']);
        $port = Port::create(['id_charger' => $charger->id_charger, 'nomor_port' => 'Port 1', 'tipe_konektor' => 'ccs2', 'tipe_charging' => 'DC', 'daya_maks_kw' => 50, 'status_port' => 'Charging']);
        $tarif = Tarif::create(['id_location' => $location->id_location, 'harga_per_kwh' => 2500, 'biaya_minimum' => 0, 'biaya_parkir_flat' => 2000, 'periode_mulai' => now()->subDay(), 'periode_berakhir' => now()->addYears(10)]);
        $session = ChargingSession::create(['id_user' => $user->id_user, 'id_charger' => $charger->id_charger, 'id_port' => $port->id_port, 'id_tarif' => $tarif->id_tarif, 'id_vehicle' => $vehicle->id_vehicle, 'waktu_mulai' => now()->subMinutes(5), 'total_energi_kwh' => 0, 'target_energi_kwh' => 10, 'estimasi_biaya_charging' => 25000, 'estimasi_biaya_parkir' => 2000, 'saldo_hold' => 27000, 'status' => 'Berlangsung', 'soc_awal' => 20]);
        $method = MetodePembayaran::create(['nama_metode' => 'Dompet Digital', 'biaya_layanan' => 0, 'status_metode' => 'Aktif']);
        \App\Models\Payment::create(['id_session' => $session->id_session, 'id_metode' => $method->id_metode, 'jenis_pembayaran' => 'charging', 'total_bayar' => 27000, 'status_pembayaran' => 'Pending', 'waktu_pembayaran' => now(), 'referensi_gateway' => 'HOLD']);

        Sanctum::actingAs($user);
        $this->postJson("/api/charging-sessions/{$session->id_session}/finish", ['energi_kwh' => 6])->assertOk();
        $this->assertSame(83000, (int) $wallet->fresh()->saldo);
    }

    public function test_topup_expired_still_recorded_when_notification_throws(): void
    {
        $mock = Mockery::mock(NotificationService::class);
        $mock->shouldReceive('notifyTopupFailed')->andThrow(new \RuntimeException('boom'));
        $this->app->instance(NotificationService::class, $mock);

        $user = User::create(['id_user' => 'DRV0000000002', 'email' => 'd2@test.com', 'password' => bcrypt('p'), 'peran' => 'driver', 'status_akun' => 'Aktif']);
        UserProfile::create(['id_user' => $user->id_user, 'nama_lengkap' => 'D2', 'nomor_telepon' => '081234567890', 'alamat' => 'Jl', 'tanggal_lahir' => '1995-01-01']);
        $wallet = Dompet::create(['id_user' => $user->id_user, 'saldo' => 0, 'saldo_hold' => 0, 'status_dompet' => 'Aktif']);
        $method = MetodePembayaran::create(['nama_metode' => 'GoPay', 'biaya_layanan' => 0, 'status_metode' => 'Aktif']);
        $topup = Topup::create(['id_wallet' => $wallet->id_wallet, 'id_metode' => $method->id_metode, 'referensi' => 'EVT-EXP2', 'kode_pembayaran' => '123', 'nominal' => 10000, 'biaya_layanan' => 0, 'status_topup' => 'Pending', 'waktu_topup' => now()->subDays(2), 'kedaluwarsa_pada' => now()->subDay()]);
        Sanctum::actingAs($user);
        $this->getJson("/api/topup/{$topup->referensi}")->assertOk();
        $this->assertDatabaseHas('topup', ['referensi' => 'EVT-EXP2', 'status_topup' => 'Gagal']);
    }
}
