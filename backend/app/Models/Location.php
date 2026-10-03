<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

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

    public function chargers()
    {
        return $this->hasMany(Charger::class, 'id_location', 'id_location');
    }

    public function tarif()
    {
        return $this->hasMany(Tarif::class, 'id_location', 'id_location');
    }
}
