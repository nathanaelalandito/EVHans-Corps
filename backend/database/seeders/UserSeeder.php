<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;
use Carbon\Carbon;

class UserSeeder extends Seeder
{
    public function run(): void
    {
        $users = [
            [
                'email' => 'budi.driver@ac.id',
                'peran' => 'driver',
                'status_akun' => 'aktif',
                'nama_lengkap' => 'Budi Santoso',
                'nomor_telepon' => '081234567890',
                'alamat' => 'Jl. Merdeka No. 10, Purwokerto',
                'tanggal_lahir' => '1995-03-12',
            ],
            [
                'email' => 'siti.driver@ac.id',
                'peran' => 'driver',
                'status_akun' => 'aktif',
                'nama_lengkap' => 'Siti Rahmawati',
                'nomor_telepon' => '081298765432',
                'alamat' => 'Jl. Sudirman No. 25, Purwokerto',
                'tanggal_lahir' => '1998-07-20',
            ],
            [
                'email' => 'agus.driver@ac.id',
                'peran' => 'driver',
                'status_akun' => 'nonaktif',
                'nama_lengkap' => 'Agus Setiawan',
                'nomor_telepon' => '081356789012',
                'alamat' => 'Jl. Gatot Subroto No. 5, Purwokerto',
                'tanggal_lahir' => '1990-11-02',
            ],
            [
                'email' => 'admin.utama@admin.ac.id',
                'peran' => 'admin',
                'status_akun' => 'aktif',
                'nama_lengkap' => 'Ahmad Fauzi',
                'nomor_telepon' => '081411223344',
                'alamat' => 'Jl. Ahmad Yani No. 1, Purwokerto',
                'tanggal_lahir' => '1988-01-15',
            ],
            [
                'email' => 'ops.lapangan@ops.ac.id',
                'peran' => 'operator',
                'status_akun' => 'aktif',
                'nama_lengkap' => 'Dewi Lestari',
                'nomor_telepon' => '081533445566',
                'alamat' => 'Jl. Dr. Angka No. 8, Purwokerto',
                'tanggal_lahir' => '1993-09-30',
            ],
            [
                'email' => 'joko.driver@ac.id',
                'peran' => 'driver',
                'status_akun' => 'suspend',
                'nama_lengkap' => 'Joko Prasetyo',
                'nomor_telepon' => '081699887766',
                'alamat' => null,
                'tanggal_lahir' => '2000-05-18',
            ],
            [
                'email' => 'rina.driver@ac.id',
                'peran' => 'driver',
                'status_akun' => 'banned',
                'nama_lengkap' => 'Rina Amelia',
                'nomor_telepon' => '081777889900',
                'alamat' => 'Jl. Veteran No. 12, Purwokerto',
                'tanggal_lahir' => '1996-12-25',
            ],
        ];

        $counter = 1;

        foreach ($users as $data) {
            // Tentukan prefix berdasarkan domain email (sama seperti logic kamu)
            $prefix = 'DRV';
            if (str_ends_with($data['email'], '@admin.ac.id')) {
                $prefix = 'ADM';
            } elseif (str_ends_with($data['email'], '@ops.ac.id')) {
                $prefix = 'OPS';
            }

            // Generate id_user 13 karakter: prefix (3) + nomor urut (10 digit)
            $idUser = $prefix . str_pad($counter, 10, '0', STR_PAD_LEFT);

            DB::table('users')->insert([
                'id_user' => $idUser,
                'email' => $data['email'],
                'email_verified_at' => Carbon::now(),
                'password' => Hash::make('password123'), // password default untuk semua dummy
                'peran' => $data['peran'],
                'status_akun' => $data['status_akun'],
                'created_at' => Carbon::now(),
                'updated_at' => Carbon::now(),
            ]);

            DB::table('user_profile')->insert([
                'id_user' => $idUser,
                'nama_lengkap' => $data['nama_lengkap'],
                'nomor_telepon' => $data['nomor_telepon'],
                'alamat' => $data['alamat'],
                'tanggal_lahir' => $data['tanggal_lahir'],
                'created_at' => Carbon::now(),
                'updated_at' => Carbon::now(),
            ]);

            $counter++;
        }
    }
}