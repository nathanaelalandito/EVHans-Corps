<?php

namespace Tests\Feature;

use App\Models\Charger;
use App\Models\ChargingSession;
use App\Models\Dompet;
use App\Models\Location;
use App\Models\MetodePembayaran;
use App\Models\Payment;
use App\Models\Port;
use App\Models\Tarif;
use App\Models\User;
use App\Models\UserProfile;
use App\Models\Vehicle;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

/** Regression reproductions for integrity risks found during the BRD/SDD audit. */
class Part3IntegrityAuditTest extends TestCase
{
    use RefreshDatabase;

    private function driver(): User
    {
        $driver = User::create([
            'id_user' => 'DRV0000000001', 'email' => 'driver@test.com',
            'password' => bcrypt('Password123'), 'peran' => 'driver', 'status_akun' => 'Aktif',
        ]);
        UserProfile::create([
            'id_user' => $driver->id_user, 'nama_lengkap' => 'Driver',
            'nomor_telepon' => '081234567890', 'alamat' => 'Alamat', 'tanggal_lahir' => '1995-01-01',
        ]);
        return $driver;
    }

    public function test_topup_requires_checkout_and_simulation_before_crediting_wallet(): void
    {
        $driver = $this->driver();
        $wallet = Dompet::create([
            'id_user' => $driver->id_user, 'saldo' => 0, 'saldo_hold' => 0, 'status_dompet' => 'Aktif',
        ]);
        Sanctum::actingAs($driver);

        $this->postJson('/api/wallet/topup', [
            'nominal' => 10000, 'metode_pembayaran' => 'Mandiri',
        ])->assertNotFound();

        $method = MetodePembayaran::create([
            'nama_metode' => 'Mandiri', 'biaya_layanan' => 0, 'status_metode' => 'Aktif',
        ]);
        config(['payment.simulation' => false]);
        $checkout = $this->postJson('/api/topup', ['method' => $method->id_metode, 'amount' => 10000])
            ->assertCreated();
        $this->postJson('/api/topup/'.$checkout->json('data.reference').'/simulate-pay')
            ->assertStatus(403);

        $this->assertSame(0, (int) $wallet->fresh()->saldo);
    }

    public function test_driver_client_chosen_energy_is_ignored_for_settlement(): void
    {
        $driver = $this->driver();
        $wallet = Dompet::create([
            'id_user' => $driver->id_user, 'saldo' => 50000, 'saldo_hold' => 27000, 'status_dompet' => 'Aktif',
        ]);
        $vehicle = Vehicle::create([
            'id_user' => $driver->id_user, 'merek' => 'EV', 'model' => 'Audit',
            'nomor_polisi' => 'B1EV', 'tipe_konektor' => 'ccs2', 'kapasitas_baterai_kwh' => 50,
        ]);
        $location = Location::create([
            'nama_lokasi' => 'Station', 'alamat' => 'Alamat', 'latitude' => -7.8, 'longitude' => 110.36,
            'jam_buka' => '00:00', 'jam_tutup' => '23:59', 'status_loc' => 'Aktif',
        ]);
        $charger = Charger::create([
            'id_location' => $location->id_location, 'kode_perangkat' => 'CHG-AUDIT',
            'merek_model' => 'Audit', 'kap_tot_kw' => 50, 'status_mesin' => 'Active',
        ]);
        $port = Port::create([
            'id_charger' => $charger->id_charger, 'nomor_port' => 'Port 1',
            'tipe_konektor' => 'ccs2', 'tipe_charging' => 'DC', 'daya_maks_kw' => 50, 'status_port' => 'Charging',
        ]);
        $tariff = Tarif::create([
            'id_location' => $location->id_location, 'harga_per_kwh' => 2500,
            'biaya_minimum' => 0, 'biaya_parkir_flat' => 2000,
            'periode_mulai' => now()->subDay(), 'periode_berakhir' => now()->addYears(10),
        ]);
        $session = ChargingSession::create([
            'id_user' => $driver->id_user, 'id_charger' => $charger->id_charger,
            'id_port' => $port->id_port, 'id_tarif' => $tariff->id_tarif, 'id_vehicle' => $vehicle->id_vehicle,
            'waktu_mulai' => now()->subMinutes(10), 'total_energi_kwh' => 0, 'target_energi_kwh' => 10,
            'estimasi_biaya_charging' => 25000, 'estimasi_biaya_parkir' => 2000,
            'saldo_hold' => 27000, 'status' => 'Berlangsung', 'soc_awal' => 20,
        ]);
        $method = MetodePembayaran::create([
            'nama_metode' => 'Dompet Digital', 'biaya_layanan' => 0, 'status_metode' => 'Aktif',
        ]);
        Payment::create([
            'id_session' => $session->id_session, 'id_metode' => $method->id_metode,
            'jenis_pembayaran' => 'charging', 'total_bayar' => 27000,
            'status_pembayaran' => 'Pending', 'waktu_pembayaran' => now(), 'referensi_gateway' => 'HOLD',
        ]);
        Sanctum::actingAs($driver);

        $response = $this->postJson("/api/charging-sessions/{$session->id_session}/finish", [
            'energi_kwh' => 0.1,
        ])->assertOk();

        $this->assertSame(10.0, (float) $response->json('data.energi_kwh'));
        $this->assertSame(27000, (int) $response->json('data.biaya_aktual'));
        $this->assertSame(23000, (int) $wallet->fresh()->saldo);
        $this->assertSame(0, (int) $wallet->fresh()->saldo_hold);
    }
}
