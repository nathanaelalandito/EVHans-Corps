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
        Schema::create('location', function (Blueprint $table) {
            $table->id('id_location');
            $table->string('nama_lokasi');
            $table->text('alamat');
            $table->decimal('latitude', 10, 7);
            $table->decimal('longitude', 10, 7);
            $table->time('jam_buka');
            $table->time('jam_tutup');
<<<<<<< HEAD
            $table->enum('status_loc', ['aktif', 'nonaktif', 'maintenance'])->default('aktif');
=======
            $table->enum('status', ['Aktif', 'Nonaktif', 'Maintenance'])->default('Aktif');
>>>>>>> driver-sesicharging
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('location');
    }
};
