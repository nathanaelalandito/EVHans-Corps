<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;

/** Menyediakan operasi dasar pengelolaan akun pengguna. */
class UserController extends Controller
{
    /**
     * Display a listing of the resource.
     */
    /** Mengembalikan daftar akun untuk kebutuhan administrasi. */
    public function index()
    {
        //
    }

    /**
     * Store a newly created resource in storage.
     */
    /** Membuat akun dari data request yang tervalidasi. */
    public function store(Request $request)
    {
        //
    }

    /**
     * Display the specified resource.
     */
    /** Mengambil satu akun berdasarkan ID. */
    public function show(string $id)
    {
        //
    }

    /**
     * Update the specified resource in storage.
     */
    /** Memperbarui atribut akun yang dikirim oleh pemanggil. */
    public function update(Request $request, string $id)
    {
        //
    }

    /**
     * Remove the specified resource from storage.
     */
    /** Menghapus akun berdasarkan ID. */
    public function destroy(string $id)
    {
        //
    }
}
