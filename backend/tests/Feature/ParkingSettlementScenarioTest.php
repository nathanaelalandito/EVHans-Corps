<?php

namespace Tests\Feature;

use App\Models\Charger;
use App\Models\ChargingSession;
use App\Models\Dompet;
use App\Models\MetodePembayaran;
use App\Models\Location;
use App\Models\Payment;
use App\Models\Port;
use App\Models\Tarif;
use App\Models\User;
use App\Models\UserProfile;
use App\Models\Vehicle;
use Carbon\Carbon;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class ParkingSettlementScenarioTest extends TestCase
{
    use RefreshDatabase;

    private function setupSession(float $targetKwh = 10, int $hold = 27000): array
    {
        $user = User::create([
            'id_user' => 'DRV0000000001',
            'email' => 'driver@test.ac.id',
            'password' => bcrypt('password'),
            'peran' => 'driver',
            'status_akun' => 'Aktif',
        ]);
        UserProfile::create([
            'id_user' => $user->id_user,
            'nama_lengkap' => 'Driver Test',
            'nomor_telepon' => '081234567890',
            'alamat' => 'Jl. Test',
            'tanggal_lahir' => '1995-01-01',
        ]);
        $wallet = Dompet::create([
            'id_user' => $user->id_user,
            'saldo' => 100000,
            'saldo_hold' => 0,
            'status_dompet' => 'Aktif',
        ]);
        $vehicle = Vehicle::create([
            'id_user' => $user->id_user,
            'merek' => 'Test',
            'model' => 'EV',
            'nomor_polisi' => 'B1234EV',
            'tipe_konektor' => 'ccs2',
            'kapasitas_baterai_kwh' => 50,
        ]);
        $location = Location::create([
            'nama_lokasi' => 'Test Station',
            'alamat' => 'Jl. Test',
            'latitude' => -7.8,
            'longitude' => 110.36,
            'jam_buka' => '00:00',
            'jam_tutup' => '23:59',
            'status_loc' => 'Aktif',
        ]);
        $charger = Charger::create([
            'id_location' => $location->id_location,
            'kode_perangkat' => 'CHG-TEST',
            'merek_model' => 'Test',
            'kap_tot_kw' => 50,
            'status_mesin' => 'Active',
        ]);
        $port = Port::create([
            'id_charger' => $charger->id_charger,
            'nomor_port' => 'Port 1',
            'tipe_konektor' => 'ccs2',
            'tipe_charging' => 'DC',
            'daya_maks_kw' => 1,
            'status_port' => 'Charging',
        ]);
        $tarif = Tarif::create([
            'id_location' => $location->id_location,
            'harga_per_kwh' => 2500,
            'biaya_minimum' => 0,
            'biaya_parkir_flat' => 2000,
            'periode_mulai' => now()->subDay(),
            'periode_berakhir' => now()->addYears(10),
        ]);
        $session = ChargingSession::create([
            'id_user' => $user->id_user,
            'id_charger' => $charger->id_charger,
            'id_port' => $port->id_port,
            'id_tarif' => $tarif->id_tarif,
            'id_vehicle' => $vehicle->id_vehicle,
            'waktu_mulai' => now(),
            'total_energi_kwh' => 0,
            'target_energi_kwh' => $targetKwh,
            'estimasi_biaya_charging' => 25000,
            'estimasi_biaya_parkir' => 2000,
            'saldo_hold' => $hold,
            'status' => 'Berlangsung',
            'soc_awal' => 20,
        ]);
        $metode = MetodePembayaran::create([
            'nama_metode' => 'Dompet Digital',
            'biaya_layanan' => 0,
            'status_metode' => 'Aktif',
        ]);
        Payment::create([
            'id_session' => $session->id_session,
            'id_metode' => $metode->id_metode,
            'jenis_pembayaran' => 'charging',
            'total_bayar' => $hold,
            'status_pembayaran' => 'Pending',
            'waktu_pembayaran' => now(),
            'referensi_gateway' => 'HOLD-1',
        ]);
        $wallet->saldo_hold = $hold;
        $wallet->save();

        return [$user, $wallet, $session];
    }

    private function setSimulatedEnergy(ChargingSession $session, int $kwh): void
    {
        $this->travelTo(now());
        $session->update(['waktu_mulai' => now()->subSeconds($kwh * 60)]);
    }

    public function test_normal_scenario(): void
    {
        [$user, $wallet, $session] = $this->setupSession();
        $this->setSimulatedEnergy($session, 6);
        Sanctum::actingAs($user);

        $response = $this->postJson("/api/charging-sessions/{$session->id_session}/finish", [
            'energi_kwh' => 6,
        ]);
        $response->assertOk();
        $wallet->refresh();
        $session->refresh();

        $this->assertSame(83000, (int) $wallet->saldo);
        $this->assertSame(0, (int) $wallet->saldo_hold);
        $this->assertSame('Selesai', $session->status);
        $this->assertEquals(17000, (int) $response->json('data.biaya_aktual'));

        $payment = Payment::where('id_session', $session->id_session)->firstOrFail();
        $this->getJson('/api/payments/'.$payment->id_payment)
            ->assertOk()
            ->assertJsonPath('data.status', 'Selesai')
            ->assertJsonPath('data.sumber_pembayaran', 'Dompet Digital')
            ->assertJsonPath('data.tarif_per_kwh', 2500)
            ->assertJsonPath('data.biaya_energi', 15000)
            ->assertJsonPath('data.biaya_parkir_flat', 2000)
            ->assertJsonPath('data.total_dibayar', 17000);
    }

    public function test_failed_zero_energy_charges_parking(): void
    {
        [$user, $wallet, $session] = $this->setupSession();
        $this->setSimulatedEnergy($session, 0);
        Sanctum::actingAs($user);

        $response = $this->postJson("/api/charging-sessions/{$session->id_session}/interrupt", [
            'status' => 'gagal',
            'energi_kwh' => 0,
            'alasan' => 'Gangguan',
        ]);
        $response->assertOk();
        $wallet->refresh();

        $this->assertSame(98000, (int) $wallet->saldo);
        $this->assertSame(0, (int) $wallet->saldo_hold);
        $this->assertEquals(2000, (int) $response->json('data.biaya_aktual'));

        $payment = Payment::where('id_session', $session->id_session)->firstOrFail();
        $this->getJson('/api/payments/'.$payment->id_payment)
            ->assertOk()
            ->assertJsonPath('data.status', 'Gagal')
            ->assertJsonPath('data.energi_kwh', 0)
            ->assertJsonPath('data.biaya_parkir_flat', 2000)
            ->assertJsonPath('data.total_dibayar', 2000);
    }

    public function test_actual_greater_than_hold_is_capped(): void
    {
        [$user, $wallet, $session] = $this->setupSession();
        $this->setSimulatedEnergy($session, 10);
        Sanctum::actingAs($user);

        $response = $this->postJson("/api/charging-sessions/{$session->id_session}/finish", [
            'energi_kwh' => 100,
        ]);
        $response->assertOk();
        $wallet->refresh();

        $this->assertSame(73000, (int) $wallet->saldo);
        $this->assertSame(0, (int) $wallet->saldo_hold);
        $this->assertEquals(27000, (int) $response->json('data.biaya_aktual'));
    }
}
