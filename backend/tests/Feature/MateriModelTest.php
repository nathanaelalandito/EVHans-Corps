<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Tests\TestCase;

class MateriModelTest extends TestCase
{
    use RefreshDatabase;

    private int $userSeq = 1;

    private function createUser(array $overrides = []): User
    {
        $peran = $overrides['peran'] ?? 'driver';
        $prefix = match ($peran) {
            'admin' => 'ADM',
            'operator' => 'OPS',
            default => 'DRV',
        };

        $id = $prefix.str_pad((string) $this->userSeq++, 10, '0', STR_PAD_LEFT);

        return User::create(array_merge([
            'id_user' => $id,
            'email' => strtolower($prefix.$this->userSeq).'@test.com',
            'password' => Hash::make('password123'),
            'peran' => $peran,
            'status_akun' => 'Aktif',
        ], $overrides, ['id_user' => $overrides['id_user'] ?? $id]));
    }

    public function test_example(): void
    {
        $this->get('/')->assertStatus(200);
    }

    public function test_login_gagal_jika_validasi_tidak_memenuhi(): void
    {
        $response = $this->postJson('/api/login', ['email' => 'format-salah', 'password' => '']);

        $response->assertStatus(422)
            ->assertJsonValidationErrors(['email', 'password'], 'errors');
        $this->assertNull($response->json('token'));
    }

    public function test_login_gagal_jika_email_tidak_ditemukan(): void
    {
        $this->assertGuest();
        $this->postJson('/api/login', ['email' => 'missing@test.com', 'password' => 'password123'])
            ->assertStatus(401)
            ->assertJsonPath('message', 'Email atau password salah.');
        $this->assertGuest();
    }

    public function test_login_gagal_jika_password_salah(): void
    {
        $user = $this->createUser(['email' => 'driver-wrong@test.com', 'peran' => 'driver']);

        $this->postJson('/api/login', ['email' => $user->email, 'password' => 'salah-password'])
            ->assertStatus(401)
            ->assertJsonPath('message', 'Email atau password salah.');

        $this->assertGuest();
        $this->assertDatabaseCount('personal_access_tokens', 0);
    }

    public function test_login_berhasil_sebagai_driver(): void
    {
        $user = $this->createUser(['email' => 'driver@test.com', 'peran' => 'driver']);

        $response = $this->postJson('/api/login', ['email' => $user->email, 'password' => 'password123'])
            ->assertStatus(200)
            ->assertJsonPath('message', 'Login berhasil!')
            ->assertJsonPath('user.email', $user->email)
            ->assertJsonPath('user.peran', 'driver');

        $token = $response->json('token');
        $this->assertNotEmpty($token);

        $this->withToken($token)->getJson('/api/user')
            ->assertStatus(200)
            ->assertJsonPath('peran', 'driver');

        $this->app['auth']->forgetGuards();
        $this->withToken($token)->getJson('/api/operations/dashboard')->assertStatus(403);
    }

    public function test_login_berhasil_sebagai_operator(): void
    {
        $user = $this->createUser(['email' => 'operator@test.com', 'peran' => 'operator']);

        $response = $this->postJson('/api/login', ['email' => $user->email, 'password' => 'password123'])
            ->assertStatus(200)
            ->assertJsonPath('message', 'Login berhasil!')
            ->assertJsonPath('user.email', $user->email)
            ->assertJsonPath('user.peran', 'operator');

        $token = $response->json('token');
        $this->assertNotEmpty($token);

        $this->withToken($token)->getJson('/api/user')
            ->assertStatus(200)
            ->assertJsonPath('peran', 'operator');

        $this->app['auth']->forgetGuards();
        $this->withToken($token)->getJson('/api/operations/dashboard')->assertStatus(200);
    }

    public function test_login_berhasil_sebagai_admin(): void
    {
        $user = $this->createUser(['email' => 'admin@test.com', 'peran' => 'admin']);

        $response = $this->postJson('/api/login', ['email' => $user->email, 'password' => 'password123'])
            ->assertStatus(200)
            ->assertJsonPath('message', 'Login berhasil!')
            ->assertJsonPath('user.email', $user->email)
            ->assertJsonPath('user.peran', 'admin');

        $token = $response->json('token');
        $this->assertNotEmpty($token);

        $this->withToken($token)->getJson('/api/user')
            ->assertStatus(200)
            ->assertJsonPath('peran', 'admin');

        $this->app['auth']->forgetGuards();
        $this->withToken($token)->getJson('/api/operations/dashboard')->assertStatus(200);
    }
}