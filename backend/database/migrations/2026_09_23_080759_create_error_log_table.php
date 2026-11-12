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
        Schema::create('error_log', function (Blueprint $table) {
            $table->id('id_log');

            $table->foreignId('id_charger')
                ->constrained('charger', 'id_charger')
                ->cascadeOnUpdate()
                ->restrictOnDelete();

            $table->foreignId('id_session')
                ->constrained('charging_session', 'id_session')
                ->cascadeOnUpdate()
                ->restrictOnDelete();

            $table->char('id_user', 13);
            $table->foreign('id_user')
                ->references('id_user')
                ->on('users')
                ->cascadeOnUpdate()
                ->cascadeOnDelete();

            $table->string('jenis_error');
            $table->text('desk_mslh')->nullable();

            $table->dateTime('waktu_terjadi');

            $table->string('status_tanganan');

            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('error_log');
    }
};