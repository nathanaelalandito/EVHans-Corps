<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

/** Model kendaraan pengemudi termasuk konektor dan kapasitas baterainya. */
class Vehicle extends Model
{
    use HasFactory;

    protected $table = 'vehicle';

    protected $primaryKey = 'id_vehicle';

    protected $fillable = [
        'id_user',
        'merek',
        'model',
        'nomor_polisi',
        'tipe_konektor',
        'kapasitas_baterai_kwh',
    ];

    /** Pengemudi pemilik kendaraan ini. */
    public function user()
    {
        return $this->belongsTo(User::class, 'id_user', 'id_user');
    }
}
