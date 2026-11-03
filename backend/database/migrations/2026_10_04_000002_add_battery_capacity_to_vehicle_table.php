<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('vehicle', function (Blueprint $table) {
            // Kapasitas baterai (kWh). Kosong = pakai config('charging.default_battery_kwh').
            $table->decimal('kapasitas_baterai_kwh', 5, 1)->nullable();
        });
    }

    public function down(): void
    {
        Schema::table('vehicle', function (Blueprint $table) {
            $table->dropColumn('kapasitas_baterai_kwh');
        });
    }
};
