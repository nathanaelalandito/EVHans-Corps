<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;

class StationSeeder extends Seeder
{
    /** Kode station yang disediakan untuk simulasi lokal EVChargeHub. */
    public const STATION_CODES = [
        'SPKLU-0001',
        'SPKLU-0002',
        'SPKLU-0003',
        'SPKLU-0004',
        'SPKLU-0005',
        'SPKLU-0006',
        'SPKLU-0007',
        'SPKLU-0008',
        'SPKLU-0009',
    ];

    /** Mengisi station, tarif, unit charger, dan port demo secara idempotent. */
    public function run(): void
    {
        $now = now();
        $stations = [
            [
                'kode_station' => 'SPKLU-0001',
                'nama_lokasi' => 'Malioboro Mall',
                'alamat' => 'Jl. Malioboro No. 52, Suryatmajan, Danurejan, Yogyakarta',
                'latitude' => -7.7930000,
                'longitude' => 110.3655000,
                'jam_buka' => '08:00:00',
                'jam_tutup' => '22:00:00',
                'status_loc' => 'Aktif',
                'tarif' => ['harga_per_kwh' => 2500, 'biaya_minimum' => 10000, 'biaya_parkir_flat' => 5000],
                'chargers' => [
                    ['kode_perangkat' => 'CHG-0001A', 'merek_model' => 'ABB Terra 54', 'kap_tot_kw' => 100, 'status_mesin' => 'Active', 'ports' => [
                        ['nomor_port' => 'Port A', 'tipe_konektor' => 'ccs2', 'tipe_charging' => 'DC', 'daya_maks_kw' => 50, 'status_port' => 'Available'],
                        ['nomor_port' => 'Port B', 'tipe_konektor' => 'ccs2', 'tipe_charging' => 'DC', 'daya_maks_kw' => 50, 'status_port' => 'Available'],
                    ]],
                    ['kode_perangkat' => 'CHG-0001B', 'merek_model' => 'Schneider EVlink', 'kap_tot_kw' => 44, 'status_mesin' => 'Active', 'ports' => [
                        ['nomor_port' => 'Port A', 'tipe_konektor' => 'type_2', 'tipe_charging' => 'AC', 'daya_maks_kw' => 22, 'status_port' => 'Available'],
                        ['nomor_port' => 'Port B', 'tipe_konektor' => 'type_2', 'tipe_charging' => 'AC', 'daya_maks_kw' => 22, 'status_port' => 'Available'],
                    ]],
                ],
            ],
            [
                'kode_station' => 'SPKLU-0002',
                'nama_lokasi' => 'Ambarrukmo Plaza',
                'alamat' => 'Jl. Laksda Adisucipto No. 80, Caturtunggal, Depok, Sleman',
                'latitude' => -7.7825000,
                'longitude' => 110.3945000,
                'jam_buka' => '09:00:00',
                'jam_tutup' => '22:00:00',
                'status_loc' => 'Aktif',
                'tarif' => ['harga_per_kwh' => 2466, 'biaya_minimum' => 15000, 'biaya_parkir_flat' => 5000],
                'chargers' => [
                    ['kode_perangkat' => 'CHG-0002A', 'merek_model' => 'Delta UFC 100', 'kap_tot_kw' => 100, 'status_mesin' => 'Active', 'ports' => [
                        ['nomor_port' => 'Port A', 'tipe_konektor' => 'ccs2', 'tipe_charging' => 'DC', 'daya_maks_kw' => 100, 'status_port' => 'Available'],
                    ]],
                    ['kode_perangkat' => 'CHG-0002B', 'merek_model' => 'StarCharge Titan', 'kap_tot_kw' => 60, 'status_mesin' => 'Active', 'ports' => [
                        ['nomor_port' => 'Port A', 'tipe_konektor' => 'gbt', 'tipe_charging' => 'DC', 'daya_maks_kw' => 60, 'status_port' => 'Available'],
                        ['nomor_port' => 'Port B', 'tipe_konektor' => 'chademo', 'tipe_charging' => 'DC', 'daya_maks_kw' => 60, 'status_port' => 'Available'],
                    ]],
                ],
            ],
            [
                'kode_station' => 'SPKLU-0003',
                'nama_lokasi' => 'UGM Boulevard',
                'alamat' => 'Jl. Boulevard UGM, Caturtunggal, Depok, Sleman',
                'latitude' => -7.7686000,
                'longitude' => 110.3746000,
                'jam_buka' => '07:00:00',
                'jam_tutup' => '23:00:00',
                'status_loc' => 'Maintenance',
                'tarif' => ['harga_per_kwh' => 2700, 'biaya_minimum' => 12000, 'biaya_parkir_flat' => 6000],
                'chargers' => [
                    ['kode_perangkat' => 'CHG-0003A', 'merek_model' => 'Schneider EVlink', 'kap_tot_kw' => 22, 'status_mesin' => 'Maintenance', 'ports' => [
                        ['nomor_port' => 'Port A', 'tipe_konektor' => 'type_2', 'tipe_charging' => 'AC', 'daya_maks_kw' => 22, 'status_port' => 'Maintenance'],
                    ]],
                    ['kode_perangkat' => 'CHG-0003B', 'merek_model' => 'Siemens Sicharge', 'kap_tot_kw' => 60, 'status_mesin' => 'Offline', 'ports' => [
                        ['nomor_port' => 'Port A', 'tipe_konektor' => 'chademo', 'tipe_charging' => 'DC', 'daya_maks_kw' => 60, 'status_port' => 'Out of Order'],
                    ]],
                ],
            ],
            [
                'kode_station' => 'SPKLU-0004',
                'nama_lokasi' => 'De Britto',
                'alamat' => 'Jl. Laksda Adisucipto No. 161, Yogyakarta',
                'latitude' => -7.7827844,
                'longitude' => 110.3938007,
                'jam_buka' => '00:00:00',
                'jam_tutup' => '23:59:00',
                'status_loc' => 'Aktif',
                'tarif' => ['harga_per_kwh' => 2600, 'biaya_minimum' => 10000, 'biaya_parkir_flat' => 4000],
                'chargers' => [
                    ['kode_perangkat' => 'CHG-0004A', 'merek_model' => 'ABB Terra 54', 'kap_tot_kw' => 50, 'status_mesin' => 'Active', 'ports' => [
                        ['nomor_port' => 'Port A', 'tipe_konektor' => 'ccs2', 'tipe_charging' => 'DC', 'daya_maks_kw' => 50, 'status_port' => 'Available'],
                    ]],
                    ['kode_perangkat' => 'CHG-0004B', 'merek_model' => 'Schneider EVlink', 'kap_tot_kw' => 22, 'status_mesin' => 'Active', 'ports' => [
                        ['nomor_port' => 'Port A', 'tipe_konektor' => 'type_2', 'tipe_charging' => 'AC', 'daya_maks_kw' => 22, 'status_port' => 'Available'],
                    ]],
                ],
            ],
            [
                'kode_station' => 'SPKLU-0005',
                'nama_lokasi' => 'UKDW',
                'alamat' => 'Jl. Doktor Wahidin Sudirohusodo No. 5–25, Yogyakarta',
                'latitude' => -7.7854000,
                'longitude' => 110.3772000,
                'jam_buka' => '07:00:00',
                'jam_tutup' => '21:00:00',
                'status_loc' => 'Aktif',
                'tarif' => ['harga_per_kwh' => 2300, 'biaya_minimum' => 0, 'biaya_parkir_flat' => 3000],
                'chargers' => [
                    ['kode_perangkat' => 'CHG-0005A', 'merek_model' => 'StarCharge Titan', 'kap_tot_kw' => 60, 'status_mesin' => 'Active', 'ports' => [
                        ['nomor_port' => 'Port A', 'tipe_konektor' => 'ccs2', 'tipe_charging' => 'DC', 'daya_maks_kw' => 60, 'status_port' => 'Available'],
                    ]],
                    ['kode_perangkat' => 'CHG-0005B', 'merek_model' => 'Schneider EVlink', 'kap_tot_kw' => 44, 'status_mesin' => 'Active', 'ports' => [
                        ['nomor_port' => 'Port A', 'tipe_konektor' => 'type_2', 'tipe_charging' => 'AC', 'daya_maks_kw' => 22, 'status_port' => 'Available'],
                        ['nomor_port' => 'Port B', 'tipe_konektor' => 'type_2', 'tipe_charging' => 'AC', 'daya_maks_kw' => 22, 'status_port' => 'Available'],
                    ]],
                ],
            ],
            [
                'kode_station' => 'SPKLU-0006',
                'nama_lokasi' => 'Golo',
                'alamat' => 'Jl. Golo, Pandeyan, Umbulharjo, Yogyakarta',
                'latitude' => -7.8018000,
                'longitude' => 110.3899000,
                'jam_buka' => '06:00:00',
                'jam_tutup' => '23:00:00',
                'status_loc' => 'Aktif',
                'tarif' => ['harga_per_kwh' => 2450, 'biaya_minimum' => 5000, 'biaya_parkir_flat' => 2500],
                'chargers' => [
                    ['kode_perangkat' => 'CHG-0006A', 'merek_model' => 'ABB Terra 54', 'kap_tot_kw' => 50, 'status_mesin' => 'Active', 'ports' => [
                        ['nomor_port' => 'Port A', 'tipe_konektor' => 'ccs2', 'tipe_charging' => 'DC', 'daya_maks_kw' => 50, 'status_port' => 'Out of Order'],
                    ]],
                    ['kode_perangkat' => 'CHG-0006B', 'merek_model' => 'Delta AC Max', 'kap_tot_kw' => 22, 'status_mesin' => 'Active', 'ports' => [
                        ['nomor_port' => 'Port A', 'tipe_konektor' => 'type_2', 'tipe_charging' => 'AC', 'daya_maks_kw' => 22, 'status_port' => 'Out of Order'],
                    ]],
                ],
            ],
            [
                'kode_station' => 'SPKLU-0007',
                'nama_lokasi' => 'UII Ngemplak',
                'alamat' => 'Jl. Kaliurang Km. 14,5, Umbulmartani, Ngemplak, Sleman',
                'latitude' => -7.6524000,
                'longitude' => 110.4149000,
                'jam_buka' => '08:00:00',
                'jam_tutup' => '20:00:00',
                'status_loc' => 'Aktif',
                'tarif' => ['harga_per_kwh' => 2500, 'biaya_minimum' => 10000, 'biaya_parkir_flat' => 3000],
                'chargers' => [
                    ['kode_perangkat' => 'CHG-0007A', 'merek_model' => 'Siemens Sicharge', 'kap_tot_kw' => 60, 'status_mesin' => 'Active', 'ports' => [
                        ['nomor_port' => 'Port A', 'tipe_konektor' => 'ccs2', 'tipe_charging' => 'DC', 'daya_maks_kw' => 60, 'status_port' => 'Available'],
                    ]],
                    ['kode_perangkat' => 'CHG-0007B', 'merek_model' => 'Delta AC Max', 'kap_tot_kw' => 22, 'status_mesin' => 'Active', 'ports' => [
                        ['nomor_port' => 'Port A', 'tipe_konektor' => 'gbt', 'tipe_charging' => 'AC', 'daya_maks_kw' => 22, 'status_port' => 'Available'],
                    ]],
                ],
            ],
            [
                'kode_station' => 'SPKLU-0008',
                'nama_lokasi' => 'Pakuwon Mall Jogja',
                'alamat' => 'Jl. Ring Road Utara, Kaliwaru, Condongcatur, Sleman',
                'latitude' => -7.7593000,
                'longitude' => 110.4082000,
                'jam_buka' => '10:00:00',
                'jam_tutup' => '22:00:00',
                'status_loc' => 'Nonaktif',
                'tarif' => ['harga_per_kwh' => 2550, 'biaya_minimum' => 10000, 'biaya_parkir_flat' => 5000],
                'chargers' => [
                    ['kode_perangkat' => 'CHG-0008A', 'merek_model' => 'Delta UFC 100', 'kap_tot_kw' => 100, 'status_mesin' => 'Offline', 'ports' => [
                        ['nomor_port' => 'Port A', 'tipe_konektor' => 'ccs2', 'tipe_charging' => 'DC', 'daya_maks_kw' => 100, 'status_port' => 'Out of Order'],
                    ]],
                    ['kode_perangkat' => 'CHG-0008B', 'merek_model' => 'Schneider EVlink', 'kap_tot_kw' => 22, 'status_mesin' => 'Offline', 'ports' => [
                        ['nomor_port' => 'Port A', 'tipe_konektor' => 'type_2', 'tipe_charging' => 'AC', 'daya_maks_kw' => 22, 'status_port' => 'Out of Order'],
                    ]],
                ],
            ],
            [
                'kode_station' => 'SPKLU-0009',
                'nama_lokasi' => 'Hartono Mall',
                'alamat' => 'Jl. Ring Road Utara, Sanggrahan, Condongcatur, Sleman',
                'latitude' => -7.7599000,
                'longitude' => 110.4070000,
                'jam_buka' => '10:00:00',
                'jam_tutup' => '22:00:00',
                'status_loc' => 'Maintenance',
                'tarif' => ['harga_per_kwh' => 2600, 'biaya_minimum' => 10000, 'biaya_parkir_flat' => 5000],
                'chargers' => [
                    ['kode_perangkat' => 'CHG-0009A', 'merek_model' => 'ABB Terra 54', 'kap_tot_kw' => 50, 'status_mesin' => 'Maintenance', 'ports' => [
                        ['nomor_port' => 'Port A', 'tipe_konektor' => 'chademo', 'tipe_charging' => 'DC', 'daya_maks_kw' => 50, 'status_port' => 'Maintenance'],
                    ]],
                    ['kode_perangkat' => 'CHG-0009B', 'merek_model' => 'Delta AC Max', 'kap_tot_kw' => 22, 'status_mesin' => 'Maintenance', 'ports' => [
                        ['nomor_port' => 'Port A', 'tipe_konektor' => 'type_2', 'tipe_charging' => 'AC', 'daya_maks_kw' => 22, 'status_port' => 'Maintenance'],
                    ]],
                ],
            ],
        ];

        foreach ($stations as $station) {
            $tariff = $station['tarif'];
            $chargers = $station['chargers'];
            unset($station['tarif'], $station['chargers']);

            DB::table('location')->updateOrInsert(
                ['kode_station' => $station['kode_station']],
                [...$station, 'updated_at' => $now, 'created_at' => $now],
            );

            $locationId = (int) DB::table('location')
                ->where('kode_station', $station['kode_station'])
                ->value('id_location');

            $this->syncCurrentTariff($locationId, $tariff, $now);
            $this->syncChargersAndPorts($locationId, $chargers, $now);
        }
    }

