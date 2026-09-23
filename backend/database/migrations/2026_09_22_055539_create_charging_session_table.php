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
        Schema::create('charging_session', function (Blueprint $table) {
            $table->id('id_session');
            $table->char('id_user', 13);
            $table->foreign('id_user')
                ->references('id_user')
                ->on('users')
                ->cascadeOnUpdate()
                ->cascadeOnDelete();
            $table->foreignId('id_charger')
                ->constrained('charger', 'id_charger')
                ->cascadeOnUpdate()
                ->cascadeOnDelete();
            $table->foreignId('id_tarif')
                ->constrained('tarif', 'id_tarif')
                ->cascadeOnUpdate()
                ->cascadeOnDelete();
            $table->foreignId('id_vehicle')
                ->constrained('vehicle', 'id_vehicle')
                ->cascadeOnUpdate()
                ->cascadeOnDelete();
            $table->datetime('waktu_mulai');
            $table->datetime('waktu_selesai')->nullable();
            $table->decimal('total_energi_kwh', 8, 2);
            $table->enum('status', ['pending', 'berlangsung', 'selesai', 'dibatalkan'])->default('pending');
            $table->unsignedTinyInteger('soc_awal');
            $table->unsignedTinyInteger('soc_akhir')->nullable();
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('charging_session');
    }
};
