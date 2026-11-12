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
            $table->char('kode_perangkat', 12);
            $table->string('merek_model');
            $table->integer('kap_tot_kw');
            $table->enum('status_mesin', ['Active', 'Maintenance', 'Offline'])->default('Active');
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
