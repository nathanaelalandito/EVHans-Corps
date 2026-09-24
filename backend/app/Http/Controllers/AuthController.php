<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use App\Models\User;
use App\Models\UserProfile;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Facades\DB;

class AuthController extends Controller
{
    public function register(Request $request)
    {
    // 1. Validasi input dari frontend (tambahkan nomor_telepon dan alamat)
    $validator = Validator::make($request->all(), [
        'name' => 'required|string|max:255',
        'email' => 'required|string|email|max:255|unique:users,email',
        'password' => 'required|string|min:6',
        'nomor_telepon' => 'required|string|max:15',
        'alamat' => 'required|string|max:255',
        'tanggal_lahir' => 'required|date',
    ]);

    if ($validator->fails()) {
        return response()->json([
            'errors' => $validator->errors()
        ], 422);
    }

    DB::beginTransaction();

    try {
        $email = $request->email;
        $prefix = 'DRV'; // Default untuk user biasa / driver

        // Tentukan prefix berdasarkan domain email
        if (str_ends_with($email, '@admin.ac.id')) {
            $prefix = 'ADM';
        } elseif (str_ends_with($email, '@ops.ac.id')) {
            $prefix = 'OPS';
        }

        // Generate ID otomatis (ADM001, OPS001, DRV001)
        $lastUser = User::where('id_user', 'LIKE', "{$prefix}%")
                        ->orderBy('id_user', 'desc')
                        ->first();

        if ($lastUser) {
            $lastNumber = (int) str_replace($prefix, '', $lastUser->id_user);
            $nextNumber = $lastNumber + 1;
        } else {
            $nextNumber = 1;
        }

        $customId = $prefix . str_pad($nextNumber, 3, '0', STR_PAD_LEFT);

        // 2. Simpan ke tabel Users
        $user = User::create([
            'id_user' => $customId,
            'email' => $request->email,
            'password' => Hash::make($request->password),
            'peran' => $prefix === 'ADM' ? 'admin' : ($prefix === 'OPS' ? 'operator' : 'user'),
            'status_akun' => 'aktif',
        ]);

        // 3. Simpan ke tabel User_Profile (dengan data lengkap)
        UserProfile::create([
            'id_user' => $user->id_user,
            'nama_lengkap' => $request->name,
            'nomor_telepon' => $request->nomor_telepon,
            'alamat' => $request->alamat,
            'tanggal_lahir' => $request->tanggal_lahir,
        ]);

        DB::commit();

        return response()->json([
            'message' => 'Registrasi berhasil!',
            'user' => $user
        ], 201);

    } catch (\Exception $e) {
        DB::rollBack();
        return response()->json([
            'message' => 'Terjadi kesalahan pada server.',
            'error' => $e->getMessage()
        ], 500);
    }
    }
}