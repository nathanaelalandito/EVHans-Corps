<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasOne;
use App\Models\Refund;

class Payment extends Model
{
    protected $table = 'payment';

    protected $primaryKey = 'id_payment';

    protected $fillable = [
<<<<<<< HEAD
        'id_session',
        'id_metode',
        'jenis_pembayaran',
        'total_bayar',
        'status_pembayaran',
        'waktu_pembayaran',
        'referensi_gateway',
=======
        'id_session', 'id_metode', 'total_bayar', 'status_pembayaran', 'waktu_pembayaran', 'referensi_gateway'
>>>>>>> driver-sesicharging
    ];

    protected $casts = [
        'total_bayar' => 'integer',
        'waktu_pembayaran' => 'datetime',
    ];

    public function session(): BelongsTo
    {
        return $this->belongsTo(ChargingSession::class, 'id_session', 'id_session');
    }

    public function method(): BelongsTo
    {
        return $this->belongsTo(MetodePembayaran::class, 'id_metode', 'id_metode');
    }

    public function topup(): HasOne
    {
        return $this->hasOne(Topup::class, 'id_payment', 'id_payment');
    }

    public function refund(): HasOne
    {
        return $this->hasOne(Refund::class, 'id_payment', 'id_payment');
    }
}
