<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;
use App\Models\Charger;
use app\Models\StationOperator;

class Location extends Model
{
    use HasFactory;

    protected $table = 'location';

    protected $primaryKey = 'id_location';

    protected $guarded = [];

    protected $casts = [
        'latitude' => 'float',
        'longitude' => 'float',
    ];

    public function chargers(): HasMany
    {
        return $this->hasMany(Charger::class, 'id_location', 'id_location');
    }

    public function tarifs(): HasMany
    {
        return $this->hasMany(Tarif::class, 'id_location', 'id_location');
    }

    public function stationoperator(): HasMany {
        return $this->hasMany(StationOperator::class, 'id_location', 'id_location');
    }
}
