<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasOne;

/** Model transaksi keuangan untuk sesi charging atau pengisian saldo. */
class Payment extends Model
{
    protected $table = 'payment';

    protected $primaryKey = 'id_payment';

    protected $fillable = [
        'id_session', 'id_metode', 'jenis_pembayaran', 'total_bayar', 'status_pembayaran', 'waktu_pembayaran', 'referensi_gateway',
    ];

    protected $casts = [
        'total_bayar' => 'integer',
        'waktu_pembayaran' => 'datetime',
    ];

    /** Sesi charging yang tagihannya dicatat oleh transaksi ini. */
    public function session(): BelongsTo
    {
        return $this->belongsTo(ChargingSession::class, 'id_session', 'id_session');
    }

    /** Metode pembayaran yang tercatat pada transaksi. */
    public function method(): BelongsTo
    {
        return $this->belongsTo(MetodePembayaran::class, 'id_metode', 'id_metode');
    }

    /** Permintaan top up yang diselesaikan oleh transaksi ini, jika ada. */
    public function topup(): HasOne
    {
        return $this->hasOne(Topup::class, 'id_payment', 'id_payment');
    }

    /** Data refund yang dikaitkan ke transaksi pada implementasi saat ini. */
    public function refund(): HasOne
    {
        return $this->hasOne(Refund::class, 'id_payment', 'id_payment');
    }
}
