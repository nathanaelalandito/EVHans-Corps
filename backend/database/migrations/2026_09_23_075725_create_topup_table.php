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
        Schema::create('topup', function (Blueprint $table) {
            $table->id('id_topup');
            $table->foreignId('id_wallet')
                ->constrained('dompet', 'id_wallet')
                ->cascadeOnUpdate()
                ->cascadeOnDelete();
            $table->foreignId('id_payment')
                ->constrained('payment', 'id_payment')
                ->cascadeOnUpdate()
                ->cascadeOnDelete();
            $table->integer('nominal');
            $table->enum('status_topup', ['pending', 'sukses', 'gagal'])->default('pending');
            $table->datetime('waktu_topup');
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('topup');
    }
};
