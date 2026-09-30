<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Dompet extends Model
{
    use HasFactory;

    protected $table = 'dompet';
    protected $primaryKey = 'id_wallet';

    protected $fillable = [
        'id_user',
        'saldo',
        'pin_transaksi',
        'status_dompet',
        'percobaan_pin_gagal',
        'locked_until',
    ];

    // Jangan pernah ikut ter-serialize ke response JSON
    protected $hidden = [
        'pin_transaksi',
    ];

    protected $casts = [
        'saldo' => 'integer',
        'percobaan_pin_gagal' => 'integer',
        'locked_until' => 'datetime',
    ];

    public function user()
    {
        return $this->belongsTo(User::class, 'id_user', 'id_user');
    }

    public function hasPin(): bool
    {
        return ! is_null($this->pin_transaksi);
    }

    public function isLocked(): bool
    {
        return $this->locked_until !== null && $this->locked_until->isFuture();
    }
}
