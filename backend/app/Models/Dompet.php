<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

/** Model saldo digital pengemudi, termasuk dana tertahan dan pengamanan PIN. */
class Dompet extends Model
{
    use HasFactory;

    protected $table = 'dompet';

    protected $primaryKey = 'id_wallet';

    protected $fillable = [
        'id_user',
        'saldo',
        'saldo_hold',
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
        'saldo_hold' => 'integer',
        'percobaan_pin_gagal' => 'integer',
        'locked_until' => 'datetime',
    ];

    /** Pengguna pemilik dompet digital. */
    public function user()
    {
        return $this->belongsTo(User::class, 'id_user', 'id_user');
    }

    /** Saldo yang dapat dipakai setelah dikurangi dana yang sedang di-hold. */
    public function saldoTersedia(): int
    {
        return max(0, (int) $this->saldo - (int) $this->saldo_hold);
    }

    /** Riwayat permintaan top up yang masuk ke dompet ini. */
    public function topups()
    {
        return $this->hasMany(Topup::class, 'id_wallet', 'id_wallet');
    }

    /** Menentukan apakah pengguna sudah mengatur PIN transaksi. */
    public function hasPin(): bool
    {
        return ! is_null($this->pin_transaksi);
    }

    /** Menentukan apakah dompet masih berada dalam masa penguncian PIN. */
    public function isLocked(): bool
    {
        return $this->locked_until !== null && $this->locked_until->isFuture();
    }
}
