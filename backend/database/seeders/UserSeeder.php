<?php

namespace Database\Seeders;

use Carbon\Carbon;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;

class UserSeeder extends Seeder
{
    public function run(): void
    {
        $users = [
            [
                'email' => 'budi.driver@ac.id',
                'peran' => 'driver',
                'status_akun' => 'Aktif',
                'nama_lengkap' => 'Budi Santoso',
                'nomor_telepon' => '081234567890',
                'alamat' => 'Jl. Merdeka No. 10, Purwokerto',
                'tanggal_lahir' => '1995-03-12',
            ],
            [
                'email' => 'siti.driver@ac.id',
                'peran' => 'driver',
                'status_akun' => 'Aktif',
                'nama_lengkap' => 'Siti Rahmawati',
                'nomor_telepon' => '081298765432',
                'alamat' => 'Jl. Sudirman No. 25, Purwokerto',
                'tanggal_lahir' => '1998-07-20',
            ],
            [
                'email' => 'agus.driver@ac.id',
                'peran' => 'driver',
                'status_akun' => 'Nonaktif',
                'nama_lengkap' => 'Agus Setiawan',
                'nomor_telepon' => '081356789012',
                'alamat' => 'Jl. Gatot Subroto No. 5, Purwokerto',
                'tanggal_lahir' => '1990-11-02',
            ],
            [
                'email' => 'admin.utama@admin.ac.id',
                'peran' => 'admin',
                'status_akun' => 'Aktif',
                'nama_lengkap' => 'Ahmad Fauzi',
                'nomor_telepon' => '081411223344',
                'alamat' => 'Jl. Ahmad Yani No. 1, Purwokerto',
                'tanggal_lahir' => '1988-01-15',
            ],
            [
                'email' => 'ops.lapangan@ops.ac.id',
                'peran' => 'operator',
                'status_akun' => 'Aktif',
                'nama_lengkap' => 'Dewi Lestari',
                'nomor_telepon' => '081533445566',
                'alamat' => 'Jl. Dr. Angka No. 8, Purwokerto',
                'tanggal_lahir' => '1993-09-30',
            ],
            [
                'email' => 'joko.driver@ac.id',
                'peran' => 'driver',
                'status_akun' => 'Suspend',
                'nama_lengkap' => 'Joko Prasetyo',
                'nomor_telepon' => '081699887766',
                'alamat' => null,
                'tanggal_lahir' => '2000-05-18',
            ],
            [
                'email' => 'rina.driver@ac.id',
                'peran' => 'driver',
                'status_akun' => 'Banned',
                'nama_lengkap' => 'Rina Amelia',
                'nomor_telepon' => '081777889900',
                'alamat' => 'Jl. Veteran No. 12, Purwokerto',
                'tanggal_lahir' => '1996-12-25',
            ],
            [
                'email' => 'ops.ambarrukmo@ops.ac.id',
                'peran' => 'operator',
                'status_akun' => 'Aktif',
                'nama_lengkap' => 'Rizky Pratama',
                'nomor_telepon' => '081544556601',
                'alamat' => 'Jl. Laksda Adisucipto No. 80, Sleman',
                'tanggal_lahir' => '1994-02-14',
            ],
            [
                'email' => 'ops.ugm@ops.ac.id',
                'peran' => 'operator',
                'status_akun' => 'Aktif',
                'nama_lengkap' => 'Nadia Kusuma',
                'nomor_telepon' => '081544556602',
                'alamat' => 'Jl. Boulevard UGM, Sleman',
                'tanggal_lahir' => '1995-04-19',
            ],
            [
                'email' => 'ops.debritto@ops.ac.id',
                'peran' => 'operator',
                'status_akun' => 'Aktif',
                'nama_lengkap' => 'Bagas Wijaya',
                'nomor_telepon' => '081544556603',
                'alamat' => 'Jl. Laksda Adisucipto No. 161, Sleman',
                'tanggal_lahir' => '1992-06-08',
            ],
            [
                'email' => 'ops.ukdw@ops.ac.id',
                'peran' => 'operator',
                'status_akun' => 'Aktif',
                'nama_lengkap' => 'Sari Wulandari',
                'nomor_telepon' => '081544556604',
                'alamat' => 'Jl. Dr. Wahidin Sudirohusodo No. 5, Yogyakarta',
                'tanggal_lahir' => '1996-08-22',
            ],
            [
                'email' => 'ops.golo@ops.ac.id',
                'peran' => 'operator',
                'status_akun' => 'Aktif',
                'nama_lengkap' => 'Hendra Gunawan',
                'nomor_telepon' => '081544556605',
                'alamat' => 'Jl. Golo No. 14, Umbulharjo, Yogyakarta',
                'tanggal_lahir' => '1991-10-11',
            ],
            [
                'email' => 'ops.uii@ops.ac.id',
                'peran' => 'operator',
                'status_akun' => 'Aktif',
                'nama_lengkap' => 'Putri Maharani',
                'nomor_telepon' => '081544556606',
                'alamat' => 'Jl. Kaliurang Km 14.5, Sleman',
                'tanggal_lahir' => '1997-01-27',
            ],
            [
                'email' => 'ops.pakuwon@ops.ac.id',
                'peran' => 'operator',
                'status_akun' => 'Aktif',
                'nama_lengkap' => 'Fajar Nugroho',
                'nomor_telepon' => '081544556607',
                'alamat' => 'Jl. Ring Road Utara, Condongcatur, Sleman',
                'tanggal_lahir' => '1993-03-05',
            ],
            [
                'email' => 'ops.hartono@ops.ac.id',
                'peran' => 'operator',
                'status_akun' => 'Aktif',
                'nama_lengkap' => 'Larasati Dewi',
                'nomor_telepon' => '081544556608',
                'alamat' => 'Jl. Ring Road Utara, Kaliwaru, Sleman',
                'tanggal_lahir' => '1995-12-09',
            ],
        ];

        $counter = 1;

        foreach ($users as $data) {
            // Gunakan prefix sesuai role untuk akun dummy yang belum tersimpan.
            $prefix = 'DRV';
            if (str_ends_with($data['email'], '@admin.ac.id')) {
                $prefix = 'ADM';
            } elseif (str_ends_with($data['email'], '@ops.ac.id')) {
                $prefix = 'OPS';
            }

            // Pertahankan ID akun yang sudah ada agar relasi demo tidak berubah.
            $existingUser = DB::table('users')->where('email', $data['email'])->first();
            $idUser = $existingUser?->id_user ?? $prefix.str_pad($counter, 10, '0', STR_PAD_LEFT);
            $now = Carbon::now();

            DB::table('users')->updateOrInsert(
                ['email' => $data['email']],
                [
                    'id_user' => $idUser,
                    'email_verified_at' => $existingUser?->email_verified_at ?? $now,
                    'password' => Hash::make('password123'),
                    'peran' => $data['peran'],
                    'status_akun' => $data['status_akun'],
                    'updated_at' => $now,
                    'created_at' => $existingUser?->created_at ?? $now,
                ],
            );

            DB::table('user_profile')->updateOrInsert(
                ['id_user' => $idUser],
                [
                    'nama_lengkap' => $data['nama_lengkap'],
                    'nomor_telepon' => $data['nomor_telepon'],
                    'alamat' => $data['alamat'],
                    'tanggal_lahir' => $data['tanggal_lahir'],
                    'created_at' => $now,
                    'updated_at' => $now,
                ],
            );

            $counter++;
        }
    }
}
