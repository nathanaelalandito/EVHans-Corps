<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Charger extends Model
{
    use HasFactory;

    protected $table = 'charger';
    protected $primaryKey = 'id_charger';
    protected $guarded = [];

    public function location()
    {
        return $this->belongsTo(Location::class, 'id_location', 'id_location');
    }
}
