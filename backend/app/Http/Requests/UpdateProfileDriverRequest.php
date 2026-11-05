<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

/** Mendefinisikan field profil driver yang boleh diubah serta aturan validasinya. */
class UpdateProfileDriverRequest extends FormRequest
{
    /** Request ini hanya boleh diproses setelah middleware autentikasi berjalan. */
    public function authorize(): bool
    {
        return true; // sudah dijaga middleware auth:sanctum
    }

    /** Aturan validasi untuk perubahan profil dan email pengemudi. */
    public function rules(): array
    {
        return [
            'nama_lengkap' => ['sometimes', 'string', 'max:255'],
            'nomor_telepon' => ['sometimes', 'string', 'max:13'],
            'alamat' => ['sometimes', 'nullable', 'string'],
            'tanggal_lahir' => ['sometimes', 'date'],
            'email' => ['sometimes', 'email', 'max:255', 'unique:users,email,'.$this->user()->id_user.',id_user'],
        ];
    }
}
