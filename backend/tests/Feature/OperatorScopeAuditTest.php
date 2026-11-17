<?php

namespace Tests\Feature;

use App\Models\Charger;
use App\Models\AuditLog;
use App\Models\Location;
use App\Models\Port;
use App\Models\StationOperator;
use App\Models\Tarif;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

/** Adversarial station-scope checks for shared Admin/Operator APIs. */
class OperatorScopeAuditTest extends TestCase
{
    use RefreshDatabase;

    private function location(string $name): array
    {
        $location = Location::create([
            'nama_lokasi' => $name, 'alamat' => 'Alamat '.$name,
            'latitude' => -7.8, 'longitude' => 110.36, 'jam_buka' => '00:00',
            'jam_tutup' => '23:59', 'status_loc' => 'Aktif',
        ]);
        $charger = Charger::create([
            'id_location' => $location->id_location, 'kode_perangkat' => 'CHG-'.$name,
            'merek_model' => 'Audit', 'kap_tot_kw' => 50, 'status_mesin' => 'Active',
        ]);
        $port = Port::create([
            'id_charger' => $charger->id_charger, 'nomor_port' => 'Port 1',
            'tipe_konektor' => 'ccs2', 'tipe_charging' => 'DC', 'daya_maks_kw' => 50,
            'status_port' => 'Available',
        ]);
        $tariff = Tarif::create([
            'id_location' => $location->id_location, 'harga_per_kwh' => 2500,
            'biaya_minimum' => 0, 'biaya_parkir_flat' => 2000,
            'periode_mulai' => now()->subDay(), 'periode_berakhir' => now()->addYears(10),
        ]);
        return [$location, $charger, $port, $tariff];
    }

    public function test_operator_id_manipulation_cannot_read_or_change_other_station_resources(): void
    {
        [$stationA] = $this->location('Station-A');
        [$stationB, $chargerB, $portB, $tariffB] = $this->location('Station-B');
        $operator = User::create([
            'id_user' => 'OPS0000000001', 'email' => 'operator@ops.ac.id',
            'password' => bcrypt('Password123'), 'peran' => 'operator', 'status_akun' => 'Aktif',
        ]);
        StationOperator::create(['id_user' => $operator->id_user, 'id_location' => $stationA->id_location]);
        Sanctum::actingAs($operator);

        $dashboard = $this->getJson('/api/operations/dashboard')->assertOk();
        $this->assertSame(1, $dashboard->json('data.summary.total_station'));
        $this->assertSame($stationA->id_location, $dashboard->json('data.stations.0.id_location'));

        $range = now()->toDateString();
        $this->getJson("/api/operations/reports?from={$range}&to={$range}&id_location={$stationB->id_location}")
            ->assertForbidden();
        $this->putJson("/api/operations/stations/{$stationB->id_location}", [])->assertForbidden();
        $this->putJson("/api/operations/chargers/{$chargerB->id_charger}", [])->assertForbidden();
        $this->putJson("/api/operations/ports/{$portB->id_port}", [])->assertForbidden();
        $this->postJson("/api/operations/stations/{$stationB->id_location}/tarifs", [])->assertForbidden();

        $this->getJson("/api/stations/{$stationB->id_location}")->assertNotFound();
        $this->getJson("/api/operator/chargers/{$chargerB->id_charger}")->assertNotFound();
        $this->putJson("/api/operator/chargers/{$chargerB->id_charger}", ['status_mesin' => 'Offline'])->assertNotFound();
        $this->putJson("/api/operator/ports/{$portB->id_port}", ['status_port' => 'Maintenance'])->assertNotFound();
        $this->putJson("/api/operator/tarif/{$tariffB->id_tarif}", [
            'harga_per_kwh' => 3000, 'biaya_parkir_flat' => 2000,
            'effective_at' => now()->addDays(2)->toDateTimeString(),
        ])->assertNotFound();
        $this->getJson('/api/operator/notifications', ['X-Station-Id' => (string) $stationB->id_location])
            ->assertForbidden();
    }

