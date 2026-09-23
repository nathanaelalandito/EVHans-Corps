<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

class AuthController extends Controller
{
    public function login(Request $request)
    {
        // 1. Validasi input login
        $credentials = $request->validate([
            'email' => 'required|email',
            'password' => 'required',
        ]);

        // 2. Cek kecocokan email dan password
        if (!Auth::attempt($credentials)) {
            return response()->json([
                'status' => 'error',
                'message' => 'Email atau password salah!'
            ], 401);
        }

        // 3. Ambil data user yang sedang login
        $user = Auth::user();

        // 4. Kembalikan response sukses beserta role-nya (digunakan React untuk mengarahkan halaman)
        return response()->json([
            'status' => 'success',
            'message' => 'Login berhasil!',
            'data' => [
                'user' => $user,
                'role' => $user->role, // Driver, operator, atau admin
            ]
        ], 200);
    }
}
