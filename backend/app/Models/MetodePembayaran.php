<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class MetodePembayaran extends Model
{
    protected $table = 'metode_pembayaran';

    protected $primaryKey = 'id_metode';

    protected $fillable = [
        'nama_metode',
        'biaya_layanan',
        'status_metode',
    ];

    protected $casts = [
        'biaya_layanan' => 'integer',
    ];
}