    public function test_operator_cannot_manage_admin_accounts_configuration_or_audit(): void
    {
        [$station] = $this->location('Station-A');
        $operator = User::create([
            'id_user' => 'OPS0000000001', 'email' => 'operator@ops.ac.id',
            'password' => bcrypt('Password123'), 'peran' => 'operator', 'status_akun' => 'Aktif',
        ]);
        StationOperator::create(['id_user' => $operator->id_user, 'id_location' => $station->id_location]);
        Sanctum::actingAs($operator);

        $this->getJson('/api/operations/drivers')->assertForbidden();
        $this->getJson('/api/operations/payment-methods')->assertForbidden();
        $this->getJson('/api/operations/audit-logs')->assertForbidden();
        $this->getJson('/api/operations/config')->assertForbidden();
        $this->putJson("/api/operations/operators/{$operator->id_user}/station", [
            'id_locations' => [$station->id_location],
        ])->assertForbidden();
        $this->putJson("/api/operations/operators/{$operator->id_user}/profile", [
            'email' => 'changed@ops.ac.id',
        ])->assertForbidden();
    }

    public function test_operator_port_create_and_update_accept_only_ac_or_dc_charging_types(): void
    {
        [$station, $charger, $port] = $this->location('Charging-Type');
        $operator = User::create([
            'id_user' => 'OPS0000000002', 'email' => 'operator-type@ops.ac.id',
            'password' => bcrypt('Password123'), 'peran' => 'operator', 'status_akun' => 'Aktif',
        ]);
        StationOperator::create(['id_user' => $operator->id_user, 'id_location' => $station->id_location]);
        Sanctum::actingAs($operator);

        $payload = [
            'id_charger' => $charger->id_charger, 'nomor_port' => 'Port 2',
            'tipe_konektor' => 'ccs2', 'tipe_charging' => 'FAST', 'daya_maks_kw' => 50,
        ];
        $this->postJson('/api/operator/storeports', $payload)
            ->assertUnprocessable()->assertJsonValidationErrors('tipe_charging');
        $created = $this->postJson('/api/operator/storeports', array_merge($payload, ['tipe_charging' => 'AC']))
            ->assertCreated()->json('data.id_port');
        $this->putJson('/api/operator/ports/'.$port->id_port, ['tipe_charging' => 'FAST'])
            ->assertUnprocessable()->assertJsonValidationErrors('tipe_charging');
        $this->putJson('/api/operator/ports/'.$port->id_port, ['tipe_charging' => 'DC'])->assertOk();
        $this->assertDatabaseHas('ports', ['id_port' => $created, 'tipe_charging' => 'AC']);
        $this->assertDatabaseHas('ports', ['id_port' => $port->id_port, 'tipe_charging' => 'DC']);
    }

