<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class UpdateProfileDriverRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true; // sudah dijaga middleware auth:sanctum
    }

    public function rules(): array
    {
        return [
            'nama_lengkap' => ['sometimes', 'string', 'max:255'],
            'nomor_telepon' => ['sometimes', 'string', 'max:13'],
            'alamat' => ['sometimes', 'nullable', 'string'],
            'tanggal_lahir' => ['sometimes', 'date'],
            'email' => ['sometimes', 'email', 'max:255', 'unique:users,email,' . $this->user()->id_user . ',id_user']
        ];
    }
}