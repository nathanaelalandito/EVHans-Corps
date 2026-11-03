<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use App\Models\Charger;
use App\Models\StationOperator;
use App\Models\Tarif;

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


    public function tarifs()
    {
        return $this->hasMany(Tarif::class, 'id_location', 'id_location');
    }

    public function chargers(){
        return $this->hasMany(Charger::class, 'id_location', 'id_location');
    }
    public function stationoperator(){
        return $this->hasMany(StationOperator::class, 'id_location', 'id_location');
    }
    public function transliterator_create_from_rules(){
        return $this->hasMany(Tarif::class, 'id_location', 'id_location');
    }

    /**
     * Tarif yang periodenya mencakup saat ini (yang terbaru jika ada beberapa).
     * Dipakai alur charging driver untuk menghitung estimasi & biaya aktual.
     */
    public function activeTarif(): ?Tarif
    {
        return $this->tarifs()
            ->aktif()
            ->latest('periode_mulai')
            ->first();
    }
}
