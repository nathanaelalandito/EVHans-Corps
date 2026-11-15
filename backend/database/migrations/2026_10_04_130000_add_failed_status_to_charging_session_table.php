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

        DB::statement("ALTER TABLE charging_session MODIFY status ENUM('Pending', 'Berlangsung', 'Selesai', 'Dibatalkan', 'Gagal') DEFAULT 'Pending'");
    }

    public function down(): void
    {
        if (Schema::getConnection()->getDriverName() === 'sqlite') {
            return;
        }

        DB::statement("ALTER TABLE charging_session MODIFY status ENUM('Pending', 'Berlangsung', 'Selesai', 'Dibatalkan') DEFAULT 'Pending'");
    }
};
