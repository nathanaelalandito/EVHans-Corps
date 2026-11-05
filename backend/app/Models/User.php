<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Laravel\Sanctum\HasApiTokens;

/** Model akun autentikasi untuk peran pengemudi, operator, dan admin. */
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
    /** Data profil pribadi yang melengkapi akun autentikasi. */
    public function profile()
    {
        return $this->hasOne(UserProfile::class, 'id_user', 'id_user');
    }

    /** Dompet digital yang digunakan pengguna untuk transaksi. */
    public function dompet()
    {
        return $this->hasOne(Dompet::class, 'id_user', 'id_user');
    }

    /** Kendaraan yang didaftarkan oleh pengguna. */
    public function vehicles()
    {
        return $this->hasMany(Vehicle::class, 'id_user', 'id_user'); // sesuaikan nama model/tabel kendaraan kamu
    }

    /** Riwayat sesi charging milik pengguna. */
    public function chargingSessions()
    {
        return $this->hasMany(ChargingSession::class, 'id_user', 'id_user'); // sesuaikan
    }

    /** Laporan gangguan yang terkait dengan pengguna. */
    public function errorLog()
    {
        return $this->hasMany(ErrorLog::class, 'id_user', 'id_user');
    }

    /** Penugasan station bagi akun yang berperan sebagai operator. */
    public function stationoperator()
    {
        return $this->hasMany(StationOperator::class, 'id_user', 'id_user');
    }
}
