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
        Schema::create('payment', function (Blueprint $table) {
            $table->id('id_payment');
            $table->foreignId('id_session')
                ->constrained('charging_session', 'id_session')
                ->cascadeOnUpdate()
                ->cascadeOnDelete();
            $table->foreignId('id_metode')
                ->constrained('metode_pembayaran', 'id_metode')
                ->cascadeOnUpdate()
                ->cascadeOnDelete();
            $table->integer('total_bayar');
            $table->enum('status_pembayaran', ['pending', 'sukses', 'gagal'])->default('pending');
            $table->datetime('waktu_pembayaran');
            $table->string('referensi_gateway')->nullable();
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('payment');
    }
};
