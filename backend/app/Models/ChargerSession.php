<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasOne;
use App\Models\User;
use App\Models\Charger;
use App\Models\Payment;

class ChargingSession extends Model {
    protected $table = 'charging_session';
    protected $primaryKey = 'id_session';
    protected $fillable = [
        'id_user', 'id_charger', 'id_tarif', 'id_vehicle', 
        'waktu_mulai', 'waktu_selesai', 'total_energi_kwh', 'status', 'soc_awal', 'soc_akhir'
    ];

    public function user(): BelongsTo {
        return $this->belongsTo(User::class, 'id_user', 'id_user');
    }

    public function charger(): BelongsTo {
        return $this->belongsTo(Charger::class, 'id_charger', 'id_charger');
    }

    public function payment(): HasOne {
        return $this->hasOne(Payment::class, 'id_session', 'id_session');
    }
    
}