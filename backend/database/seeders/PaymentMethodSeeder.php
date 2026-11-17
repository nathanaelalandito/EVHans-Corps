<?php

namespace Database\Seeders;

use App\Models\MetodePembayaran;
use Illuminate\Database\Seeder;
use RuntimeException;

class PaymentMethodSeeder extends Seeder
{
    public function run(): void
    {
        if (app()->environment('production')) {
            throw new RuntimeException('Demo payment method seeding is disabled in production.');
        }

        collect(['Dompet Digital', 'Mandiri', 'OVO', 'BCA', 'BRI', 'BNI'])
            ->each(fn (string $name) => MetodePembayaran::firstOrCreate(
                ['nama_metode' => $name],
                ['tipe_metode' => 'ewallet', 'biaya_layanan' => 0, 'status_metode' => 'Aktif']
            ));
    }
}
