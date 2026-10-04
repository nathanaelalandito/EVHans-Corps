<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('topup', function (Blueprint $table) {
            $table->id('id_topup');

            // Dompet yang saldonya bertambah
            $table->unsignedBigInteger('id_wallet');
            // Metode pembayaran (GoPay, DANA, VA BRI, SeaBank)
            $table->unsignedBigInteger('id_metode');
            $table->string('referensi', 50)->unique();   // EVT20261003-ABC123 (kode transaksi)
            $table->string('kode_pembayaran', 100); // nomor telepon (GoPay/DANA) atau nomor VA (kode bank + telepon)
            $table->integer('nominal');                  // saldo yang masuk ke dompet
            $table->integer('biaya_layanan')->default(0); // biaya metode saat transaksi dibuat
            $table->enum('status_topup', ['pending', 'sukses', 'gagal'])->default('pending');
            $table->dateTime('waktu_topup');             // dibuat; diperbarui saat pembayaran diterima
            $table->dateTime('kedaluwarsa_pada');        // waktu_topup + 24 jam
            $table->timestamps();
            $table->foreign('id_wallet')->references('id_wallet')->on('dompet')->cascadeOnDelete();
            $table->foreign('id_metode')->references('id_metode')->on('metode_pembayaran')->restrictOnDelete();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('topup');
    }
};