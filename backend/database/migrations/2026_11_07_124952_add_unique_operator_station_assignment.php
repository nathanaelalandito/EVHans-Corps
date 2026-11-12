<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::table('station_operators', function (Blueprint $table) {
            $table->unique(['id_user', 'id_location'], 'station_operators_user_location_unique');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('station_operators', function (Blueprint $table) {
            $table->dropUnique('station_operators_user_location_unique');
        });
    }
};
