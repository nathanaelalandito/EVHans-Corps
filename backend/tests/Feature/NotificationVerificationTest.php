<?php

namespace Tests\Feature;

use App\Models\Charger;
use App\Models\ChargingSession;
use App\Models\Dompet;
use App\Models\Location;
use App\Models\MetodePembayaran;
use App\Models\Notifikasi;
use App\Models\Port;
use App\Models\StationOperator;
use App\Models\Tarif;
use App\Models\User;
use App\Models\UserProfile;
use App\Models\Vehicle;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class NotificationVerificationTest extends TestCase
{
    use RefreshDatabase;

    private function admin(string $id = 'ADM0000000001'): User
    {
        return User::create(['id_user' => $id, 'email' => "{$id}@admin.ac.id", 'password' => bcrypt('password'), 'peran' => 'admin', 'status_akun' => 'Aktif']);
    }

    private function operator(string $id, int $locationId): User
    {
        $u = User::create(['id_user' => $id, 'email' => "{$id}@ops.ac.id", 'password' => bcrypt('password'), 'peran' => 'operator', 'status_akun' => 'Aktif']);
        UserProfile::create(['id_user' => $u->id_user, 'nama_lengkap' => $id, 'nomor_telepon' => '081234567890', 'alamat' => 'Jl. Test', 'tanggal_lahir' => '1995-01-01']);
        StationOperator::create(['id_user' => $u->id_user, 'id_location' => $locationId]);
        return $u;
    }

    private function driver(string $id): User
    {
        $u = User::create(['id_user' => $id, 'email' => "{$id}@driver.ac.id", 'password' => bcrypt('password'), 'peran' => 'driver', 'status_akun' => 'Aktif']);
        UserProfile::create(['id_user' => $u->id_user, 'nama_lengkap' => $id, 'nomor_telepon' => '081234567890', 'alamat' => 'Jl. Test', 'tanggal_lahir' => '1995-01-01']);
        Dompet::create(['id_user' => $u->id_user, 'saldo' => 100000, 'saldo_hold' => 0, 'status_dompet' => 'Aktif']);
        return $u;
    }

    private function baseStation(): array
    {
        $location = Location::create(['nama_lokasi' => 'Station A', 'alamat' => 'Jl. A', 'latitude' => -7.8, 'longitude' => 110.36, 'jam_buka' => '00:00', 'jam_tutup' => '23:59', 'status_loc' => 'Aktif']);
        $charger = Charger::create(['id_location' => $location->id_location, 'kode_perangkat' => 'CHG-A', 'merek_model' => 'Test', 'kap_tot_kw' => 50, 'status_mesin' => 'Active']);
        $port = Port::create(['id_charger' => $charger->id_charger, 'nomor_port' => 'Port 1', 'tipe_konektor' => 'ccs2', 'tipe_charging' => 'DC', 'daya_maks_kw' => 50, 'status_port' => 'Charging']);
        $tarif = Tarif::create(['id_location' => $location->id_location, 'harga_per_kwh' => 2500, 'biaya_minimum' => 0, 'biaya_parkir_flat' => 2000, 'periode_mulai' => now()->subDay(), 'periode_berakhir' => now()->addYears(10)]);
        return [$location, $charger, $port, $tarif];
    }

    public function test_a_session_completed_notifies_driver(): void
    {
        [$location, $charger, $port, $tarif] = $this->baseStation();
        $driver = $this->driver('DRV0000000001');
        $vehicle = Vehicle::create(['id_user' => $driver->id_user, 'merek' => 'T', 'model' => 'EV', 'nomor_polisi' => 'B1EV', 'tipe_konektor' => 'ccs2', 'kapasitas_baterai_kwh' => 50]);
        $session = ChargingSession::create(['id_user' => $driver->id_user, 'id_charger' => $charger->id_charger, 'id_port' => $port->id_port, 'id_tarif' => $tarif->id_tarif, 'id_vehicle' => $vehicle->id_vehicle, 'waktu_mulai' => now()->subMinutes(5), 'total_energi_kwh' => 0, 'target_energi_kwh' => 10, 'estimasi_biaya_charging' => 25000, 'estimasi_biaya_parkir' => 2000, 'saldo_hold' => 27000, 'status' => 'Berlangsung', 'soc_awal' => 20]);
        $metode = MetodePembayaran::create(['nama_metode' => 'Dompet Digital', 'biaya_layanan' => 0, 'status_metode' => 'Aktif']);
        \App\Models\Payment::create(['id_session' => $session->id_session, 'id_metode' => $metode->id_metode, 'jenis_pembayaran' => 'charging', 'total_bayar' => 27000, 'status_pembayaran' => 'Pending', 'waktu_pembayaran' => now(), 'referensi_gateway' => 'HOLD-1']);
        $driver->dompet->update(['saldo_hold' => 27000]);

        Sanctum::actingAs($driver);
        $this->postJson("/api/charging-sessions/{$session->id_session}/finish", ['energi_kwh' => 6])->assertOk();
        $this->assertDatabaseHas('notifikasi', ['id_user' => $driver->id_user, 'tipe' => 'charging_selesai']);
    }

    public function test_b_session_failed_notifies_driver(): void
    {
        [$location, $charger, $port, $tarif] = $this->baseStation();
        $driver = $this->driver('DRV0000000002');
        $vehicle = Vehicle::create(['id_user' => $driver->id_user, 'merek' => 'T', 'model' => 'EV', 'nomor_polisi' => 'B2EV', 'tipe_konektor' => 'ccs2', 'kapasitas_baterai_kwh' => 50]);
        $session = ChargingSession::create(['id_user' => $driver->id_user, 'id_charger' => $charger->id_charger, 'id_port' => $port->id_port, 'id_tarif' => $tarif->id_tarif, 'id_vehicle' => $vehicle->id_vehicle, 'waktu_mulai' => now()->subMinutes(5), 'total_energi_kwh' => 0, 'target_energi_kwh' => 10, 'estimasi_biaya_charging' => 25000, 'estimasi_biaya_parkir' => 2000, 'saldo_hold' => 27000, 'status' => 'Berlangsung', 'soc_awal' => 20]);
        $metode = MetodePembayaran::create(['nama_metode' => 'Dompet Digital', 'biaya_layanan' => 0, 'status_metode' => 'Aktif']);
        \App\Models\Payment::create(['id_session' => $session->id_session, 'id_metode' => $metode->id_metode, 'jenis_pembayaran' => 'charging', 'total_bayar' => 27000, 'status_pembayaran' => 'Pending', 'waktu_pembayaran' => now(), 'referensi_gateway' => 'HOLD-2']);
        $driver->dompet->update(['saldo_hold' => 27000]);

        Sanctum::actingAs($driver);
        $this->postJson("/api/charging-sessions/{$session->id_session}/interrupt", ['status' => 'gagal', 'energi_kwh' => 3, 'alasan' => 'Gangguan'])->assertOk();
        $this->assertDatabaseHas('notifikasi', ['id_user' => $driver->id_user, 'tipe' => 'charging_gagal']);
    }

    public function test_c_operator_stop_notifies_driver(): void
    {
        [$location, $charger, $port, $tarif] = $this->baseStation();
        $driver = $this->driver('DRV0000000003');
        $operator = $this->operator('OPS0000000001', $location->id_location);
        $vehicle = Vehicle::create(['id_user' => $driver->id_user, 'merek' => 'T', 'model' => 'EV', 'nomor_polisi' => 'B3EV', 'tipe_konektor' => 'ccs2', 'kapasitas_baterai_kwh' => 50]);
        $session = ChargingSession::create(['id_user' => $driver->id_user, 'id_charger' => $charger->id_charger, 'id_port' => $port->id_port, 'id_tarif' => $tarif->id_tarif, 'id_vehicle' => $vehicle->id_vehicle, 'waktu_mulai' => now()->subMinutes(5), 'total_energi_kwh' => 0, 'target_energi_kwh' => 10, 'estimasi_biaya_charging' => 25000, 'estimasi_biaya_parkir' => 2000, 'saldo_hold' => 27000, 'status' => 'Berlangsung', 'soc_awal' => 20]);
        $metode = MetodePembayaran::create(['nama_metode' => 'Dompet Digital', 'biaya_layanan' => 0, 'status_metode' => 'Aktif']);
        \App\Models\Payment::create(['id_session' => $session->id_session, 'id_metode' => $metode->id_metode, 'jenis_pembayaran' => 'charging', 'total_bayar' => 27000, 'status_pembayaran' => 'Pending', 'waktu_pembayaran' => now(), 'referensi_gateway' => 'HOLD-3']);
        $driver->dompet->update(['saldo_hold' => 27000]);

        Sanctum::actingAs($operator);
        $this->postJson("/api/operator/sessions/{$session->id_session}/stop", ['alasan' => 'Maintenance'])->assertOk();
        $this->assertDatabaseHas('notifikasi', ['id_user' => $driver->id_user, 'tipe' => 'charging_selesai']);
    }

    public function test_d_topup_expired_notifies_driver(): void
    {
        $driver = $this->driver('DRV0000000004');
        $method = MetodePembayaran::create(['nama_metode' => 'GoPay', 'biaya_layanan' => 0, 'status_metode' => 'Aktif']);
        $topup = \App\Models\Topup::create([
            'id_wallet' => $driver->dompet->id_wallet,
            'id_metode' => $method->id_metode,
            'referensi' => 'EVT-EXP',
            'kode_pembayaran' => '123',
            'nominal' => 10000,
            'biaya_layanan' => 0,
            'status_topup' => 'Pending',
            'waktu_topup' => now()->subDays(2),
            'kedaluwarsa_pada' => now()->subDay(),
        ]);

        Sanctum::actingAs($driver);
        $this->getJson("/api/topup/{$topup->referensi}")->assertOk();
        $this->assertDatabaseHas('notifikasi', ['id_user' => $driver->id_user, 'tipe' => 'topup_gagal']);
    }

    public function test_e_g_h_charger_issue_recipients_and_idempotent(): void
    {
        [$location, $charger, $port, $tarif] = $this->baseStation();
        $admin = $this->admin();
        $operator = $this->operator('OPS0000000002', $location->id_location);
        $otherLocation = Location::create(['nama_lokasi' => 'Other', 'alamat' => 'Jl. Other', 'latitude' => -7.8, 'longitude' => 110.36, 'jam_buka' => '00:00', 'jam_tutup' => '23:59', 'status_loc' => 'Aktif']);
        $otherOperator = $this->operator('OPS0000000003', $otherLocation->id_location);

        $driver = $this->driver('DRV0000000005');
        $vehicle = Vehicle::create(['id_user' => $driver->id_user, 'merek' => 'T', 'model' => 'EV', 'nomor_polisi' => 'B5EV', 'tipe_konektor' => 'ccs2', 'kapasitas_baterai_kwh' => 50]);
        $session = ChargingSession::create(['id_user' => $driver->id_user, 'id_charger' => $charger->id_charger, 'id_port' => $port->id_port, 'id_tarif' => $tarif->id_tarif, 'id_vehicle' => $vehicle->id_vehicle, 'waktu_mulai' => now(), 'total_energi_kwh' => 0, 'target_energi_kwh' => 10, 'estimasi_biaya_charging' => 25000, 'estimasi_biaya_parkir' => 2000, 'saldo_hold' => 27000, 'status' => 'Berlangsung', 'soc_awal' => 20]);

        Sanctum::actingAs($operator);
        $this->putJson("/api/operations/chargers/{$charger->id_charger}", ['status_mesin' => 'Maintenance', 'alasan' => 'Gangguan unit'])->assertOk();
        // trigger again for dedup
        $this->putJson("/api/operations/chargers/{$charger->id_charger}", ['status_mesin' => 'Maintenance', 'alasan' => 'Gangguan unit'])->assertOk();

        $this->assertDatabaseHas('notifikasi', ['id_user' => $admin->id_user, 'tipe' => 'charger_gangguan']);
        $this->assertDatabaseHas('notifikasi', ['id_user' => $operator->id_user, 'tipe' => 'charger_gangguan']);
        $this->assertDatabaseHas('notifikasi', ['id_user' => $driver->id_user, 'tipe' => 'charger_gangguan']);
        $this->assertDatabaseMissing('notifikasi', ['id_user' => $otherOperator->id_user, 'tipe' => 'charger_gangguan']);

        $count = Notifikasi::where('id_user', $admin->id_user)->where('tipe', 'charger_gangguan')->count();
        $this->assertSame(1, $count);
    }

    public function test_g_mark_read_persisted(): void
    {
        $driver = $this->driver('DRV0000000006');
        $n = Notifikasi::create(['id_user' => $driver->id_user, 'tipe' => 'info', 'judul' => 'T', 'pesan' => 'P', 'dedup_key' => 'k1']);
        Sanctum::actingAs($driver);
        $this->putJson("/api/notifications/{$n->id_notifikasi}/read")->assertOk();
        $this->assertNotNull(Notifikasi::find($n->id_notifikasi)->dibaca_pada);
        $this->putJson('/api/notifications/read-all')->assertOk();
    }

    public function test_h_idor_and_i_unauth(): void
    {
        $a = $this->driver('DRV0000000007');
        $b = $this->driver('DRV0000000008');
        $n = Notifikasi::create(['id_user' => $b->id_user, 'tipe' => 'info', 'judul' => 'T', 'pesan' => 'P', 'dedup_key' => 'k2']);

        Sanctum::actingAs($a);
        $this->getJson("/api/notifications/{$n->id_notifikasi}")->assertStatus(404);
        $this->putJson("/api/notifications/{$n->id_notifikasi}/read")->assertStatus(404);

        // unauth
        auth()->forgetGuards();
        $this->getJson('/api/notifications')->assertStatus(401);
        $this->getJson('/api/notifications/unread-count')->assertStatus(401);
    }

    public function test_k_unread_count_and_pagination(): void
    {
        $driver = $this->driver('DRV0000000009');
        for ($i = 0; $i < 25; $i++) {
            Notifikasi::create(['id_user' => $driver->id_user, 'tipe' => 'info', 'judul' => "T{$i}", 'pesan' => 'P', 'dedup_key' => "k{$i}"]);
        }
        Sanctum::actingAs($driver);
        $res = $this->getJson('/api/notifications/unread-count');
        $res->assertOk();
        $this->assertSame(25, $res->json('data.unread'));
        $list = $this->getJson('/api/notifications');
        $list->assertOk();
        $this->assertCount(20, $list->json('data.data'));
    }

    public function test_l_message_no_sensitive_data(): void
    {
        $driver = $this->driver('DRV0000000010');
        $n = Notifikasi::create(['id_user' => $driver->id_user, 'tipe' => 'info', 'judul' => 'T', 'pesan' => 'Pesan aman', 'dedup_key' => 'kx']);
        Sanctum::actingAs($driver);
        $res = $this->getJson('/api/notifications');
        $res->assertOk();
        $payload = json_encode($res->json());
        $this->assertStringNotContainsString('password', strtolower($payload));
        $this->assertStringNotContainsString('token', strtolower($payload));
    }
}

