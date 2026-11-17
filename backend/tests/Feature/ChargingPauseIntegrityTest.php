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
use Illuminate\Support\Facades\DB;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class ChargingPauseIntegrityTest extends TestCase
{
    use RefreshDatabase;

    private function fixture(string $userId = 'DRV0000000001', string $role = 'driver'): array
    {
        $user = User::create([
            'id_user' => $userId, 'email' => strtolower($userId).'@test.com',
            'password' => bcrypt('Password123'), 'peran' => $role, 'status_akun' => 'Aktif',
        ]);
        UserProfile::create([
            'id_user' => $userId, 'nama_lengkap' => 'Test', 'nomor_telepon' => '081234567890',
            'alamat' => 'Alamat', 'tanggal_lahir' => '1995-01-01',
        ]);
        $wallet = Dompet::create(['id_user' => $userId, 'saldo' => 100000, 'saldo_hold' => 27000, 'status_dompet' => 'Aktif']);
        $vehicle = Vehicle::create([
            'id_user' => $userId, 'merek' => 'Test', 'model' => 'EV', 'nomor_polisi' => 'B1EV',
            'tipe_konektor' => 'ccs2', 'kapasitas_baterai_kwh' => 50,
        ]);
        $location = Location::create([
            'nama_lokasi' => 'Station', 'alamat' => 'Alamat', 'latitude' => -7.8, 'longitude' => 110.36,
            'jam_buka' => '00:00', 'jam_tutup' => '23:59', 'status_loc' => 'Aktif',
        ]);
        $charger = Charger::create([
            'id_location' => $location->id_location, 'kode_perangkat' => 'CHG-PAUSE',
            'merek_model' => 'Test', 'kap_tot_kw' => 1, 'status_mesin' => 'Active',
        ]);
        $port = Port::create([
            'id_charger' => $charger->id_charger, 'nomor_port' => 'Port 1', 'tipe_konektor' => 'ccs2',
            'tipe_charging' => 'DC', 'daya_maks_kw' => 1, 'status_port' => 'Charging',
        ]);
        $tariff = Tarif::create([
            'id_location' => $location->id_location, 'harga_per_kwh' => 2500, 'biaya_minimum' => 0,
            'biaya_parkir_flat' => 2000, 'periode_mulai' => now()->subDay(), 'periode_berakhir' => now()->addYears(10),
        ]);
        $session = ChargingSession::create([
            'id_user' => $userId, 'id_charger' => $charger->id_charger, 'id_port' => $port->id_port,
            'id_tarif' => $tariff->id_tarif, 'id_vehicle' => $vehicle->id_vehicle, 'waktu_mulai' => now(),
            'total_energi_kwh' => 0, 'target_energi_kwh' => 10, 'estimasi_biaya_charging' => 25000,
            'estimasi_biaya_parkir' => 2000, 'saldo_hold' => 27000, 'status' => 'Berlangsung', 'soc_awal' => 20,
        ]);
        $method = MetodePembayaran::create(['nama_metode' => 'Dompet Digital', 'biaya_layanan' => 0, 'status_metode' => 'Aktif']);
        Payment::create([
            'id_session' => $session->id_session, 'id_metode' => $method->id_metode,
            'jenis_pembayaran' => 'charging', 'total_bayar' => 27000, 'status_pembayaran' => 'Pending',
            'waktu_pembayaran' => now(), 'referensi_gateway' => 'HOLD-PAUSE',
        ]);

        return [$user, $wallet, $location, $charger, $port, $session];
    }

    private function runFor(ChargingSession $session, int $kwh): void
    {
        $this->travelTo(now());
        $session->update(['waktu_mulai' => now()->subSeconds($kwh * 60)]);
    }

    public function test_energy_does_not_advance_while_session_is_paused(): void
    {
        [$driver, , , , , $session] = $this->fixture();
        $this->runFor($session, 3);
        Sanctum::actingAs($driver);
        $this->postJson("/api/charging-sessions/{$session->id_session}/pause")->assertOk();
        $this->travel(120)->seconds();
        $this->assertSame(3.0, (float) $this->getJson('/api/charging-sessions/active')->json('data.energi_kwh'));
    }

    public function test_pause_time_is_excluded_from_energy_and_duration(): void
    {
        [$driver, , , , , $session] = $this->fixture();
        $this->runFor($session, 4);
        Sanctum::actingAs($driver);
        $this->postJson("/api/charging-sessions/{$session->id_session}/pause")->assertOk();
        $this->travel(120)->seconds();
        $this->postJson("/api/charging-sessions/{$session->id_session}/resume")->assertOk();
        $this->travel(180)->seconds();
        $active = $this->getJson('/api/charging-sessions/active')->assertOk()->json('data');
        $this->assertSame(7.0, (float) $active['energi_kwh']);
        $this->assertSame(25200, (int) $active['durasi_detik']);
        $this->postJson("/api/charging-sessions/{$session->id_session}/finish")->assertOk();
    }

    public function test_pause_and_resume_are_idempotent(): void
    {
        $this->travelTo(now());
        [$driver, , , , , $session] = $this->fixture();
        Sanctum::actingAs($driver);
        $this->postJson("/api/charging-sessions/{$session->id_session}/pause")->assertOk();
        $this->postJson("/api/charging-sessions/{$session->id_session}/pause")->assertOk();
        $this->travel(60)->seconds();
        $this->postJson("/api/charging-sessions/{$session->id_session}/resume")->assertOk();
        $this->postJson("/api/charging-sessions/{$session->id_session}/resume")->assertOk();
        $this->assertSame(60, (int) $session->fresh()->total_jeda_detik);
    }

    public function test_pause_on_non_running_session_is_rejected(): void
    {
        [$driver, , , , , $session] = $this->fixture();
        $session->update(['status' => 'Selesai']);
        Sanctum::actingAs($driver);
        $this->postJson("/api/charging-sessions/{$session->id_session}/pause")->assertStatus(422);
    }

    public function test_pause_requires_auth_and_session_owner(): void
    {
        [, , , , , $session] = $this->fixture();
        $this->postJson("/api/charging-sessions/{$session->id_session}/pause")->assertUnauthorized();
        $other = User::create(['id_user' => 'DRV0000000002', 'email' => 'other@test.com', 'password' => bcrypt('Password123'), 'peran' => 'driver', 'status_akun' => 'Aktif']);
        Sanctum::actingAs($other);
        $this->postJson("/api/charging-sessions/{$session->id_session}/pause")->assertNotFound();
    }

    public function test_expired_pause_auto_resumes_once_and_records_exact_limit(): void
    {
        $this->travelTo(now());
        [$driver, , , , , $session] = $this->fixture();
        Sanctum::actingAs($driver);
        $this->postJson("/api/charging-sessions/{$session->id_session}/pause")->assertOk();
        $this->travel(300)->seconds();
        $this->getJson('/api/charging-sessions/active')->assertOk();
        $this->getJson('/api/charging-sessions/active')->assertOk();
        $session->refresh();
        $this->assertSame(300, (int) $session->total_jeda_detik);
        $this->assertNull($session->dijeda_pada);
        $this->assertNull($session->jeda_berakhir_pada);
        $this->getJson('/api/charging-sessions/active')->assertOk()->assertJsonPath('data.status_port', 'Charging');
        $invoice = $this->postJson("/api/charging-sessions/{$session->id_session}/finish")->assertOk()->json('data');
        $this->assertSame(0.0, (float) $invoice['energi_kwh']);
        $this->assertSame(2000, (int) $invoice['biaya_aktual']);
        $this->assertSame(300, (int) $session->fresh()->total_jeda_detik);
    }

    public function test_driver_stop_while_paused_uses_locked_energy_and_releases_hold_and_port(): void
    {
        [$driver, $wallet, , , $port, $session] = $this->fixture();
        $this->runFor($session, 3);
        Sanctum::actingAs($driver);
        $this->postJson("/api/charging-sessions/{$session->id_session}/pause")->assertOk();
        $this->travel(120)->seconds();
        $invoice = $this->postJson("/api/charging-sessions/{$session->id_session}/finish")->assertOk()->json('data');
        $this->assertSame(3.0, (float) $invoice['energi_kwh']);
        $this->assertSame(9500, (int) $invoice['biaya_aktual']);
        $this->assertSame(0, (int) $wallet->fresh()->saldo_hold);
        $this->assertSame(Port::AVAILABLE, $port->fresh()->status_port);
    }

    public function test_operator_stop_while_paused_settles_same_energy_and_releases_hold(): void
    {
        [$driver, $wallet, $location, , , $session] = $this->fixture();
        $operator = User::create(['id_user' => 'OPS0000000001', 'email' => 'ops@test.com', 'password' => bcrypt('Password123'), 'peran' => 'operator', 'status_akun' => 'Aktif']);
        DB::table('station_operators')->insert(['id_user' => $operator->id_user, 'id_location' => $location->id_location, 'created_at' => now(), 'updated_at' => now()]);
        $this->runFor($session, 3);
        Sanctum::actingAs($driver);
        $this->postJson("/api/charging-sessions/{$session->id_session}/pause")->assertOk();
        $this->travel(120)->seconds();
        Sanctum::actingAs($operator);
        $invoice = $this->postJson("/api/operator/sessions/{$session->id_session}/stop", ['alasan' => 'Gangguan teknis'])->assertOk()->json('data');
        $this->assertSame(3.0, (float) $invoice['energi_kwh']);
        $this->assertSame(9500, (int) $invoice['biaya_aktual']);
        $this->assertSame(0, (int) $wallet->fresh()->saldo_hold);
    }

    public function test_fault_report_while_paused_keeps_energy_and_notifies_assigned_operator(): void
    {
        [$driver, , $location, $charger, , $session] = $this->fixture();
        $operator = User::create(['id_user' => 'OPS0000000001', 'email' => 'ops@test.com', 'password' => bcrypt('Password123'), 'peran' => 'operator', 'status_akun' => 'Aktif']);
        DB::table('station_operators')->insert(['id_user' => $operator->id_user, 'id_location' => $location->id_location, 'created_at' => now(), 'updated_at' => now()]);
        $this->runFor($session, 3);
        Sanctum::actingAs($driver);
        $this->postJson("/api/charging-sessions/{$session->id_session}/pause")->assertOk();
        $this->travel(120)->seconds();
        $invoice = $this->postJson("/api/charging-sessions/{$session->id_session}/interrupt", ['status' => 'gagal', 'alasan' => 'Gangguan'])->assertOk()->json('data');
        $this->assertSame(3.0, (float) $invoice['energi_kwh']);
        $this->assertDatabaseHas('notifikasi', ['id_user' => $operator->id_user, 'tipe' => 'charger_gangguan']);
        $this->assertDatabaseHas('notifikasi', ['id_user' => $driver->id_user, 'tipe' => 'charging_gagal']);
        $this->assertSame($charger->id_charger, $session->fresh()->id_charger);
    }

    public function test_fault_report_without_pause_still_settles_by_simulated_energy(): void
    {
        [$driver, $wallet, , , , $session] = $this->fixture();
        $this->runFor($session, 3);
        Sanctum::actingAs($driver);
        $invoice = $this->postJson("/api/charging-sessions/{$session->id_session}/interrupt", ['status' => 'gagal'])->assertOk()->json('data');
        $this->assertSame(3.0, (float) $invoice['energi_kwh']);
        $this->assertSame(9500, (int) $invoice['biaya_aktual']);
        $this->assertSame(0, (int) $wallet->fresh()->saldo_hold);
    }

    public function test_driver_deactivation_during_pause_releases_hold_without_settlement_drift(): void
    {
        [$driver, $wallet, , , , $session] = $this->fixture();
        $admin = User::create(['id_user' => 'ADM0000000001', 'email' => 'admin@test.com', 'password' => bcrypt('Password123'), 'peran' => 'admin', 'status_akun' => 'Aktif']);
        $this->runFor($session, 3);
        Sanctum::actingAs($driver);
        $this->postJson("/api/charging-sessions/{$session->id_session}/pause")->assertOk();
        $this->travel(120)->seconds();
        Sanctum::actingAs($admin);
        $this->putJson("/api/operations/drivers/{$driver->id_user}/status", ['status_akun' => 'Nonaktif'])->assertOk();
        $this->assertSame(0, (int) $wallet->fresh()->saldo_hold);
        $this->assertNotSame('Berlangsung', $session->fresh()->status);
    }

    public function test_three_kwh_pause_two_minutes_three_kwh_settles_as_six_kwh(): void
    {
        [$driver, , , , , $session] = $this->fixture();
        $this->runFor($session, 3);
        Sanctum::actingAs($driver);
        $this->postJson("/api/charging-sessions/{$session->id_session}/pause")->assertOk();
        $this->travel(120)->seconds();
        $this->postJson("/api/charging-sessions/{$session->id_session}/resume")->assertOk();
        $this->travel(180)->seconds();
        $invoice = $this->postJson("/api/charging-sessions/{$session->id_session}/finish")->assertOk()->json('data');
        $this->assertSame(6.0, (float) $invoice['energi_kwh']);
        $this->assertSame(17000, (int) $invoice['biaya_aktual']);
        $this->assertSame(120, (int) $invoice['total_jeda_detik']);
        $this->assertTrue($invoice['pernah_dijeda']);
        $this->assertSame('Dompet Digital', $invoice['sumber_pembayaran']);
    }

    public function test_pause_and_resume_are_audited_without_notifications(): void
    {
        [$driver, , , , , $session] = $this->fixture();
        Sanctum::actingAs($driver);
        $this->postJson("/api/charging-sessions/{$session->id_session}/pause")->assertOk();
        $this->travel(30)->seconds();
        $this->postJson("/api/charging-sessions/{$session->id_session}/resume")->assertOk();
        $this->assertDatabaseHas('audit_logs', ['aksi' => 'jeda_sesi', 'id_entitas' => (string) $session->id_session]);
        $this->assertDatabaseHas('audit_logs', ['aksi' => 'lanjut_sesi', 'id_entitas' => (string) $session->id_session]);
        $this->assertDatabaseCount('notifikasi', 0);
    }

    public function test_monitoring_pause_contract_retains_legacy_energy_fields(): void
    {
        [$driver, , , , , $session] = $this->fixture();
        $this->runFor($session, 2);
        Sanctum::actingAs($driver);
        $this->postJson("/api/charging-sessions/{$session->id_session}/pause")->assertOk();
        $this->getJson('/api/charging-sessions/active')->assertOk()
            ->assertJsonPath('data.dijeda', true)
            ->assertJsonPath('data.status', 'Dijeda')
            ->assertJsonPath('data.energi_kwh', 2)
            ->assertJsonPath('data.sisa_jeda_detik', 300);
        $this->assertNotNull($session->fresh()->jeda_berakhir_pada);
    }

    public function test_paused_port_remains_unavailable_to_another_driver(): void
    {
        [$driver, , , , $port, $session] = $this->fixture();
        Sanctum::actingAs($driver);
        $this->postJson("/api/charging-sessions/{$session->id_session}/pause")->assertOk();
        $this->assertSame('Charging', $port->fresh()->status_port);
        $this->assertSame(1, ChargingSession::where('id_port', $port->id_port)->where('status', 'Berlangsung')->count());

        $other = User::create(['id_user' => 'DRV0000000002', 'email' => 'other@test.com', 'password' => bcrypt('Password123'), 'peran' => 'driver', 'status_akun' => 'Aktif']);
        $otherVehicle = Vehicle::create([
            'id_user' => $other->id_user, 'merek' => 'Other', 'model' => 'EV', 'nomor_polisi' => 'B2EV',
            'tipe_konektor' => 'ccs2', 'kapasitas_baterai_kwh' => 50,
        ]);
        Sanctum::actingAs($other);
        $this->postJson('/api/charging-sessions/validate', [
            'id_port' => $port->id_port, 'id_vehicle' => $otherVehicle->id_vehicle, 'target_kwh' => 2,
        ])->assertStatus(409)->assertJsonPath('kode', 'port_dipakai');
    }

    public function test_admin_and_operator_cannot_call_driver_pause_routes(): void
    {
        [, , , , , $session] = $this->fixture();
        foreach ([['ADM0000000001', 'admin'], ['OPS0000000001', 'operator']] as [$id, $role]) {
            $user = User::create(['id_user' => $id, 'email' => strtolower($id).'@test.com', 'password' => bcrypt('Password123'), 'peran' => $role, 'status_akun' => 'Aktif']);
            Sanctum::actingAs($user);
            $this->postJson("/api/charging-sessions/{$session->id_session}/pause")->assertForbidden();
            $this->postJson("/api/charging-sessions/{$session->id_session}/resume")->assertForbidden();
        }
    }

    public function test_admin_and_operator_cannot_access_driver_wallet_profile_vehicle_or_topup_routes(): void
    {
        foreach ([['ADM0000000001', 'admin'], ['OPS0000000001', 'operator']] as [$id, $role]) {
            $user = User::create(['id_user' => $id, 'email' => strtolower($id).'@test.com', 'password' => bcrypt('Password123'), 'peran' => $role, 'status_akun' => 'Aktif']);
            Sanctum::actingAs($user);
            $this->getJson('/api/wallet')->assertForbidden();
            $this->getJson('/api/driver/profile')->assertForbidden();
            $this->getJson('/api/vehicles')->assertForbidden();
            $this->postJson('/api/topup', [])->assertForbidden();
        }
    }
}
