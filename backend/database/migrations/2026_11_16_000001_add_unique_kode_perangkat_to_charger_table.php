<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        $duplicates = DB::table('charger')
            ->select('kode_perangkat')
            ->groupBy('kode_perangkat')
            ->havingRaw('COUNT(*) > 1')
            ->pluck('kode_perangkat');

        foreach ($duplicates as $code) {
            $chargers = DB::table('charger')
                ->where('kode_perangkat', $code)
                ->orderBy('id_charger')
                ->get(['id_charger']);

            foreach ($chargers->skip(1) as $index => $charger) {
                DB::table('charger')
                    ->where('id_charger', $charger->id_charger)
                    ->update(['kode_perangkat' => $code.'-'.($index + 1)]);
            }
        }

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
