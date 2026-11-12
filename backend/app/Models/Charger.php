<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

/** Model unit perangkat charging yang berada pada satu lokasi dan memiliki beberapa port. */
class Charger extends Model
{
    use HasFactory;

    protected $table = 'charger';

    protected $primaryKey = 'id_charger';

    protected $fillable = [
        'id_location', 'kode_perangkat', 'merek_model', 'kap_tot_kw', 'status_mesin',
    ];

    /** Daftar port atau konektor fisik yang tersedia pada unit charger ini. */
    public function ports()
    {
        return $this->hasMany(Port::class, 'id_charger', 'id_charger');
    }

    /** Lokasi station tempat unit charger terpasang. */
    public function location()
    {
        return $this->belongsTo(Location::class, 'id_location', 'id_location');
    }

    /** Riwayat seluruh sesi yang pernah menggunakan unit charger ini. */
    public function sessions(): HasMany
    {
        return $this->hasMany(ChargingSession::class, 'id_charger', 'id_charger');
    }

    /** Catatan gangguan yang dilaporkan untuk unit charger ini. */
    public function errorLogs(): HasMany
    {
        return $this->hasMany(ErrorLog::class, 'id_charger', 'id_charger');
    }
}
