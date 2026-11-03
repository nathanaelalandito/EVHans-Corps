<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        DB::statement("ALTER TABLE charging_session MODIFY status ENUM('Pending', 'Berlangsung', 'Selesai', 'Dibatalkan', 'Gagal') DEFAULT 'Pending'");
    }

    public function down(): void
    {
        DB::statement("ALTER TABLE charging_session MODIFY status ENUM('Pending', 'Berlangsung', 'Selesai', 'Dibatalkan') DEFAULT 'Pending'");
    }
};
