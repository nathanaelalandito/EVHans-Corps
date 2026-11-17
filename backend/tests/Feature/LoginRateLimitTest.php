<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class LoginRateLimitTest extends TestCase
{
    use RefreshDatabase;

    public function test_sixth_login_attempt_is_limited_and_valid_login_works_after_window(): void
    {
        $user = User::create([
            'id_user' => 'DRV0000000001', 'email' => 'driver@test.com', 'password' => bcrypt('Password123'),
            'peran' => 'driver', 'status_akun' => 'Aktif',
        ]);

        for ($attempt = 1; $attempt <= 5; $attempt++) {
            $this->postJson('/api/login', ['email' => $user->email, 'password' => 'wrong-password'])
                ->assertUnauthorized()
                ->assertJsonPath('message', 'Email atau password salah.');
        }

        $this->postJson('/api/login', ['email' => $user->email, 'password' => 'wrong-password'])
            ->assertStatus(429)
            ->assertJsonPath('message', 'Too Many Attempts.');

        $this->travel(61)->seconds();
        $this->postJson('/api/login', ['email' => $user->email, 'password' => 'Password123'])
            ->assertOk()
            ->assertJsonPath('user.id_user', $user->id_user);
    }

    public function test_wrong_credentials_use_the_same_generic_message_for_known_and_unknown_accounts(): void
    {
        User::create([
            'id_user' => 'DRV0000000001', 'email' => 'known@test.com', 'password' => bcrypt('Password123'),
            'peran' => 'driver', 'status_akun' => 'Aktif',
        ]);

        $known = $this->postJson('/api/login', ['email' => 'known@test.com', 'password' => 'wrong-password']);
        $unknown = $this->postJson('/api/login', ['email' => 'missing@test.com', 'password' => 'wrong-password']);

        $known->assertUnauthorized()->assertJsonPath('message', 'Email atau password salah.');
        $unknown->assertUnauthorized()->assertJsonPath('message', 'Email atau password salah.');
    }
}
