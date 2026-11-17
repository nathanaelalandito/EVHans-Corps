<?php

namespace Tests\Feature;

use App\Models\Charger;
use App\Models\ChargingSession;
use App\Models\Dompet;
use App\Models\Location;
use App\Models\MetodePembayaran;
use App\Models\Payment;
use App\Models\Port;
use App\Models\StationOperator;
use App\Models\Tarif;
use App\Models\User;
use App\Models\UserProfile;
use App\Models\Vehicle;
use Carbon\Carbon;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class TariffScheduleBoundaryTest extends TestCase
{
    use RefreshDatabase;

    public function test_scheduled_tariff_applies_at_exact_boundary_and_only_new_sessions_use_it(): void
    {
        $now = Carbon::parse('2026-11-17 10:00:00', config('app.timezone'));
        $effectiveAt = $now->copy()->addMinutes(5);
        Carbon::setTestNow($now);
        config(['charging.require_arrival' => false]);

        $location = Location::create([
            'nama_lokasi' => 'Tariff Boundary', 'alamat' => 'Jl. Test',
            'latitude' => -7.8, 'longitude' => 110.36,
            'jam_buka' => '00:00', 'jam_tutup' => '23:59', 'status_loc' => 'Aktif',
        ]);
        $charger = Charger::create([
            'id_location' => $location->id_location, 'kode_perangkat' => 'CHG-TIME',
            'merek_model' => 'Test Charger', 'kap_tot_kw' => 50, 'status_mesin' => 'Active',
        ]);
        $occupiedPort = Port::create([
            'id_charger' => $charger->id_charger, 'nomor_port' => 'Port 1',
            'tipe_konektor' => 'ccs2', 'tipe_charging' => 'DC', 'daya_maks_kw' => 50,
            'status_port' => 'Charging',
        ]);
        $newSessionPort = Port::create([
            'id_charger' => $charger->id_charger, 'nomor_port' => 'Port 2',
            'tipe_konektor' => 'ccs2', 'tipe_charging' => 'DC', 'daya_maks_kw' => 50,
            'status_port' => 'Available',
        ]);
        $oldTariff = Tarif::create([
            'id_location' => $location->id_location, 'harga_per_kwh' => 2500,
            'biaya_minimum' => 0, 'biaya_parkir_flat' => 2000,
            'periode_mulai' => $now->copy()->subDay(), 'periode_berakhir' => $now->copy()->addYears(10),
        ]);

        $oldDriver = $this->driver('DRV0000000001', 'old-session@test.com');
        $newDriver = $this->driver('DRV0000000002', 'new-session@test.com');
        $operator = User::create([
            'id_user' => 'OPS0000000001', 'email' => 'tariff-operator@test.com',
            'password' => bcrypt('Password123'), 'peran' => 'operator', 'status_akun' => 'Aktif',
        ]);
        StationOperator::create(['id_user' => $operator->id_user, 'id_location' => $location->id_location]);
        $alreadyRunning = ChargingSession::create([
            'id_user' => $oldDriver->id_user, 'id_charger' => $charger->id_charger,
            'id_port' => $occupiedPort->id_port, 'id_tarif' => $oldTariff->id_tarif,
            'id_vehicle' => $oldDriver->vehicles()->first()->id_vehicle,
            'waktu_mulai' => $now->copy()->subMinute(), 'total_energi_kwh' => 0,
            'target_energi_kwh' => 6, 'estimasi_biaya_charging' => 15000,
            'estimasi_biaya_parkir' => 2000, 'saldo_hold' => 17000,
            'status' => 'Berlangsung', 'soc_awal' => 20,
        ]);

        Sanctum::actingAs($operator);
        $scheduled = $this->postJson('/api/operator/tarif', [
            'harga_per_kwh' => 4000, 'biaya_minimum' => 0, 'biaya_parkir_flat' => 3500,
            'mode' => 'scheduled', 'effective_at' => $effectiveAt->toDateTimeString(),
        ])->assertCreated()->json('data');

        $this->getJson('/api/operator/tarif')
            ->assertOk()
            ->assertJsonPath('data.active.id_tarif', $oldTariff->id_tarif)
            ->assertJsonPath('data.scheduled.0.id_tarif', $scheduled['id_tarif']);
        $this->assertSame($oldTariff->id_tarif, $alreadyRunning->fresh()->id_tarif);
        $this->assertSame(2000, (int) $alreadyRunning->fresh()->tarif->biaya_parkir_flat);

        Carbon::setTestNow($effectiveAt);
        $this->getJson('/api/operator/tarif')
            ->assertOk()
            ->assertJsonPath('data.active.id_tarif', $scheduled['id_tarif']);
        $this->assertSame($oldTariff->id_tarif, $alreadyRunning->fresh()->id_tarif);

        Sanctum::actingAs($newDriver);
        $started = $this->postJson('/api/charging-sessions/start', [
            'id_port' => $newSessionPort->id_port,
            'id_vehicle' => $newDriver->vehicles()->first()->id_vehicle,
            'soc_awal' => 20, 'target_kwh' => 6, 'pin' => '482917',
            'latitude' => -7.8, 'longitude' => 110.36,
        ])->assertCreated()->json('data');

        $newSession = ChargingSession::findOrFail($started['id_session']);
        $this->assertSame($scheduled['id_tarif'], $newSession->id_tarif);
        $this->assertSame(3500, (int) $newSession->estimasi_biaya_parkir);
        $this->assertSame(27500, (int) $newSession->saldo_hold);
    }

    protected function tearDown(): void
    {
        Carbon::setTestNow();
        parent::tearDown();
    }

    private function driver(string $id, string $email): User
    {
        $user = User::create([
            'id_user' => $id, 'email' => $email, 'password' => bcrypt('Password123'),
            'peran' => 'driver', 'status_akun' => 'Aktif',
        ]);
        UserProfile::create([
            'id_user' => $id, 'nama_lengkap' => 'Tariff Driver', 'nomor_telepon' => '081234567890',
            'alamat' => 'Jl. Test', 'tanggal_lahir' => '1995-01-01',
        ]);
        Dompet::create([
            'id_user' => $id, 'saldo' => 100000, 'saldo_hold' => 0,
            'pin_transaksi' => Hash::make('482917'), 'status_dompet' => 'Aktif',
        ]);
        Vehicle::create([
            'id_user' => $id, 'merek' => 'Test', 'model' => 'EV', 'nomor_polisi' => 'B1EV',
            'tipe_konektor' => 'ccs2', 'kapasitas_baterai_kwh' => 50,
        ]);

        return $user;
    }
}
