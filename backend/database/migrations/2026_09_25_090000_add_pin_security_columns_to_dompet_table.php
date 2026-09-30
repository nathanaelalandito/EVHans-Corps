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
            // Ubah kolom pin_transaksi agar boleh kosong sebelum user set PIN pertama kali
            $table->string('pin_transaksi')->nullable()->change();

            // Jumlah percobaan PIN salah berturut-turut
            $table->unsignedTinyInteger('percobaan_pin_gagal')->default(0)->after('pin_transaksi');

            // Waktu dompet terkunci sampai kapan akibat terlalu banyak percobaan salah
            $table->timestamp('locked_until')->nullable()->after('percobaan_pin_gagal');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('dompet', function (Blueprint $table) {
            $table->dropColumn(['percobaan_pin_gagal', 'locked_until']);
            $table->string('pin_transaksi')->nullable(false)->change();
        });
    }
};
