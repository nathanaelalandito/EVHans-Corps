<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('metode_pembayaran', function (Blueprint $table) {
            $table->enum('tipe_metode', ['ewallet', 'va'])->default('ewallet')->after('nama_metode');
        });

        DB::table('metode_pembayaran')
            ->where('nama_metode', 'like', '%va%')
            ->update(['tipe_metode' => 'va']);
    }

    public function down(): void
    {
        Schema::table('metode_pembayaran', function (Blueprint $table) {
            $table->dropColumn('tipe_metode');
        });
    }
};
