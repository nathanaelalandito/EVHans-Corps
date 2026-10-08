<?php

namespace Database\Seeders;

use App\Models\MetodePembayaran;
use Illuminate\Database\Seeder;

class PaymentMethodSeeder extends Seeder
{
    public function run(): void
    {
        collect(['Dompet Digital', 'Mandiri', 'OVO', 'BCA', 'BRI', 'BNI'])
            ->each(fn (string $name) => MetodePembayaran::firstOrCreate(
                ['nama_metode' => $name],
                ['biaya_layanan' => 0, 'status_metode' => 'aktif']
            ));
    }
}
