<?php

namespace Tests\Feature;

use App\Models\Charger;
use App\Models\ChargingSession;
use App\Models\Dompet;
use App\Models\ErrorLog;
use App\Models\Location;
use App\Models\Port;
use App\Models\StationOperator;
use App\Models\Tarif;
use App\Models\User;
use App\Models\UserProfile;
use App\Models\Vehicle;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class MalfunctionReportTest extends TestCase
{
    use RefreshDatabase;

    private function admin(string $id): User
    {
        return User::create([
            'id_user' => $id,
            'email' => "{$id}@admin.ac.id",
            'password' => bcrypt('password'),
            'peran' => 'admin',
            'status_akun' => 'Aktif',
        ]);
    }

    private function operator(string $id, int $locationId): User
    {
        $user = User::create([
            'id_user' => $id,
            'email' => "{$id}@ops.ac.id",
            'password' => bcrypt('password'),
            'peran' => 'operator',
            'status_akun' => 'Aktif',
        ]);
        UserProfile::create([
            'id_user' => $user->id_user,
            'nama_lengkap' => $id,
            'nomor_telepon' => '081234567890',
            'alamat' => 'Jl. Test',
            'tanggal_lahir' => '1995-01-01',
        ]);
        StationOperator::create(['id_user' => $user->id_user, 'id_location' => $locationId]);

        return $user;
    }

    private function station(string $name, string $driverId, string $driverName): array
    {
        $driver = User::create([
            'id_user' => $driverId,
            'email' => "{$driverId}@driver.ac.id",
            'password' => bcrypt('password'),
            'peran' => 'driver',
            'status_akun' => 'Aktif',
        ]);
        UserProfile::create([
            'id_user' => $driver->id_user,
            'nama_lengkap' => $driverName,
            'nomor_telepon' => '081234567890',
            'alamat' => 'Jl. Test',
            'tanggal_lahir' => '1995-01-01',
        ]);
        Dompet::create([
            'id_user' => $driver->id_user,
            'saldo' => 100000,
            'saldo_hold' => 0,
            'status_dompet' => 'Aktif',
        ]);

        $location = Location::create([
            'nama_lokasi' => "Station {$name}",
            'alamat' => 'Jl. Test',
            'latitude' => -7.8,
            'longitude' => 110.36,
            'jam_buka' => '00:00',
            'jam_tutup' => '23:59',
            'status_loc' => 'Aktif',
        ]);
        $charger = Charger::create([
            'id_location' => $location->id_location,
            'kode_perangkat' => "{$name}-CHG",
            'merek_model' => 'Test',
            'kap_tot_kw' => 50,
            'status_mesin' => 'Active',
        ]);
        $port = Port::create([
            'id_charger' => $charger->id_charger,
            'nomor_port' => 'Port 1',
            'tipe_konektor' => 'ccs2',
            'tipe_charging' => 'DC',
            'daya_maks_kw' => 50,
            'status_port' => 'Available',
        ]);
        $tarif = Tarif::create([
            'id_location' => $location->id_location,
            'harga_per_kwh' => 2500,
            'biaya_minimum' => 0,
            'biaya_parkir_flat' => 2000,
            'periode_mulai' => now()->subDay(),
            'periode_berakhir' => now()->addYears(10),
        ]);
        $vehicle = Vehicle::create([
            'id_user' => $driver->id_user,
            'merek' => 'Test',
            'model' => 'EV',
            'nomor_polisi' => "B{$name}EV",
            'tipe_konektor' => 'ccs2',
            'kapasitas_baterai_kwh' => 50,
        ]);
        $session = ChargingSession::create([
            'id_user' => $driver->id_user,
            'id_charger' => $charger->id_charger,
            'id_port' => $port->id_port,
            'id_tarif' => $tarif->id_tarif,
            'id_vehicle' => $vehicle->id_vehicle,
            'waktu_mulai' => now()->subHour(),
            'total_energi_kwh' => 10,
            'target_energi_kwh' => 10,
            'estimasi_biaya_charging' => 25000,
            'estimasi_biaya_parkir' => 2000,
            'saldo_hold' => 0,
            'status' => 'Selesai',
            'soc_awal' => 20,
        ]);

        return [$location, $charger, $session, $driver];
    }

    private function errorLog(array $station, string $status, string $jenisError): ErrorLog
    {
        [, $charger, $session, $driver] = $station;

        return ErrorLog::create([
            'id_charger' => $charger->id_charger,
            'id_session' => $session->id_session,
            'id_user' => $driver->id_user,
            'jenis_error' => $jenisError,
            'desk_mslh' => "Laporan {$jenisError}",
            'waktu_terjadi' => now()->subMinutes(5),
            'status_tanganan' => $status,
        ]);
    }

    public function test_admin_report_returns_malfunction_summary_and_items(): void
    {
        $stationA = $this->station('STA', 'DRV0000000001', 'Driver A');
        $stationB = $this->station('STB', 'DRV0000000002', 'Driver B');
        $this->errorLog($stationA, 'Menunggu', 'Konektor panas');
        $this->errorLog($stationA, 'Sedang Ditangani', 'Sensor arus');
        $this->errorLog($stationA, 'Selesai', 'Layar mati');
        $this->errorLog($stationB, 'Menunggu', 'Kabel rusak');
        $admin = $this->admin('ADM0000000001');
        Sanctum::actingAs($admin);

        $response = $this->getJson('/api/operations/reports?from='.now()->toDateString().'&to='.now()->toDateString());

        $response->assertOk()
            ->assertJsonCount(4, 'data.malfunctions')
            ->assertJsonPath('data.summary.malfunctions.total', 4)
            ->assertJsonPath('data.summary.malfunctions.pending', 2)
            ->assertJsonPath('data.summary.malfunctions.in_progress', 1)
            ->assertJsonPath('data.summary.malfunctions.resolved', 1)
            ->assertJsonFragment([
                'id_session' => $stationA[2]->id_session,
                'kode_perangkat' => 'STA-CHG',
                'merek_model' => 'Test',
                'nama_lokasi' => 'Station STA',
                'alamat' => 'Jl. Test',
                'jenis_error' => 'Konektor panas',
                'nama_pelapor' => 'Driver A',
                'email_pelapor' => 'DRV0000000001@driver.ac.id',
                'status_tanganan' => 'Menunggu',
            ]);
    }

    public function test_operator_report_only_returns_assigned_station_malfunctions(): void
    {
        $stationA = $this->station('STA', 'DRV0000000003', 'Driver A');
        $stationB = $this->station('STB', 'DRV0000000004', 'Driver B');
        $this->errorLog($stationA, 'Menunggu', 'Konektor panas');
        $this->errorLog($stationA, 'Sedang Ditangani', 'Sensor arus');
        $this->errorLog($stationA, 'Selesai', 'Layar mati');
        $this->errorLog($stationB, 'Menunggu', 'Kabel rusak');
        $operator = $this->operator('OPS0000000001', $stationA[0]->id_location);
        Sanctum::actingAs($operator);

        $response = $this->getJson('/api/operator/reports?start_date='.now()->toDateString().'&end_date='.now()->toDateString());

        $response->assertOk()
            ->assertJsonCount(3, 'data.malfunctions')
            ->assertJsonPath('data.summary.malfunctions.total', 3)
            ->assertJsonPath('data.summary.malfunctions.pending', 1)
            ->assertJsonPath('data.summary.malfunctions.in_progress', 1)
            ->assertJsonPath('data.summary.malfunctions.resolved', 1)
            ->assertJsonMissing(['kode_perangkat' => 'STB-CHG']);
    }
}
