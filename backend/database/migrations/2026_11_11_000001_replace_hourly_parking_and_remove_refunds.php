<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (Schema::hasColumn('tarif', 'biaya_parkir_pjam')) {
            Schema::table('tarif', function (Blueprint $table): void {
                $table->integer('biaya_parkir_flat')->default(0)->after('biaya_minimum');
            });

            DB::table('tarif')->update([
                'biaya_parkir_flat' => DB::raw('biaya_parkir_pjam'),
            ]);

            Schema::table('tarif', function (Blueprint $table): void {
                $table->dropColumn('biaya_parkir_pjam');
            });
        }

        Schema::dropIfExists('refund');
    }

    public function down(): void
    {
        if (Schema::hasColumn('tarif', 'biaya_parkir_flat')) {
            Schema::table('tarif', function (Blueprint $table): void {
                $table->integer('biaya_parkir_pjam')->default(0)->after('biaya_minimum');
            });

            DB::table('tarif')->update([
                'biaya_parkir_pjam' => DB::raw('biaya_parkir_flat'),
            ]);

            Schema::table('tarif', function (Blueprint $table): void {
                $table->dropColumn('biaya_parkir_flat');
            });
        }

        if (! Schema::hasTable('refund')) {
            Schema::create('refund', function (Blueprint $table): void {
                $table->id('id_refund');
                $table->foreignId('id_payment')->constrained('payment', 'id_payment')->cascadeOnUpdate()->cascadeOnDelete();
                $table->integer('nominal');
                $table->dateTime('waktu_execute');
                $table->enum('status_refund', ['Pending', 'Sukses', 'Gagal'])->default('Pending');
                $table->timestamps();
            });
        }
    }
};
