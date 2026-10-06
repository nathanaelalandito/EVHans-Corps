<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Relations\HasMany;
use App\Models\ChargingSession;
use App\Models\Location;
use App\Models\ErrorLog;

class Charger extends Model
{
    use HasFactory;

    protected $table = 'charger';
    protected $primaryKey = 'id_charger';

    protected $fillable = [
        'id_location','kode_perangkat', 'merek_model', 'kap_total_kw', 'status_mesin',
    ];

    public function ports()
    {
        return $this->hasMany(Port::class, 'id_charger', 'id_charger');
    }
    public function location()
    {
        return $this->belongsTo(Location::class, 'id_location', 'id_location');
    }

    public function sessions(): HasMany {
        return $this->hasMany(ChargingSession::class, 'id_charger', 'id_charger');
    }

    public function errorLogs(): HasMany {
        return $this->hasMany(ErrorLog::class, 'id_charger', 'id_charger');
    }
}