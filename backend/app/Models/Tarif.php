<?php

namespace App\Models;

use Carbon\Carbon;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

/** Model tarif lokasi yang berlaku pada rentang waktu tertentu. */
class Tarif extends Model
{
    use HasFactory;

    protected $table = 'tarif';

    protected $primaryKey = 'id_tarif';

    protected $fillable = [
        'id_location',
        'harga_per_kwh',
        'biaya_minimum',
        'biaya_parkir_flat',
        'periode_mulai',
        'periode_berakhir',
    ];

    protected $casts = [
        'harga_per_kwh' => 'integer',
        'biaya_minimum' => 'integer',
        'biaya_parkir_flat' => 'integer',
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
            ->where('periode_berakhir', '>', $now);
    }

    /**
     * Rincian biaya untuk sejumlah kWh pada port berdaya $powerKw:
     *  - biaya charging = kWh x tarif/kWh, minimal biaya minimum
     *  - durasi         = kWh / daya port (kW)
     *  - biaya parkir   = biaya flat sekali untuk setiap sesi
     * Dipakai bersama oleh estimasi (start), penyelesaian sesi, dan invoice.
     */
    /** Menghitung estimasi biaya energi dan parkir untuk jumlah energi tertentu. */
    public function costFor(float $kwh, float $powerKw): array
    {
        $kwh = round($kwh, 2);
        $powerKw = max(1, $powerKw);
        $durationMinutes = (int) ceil($kwh / $powerKw * 60);

        $chargingCost = max((int) round($kwh * $this->harga_per_kwh), (int) $this->biaya_minimum);

        $parkingCost = (int) $this->biaya_parkir_flat;

        return [
            'target_kwh' => $kwh,
            'daya_kw' => $powerKw,
            'durasi_menit' => $durationMinutes,
            'harga_per_kwh' => (int) $this->harga_per_kwh,
            'biaya_minimum' => (int) $this->biaya_minimum,
            'biaya_charging' => $chargingCost,
            'biaya_parkir_flat' => (int) $this->biaya_parkir_flat,
            'biaya_parkir' => $parkingCost,
            'total' => $chargingCost + $parkingCost,
        ];
    }
}
