<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use App\Models\ChargingSession;
use App\Models\Location;
use App\Models\ErrorLog;


class Charger extends Model {
    protected $table = 'charger';
    protected $primaryKey = 'id_charger';
    protected $fillable = ['id_location', 'kode_perangkat', 'tipe_konektor', 'daya_kwh', 'tipe_charging', 'status_mesin'];
    protected $casts = [
        'daya_kwh' => 'integer',
    ];


    public function location(): BelongsTo {
        return $this->belongsTo(Location::class, 'id_location', 'id_location');
    }

    public function sessions(): HasMany {
        return $this->hasMany(ChargingSession::class, 'id_charger', 'id_charger');
    }

    public function errorLogs(): HasMany {
        return $this->hasMany(ErrorLog::class, 'id_charger', 'id_charger');
    }
}

