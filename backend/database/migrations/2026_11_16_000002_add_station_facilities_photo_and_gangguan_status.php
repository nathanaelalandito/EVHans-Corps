<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('location', function (Blueprint $table): void {
            $table->text('fasilitas')->nullable()->after('jam_tutup');
            $table->string('foto')->nullable()->after('fasilitas');
        });

        DB::statement("ALTER TABLE location MODIFY status_loc ENUM('Aktif','Nonaktif','Maintenance','Gangguan') DEFAULT 'Aktif'");
    }

    public function down(): void
    {
        DB::statement("ALTER TABLE location MODIFY status_loc ENUM('Aktif','Nonaktif','Maintenance') DEFAULT 'Aktif'");

        Schema::table('location', function (Blueprint $table): void {
            $table->dropColumn(['fasilitas', 'foto']);
        });
    }
};
