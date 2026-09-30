<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class ChargingSession extends Model
{
    use HasFactory;

    protected $table = 'charging_session';
    protected $primaryKey = 'id_session';

    protected $fillable = [
        'id_user',
        'id_charger',
        'id_tarif',
        'id_vehicle',
        'waktu_mulai',
        'waktu_selesai',
        'total_energi_kwh',
        'status',
        'soc_awal',
        'soc_akhir',
    ];

    public function user()
    {
        return $this->belongsTo(User::class, 'id_user', 'id_user');
    }
}