<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class StationOperator extends Model
{
    use HasFactory;

    protected $table = 'station_operators';
    protected $primaryKey = 'id_station_operator';

    protected $fillable = [
        'id_user',
        'id_location',
    ];

    // Relasi ke Model User (sesuaikan foreign key & primary key 'id_user')
    public function user()
    {
        return $this->belongsTo(User::class, 'id_user', 'id_user');
    }

    // Relasi ke Model Location
    public function location()
    {
        return $this->belongsTo(Location::class, 'id_location', 'id_location');
    }
}