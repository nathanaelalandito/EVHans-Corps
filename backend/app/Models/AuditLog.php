<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

/** Menyimpan jejak perubahan administratif dan operasional yang dapat diaudit. */
class AuditLog extends Model
{
    protected $fillable = [
        'id_user',
        'id_location',
        'aksi',
        'entitas',
        'id_entitas',
        'data_sebelum',
        'data_sesudah',
        'alasan',
    ];

    protected $casts = [
        'data_sebelum' => 'array',
        'data_sesudah' => 'array',
    ];

    /** Akun yang melakukan perubahan, bila masih tercatat di sistem. */
    public function user()
    {
        return $this->belongsTo(User::class, 'id_user', 'id_user');
    }

    /** Station yang terdampak oleh perubahan. */
    public function location()
    {
        return $this->belongsTo(Location::class, 'id_location', 'id_location');
    }
}
