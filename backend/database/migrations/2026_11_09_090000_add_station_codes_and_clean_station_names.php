<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /** Menambahkan kode panggil unik dan membersihkan nama station lama. */
    public function up(): void
    {
        Schema::table('location', function (Blueprint $table): void {
            $table->string('kode_station', 20)->nullable()->after('id_location');
        });

        $sequence = 0;
        DB::table('location')->orderBy('id_location')->get(['id_location', 'nama_lokasi'])->each(function ($station) use (&$sequence): void {
            $sequence++;
            $cleanName = preg_replace('/^\s*EVCharge(?:r)? Hub\s*-\s*/iu', '', trim($station->nama_lokasi));

            DB::table('location')->where('id_location', $station->id_location)->update([
                'kode_station' => sprintf('SPKLU-%04d', $sequence),
                'nama_lokasi' => $cleanName,
            ]);
        });

        Schema::table('location', function (Blueprint $table): void {
            $table->unique('kode_station');
        });
    }

    /** Menghapus kode baru tanpa mengubah nama station hasil migrasi. */
    public function down(): void
    {
        Schema::table('location', function (Blueprint $table): void {
            $table->dropUnique(['kode_station']);
            $table->dropColumn('kode_station');
        });
    }
};
