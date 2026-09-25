<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use App\Models\User;

class UserProfile extends Model
{
    use HasFactory;

    protected $table = 'user_profile'; // Sesuai nama tabel di database
    protected $primaryKey = 'id_user_profile'; // Menyesuaikan ERD

    protected $fillable = [
        'id_user',
        'nama_lengkap',
        'nomor_telepon',
        'alamat',
        'tanggal_lahir',
    ];

    // Relasi balik ke User
    public function user()
    {
        return $this->belongsTo(User::class, 'id_user', 'id_user');
    }
}