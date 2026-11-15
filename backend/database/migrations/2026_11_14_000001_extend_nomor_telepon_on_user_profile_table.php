<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Perluas kolom nomor telepon dari CHAR(13) menjadi VARCHAR(15) agar sesuai
     * batas validasi baru (maksimal 15 digit angka). Data lama tidak berubah.
     */
    public function up(): void
    {
        Schema::table('user_profile', function (Blueprint $table) {
            $table->string('nomor_telepon', 15)->change();
        });
    }

    /**
     * Catatan: rollback gagal jika sudah ada nomor telepon lebih dari 13 digit.
     */
    public function down(): void
    {
        Schema::table('user_profile', function (Blueprint $table) {
            $table->char('nomor_telepon', 13)->change();
        });
    }
};
