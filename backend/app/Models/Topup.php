<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Topup extends Model
{
    protected $table = 'topup';

    protected $primaryKey = 'id_topup';

    protected $fillable = [
        'id_wallet',
        'id_payment',
        'nominal',
        'status_topup',
        'waktu_topup',
    ];

    protected $casts = [
        'nominal' => 'integer',
        'waktu_topup' => 'datetime',
    ];

    public function wallet(): BelongsTo
    {
        return $this->belongsTo(Dompet::class, 'id_wallet', 'id_wallet');
    }

    public function payment(): BelongsTo
    {
        return $this->belongsTo(Payment::class, 'id_payment', 'id_payment');
    }
}
