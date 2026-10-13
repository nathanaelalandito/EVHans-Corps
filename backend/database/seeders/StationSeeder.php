<?php

namespace Database\Seeders;

use App\Models\Charger;
use App\Models\Location;
use App\Models\Tarif;
use Illuminate\Database\Seeder;

/**
 * Data dummy charging station (area Yogyakarta & sekitarnya).
 * Koordinat perkiraan, cukup untuk pengembangan. Aman dijalankan berulang.
 *
 * Format charger: [tipe_konektor, daya_kW, AC/DC, status]
 * Kode perangkat (CHG001, CHG002, ...) dibuat berurutan otomatis.
 */
class StationSeeder extends Seeder
{
    public function run(): void
    {
        $stations = [
            [
                'nama_lokasi' => 'EVCharge Hub - Malioboro Mall',
                'alamat' => 'Jl. Malioboro No. 52, Yogyakarta',
                'latitude' => -7.7930, 'longitude' => 110.3655,
                'jam_buka' => '08:00:00', 'jam_tutup' => '22:00:00',
                'status' => 'aktif', 'harga' => 2500, 'minimum' => 10000, 'parkir' => 3000,
                'chargers' => [
                    ['ccs2', 50, 'DC', 'tersedia'],
                    ['ccs2', 50, 'DC', 'sedang digunakan'],
                    ['ccs2', 50, 'DC', 'tersedia'],
                    ['type_2', 22, 'AC', 'sedang digunakan'],
                    ['type_2', 22, 'AC', 'tersedia'],
                    ['type_2', 22, 'AC', 'sedang digunakan'],
                ],
            ],
            [
                'nama_lokasi' => 'EVCharge Hub - Ambarrukmo Plaza',
                'alamat' => 'Jl. Laksda Adisucipto, Yogyakarta',
                'latitude' => -7.7825, 'longitude' => 110.3945,
                'jam_buka' => '00:00:00', 'jam_tutup' => '23:59:00',
                'status' => 'aktif', 'harga' => 2200, 'minimum' => 8000, 'parkir' => 3000,
                'chargers' => [
                    ['ccs2', 22, 'DC', 'sedang digunakan'],
                    ['ccs2', 22, 'DC', 'sedang digunakan'],
                    ['ccs2', 22, 'DC', 'sedang digunakan'],
                    ['ccs2', 22, 'DC', 'sedang digunakan'],
                ],
            ],
            [
                'nama_lokasi' => 'EVCharge Hub - UGM Boulevard',
                'alamat' => 'Jl. Boulevard UGM, Yogyakarta',
                'latitude' => -7.7686, 'longitude' => 110.3746,
                'jam_buka' => '06:00:00', 'jam_tutup' => '21:00:00',
                'status' => 'maintenance', 'harga' => 2700, 'minimum' => 10000, 'parkir' => 2000,
                'chargers' => [
                    ['chademo', 60, 'DC', 'tersedia'],
                    ['chademo', 60, 'DC', 'maintenance'],
                    ['type_2', 22, 'AC', 'tersedia'],
                    ['type_2', 22, 'AC', 'rusak'],
                    ['type_2', 22, 'AC', 'offline'],
                ],
            ],
            [
                'nama_lokasi' => 'EVCharge Hub - Stasiun Tugu',
                'alamat' => 'Jl. Pangeran Mangkubumi, Gowongan, Yogyakarta',
                'latitude' => -7.7893, 'longitude' => 110.3633,
                'jam_buka' => '05:00:00', 'jam_tutup' => '23:00:00',
                'status' => 'aktif', 'harga' => 2600, 'minimum' => 10000, 'parkir' => 4000,
                'chargers' => [
                    ['ccs2', 60, 'DC', 'tersedia'],
                    ['ccs2', 60, 'DC', 'tersedia'],
                    ['type_2', 22, 'AC', 'tersedia'],
                    ['type_2', 22, 'AC', 'sedang digunakan'],
                ],
            ],
            [
                'nama_lokasi' => 'EVCharge Hub - Jogja City Mall',
                'alamat' => 'Jl. Magelang Km 6, Sleman',
                'latitude' => -7.7538, 'longitude' => 110.3606,
                'jam_buka' => '10:00:00', 'jam_tutup' => '22:00:00',
                'status' => 'aktif', 'harga' => 2400, 'minimum' => 8000, 'parkir' => 3000,
                'chargers' => [
                    ['ccs2', 50, 'DC', 'sedang digunakan'],
                    ['ccs2', 50, 'DC', 'tersedia'],
                    ['type_2', 7, 'AC', 'tersedia'],
                    ['type_2', 7, 'AC', 'tersedia'],
                    ['type_2', 7, 'AC', 'sedang digunakan'],
                ],
            ],
            [
                'nama_lokasi' => 'EVCharge Hub - Hartono Mall',
                'alamat' => 'Jl. Ring Road Utara, Condongcatur, Sleman',
                'latitude' => -7.7516, 'longitude' => 110.4092,
                'jam_buka' => '10:00:00', 'jam_tutup' => '22:00:00',
                'status' => 'aktif', 'harga' => 2400, 'minimum' => 8000, 'parkir' => 3000,
                'chargers' => [
                    ['ccs2', 120, 'DC', 'tersedia'],
                    ['ccs2', 120, 'DC', 'sedang digunakan'],
                    ['gbt', 60, 'DC', 'tersedia'],
                    ['type_2', 22, 'AC', 'tersedia'],
                ],
            ],
            [
                'nama_lokasi' => 'EVCharge Point - Alun-Alun Selatan',
                'alamat' => 'Jl. Alun-Alun Selatan, Patehan, Yogyakarta',
                'latitude' => -7.8130, 'longitude' => 110.3640,
                'jam_buka' => '07:00:00', 'jam_tutup' => '21:00:00',
                'status' => 'aktif', 'harga' => 2300, 'minimum' => 5000, 'parkir' => 2000,
                'chargers' => [
                    ['type_2', 22, 'AC', 'tersedia'],
                    ['type_2', 22, 'AC', 'tersedia'],
                    ['type_2', 7, 'AC', 'sedang digunakan'],
                ],
            ],
            [
                'nama_lokasi' => 'EVCharge Hub - Terminal Giwangan',
                'alamat' => 'Jl. Imogiri Timur, Giwangan, Yogyakarta',
                'latitude' => -7.8283, 'longitude' => 110.3908,
                'jam_buka' => '00:00:00', 'jam_tutup' => '23:59:00',
                'status' => 'aktif', 'harga' => 2100, 'minimum' => 8000, 'parkir' => 2000,
                'chargers' => [
                    ['ccs2', 150, 'DC', 'tersedia'],
                    ['ccs2', 150, 'DC', 'tersedia'],
                    ['chademo', 50, 'DC', 'tersedia'],
                    ['gbt', 60, 'DC', 'offline'],
                    ['type_2', 22, 'AC', 'tersedia'],
                    ['type_2', 22, 'AC', 'sedang digunakan'],
                ],
            ],
            [
                'nama_lokasi' => 'EVCharge Point - Candi Prambanan',
                'alamat' => 'Jl. Raya Solo - Yogyakarta Km 16, Sleman',
                'latitude' => -7.7520, 'longitude' => 110.4915,
                'jam_buka' => '06:00:00', 'jam_tutup' => '18:00:00',
                'status' => 'nonaktif', 'harga' => 2300, 'minimum' => 5000, 'parkir' => 5000,
                'chargers' => [
                    ['type_2', 22, 'AC', 'offline'],
                    ['type_2', 22, 'AC', 'offline'],
                ],
            ],
            [
                'nama_lokasi' => 'EVCharge Hub - Bandara YIA',
                'alamat' => 'Jl. Bandara YIA, Temon, Kulon Progo',
                'latitude' => -7.9007, 'longitude' => 110.0568,
                'jam_buka' => '00:00:00', 'jam_tutup' => '23:59:00',
                'status' => 'aktif', 'harga' => 3000, 'minimum' => 15000, 'parkir' => 5000,
                'chargers' => [
                    ['ccs2', 150, 'DC', 'sedang digunakan'],
                    ['ccs2', 150, 'DC', 'tersedia'],
                    ['ccs2', 60, 'DC', 'tersedia'],
                    ['type_2', 22, 'AC', 'tersedia'],
                    ['type_2', 22, 'AC', 'tersedia'],
                    ['type_2', 22, 'AC', 'sedang digunakan'],
                    ['gbt', 60, 'DC', 'tersedia'],
                ],
            ],
        ];

        $nomorCharger = 1;

        foreach ($stations as $i => $s) {
            $location = Location::updateOrCreate(
                ['id_location' => $i + 1],
                [
                    'nama_lokasi' => $s['nama_lokasi'],
                    'alamat' => $s['alamat'],
                    'latitude' => $s['latitude'],
                    'longitude' => $s['longitude'],
                    'jam_buka' => $s['jam_buka'],
                    'jam_tutup' => $s['jam_tutup'],
                    'status' => $s['status'],
                ]
            );

            foreach ($s['chargers'] as [$konektor, $daya, $tipe, $status]) {
                Charger::updateOrCreate(
                    [
                        'id_location' => $location->id_location,
                        'kode_perangkat' => sprintf('CHG%03d', $nomorCharger++),
                    ],
                    [
                        'tipe_konektor' => $konektor,
                        'daya_kwh' => $daya,
                        'tipe_charging' => $tipe,
                        'status' => $status,
                    ]
                );
            }

            Tarif::updateOrCreate(
                ['id_location' => $location->id_location, 'periode_mulai' => '2026-01-01 00:00:00'],
                [
                    'harga_per_kwh' => $s['harga'],
                    'biaya_minimum' => $s['minimum'],
                    'biaya_parkir_pjam' => $s['parkir'],
                    'periode_berakhir' => '2030-12-31 23:59:59',
                ]
            );
        }
    }
}
