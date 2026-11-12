<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use Carbon\Carbon;

class TarifSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
            DB::table('tarif')->insert([
                'id_location'        => 2,
                'harga_per_kwh'      => 2466,        // Tarif resmi curah SPKLU PLN (Rp/kWh)
                'biaya_minimum'      => 15000,       // Minimum transaksi charge
                'biaya_parkir_flat'  => 5000,        // Biaya parkir flat per sesi di stasiun
                'periode_mulai'      => Carbon::now()->startOfYear(), // Berlaku sejak awal tahun
                'periode_berakhir'   => Carbon::now()->endOfYear(),   // Berlaku sampai akhir tahun
                'created_at'         => now(),
                'updated_at'         => now(),
            ]);
    }
}
