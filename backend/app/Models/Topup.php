<?php
 
namespace App\Models;
 
use Illuminate\Database\Eloquent\Model;
 
class Topup extends Model
{
    protected $table = 'topup';
    protected $primaryKey = 'id_topup';
 
    protected $fillable = [
        'id_wallet', 'id_metode', 'referensi', 'kode_pembayaran',
        'nominal', 'biaya_layanan', 'status_topup', 'waktu_topup', 'kedaluwarsa_pada',
    ];
 
    protected $casts = [
        'nominal'          => 'integer',
        'biaya_layanan'    => 'integer',
        'waktu_topup'      => 'datetime',
        'kedaluwarsa_pada' => 'datetime',
    ];
    // app/Models/Topup.php
        public function dompet()
        {
            return $this->belongsTo(\App\Models\Dompet::class, 'id_wallet', 'id_wallet');
        }

        // app/Models/Dompet.php
        public function profile()
        {
            return $this->hasOne(\App\Models\UserProfile::class, 'id_user', 'id_user');
        }
}