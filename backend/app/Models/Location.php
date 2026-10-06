<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;
use App\Models\Charger;
use app\Models\StationOperator;

class Location extends Model {
    protected $table = 'location';
    protected $primaryKey = 'id_location';
    protected $fillable = ['nama_lokasi', 'alamat', 'latitude', 'longitude', 'jam_buka', 'jam_tutup', 'status'];

    public function chargers(): HasMany {
        return $this->hasMany(Charger::class, 'id_location', 'id_location');
    }
    public function stationoperator(): HasMany {
        return $this->hasMany(StationOperator::class, 'id_location', 'id_location');
    }
}