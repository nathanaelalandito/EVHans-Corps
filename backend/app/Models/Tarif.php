<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Tarif extends Model
{
    use HasFactory;

    protected $table = 'tarif';

    protected $primaryKey = 'id_tarif';

    protected $fillable = [
        'id_location',
        'harga_per_kwh',
        'biaya_minimum',
        'biaya_parkir_pjam',
        'periode_mulai',
        'periode_berakhir',
    ];

    protected $casts = [
        'harga_per_kwh' => 'integer',
        'biaya_minimum' => 'integer',
        'biaya_parkir_pjam' => 'integer',
        'periode_mulai' => 'datetime',
        'periode_berakhir' => 'datetime',
    ];

    public function location(): BelongsTo
    {
        return $this->belongsTo(Location::class, 'id_location', 'id_location');
    }
}
