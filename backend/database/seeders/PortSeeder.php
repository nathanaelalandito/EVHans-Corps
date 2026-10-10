<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use Carbon\Carbon;

class PortSeeder extends Seeder
{
    public function run()
    {
        DB::table('ports')->insert([
            // ==========================================
            // ID Charger 11 (10 Port)
            // ==========================================
            ['id_charger' => 11, 'nomor_port' => 'Port 1', 'tipe_konektor' => 'CCS2', 'tipe_charging' => 'DC', 'daya_maks_kw' => 50.00, 'status_port' => 'Available', 'created_at' => Carbon::now(), 'updated_at' => Carbon::now()],
            ['id_charger' => 11, 'nomor_port' => 'Port 2', 'tipe_konektor' => 'Type 2', 'tipe_charging' => 'AC', 'daya_maks_kw' => 22.00, 'status_port' => 'Charging', 'created_at' => Carbon::now(), 'updated_at' => Carbon::now()],
            ['id_charger' => 11, 'nomor_port' => 'Port 3', 'tipe_konektor' => 'CHAdeMO', 'tipe_charging' => 'DC', 'daya_maks_kw' => 60.00, 'status_port' => 'Available', 'created_at' => Carbon::now(), 'updated_at' => Carbon::now()],
            ['id_charger' => 11, 'nomor_port' => 'Port 4', 'tipe_konektor' => 'GB/T', 'tipe_charging' => 'DC', 'daya_maks_kw' => 100.00, 'status_port' => 'Out of Order', 'created_at' => Carbon::now(), 'updated_at' => Carbon::now()],
            ['id_charger' => 11, 'nomor_port' => 'Port 5', 'tipe_konektor' => 'Type 1', 'tipe_charging' => 'AC', 'daya_maks_kw' => 7.40, 'status_port' => 'Available', 'created_at' => Carbon::now(), 'updated_at' => Carbon::now()],
            ['id_charger' => 11, 'nomor_port' => 'Port 6', 'tipe_konektor' => 'CCS2', 'tipe_charging' => 'DC', 'daya_maks_kw' => 50.00, 'status_port' => 'Available', 'created_at' => Carbon::now(), 'updated_at' => Carbon::now()],
            ['id_charger' => 11, 'nomor_port' => 'Port 7', 'tipe_konektor' => 'Type 2', 'tipe_charging' => 'AC', 'daya_maks_kw' => 22.00, 'status_port' => 'Available', 'created_at' => Carbon::now(), 'updated_at' => Carbon::now()],
            ['id_charger' => 11, 'nomor_port' => 'Port 8', 'tipe_konektor' => 'CHAdeMO', 'tipe_charging' => 'DC', 'daya_maks_kw' => 60.00, 'status_port' => 'Charging', 'created_at' => Carbon::now(), 'updated_at' => Carbon::now()],
            ['id_charger' => 11, 'nomor_port' => 'Port 9', 'tipe_konektor' => 'GB/T', 'tipe_charging' => 'DC', 'daya_maks_kw' => 100.00, 'status_port' => 'Available', 'created_at' => Carbon::now(), 'updated_at' => Carbon::now()],
            ['id_charger' => 11, 'nomor_port' => 'Port 10', 'tipe_konektor' => 'Type 1', 'tipe_charging' => 'AC', 'daya_maks_kw' => 7.40, 'status_port' => 'Maintenance', 'created_at' => Carbon::now(), 'updated_at' => Carbon::now()],

            // ==========================================
            // ID Charger 12 (10 Port)
            // ==========================================
            ['id_charger' => 12, 'nomor_port' => 'Port 1', 'tipe_konektor' => 'CCS2', 'tipe_charging' => 'DC', 'daya_maks_kw' => 120.00, 'status_port' => 'Available', 'created_at' => Carbon::now(), 'updated_at' => Carbon::now()],
            ['id_charger' => 12, 'nomor_port' => 'Port 2', 'tipe_konektor' => 'Type 2', 'tipe_charging' => 'AC', 'daya_maks_kw' => 22.00, 'status_port' => 'Available', 'created_at' => Carbon::now(), 'updated_at' => Carbon::now()],
            ['id_charger' => 12, 'nomor_port' => 'Port 3', 'tipe_konektor' => 'CHAdeMO', 'tipe_charging' => 'DC', 'daya_maks_kw' => 50.00, 'status_port' => 'Charging', 'created_at' => Carbon::now(), 'updated_at' => Carbon::now()],
            ['id_charger' => 12, 'nomor_port' => 'Port 4', 'tipe_konektor' => 'GB/T', 'tipe_charging' => 'DC', 'daya_maks_kw' => 90.00, 'status_port' => 'Available', 'created_at' => Carbon::now(), 'updated_at' => Carbon::now()],
            ['id_charger' => 12, 'nomor_port' => 'Port 5', 'tipe_konektor' => 'Type 1', 'tipe_charging' => 'AC', 'daya_maks_kw' => 7.40, 'status_port' => 'Out of Order', 'created_at' => Carbon::now(), 'updated_at' => Carbon::now()],
            ['id_charger' => 12, 'nomor_port' => 'Port 6', 'tipe_konektor' => 'CCS2', 'tipe_charging' => 'DC', 'daya_maks_kw' => 120.00, 'status_port' => 'Available', 'created_at' => Carbon::now(), 'updated_at' => Carbon::now()],
            ['id_charger' => 12, 'nomor_port' => 'Port 7', 'tipe_konektor' => 'Type 2', 'tipe_charging' => 'AC', 'daya_maks_kw' => 22.00, 'status_port' => 'Charging', 'created_at' => Carbon::now(), 'updated_at' => Carbon::now()],
            ['id_charger' => 12, 'nomor_port' => 'Port 8', 'tipe_konektor' => 'CHAdeMO', 'tipe_charging' => 'DC', 'daya_maks_kw' => 50.00, 'status_port' => 'Maintenance', 'created_at' => Carbon::now(), 'updated_at' => Carbon::now()],
            ['id_charger' => 12, 'nomor_port' => 'Port 9', 'tipe_konektor' => 'GB/T', 'tipe_charging' => 'DC', 'daya_maks_kw' => 90.00, 'status_port' => 'Available', 'created_at' => Carbon::now(), 'updated_at' => Carbon::now()],
            ['id_charger' => 12, 'nomor_port' => 'Port 10', 'tipe_konektor' => 'Type 1', 'tipe_charging' => 'AC', 'daya_maks_kw' => 7.40, 'status_port' => 'Available', 'created_at' => Carbon::now(), 'updated_at' => Carbon::now()],

            // ==========================================
            // ID Charger 13 (10 Port)
            // ==========================================
            ['id_charger' => 13, 'nomor_port' => 'Port 1', 'tipe_konektor' => 'CCS2', 'tipe_charging' => 'DC', 'daya_maks_kw' => 100.00, 'status_port' => 'Charging', 'created_at' => Carbon::now(), 'updated_at' => Carbon::now()],
            ['id_charger' => 13, 'nomor_port' => 'Port 2', 'tipe_konektor' => 'Type 2', 'tipe_charging' => 'AC', 'daya_maks_kw' => 22.00, 'status_port' => 'Available', 'created_at' => Carbon::now(), 'updated_at' => Carbon::now()],
            ['id_charger' => 13, 'nomor_port' => 'Port 3', 'tipe_konektor' => 'CHAdeMO', 'tipe_charging' => 'DC', 'daya_maks_kw' => 60.00, 'status_port' => 'Available', 'created_at' => Carbon::now(), 'updated_at' => Carbon::now()],
            ['id_charger' => 13, 'nomor_port' => 'Port 4', 'tipe_konektor' => 'GB/T', 'tipe_charging' => 'DC', 'daya_maks_kw' => 100.00, 'status_port' => 'Out of Order', 'created_at' => Carbon::now(), 'updated_at' => Carbon::now()],
            ['id_charger' => 13, 'nomor_port' => 'Port 5', 'tipe_konektor' => 'Type 1', 'tipe_charging' => 'AC', 'daya_maks_kw' => 7.40, 'status_port' => 'Available', 'created_at' => Carbon::now(), 'updated_at' => Carbon::now()],
            ['id_charger' => 13, 'nomor_port' => 'Port 6', 'tipe_konektor' => 'CCS2', 'tipe_charging' => 'DC', 'daya_maks_kw' => 100.00, 'status_port' => 'Available', 'created_at' => Carbon::now(), 'updated_at' => Carbon::now()],
            ['id_charger' => 13, 'nomor_port' => 'Port 7', 'tipe_konektor' => 'Type 2', 'tipe_charging' => 'AC', 'daya_maks_kw' => 22.00, 'status_port' => 'Charging', 'created_at' => Carbon::now(), 'updated_at' => Carbon::now()],
            ['id_charger' => 13, 'nomor_port' => 'Port 8', 'tipe_konektor' => 'CHAdeMO', 'tipe_charging' => 'DC', 'daya_maks_kw' => 60.00, 'status_port' => 'Available', 'created_at' => Carbon::now(), 'updated_at' => Carbon::now()],
            ['id_charger' => 13, 'nomor_port' => 'Port 9', 'tipe_konektor' => 'GB/T', 'tipe_charging' => 'DC', 'daya_maks_kw' => 100.00, 'status_port' => 'Maintenance', 'created_at' => Carbon::now(), 'updated_at' => Carbon::now()],
            ['id_charger' => 13, 'nomor_port' => 'Port 10', 'tipe_konektor' => 'Type 1', 'tipe_charging' => 'AC', 'daya_maks_kw' => 7.40, 'status_port' => 'Available', 'created_at' => Carbon::now(), 'updated_at' => Carbon::now()],

            // ==========================================
            // ID Charger 14 (10 Port)
            // ==========================================
            ['id_charger' => 14, 'nomor_port' => 'Port 1', 'tipe_konektor' => 'CCS2', 'tipe_charging' => 'DC', 'daya_maks_kw' => 90.00, 'status_port' => 'Available', 'created_at' => Carbon::now(), 'updated_at' => Carbon::now()],
            ['id_charger' => 14, 'nomor_port' => 'Port 2', 'tipe_konektor' => 'Type 2', 'tipe_charging' => 'AC', 'daya_maks_kw' => 22.00, 'status_port' => 'Available', 'created_at' => Carbon::now(), 'updated_at' => Carbon::now()],
            ['id_charger' => 14, 'nomor_port' => 'Port 3', 'tipe_konektor' => 'CHAdeMO', 'tipe_charging' => 'DC', 'daya_maks_kw' => 50.00, 'status_port' => 'Charging', 'created_at' => Carbon::now(), 'updated_at' => Carbon::now()],
            ['id_charger' => 14, 'nomor_port' => 'Port 4', 'tipe_konektor' => 'GB/T', 'tipe_charging' => 'DC', 'daya_maks_kw' => 90.00, 'status_port' => 'Available', 'created_at' => Carbon::now(), 'updated_at' => Carbon::now()],
            ['id_charger' => 14, 'nomor_port' => 'Port 5', 'tipe_konektor' => 'Type 1', 'tipe_charging' => 'AC', 'daya_maks_kw' => 7.40, 'status_port' => 'Out of Order', 'created_at' => Carbon::now(), 'updated_at' => Carbon::now()],
            ['id_charger' => 14, 'nomor_port' => 'Port 6', 'tipe_konektor' => 'CCS2', 'tipe_charging' => 'DC', 'daya_maks_kw' => 90.00, 'status_port' => 'Available', 'created_at' => Carbon::now(), 'updated_at' => Carbon::now()],
            ['id_charger' => 14, 'nomor_port' => 'Port 7', 'tipe_konektor' => 'Type 2', 'tipe_charging' => 'AC', 'daya_maks_kw' => 22.00, 'status_port' => 'Available', 'created_at' => Carbon::now(), 'updated_at' => Carbon::now()],
            ['id_charger' => 14, 'nomor_port' => 'Port 8', 'tipe_konektor' => 'CHAdeMO', 'tipe_charging' => 'DC', 'daya_maks_kw' => 50.00, 'status_port' => 'Charging', 'created_at' => Carbon::now(), 'updated_at' => Carbon::now()],
            ['id_charger' => 14, 'nomor_port' => 'Port 9', 'tipe_konektor' => 'GB/T', 'tipe_charging' => 'DC', 'daya_maks_kw' => 90.00, 'status_port' => 'Available', 'created_at' => Carbon::now(), 'updated_at' => Carbon::now()],
            ['id_charger' => 14, 'nomor_port' => 'Port 10', 'tipe_konektor' => 'Type 1', 'tipe_charging' => 'AC', 'daya_maks_kw' => 7.40, 'status_port' => 'Maintenance', 'created_at' => Carbon::now(), 'updated_at' => Carbon::now()],

            // ==========================================
            // ID Charger 15 (10 Port)
            // ==========================================
            ['id_charger' => 15, 'nomor_port' => 'Port 1', 'tipe_konektor' => 'CCS2', 'tipe_charging' => 'DC', 'daya_maks_kw' => 60.00, 'status_port' => 'Available', 'created_at' => Carbon::now(), 'updated_at' => Carbon::now()],
            ['id_charger' => 15, 'nomor_port' => 'Port 2', 'tipe_konektor' => 'Type 2', 'tipe_charging' => 'AC', 'daya_maks_kw' => 22.00, 'status_port' => 'Out of Order', 'created_at' => Carbon::now(), 'updated_at' => Carbon::now()],
            ['id_charger' => 15, 'nomor_port' => 'Port 3', 'tipe_konektor' => 'CHAdeMO', 'tipe_charging' => 'DC', 'daya_maks_kw' => 60.00, 'status_port' => 'Available', 'created_at' => Carbon::now(), 'updated_at' => Carbon::now()],
            ['id_charger' => 15, 'nomor_port' => 'Port 4', 'tipe_konektor' => 'GB/T', 'tipe_charging' => 'DC', 'daya_maks_kw' => 60.00, 'status_port' => 'Charging', 'created_at' => Carbon::now(), 'updated_at' => Carbon::now()],
            ['id_charger' => 15, 'nomor_port' => 'Port 5', 'tipe_konektor' => 'Type 1', 'tipe_charging' => 'AC', 'daya_maks_kw' => 7.40, 'status_port' => 'Available', 'created_at' => Carbon::now(), 'updated_at' => Carbon::now()],
            ['id_charger' => 15, 'nomor_port' => 'Port 6', 'tipe_konektor' => 'CCS2', 'tipe_charging' => 'DC', 'daya_maks_kw' => 60.00, 'status_port' => 'Maintenance', 'created_at' => Carbon::now(), 'updated_at' => Carbon::now()],
            ['id_charger' => 15, 'nomor_port' => 'Port 7', 'tipe_konektor' => 'Type 2', 'tipe_charging' => 'AC', 'daya_maks_kw' => 22.00, 'status_port' => 'Available', 'created_at' => Carbon::now(), 'updated_at' => Carbon::now()],
            ['id_charger' => 15, 'nomor_port' => 'Port 8', 'tipe_konektor' => 'CHAdeMO', 'tipe_charging' => 'DC', 'daya_maks_kw' => 60.00, 'status_port' => 'Charging', 'created_at' => Carbon::now(), 'updated_at' => Carbon::now()],
            ['id_charger' => 15, 'nomor_port' => 'Port 9', 'tipe_konektor' => 'GB/T', 'tipe_charging' => 'DC', 'daya_maks_kw' => 60.00, 'status_port' => 'Available', 'created_at' => Carbon::now(), 'updated_at' => Carbon::now()],
            ['id_charger' => 15, 'nomor_port' => 'Port 10', 'tipe_konektor' => 'Type 1', 'tipe_charging' => 'AC', 'daya_maks_kw' => 7.40, 'status_port' => 'Available', 'created_at' => Carbon::now(), 'updated_at' => Carbon::now()],

            // ==========================================
            // ID Charger 16 (10 Port)
            // ==========================================
            ['id_charger' => 16, 'nomor_port' => 'Port 1', 'tipe_konektor' => 'CCS2', 'tipe_charging' => 'DC', 'daya_maks_kw' => 180.00, 'status_port' => 'Available', 'created_at' => Carbon::now(), 'updated_at' => Carbon::now()],
            ['id_charger' => 16, 'nomor_port' => 'Port 2', 'tipe_konektor' => 'Type 2', 'tipe_charging' => 'AC', 'daya_maks_kw' => 22.00, 'status_port' => 'Charging', 'created_at' => Carbon::now(), 'updated_at' => Carbon::now()],
            ['id_charger' => 16, 'nomor_port' => 'Port 3', 'tipe_konektor' => 'CHAdeMO', 'tipe_charging' => 'DC', 'daya_maks_kw' => 100.00, 'status_port' => 'Available', 'created_at' => Carbon::now(), 'updated_at' => Carbon::now()],
            ['id_charger' => 16, 'nomor_port' => 'Port 4', 'tipe_konektor' => 'GB/T', 'tipe_charging' => 'DC', 'daya_maks_kw' => 150.00, 'status_port' => 'Available', 'created_at' => Carbon::now(), 'updated_at' => Carbon::now()],
            ['id_charger' => 16, 'nomor_port' => 'Port 5', 'tipe_konektor' => 'Type 1', 'tipe_charging' => 'AC', 'daya_maks_kw' => 7.40, 'status_port' => 'Out of Order', 'created_at' => Carbon::now(), 'updated_at' => Carbon::now()],
            ['id_charger' => 16, 'nomor_port' => 'Port 6', 'tipe_konektor' => 'CCS2', 'tipe_charging' => 'DC', 'daya_maks_kw' => 180.00, 'status_port' => 'Reserved', 'created_at' => Carbon::now(), 'updated_at' => Carbon::now()],
            ['id_charger' => 16, 'nomor_port' => 'Port 7', 'tipe_konektor' => 'Type 2', 'tipe_charging' => 'AC', 'daya_maks_kw' => 22.00, 'status_port' => 'Available', 'created_at' => Carbon::now(), 'updated_at' => Carbon::now()],
            ['id_charger' => 16, 'nomor_port' => 'Port 8', 'tipe_konektor' => 'CHAdeMO', 'tipe_charging' => 'DC', 'daya_maks_kw' => 100.00, 'status_port' => 'Charging', 'created_at' => Carbon::now(), 'updated_at' => Carbon::now()],
            ['id_charger' => 16, 'nomor_port' => 'Port 9', 'tipe_konektor' => 'GB/T', 'tipe_charging' => 'DC', 'daya_maks_kw' => 150.00, 'status_port' => 'Available', 'created_at' => Carbon::now(), 'updated_at' => Carbon::now()],
            ['id_charger' => 16, 'nomor_port' => 'Port 10', 'tipe_konektor' => 'Type 1', 'tipe_charging' => 'AC', 'daya_maks_kw' => 7.40, 'status_port' => 'Maintenance', 'created_at' => Carbon::now(), 'updated_at' => Carbon::now()],

            // ==========================================
            // ID Charger 17 (10 Port)
            // ==========================================
            ['id_charger' => 17, 'nomor_port' => 'Port 1', 'tipe_konektor' => 'CCS2', 'tipe_charging' => 'DC', 'daya_maks_kw' => 100.00, 'status_port' => 'Available', 'created_at' => Carbon::now(), 'updated_at' => Carbon::now()],
            ['id_charger' => 17, 'nomor_port' => 'Port 2', 'tipe_konektor' => 'Type 2', 'tipe_charging' => 'AC', 'daya_maks_kw' => 22.00, 'status_port' => 'Available', 'created_at' => Carbon::now(), 'updated_at' => Carbon::now()],
            ['id_charger' => 17, 'nomor_port' => 'Port 3', 'tipe_konektor' => 'CHAdeMO', 'tipe_charging' => 'DC', 'daya_maks_kw' => 60.00, 'status_port' => 'Charging', 'created_at' => Carbon::now(), 'updated_at' => Carbon::now()],
            ['id_charger' => 17, 'nomor_port' => 'Port 4', 'tipe_konektor' => 'GB/T', 'tipe_charging' => 'DC', 'daya_maks_kw' => 100.00, 'status_port' => 'Available', 'created_at' => Carbon::now(), 'updated_at' => Carbon::now()],
            ['id_charger' => 17, 'nomor_port' => 'Port 5', 'tipe_konektor' => 'Type 1', 'tipe_charging' => 'AC', 'daya_maks_kw' => 7.40, 'status_port' => 'Out of Order', 'created_at' => Carbon::now(), 'updated_at' => Carbon::now()],
            ['id_charger' => 17, 'nomor_port' => 'Port 6', 'tipe_konektor' => 'CCS2', 'tipe_charging' => 'DC', 'daya_maks_kw' => 100.00, 'status_port' => 'Maintenance', 'created_at' => Carbon::now(), 'updated_at' => Carbon::now()],
            ['id_charger' => 17, 'nomor_port' => 'Port 7', 'tipe_konektor' => 'Type 2', 'tipe_charging' => 'AC', 'daya_maks_kw' => 22.00, 'status_port' => 'Available', 'created_at' => Carbon::now(), 'updated_at' => Carbon::now()],
            ['id_charger' => 17, 'nomor_port' => 'Port 8', 'tipe_konektor' => 'CHAdeMO', 'tipe_charging' => 'DC', 'daya_maks_kw' => 60.00, 'status_port' => 'Charging', 'created_at' => Carbon::now(), 'updated_at' => Carbon::now()],
            ['id_charger' => 17, 'nomor_port' => 'Port 9', 'tipe_konektor' => 'GB/T', 'tipe_charging' => 'DC', 'daya_maks_kw' => 100.00, 'status_port' => 'Available', 'created_at' => Carbon::now(), 'updated_at' => Carbon::now()],
            ['id_charger' => 17, 'nomor_port' => 'Port 10', 'tipe_konektor' => 'Type 1', 'tipe_charging' => 'AC', 'daya_maks_kw' => 7.40, 'status_port' => 'Reserved', 'created_at' => Carbon::now(), 'updated_at' => Carbon::now()],

            // ==========================================
            // ID Charger 18 (10 Port)
            // ==========================================
            ['id_charger' => 18, 'nomor_port' => 'Port 1', 'tipe_konektor' => 'CCS2', 'tipe_charging' => 'DC', 'daya_maks_kw' => 120.00, 'status_port' => 'Charging', 'created_at' => Carbon::now(), 'updated_at' => Carbon::now()],
            ['id_charger' => 18, 'nomor_port' => 'Port 2', 'tipe_konektor' => 'Type 2', 'tipe_charging' => 'AC', 'daya_maks_kw' => 22.00, 'status_port' => 'Available', 'created_at' => Carbon::now(), 'updated_at' => Carbon::now()],
            ['id_charger' => 18, 'nomor_port' => 'Port 3', 'tipe_konektor' => 'CHAdeMO', 'tipe_charging' => 'DC', 'daya_maks_kw' => 50.00, 'status_port' => 'Available', 'created_at' => Carbon::now(), 'updated_at' => Carbon::now()],
            ['id_charger' => 18, 'nomor_port' => 'Port 4', 'tipe_konektor' => 'GB/T', 'tipe_charging' => 'DC', 'daya_maks_kw' => 90.00, 'status_port' => 'Out of Order', 'created_at' => Carbon::now(), 'updated_at' => Carbon::now()],
            ['id_charger' => 18, 'nomor_port' => 'Port 5', 'tipe_konektor' => 'Type 1', 'tipe_charging' => 'AC', 'daya_maks_kw' => 7.40, 'status_port' => 'Available', 'created_at' => Carbon::now(), 'updated_at' => Carbon::now()],
            ['id_charger' => 18, 'nomor_port' => 'Port 6', 'tipe_konektor' => 'CCS2', 'tipe_charging' => 'DC', 'daya_maks_kw' => 120.00, 'status_port' => 'Reserved', 'created_at' => Carbon::now(), 'updated_at' => Carbon::now()],
            ['id_charger' => 18, 'nomor_port' => 'Port 7', 'tipe_konektor' => 'Type 2', 'tipe_charging' => 'AC', 'daya_maks_kw' => 22.00, 'status_port' => 'Charging', 'created_at' => Carbon::now(), 'updated_at' => Carbon::now()],
            ['id_charger' => 18, 'nomor_port' => 'Port 8', 'tipe_konektor' => 'CHAdeMO', 'tipe_charging' => 'DC', 'daya_maks_kw' => 50.00, 'status_port' => 'Available', 'created_at' => Carbon::now(), 'updated_at' => Carbon::now()],
            ['id_charger' => 18, 'nomor_port' => 'Port 9', 'tipe_konektor' => 'GB/T', 'tipe_charging' => 'DC', 'daya_maks_kw' => 90.00, 'status_port' => 'Available', 'created_at' => Carbon::now(), 'updated_at' => Carbon::now()],
            ['id_charger' => 18, 'nomor_port' => 'Port 10', 'tipe_konektor' => 'Type 1', 'tipe_charging' => 'AC', 'daya_maks_kw' => 7.40, 'status_port' => 'Maintenance', 'created_at' => Carbon::now(), 'updated_at' => Carbon::now()],

            // ==========================================
            // ID Charger 19 (10 Port)
            // ==========================================
            ['id_charger' => 19, 'nomor_port' => 'Port 1', 'tipe_konektor' => 'CCS2', 'tipe_charging' => 'DC', 'daya_maks_kw' => 150.00, 'status_port' => 'Available', 'created_at' => Carbon::now(), 'updated_at' => Carbon::now()],
            ['id_charger' => 19, 'nomor_port' => 'Port 2', 'tipe_konektor' => 'Type 2', 'tipe_charging' => 'AC', 'daya_maks_kw' => 22.00, 'status_port' => 'Charging', 'created_at' => Carbon::now(), 'updated_at' => Carbon::now()],
            ['id_charger' => 19, 'nomor_port' => 'Port 3', 'tipe_konektor' => 'CHAdeMO', 'tipe_charging' => 'DC', 'daya_maks_kw' => 80.00, 'status_port' => 'Available', 'created_at' => Carbon::now(), 'updated_at' => Carbon::now()],
            ['id_charger' => 19, 'nomor_port' => 'Port 4', 'tipe_konektor' => 'GB/T', 'tipe_charging' => 'DC', 'daya_maks_kw' => 120.00, 'status_port' => 'Available', 'created_at' => Carbon::now(), 'updated_at' => Carbon::now()],
            ['id_charger' => 19, 'nomor_port' => 'Port 5', 'tipe_konektor' => 'Type 1', 'tipe_charging' => 'AC', 'daya_maks_kw' => 7.40, 'status_port' => 'Out of Order', 'created_at' => Carbon::now(), 'updated_at' => Carbon::now()],
            ['id_charger' => 19, 'nomor_port' => 'Port 6', 'tipe_konektor' => 'CCS2', 'tipe_charging' => 'DC', 'daya_maks_kw' => 150.00, 'status_port' => 'Available', 'created_at' => Carbon::now(), 'updated_at' => Carbon::now()],
            ['id_charger' => 19, 'nomor_port' => 'Port 7', 'tipe_konektor' => 'Type 2', 'tipe_charging' => 'AC', 'daya_maks_kw' => 22.00, 'status_port' => 'Available', 'created_at' => Carbon::now(), 'updated_at' => Carbon::now()],
            ['id_charger' => 19, 'nomor_port' => 'Port 8', 'tipe_konektor' => 'CHAdeMO', 'tipe_charging' => 'DC', 'daya_maks_kw' => 80.00, 'status_port' => 'Charging', 'created_at' => Carbon::now(), 'updated_at' => Carbon::now()],
            ['id_charger' => 19, 'nomor_port' => 'Port 9', 'tipe_konektor' => 'GB/T', 'tipe_charging' => 'DC', 'daya_maks_kw' => 120.00, 'status_port' => 'Available', 'created_at' => Carbon::now(), 'updated_at' => Carbon::now()],
            ['id_charger' => 19, 'nomor_port' => 'Port 10', 'tipe_konektor' => 'Type 1', 'tipe_charging' => 'AC', 'daya_maks_kw' => 7.40, 'status_port' => 'Available', 'created_at' => Carbon::now(), 'updated_at' => Carbon::now()],

            // ==========================================
            // ID Charger 20 (10 Port)
            // ==========================================
            ['id_charger' => 20, 'nomor_port' => 'Port 1', 'tipe_konektor' => 'CCS2', 'tipe_charging' => 'DC', 'daya_maks_kw' => 60.00, 'status_port' => 'Available', 'created_at' => Carbon::now(), 'updated_at' => Carbon::now()],
            ['id_charger' => 20, 'nomor_port' => 'Port 2', 'tipe_konektor' => 'Type 2', 'tipe_charging' => 'AC', 'daya_maks_kw' => 22.00, 'status_port' => 'Available', 'created_at' => Carbon::now(), 'updated_at' => Carbon::now()],
            ['id_charger' => 20, 'nomor_port' => 'Port 3', 'tipe_konektor' => 'CHAdeMO', 'tipe_charging' => 'DC', 'daya_maks_kw' => 40.00, 'status_port' => 'Charging', 'created_at' => Carbon::now(), 'updated_at' => Carbon::now()],
            ['id_charger' => 20, 'nomor_port' => 'Port 4', 'tipe_konektor' => 'GB/T', 'tipe_charging' => 'DC', 'daya_maks_kw' => 60.00, 'status_port' => 'Out of Order', 'created_at' => Carbon::now(), 'updated_at' => Carbon::now()],
            ['id_charger' => 20, 'nomor_port' => 'Port 5', 'tipe_konektor' => 'Type 1', 'tipe_charging' => 'AC', 'daya_maks_kw' => 7.40, 'status_port' => 'Available', 'created_at' => Carbon::now(), 'updated_at' => Carbon::now()],
            ['id_charger' => 20, 'nomor_port' => 'Port 6', 'tipe_konektor' => 'CCS2', 'tipe_charging' => 'DC', 'daya_maks_kw' => 60.00, 'status_port' => 'Available', 'created_at' => Carbon::now(), 'updated_at' => Carbon::now()],
            ['id_charger' => 20, 'nomor_port' => 'Port 7', 'tipe_konektor' => 'Type 2', 'tipe_charging' => 'AC', 'daya_maks_kw' => 22.00, 'status_port' => 'Charging', 'created_at' => Carbon::now(), 'updated_at' => Carbon::now()],
            ['id_charger' => 20, 'nomor_port' => 'Port 8', 'tipe_konektor' => 'CHAdeMO', 'tipe_charging' => 'DC', 'daya_maks_kw' => 40.00, 'status_port' => 'Available', 'created_at' => Carbon::now(), 'updated_at' => Carbon::now()],
            ['id_charger' => 20, 'nomor_port' => 'Port 9', 'tipe_konektor' => 'GB/T', 'tipe_charging' => 'DC', 'daya_maks_kw' => 60.00, 'status_port' => 'Available', 'created_at' => Carbon::now(), 'updated_at' => Carbon::now()],
            ['id_charger' => 20, 'nomor_port' => 'Port 10', 'tipe_konektor' => 'Type 1', 'tipe_charging' => 'AC', 'daya_maks_kw' => 7.40, 'status_port' => 'Available', 'created_at' => Carbon::now(), 'updated_at' => Carbon::now()],
        ]);
    }
}