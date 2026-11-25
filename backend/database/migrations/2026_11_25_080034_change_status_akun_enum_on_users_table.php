<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (Schema::getConnection()->getDriverName() === 'sqlite') {
            return;
        }

        DB::statement("UPDATE users SET status_akun = 'Nonaktif' WHERE status_akun IN ('Suspend', 'Banned')");
        DB::statement("ALTER TABLE users MODIFY status_akun ENUM('Aktif', 'Nonaktif') NOT NULL DEFAULT 'Aktif'");
    }

    public function down(): void
    {
        if (Schema::getConnection()->getDriverName() === 'sqlite') {
            return;
        }

        DB::statement("ALTER TABLE users MODIFY status_akun ENUM('Aktif', 'Nonaktif', 'Suspend', 'Banned') NOT NULL DEFAULT 'Aktif'");
    }
};
