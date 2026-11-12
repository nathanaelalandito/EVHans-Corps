<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use RuntimeException;

class StationOpSeeder extends Seeder
{
    /** Pemetaan 1-ke-1 operator demo ke satu stasiun lokasi kerja masing-masing. */
    public const STATION_OPERATOR_EMAILS = [
        'SPKLU-0001' => 'ops.lapangan@ops.ac.id',
        'SPKLU-0002' => 'ops.ambarrukmo@ops.ac.id',
        'SPKLU-0003' => 'ops.ugm@ops.ac.id',
        'SPKLU-0004' => 'ops.debritto@ops.ac.id',
        'SPKLU-0005' => 'ops.ukdw@ops.ac.id',
        'SPKLU-0006' => 'ops.golo@ops.ac.id',
        'SPKLU-0007' => 'ops.uii@ops.ac.id',
        'SPKLU-0008' => 'ops.pakuwon@ops.ac.id',
        'SPKLU-0009' => 'ops.hartono@ops.ac.id',
    ];

    /** Menugaskan setiap operator ke satu stasiun lokasi kerjanya secara idempotent. */
    public function run(): void
    {
        $assigned = 0;

        foreach (self::STATION_OPERATOR_EMAILS as $stationCode => $operatorEmail) {
            $locationId = DB::table('location')
                ->where('kode_station', $stationCode)
                ->value('id_location');

            $operatorId = DB::table('users')
                ->where('email', $operatorEmail)
                ->where('peran', 'operator')
                ->where('status_akun', 'Aktif')
                ->value('id_user');

            if (! $locationId || ! $operatorId) {
                continue;
            }

            // Pastikan operator hanya terikat pada satu stasiun tempat kerjanya.
            DB::table('station_operators')
                ->where('id_user', $operatorId)
                ->where('id_location', '!=', $locationId)
                ->delete();

            DB::table('station_operators')->updateOrInsert(
                ['id_user' => $operatorId, 'id_location' => $locationId],
                ['updated_at' => now(), 'created_at' => now()],
            );

            $assigned++;
        }

        if ($assigned === 0) {
            throw new RuntimeException('Seeder station membutuhkan minimal satu akun Operator aktif dan lokasi station.');
        }
    }
}
