<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Carbon\Carbon;

class Tarif extends Model
{
    use HasFactory;

    // Nama tabel di database
    protected $table = 'tarif';

    // Primary key kustom (karena bukan 'id' default)
    protected $primaryKey = 'id_tarif';

    // Kolom yang dapat diisi secara massal (mass assignable)
    protected $fillable = [
        'id_location',
        'harga_per_kwh',
        'biaya_minimum',
        'biaya_parkir_pjam',
        'periode_mulai',
        'periode_berakhir',
    ];

    // Casting tipe data agar datetime otomatis menjadi instance Carbon
    protected $casts = [
        'harga_per_kwh' => 'integer',
        'biaya_minimum' => 'integer',
        'biaya_parkir_pjam' => 'integer',
        'periode_mulai' => 'datetime',
        'periode_berakhir' => 'datetime',
    ];

    /**
     * Relasi: Tarif ini dimiliki oleh sebuah Lokasi Stasiun
     */
    public function location()
    {
        return $this->belongsTo(Location::class, 'id_location', 'id_location');
    }

    /**
     * Scope query: Mempermudah filter tarif yang sedang aktif saat ini
     */
    public function scopeAktif($query)
    {
        $now = Carbon::now();
        return $query->where('periode_mulai', '<=', $now)
                     ->where('periode_berakhir', '>=', $now);
    }
}