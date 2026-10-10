<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('station_operators', function (Blueprint $table) {
            $table->id('id_station_operator');
            $table->char('id_user', 13); // Harus sama persis: char dengan panjang 13
            $table->unsignedBigInteger('id_location'); // Sesuaikan dengan primary key tabel location
            $table->timestamps();

            // Pastikan merujuk ke 'users' (pakai 's')
            $table->foreign('id_user')->references('id_user')->on('users')->onDelete('cascade');
            $table->foreign('id_location')->references('id_location')->on('location')->onDelete('cascade');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('station_operators');
    }
};