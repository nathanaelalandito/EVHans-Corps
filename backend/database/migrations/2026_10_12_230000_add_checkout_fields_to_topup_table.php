<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('topup', function (Blueprint $table) {
            $table->string('referensi', 64)->nullable()->unique()->after('id_payment');
            $table->string('kode_pembayaran', 100)->nullable()->after('referensi');
            $table->integer('biaya_layanan')->default(0)->after('nominal');
            $table->dateTime('kedaluwarsa_pada')->nullable()->after('waktu_topup');
        });
    }

    public function down(): void
    {
        Schema::table('topup', function (Blueprint $table) {
            $table->dropUnique(['referensi']);
            $table->dropColumn(['referensi', 'kode_pembayaran', 'biaya_layanan', 'kedaluwarsa_pada']);
        });
    }
};
