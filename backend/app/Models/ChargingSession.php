<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasOne;

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
        'target_energi_kwh',
        'estimasi_biaya',
        'jumlah_hold',
        'status',
        'soc_awal',
        'soc_akhir',
    ];

    protected $casts = [
        'waktu_mulai' => 'datetime',
        'waktu_selesai' => 'datetime',
        'total_energi_kwh' => 'decimal:2',
        'target_energi_kwh' => 'decimal:2',
        'estimasi_biaya' => 'integer',
        'jumlah_hold' => 'integer',
        'soc_awal' => 'integer',
        'soc_akhir' => 'integer',
    ];

    public function charger(): BelongsTo
    {
        return $this->belongsTo(Charger::class, 'id_charger', 'id_charger');
    }

    public function tarif(): BelongsTo
    {
        return $this->belongsTo(Tarif::class, 'id_tarif', 'id_tarif');
    }

    public function vehicle(): BelongsTo
    {
        return $this->belongsTo(Vehicle::class, 'id_vehicle', 'id_vehicle');
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class, 'id_user', 'id_user');
    }

    public function payment(): HasOne
    {
        return $this->hasOne(Payment::class, 'id_session', 'id_session');
    }
}
