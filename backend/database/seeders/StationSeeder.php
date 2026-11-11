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
                'status_loc' => 'Aktif',
                'tarif' => ['harga_per_kwh' => 2500, 'biaya_minimum' => 10000, 'biaya_parkir_pjam' => 5000],
                'chargers' => [
                    [
                        'kode_perangkat' => 'CHG-01',
                        'merek_model' => 'ABB Terra 54',
                        'kap_tot_kw' => 50,
                        'status_mesin' => 'Active',
                        'ports' => [
                            ['nomor_port' => 'Port 1', 'tipe_konektor' => 'ccs2', 'tipe_charging' => 'DC', 'daya_maks_kw' => 50, 'status_port' => 'Available'],
                        ],
                    ],
                    [
                        'kode_perangkat' => 'CHG-02',
                        'merek_model' => 'Schneider EVlink',
                        'kap_tot_kw' => 22,
                        'status_mesin' => 'Active',
                        'ports' => [
                            ['nomor_port' => 'Port 1', 'tipe_konektor' => 'type_2', 'tipe_charging' => 'AC', 'daya_maks_kw' => 22, 'status_port' => 'Available'],
                        ],
                    ],
                    [
                        'kode_perangkat' => 'CHG-03',
                        'merek_model' => 'ABB Terra 54',
                        'kap_tot_kw' => 50,
                        'status_mesin' => 'Active',
                        'ports' => [
                            ['nomor_port' => 'Port 1', 'tipe_konektor' => 'ccs2', 'tipe_charging' => 'DC', 'daya_maks_kw' => 50, 'status_port' => 'Available'],
                        ],
                    ],
                    [
                        'kode_perangkat' => 'CHG-04',
                        'merek_model' => 'Schneider EVlink',
                        'kap_tot_kw' => 22,
                        'status_mesin' => 'Maintenance',
                        'ports' => [
                            ['nomor_port' => 'Port 1', 'tipe_konektor' => 'type_2', 'tipe_charging' => 'AC', 'daya_maks_kw' => 22, 'status_port' => 'Out of Order'],
                        ],
                    ],
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
                'status_loc' => 'Aktif',
                'tarif' => ['harga_per_kwh' => 2200, 'biaya_minimum' => 10000, 'biaya_parkir_pjam' => 4000],
                'chargers' => [
                    [
                        'kode_perangkat' => 'CHG-01',
                        'merek_model' => 'ABB Terra 54',
                        'kap_tot_kw' => 22,
                        'status_mesin' => 'Active',
                        'ports' => [
                            ['nomor_port' => 'Port 1', 'tipe_konektor' => 'ccs2', 'tipe_charging' => 'DC', 'daya_maks_kw' => 22, 'status_port' => 'Charging'],
                        ],
                    ],
                    [
                        'kode_perangkat' => 'CHG-02',
                        'merek_model' => 'ABB Terra 54',
                        'kap_tot_kw' => 22,
                        'status_mesin' => 'Active',
                        'ports' => [
                            ['nomor_port' => 'Port 1', 'tipe_konektor' => 'ccs2', 'tipe_charging' => 'DC', 'daya_maks_kw' => 22, 'status_port' => 'Charging'],
                        ],
                    ],
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
                'status_loc' => 'Maintenance',
                'tarif' => ['harga_per_kwh' => 2700, 'biaya_minimum' => 12000, 'biaya_parkir_pjam' => 6000],
                'chargers' => [
                    [
                        'kode_perangkat' => 'CHG-01',
                        'merek_model' => 'Schneider EVlink',
                        'kap_tot_kw' => 22,
                        'status_mesin' => 'Maintenance',
                        'ports' => [
                            ['nomor_port' => 'Port 1', 'tipe_konektor' => 'type_2', 'tipe_charging' => 'AC', 'daya_maks_kw' => 22, 'status_port' => 'Out of Order'],
                        ],
                    ],
                    [
                        'kode_perangkat' => 'CHG-02',
                        'merek_model' => 'Siemens Sicharge',
                        'kap_tot_kw' => 60,
                        'status_mesin' => 'Offline',
                        'ports' => [
                            ['nomor_port' => 'Port 1', 'tipe_konektor' => 'chademo', 'tipe_charging' => 'DC', 'daya_maks_kw' => 60, 'status_port' => 'Out of Order'],
                        ],
                    ],
                ],
            ],
        ];

        foreach ($stations as $station) {
            $tarif = $station['tarif'];
            $chargers = $station['chargers'];
            unset($station['tarif'], $station['chargers']);

            DB::table('location')->updateOrInsert(
                ['id_location' => $station['id_location']],
                [...$station, 'created_at' => $now, 'updated_at' => $now]
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
                ]
            );

            foreach ($chargers as $chargerData) {
                $ports = $chargerData['ports'];
                unset($chargerData['ports']);

                // Masukkan data mesin charger fisik
                $chargerId = DB::table('charger')->updateOrInsert(
                    [
                        'id_location' => $station['id_location'],
                        'kode_perangkat' => $chargerData['kode_perangkat'],
                    ],
                    [
                        ...$chargerData,
                        'created_at' => $now,
                        'updated_at' => $now,
                    ]
                );

                // Ambil id_charger yang baru saja di-insert / di-update
                $chargerRecord = DB::table('charger')
                    ->where('id_location', $station['id_location'])
                    ->where('kode_perangkat', $chargerData['kode_perangkat'])
                    ->first();

                if ($chargerRecord) {
                    foreach ($ports as $port) {
                        DB::table('ports')->updateOrInsert(
                            [
                                'id_charger' => $chargerRecord->id_charger,
                                'nomor_port' => $port['nomor_port'],
                            ],
                            [
                                ...$port,
                                'created_at' => $now,
                                'updated_at' => $now,
                            ]
                        );
                    }
                }
            }
        }
    }
}
