<?php

namespace Tests\Feature;

use App\Models\Dompet;
use App\Models\MetodePembayaran;
use App\Models\User;
use App\Models\UserProfile;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class TopupSimulationTest extends TestCase
{
    use RefreshDatabase;

    private function makeDriver(string $email, string $id): User
    {
        $user = User::create([
            'id_user' => $id,
            'email' => $email,
            'password' => bcrypt('password'),
            'peran' => 'driver',
            'status_akun' => 'Aktif',
        ]);
        UserProfile::create([
            'id_user' => $user->id_user,
            'nama_lengkap' => 'Driver',
            'nomor_telepon' => '081234567890',
            'alamat' => 'Jl. Test',
            'tanggal_lahir' => '1995-01-01',
        ]);
        Dompet::create([
            'id_user' => $user->id_user,
            'saldo' => 0,
            'saldo_hold' => 0,
            'status_dompet' => 'Aktif',
        ]);
        return $user;
    }

    private function makeMethod(): MetodePembayaran
    {
        return MetodePembayaran::create([
            'nama_metode' => 'GoPay',
            'biaya_layanan' => 0,
            'status_metode' => 'Aktif',
        ]);
    }

    public function test_driver_cannot_settle_other_drivers_topup(): void
    {
        $method = $this->makeMethod();
        $a = $this->makeDriver('a@test.com', 'DRV0000000001');
        $b = $this->makeDriver('b@test.com', 'DRV0000000002');

        Sanctum::actingAs($a);
        $create = $this->postJson('/api/topup', ['method' => $method->id_metode, 'amount' => 10000]);
        $create->assertCreated();
        $ref = $create->json('data.reference');

        Sanctum::actingAs($b);
        $this->postJson("/api/topup/{$ref}/simulate-pay")->assertStatus(404);
    }

    public function test_simulate_pay_is_idempotent(): void
    {
        $method = $this->makeMethod();
        $a = $this->makeDriver('a@test.com', 'DRV0000000001');
        Sanctum::actingAs($a);
        $create = $this->postJson('/api/topup', ['method' => $method->id_metode, 'amount' => 10000]);
        $create->assertCreated();
        $ref = $create->json('data.reference');

        $this->postJson("/api/topup/{$ref}/simulate-pay")->assertOk();
        $this->postJson("/api/topup/{$ref}/simulate-pay")->assertOk();

        $this->assertDatabaseHas('dompet', [
            'id_user' => $a->id_user,
            'saldo' => 10000,
        ]);
    }

    public function test_simulation_disabled_returns_403(): void
    {
        config(['payment.simulation' => false]);
        $method = $this->makeMethod();
        $a = $this->makeDriver('a@test.com', 'DRV0000000001');
        Sanctum::actingAs($a);
        $create = $this->postJson('/api/topup', ['method' => $method->id_metode, 'amount' => 10000]);
        $ref = $create->json('data.reference');

        $this->postJson("/api/topup/{$ref}/simulate-pay")->assertStatus(403);
    }
}
