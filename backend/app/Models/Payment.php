<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasOne;
use App\Models\Refund;
use App\Models\ChargingSession;
use App\Models\metodePembayaran;

class Payment extends Model {
    protected $table = 'payment';
    protected $primaryKey = 'id_payment';
    
    protected $fillable = [
        'id_session', 
        'id_metode', 
        'total_bayar', 
        'status_pembayaran', 
        'waktu_pembayaran', 
        'referensi_gateway'
    ];

    // Relasi ke ChargingSession
    public function session(): BelongsTo {
        return $this->belongsTo(ChargingSession::class, 'id_session', 'id_session');
    }

    // Relasi ke Metode Pembayaran (sesuaikan nama model jika berbeda, misal MetodePembayaran)
    public function metodePembayaran(): BelongsTo {
        return $this->belongsTo(MetodePembayaran::class, 'id_metode', 'id_metode');
    }

    // Relasi ke Refund (One to One)
    public function refund(): HasOne {
        return $this->hasOne(Refund::class, 'id_payment', 'id_payment');
    }
}