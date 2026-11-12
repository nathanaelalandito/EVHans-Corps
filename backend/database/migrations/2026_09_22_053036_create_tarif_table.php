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
        Schema::create('tarif', function (Blueprint $table) {
            $table->id('id_tarif');
            $table->foreignId('id_location')
                ->constrained('location', 'id_location')
                ->cascadeOnUpdate()
                ->cascadeOnDelete();
            $table->integer('harga_per_kwh');
            $table->integer('biaya_minimum');
            $table->integer('biaya_parkir_pjam');
            $table->datetime('periode_mulai');
            $table->datetime('periode_berakhir');
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('tarif');
    }
};