    /** Menyegarkan tarif berjalan tanpa mengganti jadwal tarif mendatang. */
    private function syncCurrentTariff(int $locationId, array $tariff, Carbon $now): void
    {
        $attributes = [
            ...$tariff,
            'periode_mulai' => $now->copy()->subMonth(),
            'periode_berakhir' => $now->copy()->addYear(),
            'updated_at' => $now,
        ];
        $currentTariffId = DB::table('tarif')
            ->where('id_location', $locationId)
            ->where('periode_mulai', '<=', $now)
            ->where('periode_berakhir', '>=', $now)
            ->orderByDesc('periode_mulai')
            ->value('id_tarif');

        if ($currentTariffId) {
            DB::table('tarif')->where('id_tarif', $currentTariffId)->update($attributes);

            return;
        }

        DB::table('tarif')->insert([
            ...$attributes,
            'id_location' => $locationId,
            'created_at' => $now,
        ]);
    }

    /** Menyegarkan unit charger dan port berdasarkan kode serta nomor port. */
    private function syncChargersAndPorts(int $locationId, array $chargers, Carbon $now): void
    {
        foreach ($chargers as $charger) {
            $ports = $charger['ports'];
            unset($charger['ports']);

            DB::table('charger')->updateOrInsert(
                [
                    'id_location' => $locationId,
                    'kode_perangkat' => $charger['kode_perangkat'],
                ],
                [...$charger, 'updated_at' => $now, 'created_at' => $now],
            );

            $chargerId = (int) DB::table('charger')
                ->where('id_location', $locationId)
                ->where('kode_perangkat', $charger['kode_perangkat'])
                ->value('id_charger');

            foreach ($ports as $port) {
                DB::table('ports')->updateOrInsert(
                    [
                        'id_charger' => $chargerId,
                        'nomor_port' => $port['nomor_port'],
                    ],
                    [...$port, 'updated_at' => $now, 'created_at' => $now],
                );
            }
        }
    }
}
