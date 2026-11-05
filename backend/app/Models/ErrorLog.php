<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

/** Model catatan gangguan perangkat atau sesi charging. */
class ErrorLog extends Model
{
    protected $table = 'error_log';

    protected $primaryKey = 'id_log';

    protected $fillable = ['id_charger', 'id_session', 'id_user', 'jenis_error', 'desk_mslh', 'waktu_terjadi', 'status_tanganan'];

    /** Unit charger yang mengalami gangguan. */
    public function charger()
    {
        return $this->belongsTo(Charger::class, 'id_charger', 'id_charger');
    }

    /** Sesi charging terkait, jika gangguan terjadi saat sesi aktif. */
    public function session()
    {
        return $this->belongsTo(ChargingSession::class, 'id_session', 'id_session');
    }

    /** Pengguna yang terkait dengan laporan gangguan, jika ada. */
    public function user()
    {
        return $this->belongsTo(User::class, 'id_user', 'id_user');
    }
}
