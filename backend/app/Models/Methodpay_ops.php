<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use App\Models\Location;
use App\Models\MetodePembayaran;

class Methodpay_ops extends Model
{
    protected $table = 'methodpay_ops';
    protected $primaryKey = 'id_log_payment';
    protected $fillable = [
        'id_location', 'id_metode', 'is_active', 'biaya_charger'
    ];

    public function location()
    {
        return $this->belongsTo(Location::class, 'id_location', 'id_location');
    }
    public function metodePembayaran()
    {
        return $this->belongsTo(MetodePembayaran::class, 'id_metode', 'id_metode');
    }
}
