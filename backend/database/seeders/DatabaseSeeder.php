<?php

namespace Database\Seeders;

use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;
use RuntimeException;

class DatabaseSeeder extends Seeder
{
    use WithoutModelEvents;

    /**
     * Seed the application's database.
     */
    public function run(): void
    {
        if (app()->environment('production')) {
            throw new RuntimeException('Database demo seeding is disabled in production.');
        }

        $this->call([
            UserSeeder::class,
            PaymentMethodSeeder::class,
            MetodePembayaranSeeder::class,
            StationSeeder::class,
            StationOpSeeder::class,
        ]);
    }
}
