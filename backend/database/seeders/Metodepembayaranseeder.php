<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

class MetodePembayaranSeeder extends Seeder
{
    public function run(): void
    {
        // Nama yang mengandung "VA" otomatis dianggap Virtual Account (tampil nomor VA, bukan QR).
        $metode = [
            ['nama_metode' => 'GoPay',   'biaya_layanan' => 0],
            ['nama_metode' => 'DANA',    'biaya_layanan' => 0],
            ['nama_metode' => 'VA BRI',  'biaya_layanan' => 0],
            ['nama_metode' => 'SeaBank', 'biaya_layanan' => 0],
        ];

        foreach ($metode as $m) {
            DB::table('metode_pembayaran')->updateOrInsert(
                ['nama_metode' => $m['nama_metode']],
                [
                    'biaya_layanan' => $m['biaya_layanan'],
                    'status_metode' => 'aktif',
                    'created_at'    => now(),
                    'updated_at'    => now(),
                ]
            );
        }
    }
}