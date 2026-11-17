<?php

namespace Tests\Feature;

use App\Models\UserProfile;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Event;
use Tests\TestCase;

class AuthRegistrationSafetyTest extends TestCase
{
    use RefreshDatabase;

    public function test_registration_returns_generic_error_when_internal_exception_occurs(): void
    {
        Event::listen('eloquent.creating: '.UserProfile::class, function (): void {
            throw new \RuntimeException('INTERNAL_SECRET_DATABASE_DETAIL');
        });

        $response = $this->postJson('/api/register', [
            'name' => 'Driver', 'email' => 'driver@test.com', 'password' => 'Password123',
            'nomor_telepon' => '081234567890', 'alamat' => 'Alamat', 'tanggal_lahir' => '1995-01-01',
        ]);

        $response->assertStatus(500)->assertJsonPath('message', 'Terjadi kesalahan pada server.');
        $this->assertStringNotContainsString('INTERNAL_SECRET_DATABASE_DETAIL', $response->getContent());
        $this->assertDatabaseMissing('users', ['email' => 'driver@test.com']);
    }
}
