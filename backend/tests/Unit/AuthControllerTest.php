<?php

namespace Tests\Unit;

use App\Http\Controllers\AuthController;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Tests\TestCase;

class AuthControllerTest extends TestCase
{
    use RefreshDatabase;

    public function test_class_exists(): void
    {
        $this->assertTrue(class_exists(AuthController::class));
    }

    public function test_has_methods(): void
    {
        $rc = new \ReflectionClass(AuthController::class);
        $this->assertGreaterThan(0, count($rc->getMethods(\ReflectionMethod::IS_PUBLIC)));
    }

    public function test_login_returns_forbidden_message_for_inactive_account(): void
    {
        User::factory()->create([
            'email' => 'inactive@test.ac.id',
            'password' => Hash::make('password'),
            'status_akun' => 'Nonaktif',
        ]);

        $request = Request::create('/api/login', 'POST', [
            'email' => 'inactive@test.ac.id',
            'password' => 'password',
        ]);

        $response = (new AuthController)->login($request);

        $this->assertSame(403, $response->getStatusCode());
        $this->assertSame('Akun Anda sedang dinonaktifkan.', $response->getData()->message);
    }
}