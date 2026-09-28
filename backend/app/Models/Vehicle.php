<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Factories\HasFactory;

class Vehicle extends Model
{
    use HasFactory;
 
    protected $table = 'vehicle';
    protected $primaryKey = 'id_vehicle';
 
    protected $fillable = [
        'id_user',
        'merek',
        'model',
        'nomor_polisi',
        'tipe_konektor',
    ];
 
    public function user()
    {
        return $this->belongsTo(User::class, 'id_user', 'id_user');
    }
}
