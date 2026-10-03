<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use Carbon\Carbon;

class ChargerSeeder extends Seeder
{
    public function run()
    {
        DB::table('charger')->insert([
            // Port untuk Lokasi 1 (Stasiun Tugu)
            [
                'id_location' => 1,
                'kode_perangkat' => 'CHG-TUGU-01',
                'tipe_konektor' => 'ccs2',
                'daya_kwh' => 50.00,
                'tipe_charging' => 'DC',
                'status' => 'tersedia',
                'created_at' => Carbon::now(),
                'updated_at' => Carbon::now(),
            ],
            [
                'id_location' => 1,
                'kode_perangkat' => 'CHG-TUGU-02',
                'tipe_konektor' => 'type_2',
                'daya_kwh' => 22.00,
                'tipe_charging' => 'AC',
                'status' => 'digunakan',
                'created_at' => Carbon::now(),
                'updated_at' => Carbon::now(),
            ],
            // Port untuk Lokasi 2 (Ambarrukmo)
            [
                'id_location' => 2,
                'kode_perangkat' => 'CHG-AMB-01',
                'tipe_konektor' => 'ccs2',
                'daya_kwh' => 100.00,
                'tipe_charging' => 'DC',
                'status' => 'tersedia',
                'created_at' => Carbon::now(),
                'updated_at' => Carbon::now(),
            ],
        ]);
    }
}