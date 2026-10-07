<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        DB::statement("ALTER TABLE charging_session MODIFY status ENUM('pending', 'berlangsung', 'selesai', 'dibatalkan', 'gagal') DEFAULT 'pending'");
    }

    public function down(): void
    {
        DB::statement("ALTER TABLE charging_session MODIFY status ENUM('pending', 'berlangsung', 'selesai', 'dibatalkan') DEFAULT 'pending'");
    }
};
