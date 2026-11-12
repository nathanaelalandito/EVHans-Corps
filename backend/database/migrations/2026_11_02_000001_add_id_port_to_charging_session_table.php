<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Sesi charging driver mengunci satu PORT (bukan satu mesin charger).
     * id_charger tetap diisi (dipakai laporan operator); id_port menunjuk
     * konektor yang sebenarnya dipakai.
     */
    public function up(): void
    {
        Schema::table('charging_session', function (Blueprint $table) {
            $table->unsignedBigInteger('id_port')->nullable()->after('id_charger');
            $table->foreign('id_port')
                ->references('id_port')
                ->on('ports')
                ->cascadeOnUpdate()
                ->nullOnDelete();
        });
    }

    public function down(): void
    {
        Schema::table('charging_session', function (Blueprint $table) {
            $table->dropForeign(['id_port']);
            $table->dropColumn('id_port');
        });
    }
};
