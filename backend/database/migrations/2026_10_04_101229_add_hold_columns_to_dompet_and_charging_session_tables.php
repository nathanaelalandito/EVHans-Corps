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
            if (! Schema::hasColumn('dompet', 'saldo_hold')) {
                $table->integer('saldo_hold')->default(0);
            }
        });

        Schema::table('charging_session', function (Blueprint $table) {
            // Jumlah energi yang dipilih driver + estimasi biaya saat sesi dimulai.
            if (! Schema::hasColumn('charging_session', 'target_energi_kwh')) {
                $table->decimal('target_energi_kwh', 8, 2)->nullable();
            }
            if (! Schema::hasColumn('charging_session', 'estimasi_biaya_charging')) {
                $table->integer('estimasi_biaya_charging')->nullable();
            }
            if (! Schema::hasColumn('charging_session', 'estimasi_biaya_parkir')) {
                $table->integer('estimasi_biaya_parkir')->nullable();
            }
            // Total dana yang di-hold dari dompet untuk sesi ini.
            if (! Schema::hasColumn('charging_session', 'saldo_hold')) {
                $table->integer('saldo_hold')->default(0);
            }
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
