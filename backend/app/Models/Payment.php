<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Payment extends Model
{
    use HasFactory;

    protected $table = 'payment';
    protected $primaryKey = 'id_payment';
    protected $guarded = [];

    protected $casts = [
        'waktu_pembayaran' => 'datetime',
        'total_bayar' => 'integer',
    ];

    public function session()
    {
        return $this->belongsTo(ChargingSession::class, 'id_session', 'id_session');
    }

    public function metode()
    {
        return $this->belongsTo(MetodePembayaran::class, 'id_metode', 'id_metode');
    }
}
