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
        Schema::create('charger', function (Blueprint $table) {
            $table->id('id_charger');
            $table->foreignId('id_location')
                ->constrained('location', 'id_location')
                ->cascadeOnUpdate()
                ->cascadeOnDelete();
            $table->char('kode_perangkat', 6);
            $table->enum('tipe_konektor', ['type_2', 'ccs2', 'chademo', 'gbt']);
            $table->integer('daya_kwh');
            $table->enum('tipe_charging', ['AC', 'DC']);
            $table->enum('status', ['tersedia', 'sedang digunakan', 'maintenance', 'rusak', 'offline'])->default('tersedia');
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('charger');
    }
};
