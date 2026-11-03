<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        // SQLite menyimpan enum sebagai varchar, jadi tidak perlu diubah.
        if (DB::getDriverName() !== 'mysql') {
            return;
        }

        DB::statement("ALTER TABLE charging_session MODIFY status ENUM('Pending', 'Berlangsung', 'Selesai', 'Dibatalkan', 'Gagal') DEFAULT 'Pending'");
    }

    public function down(): void
    {
        if (DB::getDriverName() !== 'mysql') {
            return;
        }

        DB::statement("ALTER TABLE charging_session MODIFY status ENUM('Pending', 'Berlangsung', 'Selesai', 'Dibatalkan') DEFAULT 'Pending'");
    }
};
