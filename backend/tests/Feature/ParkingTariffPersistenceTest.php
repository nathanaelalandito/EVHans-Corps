<?php

namespace Tests\Feature;

use App\Models\Location;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class ParkingTariffPersistenceTest extends TestCase
{
    use RefreshDatabase;

    private function admin(): User
    {
        return User::create([
            'id_user' => 'ADM0000000001',
            'email' => 'admin@test.ac.id',
            'password' => bcrypt('password'),
            'peran' => 'admin',
            'status_akun' => 'Aktif',
        ]);
    }

    private function location(): Location
    {
        return Location::create([
            'nama_lokasi' => 'Test Station',
            'alamat' => 'Jl. Test',
            'latitude' => -7.8,
            'longitude' => 110.36,
            'jam_buka' => '08:00',
            'jam_tutup' => '22:00',
            'status_loc' => 'Aktif',
        ]);
    }

    public function test_admin_can_create_tariff_with_parking_flat_and_it_persists(): void
    {
        Sanctum::actingAs($this->admin());
        $location = $this->location();

        $response = $this->postJson("/api/operations/stations/{$location->id_location}/tarifs", [
            'harga_per_kwh' => 2500,
            'biaya_minimum' => 0,
            'biaya_parkir_flat' => 2000,
            'mode' => 'immediate',
        ]);

        $response->assertCreated();
        $this->assertDatabaseHas('tarif', [
            'id_location' => $location->id_location,
            'harga_per_kwh' => 2500,
            'biaya_parkir_flat' => 2000,
        ]);

        $list = $this->getJson("/api/operations/dashboard");
        $list->assertOk();
    }

    public function test_scheduled_tariff_stores_parking_flat(): void
    {
        Sanctum::actingAs($this->admin());
        $location = $this->location();

        $response = $this->postJson("/api/operations/stations/{$location->id_location}/tarifs", [
            'harga_per_kwh' => 2500,
            'biaya_minimum' => 0,
            'biaya_parkir_flat' => 2000,
            'mode' => 'scheduled',
            'effective_at' => now()->addDay()->format('Y-m-d H:i:s'),
        ]);

        $response->assertCreated();
        $this->assertDatabaseHas('tarif', [
            'id_location' => $location->id_location,
            'biaya_parkir_flat' => 2000,
        ]);
    }

    public function test_tariff_rejects_negative_parking(): void
    {
        Sanctum::actingAs($this->admin());
        $location = $this->location();

        $response = $this->postJson("/api/operations/stations/{$location->id_location}/tarifs", [
            'harga_per_kwh' => 2500,
            'biaya_minimum' => 0,
            'biaya_parkir_flat' => -1,
            'mode' => 'immediate',
        ]);

        $response->assertStatus(422);
    }
}
