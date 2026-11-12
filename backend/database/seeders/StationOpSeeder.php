<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use RuntimeException;

class StationOpSeeder extends Seeder
{
    /** Menugaskan operator aktif ke seluruh station demo secara idempotent. */
    public function run(): void
    {
        $operatorId = DB::table('users')
            ->where('peran', 'operator')
            ->where('status_akun', 'Aktif')
            ->orderBy('id_user')
            ->value('id_user');

        if (! $operatorId) {
            throw new RuntimeException('Seeder station membutuhkan minimal satu akun Operator aktif.');
        }

        foreach (StationSeeder::STATION_CODES as $stationCode) {
            $locationId = DB::table('location')
                ->where('kode_station', $stationCode)
                ->value('id_location');

            if (! $locationId) {
                continue;
            }

            DB::table('station_operators')->updateOrInsert(
                ['id_user' => $operatorId, 'id_location' => $locationId],
                ['updated_at' => now(), 'created_at' => now()],
            );
        }
    }
}
