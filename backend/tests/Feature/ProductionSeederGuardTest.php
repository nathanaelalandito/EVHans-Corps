<?php

namespace Tests\Feature;

use Database\Seeders\DatabaseSeeder;
use Database\Seeders\MetodePembayaranSeeder;
use Database\Seeders\PaymentMethodSeeder;
use Database\Seeders\StationOpSeeder;
use Database\Seeders\StationSeeder;
use Database\Seeders\TarifSeeder;
use Database\Seeders\UserSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use RuntimeException;
use Tests\TestCase;

class ProductionSeederGuardTest extends TestCase
{
    use RefreshDatabase;

    public function test_demo_seeders_are_blocked_in_production(): void
    {
        $this->app->detectEnvironment(fn () => 'production');

        foreach ([DatabaseSeeder::class, UserSeeder::class, StationSeeder::class, StationOpSeeder::class, TarifSeeder::class, PaymentMethodSeeder::class, MetodePembayaranSeeder::class] as $seeder) {
            $exception = null;
            try {
                app($seeder)->run();
            } catch (RuntimeException $exception) {
            }

            $this->assertNotNull($exception, "{$seeder} should not run in production.");
            $this->assertStringContainsString('disabled in production', $exception->getMessage());
        }

        $this->assertDatabaseCount('users', 0);
        $this->assertDatabaseCount('location', 0);
    }
}
