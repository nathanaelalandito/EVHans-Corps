<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('ports', function (Blueprint $table) {
            $table->id('id_port');
            // Foreign key menghubungkan ke tabel chargers
            $table->unsignedBigInteger('id_charger');
            $table->foreign('id_charger')->references('id_charger')->on('charger')->onDelete('cascade');
            
            $table->string('nomor_port'); // Contoh: Port A, Port 1
            $table->string('tipe_konektor'); // Contoh: CCS2, CHAdeMO, Type 2
            $table->enum('tipe_charging', ['DC', 'AC']);
            $table->decimal('daya_maks_kw', 8, 2); // Contoh: 50.00 kW
            $table->enum('status_port', ['Available', 'Charging', 'Reserved', 'Out of Order', 'Maintenance'])->default('Available');
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('ports');
    }
};