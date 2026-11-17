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
        Schema::table('charging_session', function (Blueprint $table) {
            $table->timestamp('dijeda_pada')->nullable()->after('waktu_selesai');
            $table->unsignedInteger('total_jeda_detik')->default(0)->after('dijeda_pada');
            $table->timestamp('jeda_berakhir_pada')->nullable()->after('total_jeda_detik');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('charging_session', function (Blueprint $table) {
            $table->dropColumn(['dijeda_pada', 'total_jeda_detik', 'jeda_berakhir_pada']);
        });
    }
};
