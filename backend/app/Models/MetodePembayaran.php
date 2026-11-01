<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class MetodePembayaran extends Model
{
    use HasFactory;

    protected $table = 'metode_pembayaran';
    protected $primaryKey = 'id_metode';

    protected $fillable = [
        'nama_metode',
        'biaya_layanan',
        'status_metode'
    ];
    public function payment(){
        return $this->hasMany(Payment::class, 'id_metode', 'id_metode');
    }
    public function methofpay_ops(){
        return $this->hasMany(Methodpay_ops::class, 'id_metode', 'id_metode');
    }

}
