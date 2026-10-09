<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Location extends Model
{
    use HasFactory;

    protected $table = 'location';

    protected $primaryKey = 'id_location';

    protected $fillable = [
        'nama_lokasi',
        'alamat',
        'latitude',
        'longitude',
        'jam_buka',
        'jam_tutup',
        'status_loc',
    ];

    protected $casts = [
        'latitude' => 'decimal:7',
        'longitude' => 'decimal:7',
    ];

    public function chargers(): HasMany
    {
        return $this->hasMany(Charger::class, 'id_location', 'id_location');
    }

    public function tarifs(): HasMany
    {
        return $this->hasMany(Tarif::class, 'id_location', 'id_location');
    }
}
