<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class ErrorLog extends Model
{
    protected $table = 'error_log';

    protected $primaryKey = 'id_log';

    protected $fillable = [
        'id_charger',
        'id_session',
        'id_port',
        'id_user',
        'jenis_error',
        'kategori',
        'sumber',
        'tingkat',
        'desk_mslh',
        'waktu_terjadi',
        'status_tanganan',
        'ditangani_oleh',
        'waktu_selesai_tangani',
    ];

    protected $casts = [
        'waktu_terjadi' => 'datetime',
        'waktu_selesai_tangani' => 'datetime',
    ];

    public function charger()
    {
        return $this->belongsTo(Charger::class, 'id_charger', 'id_charger');
    }

    public function session()
    {
        return $this->belongsTo(ChargingSession::class, 'id_session', 'id_session');
    }

    public function port()
    {
        return $this->belongsTo(Port::class, 'id_port', 'id_port');
    }

    public function user()
    {
        return $this->belongsTo(User::class, 'id_user', 'id_user');
    }

    public function handler()
    {
        return $this->belongsTo(User::class, 'ditangani_oleh', 'id_user');
    }
}