    public function test_legacy_operator_charger_and_port_writes_record_actor_and_before_after_values(): void
    {
        [$station, $charger, $port] = $this->location('Audit-Write');
        $operator = User::create([
            'id_user' => 'OPS0000000003', 'email' => 'operator-audit@ops.ac.id',
            'password' => bcrypt('Password123'), 'peran' => 'operator', 'status_akun' => 'Aktif',
        ]);
        StationOperator::create(['id_user' => $operator->id_user, 'id_location' => $station->id_location]);
        Sanctum::actingAs($operator);

        $createdChargerId = $this->postJson('/api/operator/storechargers', [
            'kode_perangkat' => 'CHG-NEW-AUD', 'merek_model' => 'Model Baru',
            'kap_tot_kw' => 80, 'status_mesin' => 'Maintenance', 'alasan' => 'Pemasangan unit baru',
        ])->assertCreated()->json('data.id_charger');
        $this->putJson('/api/operator/chargers/'.$charger->id_charger, [
            'kode_perangkat' => 'CHG-UPDATED', 'merek_model' => 'Model Revisi',
            'kap_tot_kw' => 75, 'status_mesin' => 'Offline', 'alasan' => 'Kapasitas perangkat diperiksa',
        ])->assertOk();

        $createdPortId = $this->postJson('/api/operator/storeports', [
            'id_charger' => $createdChargerId, 'nomor_port' => 'Port Baru',
            'tipe_konektor' => 'ccs2', 'tipe_charging' => 'DC', 'daya_maks_kw' => 80,
            'alasan' => 'Penambahan konektor baru',
        ])->assertCreated()->json('data.id_port');
        $this->putJson('/api/operator/ports/'.$port->id_port, [
            'nomor_port' => 'Port Revisi', 'tipe_konektor' => 'type2',
            'tipe_charging' => 'AC', 'daya_maks_kw' => 22, 'alasan' => 'Spesifikasi diperbarui',
        ])->assertOk();

        $logs = AuditLog::orderBy('id_audit')->get();
        $this->assertCount(4, $logs);
        $this->assertSame(['buat_charger', 'ubah_charger', 'buat_port', 'ubah_port'], $logs->pluck('aksi')->all());
        foreach ($logs as $log) {
            $this->assertSame($operator->id_user, $log->id_user);
            $this->assertSame($station->id_location, $log->id_location);
            $this->assertNotNull($log->created_at);
            $this->assertNotEmpty($log->alasan);
        }
        $this->assertSame('CHG-NEW-AUD', $logs[0]->data_sesudah['kode_perangkat']);
        $this->assertSame('CHG-Audit-Write', $logs[1]->data_sebelum['kode_perangkat']);
        $this->assertSame('CHG-UPDATED', $logs[1]->data_sesudah['kode_perangkat']);
        $this->assertSame('Active', $logs[1]->data_sebelum['status_mesin']);
        $this->assertSame('Offline', $logs[1]->data_sesudah['status_mesin']);
        $this->assertSame('Port Baru', $logs[2]->data_sesudah['nomor_port']);
        $this->assertSame('Port 1', $logs[3]->data_sebelum['nomor_port']);
        $this->assertSame('Port Revisi', $logs[3]->data_sesudah['nomor_port']);
        $this->assertSame('DC', $logs[3]->data_sebelum['tipe_charging']);
        $this->assertSame('AC', $logs[3]->data_sesudah['tipe_charging']);
        $this->assertSame((string) $createdChargerId, $logs[0]->id_entitas);
        $this->assertSame((string) $createdPortId, $logs[2]->id_entitas);
    }

    public function test_operator_assigned_station_search_and_pagination_preserve_scope_and_legacy_shape(): void
    {
        [$stationA] = $this->location('Assigned Alpha');
        [$stationB] = $this->location('Assigned Beta');
        [$foreignStation] = $this->location('Foreign Beta');
        $stationA->update(['kode_station' => 'CODE-ALPHA']);
        $stationB->update(['kode_station' => 'CODE-BETA']);
        $foreignStation->update(['kode_station' => 'FOREIGN-BETA']);
        $operator = User::create([
            'id_user' => 'OPS0000000004', 'email' => 'station-search@ops.ac.id',
            'password' => bcrypt('Password123'), 'peran' => 'operator', 'status_akun' => 'Aktif',
        ]);
        StationOperator::create(['id_user' => $operator->id_user, 'id_location' => $stationA->id_location]);
        StationOperator::create(['id_user' => $operator->id_user, 'id_location' => $stationB->id_location]);
        $foreignOperator = User::create([
            'id_user' => 'OPS0000000005', 'email' => 'foreign-station@ops.ac.id',
            'password' => bcrypt('Password123'), 'peran' => 'operator', 'status_akun' => 'Aktif',
        ]);
        StationOperator::create(['id_user' => $foreignOperator->id_user, 'id_location' => $foreignStation->id_location]);
        Sanctum::actingAs($operator);

        $legacy = $this->getJson('/api/operator/stations')->assertOk()->json('data');
        $this->assertCount(2, $legacy);
        $this->assertArrayNotHasKey('current_page', $legacy);

        $nameSearch = $this->getJson('/api/operator/stations?q=Beta&per_page=1')
            ->assertOk()
            ->assertJsonPath('data.total', 1)
            ->assertJsonPath('data.data.0.id_location', $stationB->id_location)
            ->json('data');
        $this->assertSame(1, $nameSearch['per_page']);

        $codeSearch = $this->getJson('/api/operator/stations?q=CODE-ALPHA')
            ->assertOk()
            ->assertJsonPath('data.total', 1)
            ->assertJsonPath('data.data.0.id_location', $stationA->id_location);

        $boundedPage = $this->getJson('/api/operator/stations?per_page=500')
            ->assertOk()
            ->json('data');
        $this->assertSame(100, $boundedPage['per_page']);
        $this->assertSame(2, $boundedPage['total']);
        $this->assertNotContains($foreignStation->id_location, array_column($boundedPage['data'], 'id_location'));
    }
}
