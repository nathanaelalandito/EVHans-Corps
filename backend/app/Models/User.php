<?php

namespace App\Models;

// use Illuminate\Contracts\Auth\MustVerifyEmail;
use Database\Factories\UserFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Attributes\Hidden;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;

#[Fillable(['name', 'email', 'password'])]
#[Hidden(['password', 'remember_token'])]
class User extends Authenticatable
{
    /** @use HasFactory<UserFactory> */
    use HasFactory, Notifiable;

<<<<<<< HEAD
    /**
     * Get the attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
=======
    protected $table = 'users'; // Sesuaikan dengan nama tabel di DB
    protected $primaryKey = 'id_user'; // Beritahu Laravel kalau primary key-nya id_user
    
    public $incrementing = false; // Karena pakai string (ADM001), matikan auto-increment integer
    protected $keyType = 'string'; // Tipe data primary key adalah string

    protected $fillable = ['id_user','email','password','peran','status_akun',];

    protected $hidden = ['password', 'remember_token',];

    // Relasi ke UserProfile (One to One)
    public function profile()
>>>>>>> ba992e2 (feat: tambah backend ProfilDriver (controller, resource, request, model))
    {
        return [
            'email_verified_at' => 'datetime',
            'password' => 'hashed',
        ];
    }

      public function vehicles()
    {
        return $this->hasMany(Vehicle::class, 'id_user', 'id_user'); // sesuaikan nama model/tabel kendaraan kamu
    }

    public function chargingSessions()
    {
        return $this->hasMany(ChargingSession::class, 'id_user', 'id_user'); // sesuaikan
    }

}
