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
        Schema::create('dompet', function (Blueprint $table) {
            $table->id('id_wallet');
            $table->char('id_user', 13)->unique();
            $table->foreign('id_user')
                ->references('id_user')
                ->on('users')
                ->cascadeOnUpdate()
                ->cascadeOnDelete();
            $table->integer('saldo')->default(0);
            $table->string('pin_transaksi');
            $table->enum('status_dompet', ['aktif', 'nonaktif'])->default('aktif');
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('dompet');
    }
};
