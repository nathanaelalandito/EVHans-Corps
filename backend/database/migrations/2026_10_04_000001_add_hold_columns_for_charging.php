<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('dompet', function (Blueprint $table) {
            // Dana yang ditahan (hold) untuk sesi charging yang sedang berjalan.
            $table->integer('saldo_hold')->default(0);
        });

        Schema::table('charging_session', function (Blueprint $table) {
            // Jumlah energi yang dipilih driver + estimasi biaya saat sesi dimulai.
            $table->decimal('target_energi_kwh', 8, 2)->nullable();
            $table->integer('estimasi_biaya_charging')->nullable();
            $table->integer('estimasi_biaya_parkir')->nullable();
            // Total dana yang di-hold dari dompet untuk sesi ini.
            $table->integer('saldo_hold')->default(0);
        });
    }

    public function down(): void
    {
        Schema::table('charging_session', function (Blueprint $table) {
            $table->dropColumn(['target_energi_kwh', 'estimasi_biaya_charging', 'estimasi_biaya_parkir', 'saldo_hold']);
        });

        Schema::table('dompet', function (Blueprint $table) {
            $table->dropColumn('saldo_hold');
        });
    }
};
