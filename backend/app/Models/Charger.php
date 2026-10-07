<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Charger extends Model
{
    use HasFactory;

    protected $table = 'charger';

    protected $primaryKey = 'id_charger';

    protected $fillable = [
        'id_location',
        'kode_perangkat',
        'tipe_konektor',
        'daya_kwh',
        'tipe_charging',
        'status',
    ];

    protected $casts = [
        'daya_kwh' => 'integer',
    ];

    public function location(): BelongsTo
    {
        return $this->belongsTo(Location::class, 'id_location', 'id_location');
    }
}
