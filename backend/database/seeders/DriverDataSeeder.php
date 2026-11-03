<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;

class DriverDataSeeder extends Seeder
{
    /**
     * Seed kendaraan dan saldo dompet awal untuk akun driver contoh.
     */
    public function run(): void
    {
        $idUser = 'DRV0000000001';
        $nomorPolisi = 'R 1234 AB';

        $vehicleExists = DB::table('vehicle')
            ->where('id_user', $idUser)
            ->where('nomor_polisi', $nomorPolisi)
            ->exists();

        if (! $vehicleExists) {
            DB::table('vehicle')->insert([
                'id_user' => $idUser,
                'merek' => 'Toyota',
                'model' => 'bZ4X',
                'nomor_polisi' => $nomorPolisi,
                'tipe_konektor' => 'ccs2',
                'kapasitas_baterai_kwh' => 71.4,
                'created_at' => now(),
                'updated_at' => now(),
            ]);
        }

        $walletExists = DB::table('dompet')->where('id_user', $idUser)->exists();

        if ($walletExists) {
            $wallet = DB::table('dompet')->where('id_user', $idUser)->first();

            $values = [
                'saldo' => 500000,
                'status_dompet' => 'Aktif',
                'updated_at' => now(),
            ];

            if ($wallet->pin_transaksi === null) {
                $values['pin_transaksi'] = Hash::make('123456');
            }

            DB::table('dompet')->where('id_user', $idUser)->update($values);
        } else {
            DB::table('dompet')->insert([
                'id_user' => $idUser,
                'saldo' => 500000,
                'pin_transaksi' => Hash::make('123456'),
                'status_dompet' => 'Aktif',
                'created_at' => now(),
                'updated_at' => now(),
            ]);
        }
    }
}
