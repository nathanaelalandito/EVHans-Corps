<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use App\Models\User;
use App\Models\Charger;
use App\Models\ChargingSession;

class ErrorLog extends Model {
    protected $table = 'error_log';
    protected $primaryKey = 'id_log';
    protected $fillable = ['id_charger', 'id_session', 'id_user', 'jenis_error', 'desk_mslh', 'waktu_terjadi', 'status_tanganan'];

    public function charger(){
        return $this->belongsTo(Charger::class, 'id_charger', 'id_charger');
    }

    public function session(){
        return $this->belongsTo(ChargingSession::class, 'id_session', 'id_session');
    }

    public function user(){
        return $this->belongsTo(User::class, 'id_user', 'id_user');
    }
}