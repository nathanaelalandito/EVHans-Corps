<?php

namespace Database\Seeders;

use Carbon\Carbon;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

class StationSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        $now = Carbon::now();

        $stations = [
            [
                'id_location' => 1,
                'nama_lokasi' => 'EVCharge Hub - Malioboro Mall',
                'alamat' => 'Jl. Malioboro No. 52, Yogyakarta',
                'latitude' => -7.7930000,
                'longitude' => 110.3655000,
                'jam_buka' => '08:00:00',
                'jam_tutup' => '22:00:00',
                'status_loc' => 'aktif',
                'tarif' => ['harga_per_kwh' => 2500, 'biaya_minimum' => 10000, 'biaya_parkir_pjam' => 5000],
                'chargers' => [
                    ['kode_perangkat' => 'CHG-01', 'tipe_konektor' => 'ccs2', 'daya_kwh' => 50, 'tipe_charging' => 'DC', 'status_mesin' => 'tersedia'],
                    ['kode_perangkat' => 'CHG-02', 'tipe_konektor' => 'type_2', 'daya_kwh' => 22, 'tipe_charging' => 'AC', 'status_mesin' => 'digunakan'],
                    ['kode_perangkat' => 'CHG-03', 'tipe_konektor' => 'ccs2', 'daya_kwh' => 50, 'tipe_charging' => 'DC', 'status_mesin' => 'tersedia'],
                    ['kode_perangkat' => 'CHG-04', 'tipe_konektor' => 'type_2', 'daya_kwh' => 22, 'tipe_charging' => 'AC', 'status_mesin' => 'maintenance'],
                ],
            ],
            [
                'id_location' => 2,
                'nama_lokasi' => 'EVCharge Hub - Ambarrukmo Plaza',
                'alamat' => 'Jl. Laksda Adisucipto, Yogyakarta',
                'latitude' => -7.7825000,
                'longitude' => 110.3945000,
                'jam_buka' => '09:00:00',
                'jam_tutup' => '21:00:00',
                'status_loc' => 'aktif',
                'tarif' => ['harga_per_kwh' => 2200, 'biaya_minimum' => 10000, 'biaya_parkir_pjam' => 4000],
                'chargers' => [
                    ['kode_perangkat' => 'CHG-01', 'tipe_konektor' => 'ccs2', 'daya_kwh' => 22, 'tipe_charging' => 'DC', 'status_mesin' => 'digunakan'],
                    ['kode_perangkat' => 'CHG-02', 'tipe_konektor' => 'ccs2', 'daya_kwh' => 22, 'tipe_charging' => 'DC', 'status_mesin' => 'digunakan'],
                ],
            ],
            [
                'id_location' => 3,
                'nama_lokasi' => 'EVCharge Hub - UGM Boulevard',
                'alamat' => 'Jl. Boulevard UGM, Yogyakarta',
                'latitude' => -7.7686000,
                'longitude' => 110.3746000,
                'jam_buka' => '07:00:00',
                'jam_tutup' => '23:00:00',
                'status_loc' => 'maintenance',
                'tarif' => ['harga_per_kwh' => 2700, 'biaya_minimum' => 12000, 'biaya_parkir_pjam' => 6000],
                'chargers' => [
                    ['kode_perangkat' => 'CHG-01', 'tipe_konektor' => 'type_2', 'daya_kwh' => 22, 'tipe_charging' => 'AC', 'status_mesin' => 'maintenance'],
                    ['kode_perangkat' => 'CHG-02', 'tipe_konektor' => 'chademo', 'daya_kwh' => 60, 'tipe_charging' => 'DC', 'status_mesin' => 'rusak'],
                ],
            ],
        ];

        foreach ($stations as $station) {
            $tarif = $station['tarif'];
            $chargers = $station['chargers'];
            unset($station['tarif'], $station['chargers']);

            DB::table('location')->updateOrInsert(
                ['id_location' => $station['id_location']],
                [...$station, 'created_at' => $now, 'updated_at' => $now],
            );

            DB::table('tarif')->updateOrInsert(
                ['id_location' => $station['id_location']],
                [
                    ...$tarif,
                    'id_location' => $station['id_location'],
                    'periode_mulai' => $now->copy()->subMonth(),
                    'periode_berakhir' => $now->copy()->addYear(),
                    'created_at' => $now,
                    'updated_at' => $now,
                ],
            );

            foreach ($chargers as $charger) {
                DB::table('charger')->updateOrInsert(
                    [
                        'id_location' => $station['id_location'],
                        'kode_perangkat' => $charger['kode_perangkat'],
                    ],
                    [...$charger, 'created_at' => $now, 'updated_at' => $now],
                );
            }
        }
    }
}
