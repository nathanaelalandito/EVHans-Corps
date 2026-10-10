<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Laravel\Sanctum\HasApiTokens;
<<<<<<< HEAD
=======
use App\Models\UserProfile;
 use App\Models\Vehicle;
 use App\Models\ChargingSession;
 use App\Models\ErrorLog;
 use App\Models\StationOperator;
>>>>>>> driver-sesicharging

class User extends Authenticatable
{
    use HasApiTokens, HasFactory, Notifiable;

    protected $table = 'users'; // Sesuaikan dengan nama tabel di DB

    protected $primaryKey = 'id_user'; // Beritahu Laravel kalau primary key-nya id_user

    public $incrementing = false; // Karena pakai string (ADM001), matikan auto-increment integer

    protected $keyType = 'string'; // Tipe data primary key adalah string

    protected $fillable = ['id_user', 'email', 'password', 'peran', 'status_akun'];

    protected $hidden = ['password', 'remember_token'];

    // Relasi ke UserProfile (One to One)
    public function profile()
    {
        return $this->hasOne(UserProfile::class, 'id_user', 'id_user');
    }

    public function vehicles()
    {
        return $this->hasMany(Vehicle::class, 'id_user', 'id_user'); // sesuaikan nama model/tabel kendaraan kamu
    }

    public function chargingSessions()
    {
        return $this->hasMany(ChargingSession::class, 'id_user', 'id_user'); // sesuaikan
    }

    public function errorLog()
    {
        return $this->hasMany(ErrorLog::class, 'id_user', 'id_user');
    }
    public function stationoperator()
    {
        return $this->hasMany(StationOperator::class, 'id_user', 'id_user');
    }


}
