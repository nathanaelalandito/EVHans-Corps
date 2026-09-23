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
        Schema::create('vehicle', function (Blueprint $table) {
            $table->id('id_vehicle');
            $table->char('id_user', 13);
            $table->foreign('id_user')
                ->references('id_user')
                ->on('users')
                ->cascadeOnUpdate()
                ->cascadeOnDelete();
            $table->string('merek');
            $table->string('model');
            $table->char('nomor_polisi', 9);
            $table->enum('tipe_konektor', ['type_2', 'ccs2', 'chademo', 'gbt']);
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('vehicle');
    }
};
