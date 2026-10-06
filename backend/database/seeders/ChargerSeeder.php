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
            ['id_charger' => 1, 'id_location' => 1, 'kode_perangkat' => 'CHG-L1-01', 'merek_model' => 'ABB Terra 184', 'kap_tot_kw' => 120.00, 'status_mesin' => 'Active', 'created_at' => Carbon::now(), 'updated_at' => Carbon::now()],
            ['id_charger' => 2, 'id_location' => 1, 'kode_perangkat' => 'CHG-L1-02', 'merek_model' => 'Schneider EVlink', 'kap_tot_kw' => 100.00, 'status_mesin' => 'Active', 'created_at' => Carbon::now(), 'updated_at' => Carbon::now()],
            ['id_charger' => 3, 'id_location' => 1, 'kode_perangkat' => 'CHG-L1-03', 'merek_model' => 'Siemens Sicharge', 'kap_tot_kw' => 150.00, 'status_mesin' => 'Maintenance', 'created_at' => Carbon::now(), 'updated_at' => Carbon::now()],
            ['id_charger' => 4, 'id_location' => 1, 'kode_perangkat' => 'CHG-L1-04', 'merek_model' => 'Delta UFC', 'kap_tot_kw' => 60.00, 'status_mesin' => 'Active', 'created_at' => Carbon::now(), 'updated_at' => Carbon::now()],
            ['id_charger' => 5, 'id_location' => 1, 'kode_perangkat' => 'CHG-L1-05', 'merek_model' => 'Tritium Veefil', 'kap_tot_kw' => 90.00, 'status_mesin' => 'Offline', 'created_at' => Carbon::now(), 'updated_at' => Carbon::now()],
            ['id_charger' => 6, 'id_location' => 1, 'kode_perangkat' => 'CHG-L1-06', 'merek_model' => 'ABB Terra 184', 'kap_tot_kw' => 180.00, 'status_mesin' => 'Active', 'created_at' => Carbon::now(), 'updated_at' => Carbon::now()],
            ['id_charger' => 7, 'id_location' => 1, 'kode_perangkat' => 'CHG-L1-07', 'merek_model' => 'Schneider EVlink', 'kap_tot_kw' => 100.00, 'status_mesin' => 'Active', 'created_at' => Carbon::now(), 'updated_at' => Carbon::now()],
            ['id_charger' => 8, 'id_location' => 1, 'kode_perangkat' => 'CHG-L1-08', 'merek_model' => 'Siemens Sicharge', 'kap_tot_kw' => 120.00, 'status_mesin' => 'Maintenance', 'created_at' => Carbon::now(), 'updated_at' => Carbon::now()],
            ['id_charger' => 9, 'id_location' => 1, 'kode_perangkat' => 'CHG-L1-09', 'merek_model' => 'Delta UFC', 'kap_tot_kw' => 150.00, 'status_mesin' => 'Active', 'created_at' => Carbon::now(), 'updated_at' => Carbon::now()],
            ['id_charger' => 10, 'id_location' => 1, 'kode_perangkat' => 'CHG-L1-10', 'merek_model' => 'Tritium Veefil', 'kap_tot_kw' => 60.00, 'status_mesin' => 'Active', 'created_at' => Carbon::now(), 'updated_at' => Carbon::now()],

            ['id_charger' => 11, 'id_location' => 2, 'kode_perangkat' => 'CHG-L2-01', 'merek_model' => 'Schneider EVlink', 'kap_tot_kw' => 100.00, 'status_mesin' => 'Active', 'created_at' => Carbon::now(), 'updated_at' => Carbon::now()],
            ['id_charger' => 12, 'id_location' => 2, 'kode_perangkat' => 'CHG-L2-02', 'merek_model' => 'ABB Terra 184', 'kap_tot_kw' => 120.00, 'status_mesin' => 'Active', 'created_at' => Carbon::now(), 'updated_at' => Carbon::now()],
            ['id_charger' => 13, 'id_location' => 2, 'kode_perangkat' => 'CHG-L2-03', 'merek_model' => 'Siemens Sicharge', 'kap_tot_kw' => 150.00, 'status_mesin' => 'Offline', 'created_at' => Carbon::now(), 'updated_at' => Carbon::now()],
            ['id_charger' => 14, 'id_location' => 2, 'kode_perangkat' => 'CHG-L2-04', 'merek_model' => 'Delta UFC', 'kap_tot_kw' => 90.00, 'status_mesin' => 'Active', 'created_at' => Carbon::now(), 'updated_at' => Carbon::now()],
            ['id_charger' => 15, 'id_location' => 2, 'kode_perangkat' => 'CHG-L2-05', 'merek_model' => 'Tritium Veefil', 'kap_tot_kw' => 60.00, 'status_mesin' => 'Active', 'created_at' => Carbon::now(), 'updated_at' => Carbon::now()],
            ['id_charger' => 16, 'id_location' => 2, 'kode_perangkat' => 'CHG-L2-06', 'merek_model' => 'ABB Terra 184', 'kap_tot_kw' => 180.00, 'status_mesin' => 'Maintenance', 'created_at' => Carbon::now(), 'updated_at' => Carbon::now()],
            ['id_charger' => 17, 'id_location' => 2, 'kode_perangkat' => 'CHG-L2-07', 'merek_model' => 'Schneider EVlink', 'kap_tot_kw' => 100.00, 'status_mesin' => 'Active', 'created_at' => Carbon::now(), 'updated_at' => Carbon::now()],
            ['id_charger' => 18, 'id_location' => 2, 'kode_perangkat' => 'CHG-L2-08', 'merek_model' => 'Siemens Sicharge', 'kap_tot_kw' => 120.00, 'status_mesin' => 'Active', 'created_at' => Carbon::now(), 'updated_at' => Carbon::now()],
            ['id_charger' => 19, 'id_location' => 2, 'kode_perangkat' => 'CHG-L2-09', 'merek_model' => 'Delta UFC', 'kap_tot_kw' => 150.00, 'status_mesin' => 'Offline', 'created_at' => Carbon::now(), 'updated_at' => Carbon::now()],
            ['id_charger' => 20, 'id_location' => 2, 'kode_perangkat' => 'CHG-L2-10', 'merek_model' => 'Tritium Veefil', 'kap_tot_kw' => 60.00, 'status_mesin' => 'Active', 'created_at' => Carbon::now(), 'updated_at' => Carbon::now()],

            ['id_charger' => 21, 'id_location' => 3, 'kode_perangkat' => 'CHG-L3-01', 'merek_model' => 'Siemens Sicharge', 'kap_tot_kw' => 150.00, 'status_mesin' => 'Active', 'created_at' => Carbon::now(), 'updated_at' => Carbon::now()],
            ['id_charger' => 22, 'id_location' => 3, 'kode_perangkat' => 'CHG-L3-02', 'merek_model' => 'ABB Terra 184', 'kap_tot_kw' => 120.00, 'status_mesin' => 'Active', 'created_at' => Carbon::now(), 'updated_at' => Carbon::now()],
            ['id_charger' => 23, 'id_location' => 3, 'kode_perangkat' => 'CHG-L3-03', 'merek_model' => 'Schneider EVlink', 'kap_tot_kw' => 100.00, 'status_mesin' => 'Maintenance', 'created_at' => Carbon::now(), 'updated_at' => Carbon::now()],
            ['id_charger' => 24, 'id_location' => 3, 'kode_perangkat' => 'CHG-L3-04', 'merek_model' => 'Delta UFC', 'kap_tot_kw' => 90.00, 'status_mesin' => 'Active', 'created_at' => Carbon::now(), 'updated_at' => Carbon::now()],
            ['id_charger' => 25, 'id_location' => 3, 'kode_perangkat' => 'CHG-L3-05', 'merek_model' => 'Tritium Veefil', 'kap_tot_kw' => 60.00, 'status_mesin' => 'Active', 'created_at' => Carbon::now(), 'updated_at' => Carbon::now()],
            ['id_charger' => 26, 'id_location' => 3, 'kode_perangkat' => 'CHG-L3-06', 'merek_model' => 'ABB Terra 184', 'kap_tot_kw' => 180.00, 'status_mesin' => 'Offline', 'created_at' => Carbon::now(), 'updated_at' => Carbon::now()],
            ['id_charger' => 27, 'id_location' => 3, 'kode_perangkat' => 'CHG-L3-07', 'merek_model' => 'Schneider EVlink', 'kap_tot_kw' => 100.00, 'status_mesin' => 'Active', 'created_at' => Carbon::now(), 'updated_at' => Carbon::now()],
            ['id_charger' => 28, 'id_location' => 3, 'kode_perangkat' => 'CHG-L3-08', 'merek_model' => 'Siemens Sicharge', 'kap_tot_kw' => 120.00, 'status_mesin' => 'Active', 'created_at' => Carbon::now(), 'updated_at' => Carbon::now()],
            ['id_charger' => 29, 'id_location' => 3, 'kode_perangkat' => 'CHG-L3-09', 'merek_model' => 'Delta UFC', 'kap_tot_kw' => 150.00, 'status_mesin' => 'Maintenance', 'created_at' => Carbon::now(), 'updated_at' => Carbon::now()],
            ['id_charger' => 30, 'id_location' => 3, 'kode_perangkat' => 'CHG-L3-10', 'merek_model' => 'Tritium Veefil', 'kap_tot_kw' => 60.00, 'status_mesin' => 'Active', 'created_at' => Carbon::now(), 'updated_at' => Carbon::now()],

            ['id_charger' => 31, 'id_location' => 4, 'kode_perangkat' => 'CHG-L4-01', 'merek_model' => 'Delta UFC', 'kap_tot_kw' => 150.00, 'status_mesin' => 'Active', 'created_at' => Carbon::now(), 'updated_at' => Carbon::now()],
            ['id_charger' => 32, 'id_location' => 4, 'kode_perangkat' => 'CHG-L4-02', 'merek_model' => 'ABB Terra 184', 'kap_tot_kw' => 120.00, 'status_mesin' => 'Active', 'created_at' => Carbon::now(), 'updated_at' => Carbon::now()],
            ['id_charger' => 33, 'id_location' => 4, 'kode_perangkat' => 'CHG-L4-03', 'merek_model' => 'Schneider EVlink', 'kap_tot_kw' => 100.00, 'status_mesin' => 'Active', 'created_at' => Carbon::now(), 'updated_at' => Carbon::now()],
            ['id_charger' => 34, 'id_location' => 4, 'kode_perangkat' => 'CHG-L4-04', 'merek_model' => 'Siemens Sicharge', 'kap_tot_kw' => 90.00, 'status_mesin' => 'Offline', 'created_at' => Carbon::now(), 'updated_at' => Carbon::now()],
            ['id_charger' => 35, 'id_location' => 4, 'kode_perangkat' => 'CHG-L4-05', 'merek_model' => 'Tritium Veefil', 'kap_tot_kw' => 60.00, 'status_mesin' => 'Active', 'created_at' => Carbon::now(), 'updated_at' => Carbon::now()],
            ['id_charger' => 36, 'id_location' => 4, 'kode_perangkat' => 'CHG-L4-06', 'merek_model' => 'ABB Terra 184', 'kap_tot_kw' => 180.00, 'status_mesin' => 'Maintenance', 'created_at' => Carbon::now(), 'updated_at' => Carbon::now()],
            ['id_charger' => 37, 'id_location' => 4, 'kode_perangkat' => 'CHG-L4-07', 'merek_model' => 'Schneider EVlink', 'kap_tot_kw' => 100.00, 'status_mesin' => 'Active', 'created_at' => Carbon::now(), 'updated_at' => Carbon::now()],
            ['id_charger' => 38, 'id_location' => 4, 'kode_perangkat' => 'CHG-L4-08', 'merek_model' => 'Siemens Sicharge', 'kap_tot_kw' => 120.00, 'status_mesin' => 'Active', 'created_at' => Carbon::now(), 'updated_at' => Carbon::now()],
            ['id_charger' => 39, 'id_location' => 4, 'kode_perangkat' => 'CHG-L4-09', 'merek_model' => 'Delta UFC', 'kap_tot_kw' => 150.00, 'status_mesin' => 'Active', 'created_at' => Carbon::now(), 'updated_at' => Carbon::now()],
            ['id_charger' => 40, 'id_location' => 4, 'kode_perangkat' => 'CHG-L4-10', 'merek_model' => 'Tritium Veefil', 'kap_tot_kw' => 60.00, 'status_mesin' => 'Offline', 'created_at' => Carbon::now(), 'updated_at' => Carbon::now()],

            ['id_charger' => 41, 'id_location' => 5, 'kode_perangkat' => 'CHG-L5-01', 'merek_model' => 'Tritium Veefil', 'kap_tot_kw' => 90.00, 'status_mesin' => 'Active', 'created_at' => Carbon::now(), 'updated_at' => Carbon::now()],
            ['id_charger' => 42, 'id_location' => 5, 'kode_perangkat' => 'CHG-L5-02', 'merek_model' => 'ABB Terra 184', 'kap_tot_kw' => 120.00, 'status_mesin' => 'Active', 'created_at' => Carbon::now(), 'updated_at' => Carbon::now()],
            ['id_charger' => 43, 'id_location' => 5, 'kode_perangkat' => 'CHG-L5-03', 'merek_model' => 'Schneider EVlink', 'kap_tot_kw' => 100.00, 'status_mesin' => 'Maintenance', 'created_at' => Carbon::now(), 'updated_at' => Carbon::now()],
            ['id_charger' => 44, 'id_location' => 5, 'kode_perangkat' => 'CHG-L5-04', 'merek_model' => 'Siemens Sicharge', 'kap_tot_kw' => 150.00, 'status_mesin' => 'Active', 'created_at' => Carbon::now(), 'updated_at' => Carbon::now()],
            ['id_charger' => 45, 'id_location' => 5, 'kode_perangkat' => 'CHG-L5-05', 'merek_model' => 'Delta UFC', 'kap_tot_kw' => 60.00, 'status_mesin' => 'Active', 'created_at' => Carbon::now(), 'updated_at' => Carbon::now()],
            ['id_charger' => 46, 'id_location' => 5, 'kode_perangkat' => 'CHG-L5-06', 'merek_model' => 'ABB Terra 184', 'kap_tot_kw' => 180.00, 'status_mesin' => 'Active', 'created_at' => Carbon::now(), 'updated_at' => Carbon::now()],
            ['id_charger' => 47, 'id_location' => 5, 'kode_perangkat' => 'CHG-L5-07', 'merek_model' => 'Schneider EVlink', 'kap_tot_kw' => 100.00, 'status_mesin' => 'Offline', 'created_at' => Carbon::now(), 'updated_at' => Carbon::now()],
            ['id_charger' => 48, 'id_location' => 5, 'kode_perangkat' => 'CHG-L5-08', 'merek_model' => 'Siemens Sicharge', 'kap_tot_kw' => 120.00, 'status_mesin' => 'Active', 'created_at' => Carbon::now(), 'updated_at' => Carbon::now()],
            ['id_charger' => 49, 'id_location' => 5, 'kode_perangkat' => 'CHG-L5-09', 'merek_model' => 'Delta UFC', 'kap_tot_kw' => 150.00, 'status_mesin' => 'Maintenance', 'created_at' => Carbon::now(), 'updated_at' => Carbon::now()],
            ['id_charger' => 50, 'id_location' => 5, 'kode_perangkat' => 'CHG-L5-10', 'merek_model' => 'Tritium Veefil', 'kap_tot_kw' => 60.00, 'status_mesin' => 'Active', 'created_at' => Carbon::now(), 'updated_at' => Carbon::now()],

            ['id_charger' => 51, 'id_location' => 6, 'kode_perangkat' => 'CHG-L6-01', 'merek_model' => 'ABB Terra 184', 'kap_tot_kw' => 180.00, 'status_mesin' => 'Active', 'created_at' => Carbon::now(), 'updated_at' => Carbon::now()],
            ['id_charger' => 52, 'id_location' => 6, 'kode_perangkat' => 'CHG-L6-02', 'merek_model' => 'Schneider EVlink', 'kap_tot_kw' => 100.00, 'status_mesin' => 'Active', 'created_at' => Carbon::now(), 'updated_at' => Carbon::now()],
            ['id_charger' => 53, 'id_location' => 6, 'kode_perangkat' => 'CHG-L6-03', 'merek_model' => 'Siemens Sicharge', 'kap_tot_kw' => 150.00, 'status_mesin' => 'Active', 'created_at' => Carbon::now(), 'updated_at' => Carbon::now()],
            ['id_charger' => 54, 'id_location' => 6, 'kode_perangkat' => 'CHG-L6-04', 'merek_model' => 'Delta UFC', 'kap_tot_kw' => 120.00, 'status_mesin' => 'Maintenance', 'created_at' => Carbon::now(), 'updated_at' => Carbon::now()],
            ['id_charger' => 55, 'id_location' => 6, 'kode_perangkat' => 'CHG-L6-05', 'merek_model' => 'Tritium Veefil', 'kap_tot_kw' => 90.00, 'status_mesin' => 'Active', 'created_at' => Carbon::now(), 'updated_at' => Carbon::now()],
            ['id_charger' => 56, 'id_location' => 6, 'kode_perangkat' => 'CHG-L6-06', 'merek_model' => 'ABB Terra 184', 'kap_tot_kw' => 120.00, 'status_mesin' => 'Offline', 'created_at' => Carbon::now(), 'updated_at' => Carbon::now()],
            ['id_charger' => 57, 'id_location' => 6, 'kode_perangkat' => 'CHG-L6-07', 'merek_model' => 'Schneider EVlink', 'kap_tot_kw' => 100.00, 'status_mesin' => 'Active', 'created_at' => Carbon::now(), 'updated_at' => Carbon::now()],
            ['id_charger' => 58, 'id_location' => 6, 'kode_perangkat' => 'CHG-L6-08', 'merek_model' => 'Siemens Sicharge', 'kap_tot_kw' => 150.00, 'status_mesin' => 'Active', 'created_at' => Carbon::now(), 'updated_at' => Carbon::now()],
            ['id_charger' => 59, 'id_location' => 6, 'kode_perangkat' => 'CHG-L6-09', 'merek_model' => 'Delta UFC', 'kap_tot_kw' => 60.00, 'status_mesin' => 'Maintenance', 'created_at' => Carbon::now(), 'updated_at' => Carbon::now()],
            ['id_charger' => 60, 'id_location' => 6, 'kode_perangkat' => 'CHG-L6-10', 'merek_model' => 'Tritium Veefil', 'kap_tot_kw' => 90.00, 'status_mesin' => 'Active', 'created_at' => Carbon::now(), 'updated_at' => Carbon::now()],

            ['id_charger' => 61, 'id_location' => 7, 'kode_perangkat' => 'CHG-L7-01', 'merek_model' => 'Schneider EVlink', 'kap_tot_kw' => 100.00, 'status_mesin' => 'Active', 'created_at' => Carbon::now(), 'updated_at' => Carbon::now()],
            ['id_charger' => 62, 'id_location' => 7, 'kode_perangkat' => 'CHG-L7-02', 'merek_model' => 'ABB Terra 184', 'kap_tot_kw' => 120.00, 'status_mesin' => 'Active', 'created_at' => Carbon::now(), 'updated_at' => Carbon::now()],
            ['id_charger' => 63, 'id_location' => 7, 'kode_perangkat' => 'CHG-L7-03', 'merek_model' => 'Siemens Sicharge', 'kap_tot_kw' => 150.00, 'status_mesin' => 'Offline', 'created_at' => Carbon::now(), 'updated_at' => Carbon::now()],
            ['id_charger' => 64, 'id_location' => 7, 'kode_perangkat' => 'CHG-L7-04', 'merek_model' => 'Delta UFC', 'kap_tot_kw' => 60.00, 'status_mesin' => 'Active', 'created_at' => Carbon::now(), 'updated_at' => Carbon::now()],
            ['id_charger' => 65, 'id_location' => 7, 'kode_perangkat' => 'CHG-L7-05', 'merek_model' => 'Tritium Veefil', 'kap_tot_kw' => 90.00, 'status_mesin' => 'Maintenance', 'created_at' => Carbon::now(), 'updated_at' => Carbon::now()],
            ['id_charger' => 66, 'id_location' => 7, 'kode_perangkat' => 'CHG-L7-06', 'merek_model' => 'ABB Terra 184', 'kap_tot_kw' => 180.00, 'status_mesin' => 'Active', 'created_at' => Carbon::now(), 'updated_at' => Carbon::now()],
            ['id_charger' => 67, 'id_location' => 7, 'kode_perangkat' => 'CHG-L7-07', 'merek_model' => 'Schneider EVlink', 'kap_tot_kw' => 100.00, 'status_mesin' => 'Active', 'created_at' => Carbon::now(), 'updated_at' => Carbon::now()],
            ['id_charger' => 68, 'id_location' => 7, 'kode_perangkat' => 'CHG-L7-08', 'merek_model' => 'Siemens Sicharge', 'kap_tot_kw' => 120.00, 'status_mesin' => 'Offline', 'created_at' => Carbon::now(), 'updated_at' => Carbon::now()],
            ['id_charger' => 69, 'id_location' => 7, 'kode_perangkat' => 'CHG-L7-09', 'merek_model' => 'Delta UFC', 'kap_tot_kw' => 150.00, 'status_mesin' => 'Active', 'created_at' => Carbon::now(), 'updated_at' => Carbon::now()],
            ['id_charger' => 70, 'id_location' => 7, 'kode_perangkat' => 'CHG-L7-10', 'merek_model' => 'Tritium Veefil', 'kap_tot_kw' => 60.00, 'status_mesin' => 'Active', 'created_at' => Carbon::now(), 'updated_at' => Carbon::now()],

            ['id_charger' => 71, 'id_location' => 8, 'kode_perangkat' => 'CHG-L8-01', 'merek_model' => 'Siemens Sicharge', 'kap_tot_kw' => 150.00, 'status_mesin' => 'Active', 'created_at' => Carbon::now(), 'updated_at' => Carbon::now()],
            ['id_charger' => 72, 'id_location' => 8, 'kode_perangkat' => 'CHG-L8-02', 'merek_model' => 'ABB Terra 184', 'kap_tot_kw' => 120.00, 'status_mesin' => 'Maintenance', 'created_at' => Carbon::now(), 'updated_at' => Carbon::now()],
            ['id_charger' => 73, 'id_location' => 8, 'kode_perangkat' => 'CHG-L8-03', 'merek_model' => 'Schneider EVlink', 'kap_tot_kw' => 100.00, 'status_mesin' => 'Active', 'created_at' => Carbon::now(), 'updated_at' => Carbon::now()],
            ['id_charger' => 74, 'id_location' => 8, 'kode_perangkat' => 'CHG-L8-04', 'merek_model' => 'Delta UFC', 'kap_tot_kw' => 90.00, 'status_mesin' => 'Active', 'created_at' => Carbon::now(), 'updated_at' => Carbon::now()],
            ['id_charger' => 75, 'id_location' => 8, 'kode_perangkat' => 'CHG-L8-05', 'merek_model' => 'Tritium Veefil', 'kap_tot_kw' => 60.00, 'status_mesin' => 'Offline', 'created_at' => Carbon::now(), 'updated_at' => Carbon::now()],
            ['id_charger' => 76, 'id_location' => 8, 'kode_perangkat' => 'CHG-L8-06', 'merek_model' => 'ABB Terra 184', 'kap_tot_kw' => 180.00, 'status_mesin' => 'Active', 'created_at' => Carbon::now(), 'updated_at' => Carbon::now()],
            ['id_charger' => 77, 'id_location' => 8, 'kode_perangkat' => 'CHG-L8-07', 'merek_model' => 'Schneider EVlink', 'kap_tot_kw' => 100.00, 'status_mesin' => 'Active', 'created_at' => Carbon::now(), 'updated_at' => Carbon::now()],
            ['id_charger' => 78, 'id_location' => 8, 'kode_perangkat' => 'CHG-L8-08', 'merek_model' => 'Siemens Sicharge', 'kap_tot_kw' => 120.00, 'status_mesin' => 'Maintenance', 'created_at' => Carbon::now(), 'updated_at' => Carbon::now()],
            ['id_charger' => 79, 'id_location' => 8, 'kode_perangkat' => 'CHG-L8-09', 'merek_model' => 'Delta UFC', 'kap_tot_kw' => 150.00, 'status_mesin' => 'Active', 'created_at' => Carbon::now(), 'updated_at' => Carbon::now()],
            ['id_charger' => 80, 'id_location' => 8, 'kode_perangkat' => 'CHG-L8-10', 'merek_model' => 'Tritium Veefil', 'kap_tot_kw' => 60.00, 'status_mesin' => 'Active', 'created_at' => Carbon::now(), 'updated_at' => Carbon::now()],

            ['id_charger' => 81, 'id_location' => 9, 'kode_perangkat' => 'CHG-L9-01', 'merek_model' => 'Delta UFC', 'kap_tot_kw' => 150.00, 'status_mesin' => 'Maintenance', 'created_at' => Carbon::now(), 'updated_at' => Carbon::now()],
            ['id_charger' => 82, 'id_location' => 9, 'kode_perangkat' => 'CHG-L9-02', 'merek_model' => 'ABB Terra 184', 'kap_tot_kw' => 120.00, 'status_mesin' => 'Maintenance', 'created_at' => Carbon::now(), 'updated_at' => Carbon::now()],
            ['id_charger' => 83, 'id_location' => 9, 'kode_perangkat' => 'CHG-L9-03', 'merek_model' => 'Schneider EVlink', 'kap_tot_kw' => 100.00, 'status_mesin' => 'Maintenance', 'created_at' => Carbon::now(), 'updated_at' => Carbon::now()],
            ['id_charger' => 84, 'id_location' => 9, 'kode_perangkat' => 'CHG-L9-04', 'merek_model' => 'Siemens Sicharge', 'kap_tot_kw' => 90.00, 'status_mesin' => 'Maintenance', 'created_at' => Carbon::now(), 'updated_at' => Carbon::now()],
            ['id_charger' => 85, 'id_location' => 9, 'kode_perangkat' => 'CHG-L9-05', 'merek_model' => 'Tritium Veefil', 'kap_tot_kw' => 60.00, 'status_mesin' => 'Maintenance', 'created_at' => Carbon::now(), 'updated_at' => Carbon::now()],
            ['id_charger' => 86, 'id_location' => 9, 'kode_perangkat' => 'CHG-L9-06', 'merek_model' => 'ABB Terra 184', 'kap_tot_kw' => 180.00, 'status_mesin' => 'Maintenance', 'created_at' => Carbon::now(), 'updated_at' => Carbon::now()],
            ['id_charger' => 87, 'id_location' => 9, 'kode_perangkat' => 'CHG-L9-07', 'merek_model' => 'Schneider EVlink', 'kap_tot_kw' => 100.00, 'status_mesin' => 'Maintenance', 'created_at' => Carbon::now(), 'updated_at' => Carbon::now()],
            ['id_charger' => 88, 'id_location' => 9, 'kode_perangkat' => 'CHG-L9-08', 'merek_model' => 'Siemens Sicharge', 'kap_tot_kw' => 120.00, 'status_mesin' => 'Maintenance', 'created_at' => Carbon::now(), 'updated_at' => Carbon::now()],
            ['id_charger' => 89, 'id_location' => 9, 'kode_perangkat' => 'CHG-L9-09', 'merek_model' => 'Delta UFC', 'kap_tot_kw' => 150.00, 'status_mesin' => 'Maintenance', 'created_at' => Carbon::now(), 'updated_at' => Carbon::now()],
            ['id_charger' => 90, 'id_location' => 9, 'kode_perangkat' => 'CHG-L9-10', 'merek_model' => 'Tritium Veefil', 'kap_tot_kw' => 60.00, 'status_mesin' => 'Maintenance', 'created_at' => Carbon::now(), 'updated_at' => Carbon::now()],

            ['id_charger' => 91, 'id_location' => 10, 'kode_perangkat' => 'CHG-L10-01', 'merek_model' => 'Tritium Veefil', 'kap_tot_kw' => 90.00, 'status_mesin' => 'Active', 'created_at' => Carbon::now(), 'updated_at' => Carbon::now()],
            ['id_charger' => 92, 'id_location' => 10, 'kode_perangkat' => 'CHG-L10-02', 'merek_model' => 'ABB Terra 184', 'kap_tot_kw' => 120.00, 'status_mesin' => 'Active', 'created_at' => Carbon::now(), 'updated_at' => Carbon::now()],
            ['id_charger' => 93, 'id_location' => 10, 'kode_perangkat' => 'CHG-L10-03', 'merek_model' => 'Schneider EVlink', 'kap_tot_kw' => 100.00, 'status_mesin' => 'Active', 'created_at' => Carbon::now(), 'updated_at' => Carbon::now()],
            ['id_charger' => 94, 'id_location' => 10, 'kode_perangkat' => 'CHG-L10-04', 'merek_model' => 'Siemens Sicharge', 'kap_tot_kw' => 150.00, 'status_mesin' => 'Offline', 'created_at' => Carbon::now(), 'updated_at' => Carbon::now()],
            ['id_charger' => 95, 'id_location' => 10, 'kode_perangkat' => 'CHG-L10-05', 'merek_model' => 'Delta UFC', 'kap_tot_kw' => 60.00, 'status_mesin' => 'Active', 'created_at' => Carbon::now(), 'updated_at' => Carbon::now()],
            ['id_charger' => 96, 'id_location' => 10, 'kode_perangkat' => 'CHG-L10-06', 'merek_model' => 'ABB Terra 184', 'kap_tot_kw' => 180.00, 'status_mesin' => 'Active', 'created_at' => Carbon::now(), 'updated_at' => Carbon::now()],
            ['id_charger' => 97, 'id_location' => 10, 'kode_perangkat' => 'CHG-L10-07', 'merek_model' => 'Schneider EVlink', 'kap_tot_kw' => 100.00, 'status_mesin' => 'Maintenance', 'created_at' => Carbon::now(), 'updated_at' => Carbon::now()],
            ['id_charger' => 98, 'id_location' => 10, 'kode_perangkat' => 'CHG-L10-08', 'merek_model' => 'Siemens Sicharge', 'kap_tot_kw' => 120.00, 'status_mesin' => 'Active', 'created_at' => Carbon::now(), 'updated_at' => Carbon::now()],
            ['id_charger' => 99, 'id_location' => 10, 'kode_perangkat' => 'CHG-L10-09', 'merek_model' => 'Delta UFC', 'kap_tot_kw' => 150.00, 'status_mesin' => 'Active', 'created_at' => Carbon::now(), 'updated_at' => Carbon::now()],
            ['id_charger' => 100, 'id_location' => 10, 'kode_perangkat' => 'CHG-L10-10', 'merek_model' => 'Tritium Veefil', 'kap_tot_kw' => 60.00, 'status_mesin' => 'Active', 'created_at' => Carbon::now(), 'updated_at' => Carbon::now()],
        ]);
    }
}