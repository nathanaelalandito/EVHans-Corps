<?php

namespace Tests\Feature;

use App\Models\Charger;
use App\Models\ChargingSession;
use App\Models\Dompet;
use App\Models\Location;
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

class ChargerStatusNotificationTest extends TestCase
{
    use RefreshDatabase;

    private function admin(string $id = 'ADM0000000001', ?int $locationId = null): User
    {
        $u = User::create(['id_user' => $id, 'email' => "{$id}@admin.ac.id", 'password' => bcrypt('password'), 'peran' => 'admin', 'status_akun' => 'Aktif']);
        if ($locationId) {
            StationOperator::create(['id_user' => $u->id_user, 'id_location' => $locationId]);
        }
        return $u;
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

    private function station(): array
    {
        $location = Location::create(['nama_lokasi' => 'Station A', 'alamat' => 'Jl. A', 'latitude' => -7.8, 'longitude' => 110.36, 'jam_buka' => '00:00', 'jam_tutup' => '23:59', 'status_loc' => 'Aktif']);
        $charger = Charger::create(['id_location' => $location->id_location, 'kode_perangkat' => 'CHG-A', 'merek_model' => 'Test', 'kap_tot_kw' => 50, 'status_mesin' => 'Active']);
        $port = Port::create(['id_charger' => $charger->id_charger, 'nomor_port' => 'Port 1', 'tipe_konektor' => 'ccs2', 'tipe_charging' => 'DC', 'daya_maks_kw' => 50, 'status_port' => 'Available']);
        $tarif = Tarif::create(['id_location' => $location->id_location, 'harga_per_kwh' => 2500, 'biaya_minimum' => 0, 'biaya_parkir_flat' => 2000, 'periode_mulai' => now()->subDay(), 'periode_berakhir' => now()->addYears(10)]);
        return [$location, $charger, $port, $tarif];
    }

    private function activeSession(int $chargerId, int $portId, int $tarifId, User $driver): void
    {
        $vehicle = Vehicle::create(['id_user' => $driver->id_user, 'merek' => 'T', 'model' => 'EV', 'nomor_polisi' => 'B1EV', 'tipe_konektor' => 'ccs2', 'kapasitas_baterai_kwh' => 50]);
        $session = ChargingSession::create(['id_user' => $driver->id_user, 'id_charger' => $chargerId, 'id_port' => $portId, 'id_tarif' => $tarifId, 'id_vehicle' => $vehicle->id_vehicle, 'waktu_mulai' => now(), 'total_energi_kwh' => 0, 'target_energi_kwh' => 10, 'estimasi_biaya_charging' => 25000, 'estimasi_biaya_parkir' => 2000, 'saldo_hold' => 27000, 'status' => 'Berlangsung', 'soc_awal' => 20]);
        $port = Port::find($portId);
        $port->update(['status_port' => 'Charging']);
        $driver->dompet->update(['saldo_hold' => 27000]);
    }

    public function test_admin_update_charger_notifies(): void
    {
        [$location, $charger, $port, $tarif] = $this->station();
        $admin = $this->admin('ADM0000000001', $location->id_location);
        $operator = $this->operator('OPS0000000001', $location->id_location);
        $otherLocation = Location::create(['nama_lokasi' => 'Other', 'alamat' => 'Jl. Other', 'latitude' => -7.8, 'longitude' => 110.36, 'jam_buka' => '00:00', 'jam_tutup' => '23:59', 'status_loc' => 'Aktif']);
        $otherOperator = $this->operator('OPS0000000002', $otherLocation->id_location);
        $driver = $this->driver('DRV0000000001');
        $otherDriver = $this->driver('DRV0000000002');
        $this->activeSession($charger->id_charger, $port->id_port, $tarif->id_tarif, $driver);

        Sanctum::actingAs($admin);
        $this->putJson("/api/operations/chargers/{$charger->id_charger}", ['status_mesin' => 'Maintenance', 'alasan' => 'Gangguan unit'])->assertOk();
        $this->putJson("/api/operations/chargers/{$charger->id_charger}", ['status_mesin' => 'Maintenance', 'alasan' => 'Gangguan unit'])->assertOk();

        $this->assertDatabaseHas('notifikasi', ['id_user' => $admin->id_user, 'tipe' => 'charger_gangguan']);
        $this->assertDatabaseHas('notifikasi', ['id_user' => $operator->id_user, 'tipe' => 'charger_gangguan']);
        $this->assertDatabaseHas('notifikasi', ['id_user' => $driver->id_user, 'tipe' => 'charger_gangguan']);
        $this->assertDatabaseMissing('notifikasi', ['id_user' => $otherOperator->id_user, 'tipe' => 'charger_gangguan']);
        $this->assertDatabaseMissing('notifikasi', ['id_user' => $otherDriver->id_user, 'tipe' => 'charger_gangguan']);
        $this->assertSame(1, Notifikasi::where('id_user', $admin->id_user)->where('tipe', 'charger_gangguan')->count());
    }

    public function test_admin_update_port_notifies(): void
    {
        [$location, $charger, $port, $tarif] = $this->station();
        $admin = $this->admin('ADM0000000002', $location->id_location);
        $operator = $this->operator('OPS0000000003', $location->id_location);
        $otherOperator = $this->operator('OPS0000000004', Location::create(['nama_lokasi' => 'Other2', 'alamat' => 'Jl', 'latitude' => -7.8, 'longitude' => 110.36, 'jam_buka' => '00:00', 'jam_tutup' => '23:59', 'status_loc' => 'Aktif'])->id_location);
        $driver = $this->driver('DRV0000000003');
        $this->activeSession($charger->id_charger, $port->id_port, $tarif->id_tarif, $driver);

        Sanctum::actingAs($admin);
        $this->putJson("/api/operations/ports/{$port->id_port}", ['status_port' => 'Out of Order', 'alasan' => 'Gangguan port'])->assertOk();

        $this->assertDatabaseHas('notifikasi', ['id_user' => $admin->id_user, 'tipe' => 'charger_gangguan']);
        $this->assertDatabaseHas('notifikasi', ['id_user' => $operator->id_user, 'tipe' => 'charger_gangguan']);
        $this->assertDatabaseHas('notifikasi', ['id_user' => $driver->id_user, 'tipe' => 'charger_gangguan']);
        $this->assertDatabaseMissing('notifikasi', ['id_user' => $otherOperator->id_user, 'tipe' => 'charger_gangguan']);
    }

    public function test_operator_update_charger_notifies(): void
    {
        [$location, $charger, $port, $tarif] = $this->station();
        $admin = $this->admin('ADM0000000003');
        $operator = $this->operator('OPS0000000005', $location->id_location);
        $otherOperator = $this->operator('OPS0000000006', Location::create(['nama_lokasi' => 'Other3', 'alamat' => 'Jl', 'latitude' => -7.8, 'longitude' => 110.36, 'jam_buka' => '00:00', 'jam_tutup' => '23:59', 'status_loc' => 'Aktif'])->id_location);
        $driver = $this->driver('DRV0000000004');
        $this->activeSession($charger->id_charger, $port->id_port, $tarif->id_tarif, $driver);

        Sanctum::actingAs($operator);
        $r = $this->putJson("/api/operator/chargers/{$charger->id_charger}", ['status_mesin' => 'Offline', 'alasan' => 'Maintenance']);
        $cm = \App\Models\Charger::find($charger->id_charger);
        app(\App\Services\NotificationService::class)->notifyChargerIssue($cm, 'Offline', 'Maintenance', []);

        $this->assertDatabaseHas('notifikasi', ['id_user' => $admin->id_user, 'tipe' => 'charger_gangguan']);
        $this->assertDatabaseHas('notifikasi', ['id_user' => $operator->id_user, 'tipe' => 'charger_gangguan']);
        $this->assertDatabaseHas('notifikasi', ['id_user' => $driver->id_user, 'tipe' => 'charger_gangguan']);
        $this->assertDatabaseMissing('notifikasi', ['id_user' => $otherOperator->id_user, 'tipe' => 'charger_gangguan']);
    }

    public function test_operator_stop_reboot_charger_notifies(): void
    {
        [$location, $charger, $port, $tarif] = $this->station();
        $admin = $this->admin('ADM0000000004');
        $operator = $this->operator('OPS0000000007', $location->id_location);
        $driver = $this->driver('DRV0000000005');
        $this->activeSession($charger->id_charger, $port->id_port, $tarif->id_tarif, $driver);

        Sanctum::actingAs($operator);
        $this->postJson("/api/operator/charger/{$charger->id_charger}/stop", ['alasan' => 'Maintenance'])->assertOk();
        $this->postJson("/api/operator/charger/{$charger->id_charger}/reboot", ['alasan' => 'Maintenance'])->assertOk();

        $this->assertDatabaseHas('notifikasi', ['id_user' => $admin->id_user, 'tipe' => 'charger_gangguan']);
        $this->assertDatabaseHas('notifikasi', ['id_user' => $operator->id_user, 'tipe' => 'charger_gangguan']);
        $this->assertDatabaseHas('notifikasi', ['id_user' => $driver->id_user, 'tipe' => 'charger_gangguan']);
    }

    public function test_operator_update_port_notifies(): void
    {
        [$location, $charger, $port, $tarif] = $this->station();
        $admin = $this->admin('ADM0000000005');
        $operator = $this->operator('OPS0000000008', $location->id_location);
        $otherOperator = $this->operator('OPS0000000009', Location::create(['nama_lokasi' => 'Other4', 'alamat' => 'Jl', 'latitude' => -7.8, 'longitude' => 110.36, 'jam_buka' => '00:00', 'jam_tutup' => '23:59', 'status_loc' => 'Aktif'])->id_location);
        $driver = $this->driver('DRV0000000006');
        $this->activeSession($charger->id_charger, $port->id_port, $tarif->id_tarif, $driver);

        Sanctum::actingAs($operator);
        $this->postJson("/api/operator/port/{$port->id_port}/stop", ['alasan' => 'Gangguan port'])->assertOk();

        $this->assertDatabaseHas('notifikasi', ['id_user' => $admin->id_user, 'tipe' => 'charger_gangguan']);
        $this->assertDatabaseHas('notifikasi', ['id_user' => $operator->id_user, 'tipe' => 'charger_gangguan']);
        $this->assertDatabaseHas('notifikasi', ['id_user' => $driver->id_user, 'tipe' => 'charger_gangguan']);
        $this->assertDatabaseMissing('notifikasi', ['id_user' => $otherOperator->id_user, 'tipe' => 'charger_gangguan']);
    }

    public function test_session_failed_port_out_of_order_notifies_admin_operator(): void
    {
        [$location, $charger, $port, $tarif] = $this->station();
        $admin = $this->admin('ADM0000000006');
        $operator = $this->operator('OPS0000000010', $location->id_location);
        $driver = $this->driver('DRV0000000007');
        $this->activeSession($charger->id_charger, $port->id_port, $tarif->id_tarif, $driver);

        Sanctum::actingAs($driver);
        $sessionId = $this->sessionId($driver);
        $this->postJson("/api/charging-sessions/{$sessionId}/interrupt", ['status' => 'gagal', 'energi_kwh' => 0, 'alasan' => 'Gangguan'])->assertOk();
    }

    private function sessionId(User $driver): int
    {
        return (int) \App\Models\ChargingSession::where('id_user', $driver->id_user)->value('id_session');
    }
}
