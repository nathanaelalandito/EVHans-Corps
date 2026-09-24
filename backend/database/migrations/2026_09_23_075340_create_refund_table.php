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
        Schema::create('refund', function (Blueprint $table) {
            $table->id('id_refund');
            $table->foreignId('id_payment')
                ->constrained('payment', 'id_payment')
                ->cascadeOnUpdate()
                ->cascadeOnDelete();
            $table->integer('nominal');
            $table->datetime('waktu_execute');
            $table->enum('status_refund', ['pending', 'sukses', 'gagal'])->default('pending');
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('refund');
    }
};
