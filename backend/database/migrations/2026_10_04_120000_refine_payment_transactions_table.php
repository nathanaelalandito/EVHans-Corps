<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('payment', function (Blueprint $table) {
            $table->dropForeign(['id_session']);
        });

        Schema::table('payment', function (Blueprint $table) {
            $table->foreignId('id_session')->nullable()->change();
            $table->string('jenis_pembayaran', 24)->default('charging')->after('id_metode');
            $table->foreign('id_session')
                ->references('id_session')
                ->on('charging_session')
                ->cascadeOnUpdate()
                ->nullOnDelete();
        });
    }

    public function down(): void
    {
        Schema::table('payment', function (Blueprint $table) {
            $table->dropForeign(['id_session']);
            $table->dropColumn('jenis_pembayaran');
        });

        Schema::table('payment', function (Blueprint $table) {
            $table->foreignId('id_session')->nullable(false)->change();
            $table->foreign('id_session')
                ->references('id_session')
                ->on('charging_session')
                ->cascadeOnUpdate()
                ->cascadeOnDelete();
        });
    }
};
