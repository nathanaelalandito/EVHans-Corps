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
        Schema::create('audit_logs', function (Blueprint $table) {
            $table->id('id_audit');
            $table->char('id_user', 13)->nullable();
            $table->foreign('id_user')->references('id_user')->on('users')->nullOnDelete();
            $table->unsignedBigInteger('id_location')->nullable();
            $table->foreign('id_location')->references('id_location')->on('location')->nullOnDelete();
            $table->string('aksi', 80);
            $table->string('entitas', 80);
            $table->string('id_entitas', 80)->nullable();
            $table->json('data_sebelum')->nullable();
            $table->json('data_sesudah')->nullable();
            $table->text('alasan')->nullable();
            $table->index(['entitas', 'created_at']);
            $table->index(['id_location', 'created_at']);
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('audit_logs');
    }
};
