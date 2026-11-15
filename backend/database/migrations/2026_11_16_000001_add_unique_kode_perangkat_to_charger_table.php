<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('charger', function (Blueprint $table): void {
            $table->unique('kode_perangkat', 'charger_kode_perangkat_unique');
        });
    }

    public function down(): void
    {
        Schema::table('charger', function (Blueprint $table): void {
            $table->dropUnique('charger_kode_perangkat_unique');
        });
    }
};
