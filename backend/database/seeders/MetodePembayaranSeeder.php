<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use RuntimeException;

class MetodePembayaranSeeder extends Seeder
{
    public function run(): void
    {
        if (app()->environment('production')) {
            throw new RuntimeException('Demo payment method seeding is disabled in production.');
        }

        // Nama yang mengandung "VA" otomatis dianggap Virtual Account (tampil nomor VA, bukan QR).
        $metode = [
            ['nama_metode' => 'GoPay',   'tipe_metode' => 'ewallet', 'biaya_layanan' => 0],
            ['nama_metode' => 'DANA',    'tipe_metode' => 'ewallet', 'biaya_layanan' => 0],
            ['nama_metode' => 'VA BRI',  'tipe_metode' => 'va',      'biaya_layanan' => 0],
            ['nama_metode' => 'SeaBank', 'tipe_metode' => 'ewallet', 'biaya_layanan' => 0],
        ];

        foreach ($metode as $m) {
            DB::table('metode_pembayaran')->updateOrInsert(
                ['nama_metode' => $m['nama_metode']],
                [
                    'tipe_metode' => $m['tipe_metode'],
                    'biaya_layanan' => $m['biaya_layanan'],
                    'status_metode' => 'Aktif',
                    'created_at' => now(),
                    'updated_at' => now(),
                ]
            );
        }
    }
}
