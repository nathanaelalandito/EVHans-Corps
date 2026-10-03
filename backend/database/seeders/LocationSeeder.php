<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use Carbon\Carbon;

class LocationSeeder extends Seeder
{
    public function run()
    {
        DB::table('location')->insert([
            [
                'id_location' => 1,
                'nama_lokasi' => 'EV Hub Stasiun Tugu Yogyakarta',
                'alamat' => 'Jl. Ps. Kembang, Sosromenduran, Gedong Tengen, Yogyakarta',
                'latitude' => -7.785278,
                'longitude' => 110.362222,
                'jam_buka' => '06:00:00',
                'jam_tutup' => '22:00:00',
                'status' => 'Aktif',
                'created_at' => Carbon::now(),
                'updated_at' => Carbon::now(),
            ],
            [
                'id_location' => 2,
                'nama_lokasi' => 'EV Hub Plaza Ambarrukmo',
                'alamat' => 'Jl. Laksda Adisucipto KM. 6, Depok, Sleman, Yogyakarta',
                'latitude' => -7.782800,
                'longitude' => 110.401200,
                'jam_buka' => '10:00:00',
                'jam_tutup' => '22:00:00',
                'status' => 'Aktif',
                'created_at' => Carbon::now(),
                'updated_at' => Carbon::now(),
            ],
        ]);
    }
}