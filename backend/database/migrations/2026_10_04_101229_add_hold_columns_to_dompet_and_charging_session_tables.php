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
        Schema::table('dompet', function (Blueprint $table) {
            $table->integer('saldo_ditahan')->default(0)->after('saldo');
        });

        Schema::table('charging_session', function (Blueprint $table) {
            $table->decimal('target_energi_kwh', 8, 2)->default(0)->after('total_energi_kwh');
            $table->integer('estimasi_biaya')->default(0)->after('target_energi_kwh');
            $table->integer('jumlah_hold')->default(0)->after('estimasi_biaya');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('charging_session', function (Blueprint $table) {
            $table->dropColumn(['target_energi_kwh', 'estimasi_biaya', 'jumlah_hold']);
        });

        Schema::table('dompet', function (Blueprint $table) {
            $table->dropColumn('saldo_ditahan');
        });
    }
};
