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
        Schema::create('methodpay_ops', function (Blueprint $table) {
            $table->id('id_log_payment');
            $table->id('id_location');
            $table->id('id_metode');
            $table->boolean('is_active');
            $table->decimal('biaya_charger');
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('methodpay_ops');
    }
};
