<?php

namespace Tests\Feature;

use App\Models\Charger;
use App\Models\ChargingSession;
use App\Models\Location;
use App\Models\Port;
use App\Models\StationOperator;
use App\Models\Tarif;
use App\Models\User;
use App\Models\Vehicle;
use Carbon\Carbon;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class OperatorUtilizationReportTest extends TestCase
{
    use RefreshDatabase;

    public function test_utilization_counts_completed_failed_and_paused_charging_time_only(): void
    {
        Carbon::setTestNow(Carbon::parse('2026-11-17 12:00:00'));
        try {
            $station = Location::create([
                'nama_lokasi' => 'Utilization Station', 'alamat' => 'Alamat',
                'latitude' => -7.8, 'longitude' => 110.36, 'jam_buka' => '00:00',
                'jam_tutup' => '23:59', 'status_loc' => 'Aktif',
            ]);
            $charger = Charger::create([
                'id_location' => $station->id_location, 'kode_perangkat' => 'UTIL-1',
                'merek_model' => 'Test', 'kap_tot_kw' => 50, 'status_mesin' => 'Active',
            ]);
            Port::create([
                'id_charger' => $charger->id_charger, 'nomor_port' => 'P1',
                'tipe_konektor' => 'ccs2', 'tipe_charging' => 'DC', 'daya_maks_kw' => 50,
                'status_port' => 'Available',
            ]);
            $tariff = Tarif::create([
                'id_location' => $station->id_location, 'harga_per_kwh' => 2500,
                'biaya_minimum' => 0, 'biaya_parkir_flat' => 2000,
                'periode_mulai' => now()->subDay(), 'periode_berakhir' => now()->addYear(),
            ]);
            $operator = User::create([
                'id_user' => 'OPS0000000088', 'email' => 'util-operator@test.com',
                'password' => bcrypt('Password123'), 'peran' => 'operator', 'status_akun' => 'Aktif',
            ]);
            StationOperator::create(['id_user' => $operator->id_user, 'id_location' => $station->id_location]);
            $driver = User::create([
                'id_user' => 'DRV0000000088', 'email' => 'util-driver@test.com',
                'password' => bcrypt('Password123'), 'peran' => 'driver', 'status_akun' => 'Aktif',
            ]);
            $vehicle = Vehicle::create([
                'id_user' => $driver->id_user, 'merek' => 'Test', 'model' => 'EV',
                'nomor_polisi' => 'UTIL-1', 'tipe_konektor' => 'ccs2', 'kapasitas_baterai_kwh' => 50,
            ]);
            $base = [
                'id_user' => $driver->id_user, 'id_charger' => $charger->id_charger,
                'id_port' => 1, 'id_tarif' => $tariff->id_tarif, 'id_vehicle' => $vehicle->id_vehicle,
                'total_energi_kwh' => 0, 'target_energi_kwh' => 10,
                'estimasi_biaya_charging' => 25000, 'estimasi_biaya_parkir' => 2000,
                'saldo_hold' => 27000, 'soc_awal' => 20,
            ];
            ChargingSession::create($base + [
                'waktu_mulai' => '2026-11-17 08:00:00', 'waktu_selesai' => '2026-11-17 09:00:00',
                'total_jeda_detik' => 300, 'status' => 'Selesai',
            ]);
            ChargingSession::create($base + [
                'waktu_mulai' => '2026-11-17 09:00:00', 'waktu_selesai' => '2026-11-17 09:30:00',
                'status' => 'Gagal',
            ]);
            ChargingSession::create($base + [
                'waktu_mulai' => '2026-11-17 11:00:00', 'dijeda_pada' => '2026-11-17 11:50:00',
                'total_jeda_detik' => 300, 'status' => 'Berlangsung',
            ]);

            Sanctum::actingAs($operator);
            $response = $this->getJson('/api/operator/reports?start_date=2026-11-17&end_date=2026-11-17')->assertOk();
            $this->assertSame(7800, $response->json('data.summary.utilization.charging_seconds'));
            $this->assertSame(86400, $response->json('data.summary.utilization.denominator_seconds'));
            $this->assertSame(9.03, $response->json('data.summary.utilization.percent'));
            $this->assertSame(1, $response->json('data.summary.utilization.assigned_ports'));
        } finally {
            Carbon::setTestNow();
        }
    }
}
