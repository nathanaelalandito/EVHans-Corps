<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

/** Model lokasi SPKLU yang mengelompokkan charger, operator, dan riwayat tarif. */
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

    /** Seluruh versi tarif yang pernah atau sedang berlaku di lokasi ini. */
    public function tarifs()
    {
        return $this->hasMany(Tarif::class, 'id_location', 'id_location');
    }

    /** Unit charger yang terpasang di lokasi ini. */
    public function chargers()
    {
        return $this->hasMany(Charger::class, 'id_location', 'id_location');
    }

    /** Penugasan operator yang bertanggung jawab atas lokasi ini. */
    public function stationoperator()
    {
        return $this->hasMany(StationOperator::class, 'id_location', 'id_location');
    }

    /** Alias relasi tarif yang saat ini masih dipakai kode pemanggil lama. */
    public function transliterator_create_from_rules()
    {
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
