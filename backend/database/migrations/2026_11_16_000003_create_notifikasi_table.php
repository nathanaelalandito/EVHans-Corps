<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('notifikasi', function (Blueprint $table) {
            $table->id('id_notifikasi');
            $table->char('id_user', 13)->nullable();
            $table->foreign('id_user')->references('id_user')->on('users')->nullOnDelete();
            $table->string('tipe', 50);
            $table->string('judul', 150);
            $table->text('pesan');
            $table->string('id_entitas', 80)->nullable();
            $table->string('tipe_entitas', 80)->nullable();
            $table->string('dedup_key', 191)->nullable()->unique();
            $table->timestamp('dibaca_pada')->nullable();
            $table->timestamps();

            $table->index(['id_user', 'dibaca_pada', 'created_at']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('notifikasi');
    }
};
