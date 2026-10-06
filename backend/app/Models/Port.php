<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Port extends Model
{
    use HasFactory;

    protected $table = 'ports';
    protected $primaryKey = 'id_port';

    protected $fillable = [
        'id_charger',
        'nomor_port',
        'tipe_konektor',
        'tipe_charging',
        'daya_maks_kw',
        'status_port',
    ];

    // Relasi: Banyak Port milik 1 Charger
    public function charger()
    {
        return $this->belongsTo(Charger::class, 'id_charger', 'id_charger');
    }
}