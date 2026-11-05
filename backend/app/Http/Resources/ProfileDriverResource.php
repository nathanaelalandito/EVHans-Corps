<?php

namespace App\Http\Resources;

use Carbon\Carbon;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/** Menentukan representasi JSON profil driver yang aman untuk dikirim ke klien. */
class ProfileDriverResource extends JsonResource
{
    /** Mengubah model akun/profil menjadi bentuk aman yang dikirim ke frontend. */
    public function toArray(Request $request): array
    {
        $profile = $this->profile;

        return [
            'id_user' => $this->id_user,
            'nama_lengkap' => $profile?->nama_lengkap,
            'peran' => $this->peran,
            'status_akun' => $this->status_akun,
            'email' => $this->email,
            'email_verified' => ! is_null($this->email_verified_at),
            'nomor_telepon' => $profile?->nomor_telepon,
            'tanggal_lahir' => $profile?->tanggal_lahir?->format('Y-m-d'),
            'umur' => $profile?->tanggal_lahir
                ? Carbon::parse($profile->tanggal_lahir)->age
                : null,
            'alamat' => $profile?->alamat,
        ];
    }
}
