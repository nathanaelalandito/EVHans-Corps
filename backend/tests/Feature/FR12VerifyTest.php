<?php

namespace Tests\Feature;

use App\Models\Charger;
use App\Models\Location;
use App\Models\Port;
use App\Models\Tarif;
use App\Models\User;
use App\Models\UserProfile;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class FR12VerifyTest extends TestCase
{
    use RefreshDatabase;

    private function makeStation(string $name, string $status, string $connector, int $power, int $tariff, bool $openNow = true): Location
    {
        $location = Location::create([
            'nama_lokasi' => $name,
            'alamat' => 'Alamat '.$name,
            'kode_station' => 'SPKLU-'.strtoupper(substr(md5($name), 0, 4)),
            'latitude' => -7.8,
            'longitude' => 110.36,
            'jam_buka' => $openNow ? '00:00' : '23:59',
            'jam_tutup' => $openNow ? '23:59' : '00:01',
            'status_loc' => $status,
        ]);

        $charger = Charger::create([
            'id_location' => $location->id_location,
            'kode_perangkat' => 'CHG-'.$location->id_location,
            'merek_model' => 'Test',
            'kap_tot_kw' => 50,
            'status_mesin' => 'Active',
        ]);

        Port::create([
            'id_charger' => $charger->id_charger,
            'nomor_port' => 'Port A',
            'tipe_konektor' => $connector,
            'tipe_charging' => 'DC',
            'daya_maks_kw' => $power,
            'status_port' => 'Available',
        ]);

        Tarif::create([
            'id_location' => $location->id_location,
            'harga_per_kwh' => $tariff,
            'biaya_minimum' => 0,
            'biaya_parkir_flat' => 2000,
            'periode_mulai' => now()->subDay(),
            'periode_berakhir' => now()->addYears(10),
        ]);

        return $location;
    }

    private function driver(): User
    {
        $driver = User::create(['id_user' => 'DRV0000000001', 'email' => 'd@test.com', 'password' => bcrypt('password'), 'peran' => 'driver', 'status_akun' => 'Aktif']);
        UserProfile::create(['id_user' => $driver->id_user, 'nama_lengkap' => 'Driver', 'nomor_telepon' => '081234567890', 'alamat' => 'Jl. Test', 'tanggal_lahir' => '1995-01-01']);
        return $driver;
    }

    public function test_q_nama_alamat_kode(): void
    {
        $this->makeStation('Malioboro Mall', 'Aktif', 'ccs2', 50, 2500);
        $driver = $this->driver();
        Sanctum::actingAs($driver);

        $name = $this->getJson('/api/stations?q=malioboro')->json('data');
        $this->assertCount(1, $name);

        $code = $this->makeStation('UGM Boulevard', 'Aktif', 'ccs2', 50, 2500);
        $code->update(['kode_station' => 'SPKLU-UGM1']);
        $byCode = $this->getJson('/api/stations?q=ugm1')->json('data');
        $this->assertCount(1, $byCode);
    }

    public function test_connector_filter(): void
    {
        $this->makeStation('Station A', 'Aktif', 'ccs2', 50, 2500);
        $this->makeStation('Station B', 'Aktif', 'type_2', 50, 2500);
        $driver = $this->driver();
        Sanctum::actingAs($driver);

        $res = $this->getJson('/api/stations?connector=ccs2')->json('data');
        $this->assertCount(1, $res);
        $this->assertSame('Station A', $res[0]['nama_lokasi']);
    }

    public function test_availability_uses_can_start(): void
    {
        $this->makeStation('Open Station', 'Aktif', 'ccs2', 50, 2500, true);
        $this->makeStation('Closed Station', 'Aktif', 'ccs2', 50, 2500, false);
        $this->makeStation('Maintenance Station', 'Maintenance', 'ccs2', 50, 2500, true);
        $driver = $this->driver();
        Sanctum::actingAs($driver);

        $res = $this->getJson('/api/stations?availability=tersedia')->json('data');
        $this->assertCount(1, $res);
        $this->assertSame('Open Station', $res[0]['nama_lokasi']);
    }

    public function test_min_power_uses_port_power(): void
    {
        $this->makeStation('Low Power', 'Aktif', 'ccs2', 22, 2500);
        $this->makeStation('High Power', 'Aktif', 'ccs2', 120, 2500);
        $driver = $this->driver();
        Sanctum::actingAs($driver);

        $res = $this->getJson('/api/stations?min_power=100')->json('data');
        $this->assertCount(1, $res);
        $this->assertSame('High Power', $res[0]['nama_lokasi']);
    }

    public function test_max_tariff_uses_current_tariff(): void
    {
        $this->makeStation('Cheap', 'Aktif', 'ccs2', 50, 2000);
        $this->makeStation('Expensive', 'Aktif', 'ccs2', 50, 3000);
        $driver = $this->driver();
        Sanctum::actingAs($driver);

        $res = $this->getJson('/api/stations?max_tariff=2500')->json('data');
        $this->assertCount(1, $res);
        $this->assertSame('Cheap', $res[0]['nama_lokasi']);
    }

    public function test_combined_filters(): void
    {
        $this->makeStation('Target Station', 'Aktif', 'ccs2', 120, 2000);
        $this->makeStation('Other Station', 'Aktif', 'type_2', 22, 3000);
        $driver = $this->driver();
        Sanctum::actingAs($driver);

        $res = $this->getJson('/api/stations?q=target&connector=ccs2&availability=tersedia&min_power=100&max_tariff=2500')->json('data');
        $this->assertCount(1, $res);
        $this->assertSame('Target Station', $res[0]['nama_lokasi']);
    }

    public function test_nonaktif_never_shown(): void
    {
        $this->makeStation('Hidden Station', 'Nonaktif', 'ccs2', 50, 2500);
        $driver = $this->driver();
        Sanctum::actingAs($driver);

        $res = $this->getJson('/api/stations')->json('data');
        $this->assertCount(0, $res);
    }

    public function test_invalid_filters_ignored(): void
    {
        $this->makeStation('Station A', 'Aktif', 'ccs2', 50, 2500);
        $driver = $this->driver();
        Sanctum::actingAs($driver);

        $res = $this->getJson('/api/stations?min_power=abc&max_tariff=-10')->json('data');
        $this->assertCount(1, $res);
    }

    public function test_sql_injection_binding(): void
    {
        $this->makeStation('Station A', 'Aktif', 'ccs2', 50, 2500);
        $driver = $this->driver();
        Sanctum::actingAs($driver);

        $res = $this->getJson("/api/stations?q=%27%20OR%201%3D1%20--")->json('data');
        $this->assertCount(0, $res);
    }

    public function test_query_count(): void
    {
        for ($i = 0; $i < 9; $i++) {
            $this->makeStation('Station '.$i, 'Aktif', 'ccs2', 50, 2500);
        }
        $driver = $this->driver();
        Sanctum::actingAs($driver);

        $queries = 0;
        DB::listen(function () use (&$queries): void {
            $queries++;
        });

        $this->getJson('/api/stations')->assertOk();
        $this->assertLessThanOrEqual(10, $queries);
    }
}