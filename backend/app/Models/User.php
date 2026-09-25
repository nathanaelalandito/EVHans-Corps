<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Laravel\Sanctum\HasApiTokens;
use App\Models\UserProfile;

class User extends Authenticatable
{
    use HasFactory, Notifiable, HasApiTokens;

    protected $table = 'users'; // Sesuaikan dengan nama tabel di DB
    protected $primaryKey = 'id_user'; // Beritahu Laravel kalau primary key-nya id_user
    
    public $incrementing = false; // Karena pakai string (ADM001), matikan auto-increment integer
    protected $keyType = 'string'; // Tipe data primary key adalah string

    protected $fillable = [
        'id_user',
        'email',
        'password',
        'peran',
        'status_akun',
    ];

    protected $hidden = [
        'password',
    ];

    // Relasi ke UserProfile (One to One)
    public function profile()
    {
        return $this->hasOne(UserProfile::class, 'id_user', 'id_user');
    }
}
