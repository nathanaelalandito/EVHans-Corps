<?php

namespace App\Models;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class ChargingSession extends Model
{
    use HasFactory;

    public const AKTIF = ['pending', 'berlangsung'];

    protected $table = 'charging_session';
    protected $primaryKey = 'id_session';
    protected $guarded = [];

    protected $casts = [
        'waktu_mulai' => 'datetime',
        'waktu_selesai' => 'datetime',
        'total_energi_kwh' => 'float',
        'soc_awal' => 'integer',
        'soc_akhir' => 'integer',
    ];
    public function user()
    {
        return $this->belongsTo(User::class, 'id_user', 'id_user');
    }

    public function charger()
    {
        return $this->belongsTo(Charger::class, 'id_charger', 'id_charger');
    }

    public function tarif()
    {
        return $this->belongsTo(Tarif::class, 'id_tarif', 'id_tarif');
    }

    public function vehicle()
    {
        return $this->belongsTo(Vehicle::class, 'id_vehicle', 'id_vehicle');
    }
}
