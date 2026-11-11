<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class ChargingSession extends Model
{
    use HasFactory;

    /** Status sesi yang dianggap masih aktif (sama dengan enum kolom `status`). */
    public const AKTIF = ['Pending', 'Berlangsung'];

    protected $table = 'charging_session';

    protected $primaryKey = 'id_session';

    protected $guarded = [];

    protected $casts = [
        'waktu_mulai' => 'datetime',
        'waktu_selesai' => 'datetime',
        'total_energi_kwh' => 'float',
        'target_energi_kwh' => 'float',
        'estimasi_biaya_charging' => 'integer',
        'estimasi_biaya_parkir' => 'integer',
        'saldo_hold' => 'integer',
        'soc_awal' => 'integer',
        'soc_akhir' => 'integer',
        'deteksi_otomatis' => 'boolean',
        'heartbeat_terakhir' => 'datetime',
    ];

    /** Kategori penyebab gangguan yang dilaporkan driver. */
    public const KATEGORI_GANGGUAN = [
        'listrik' => 'Listrik padam',
        'perangkat' => 'Kerusakan perangkat',
        'konektor' => 'Masalah konektor',
        'lainnya' => 'Gangguan lain',
    ];

    public function user()
    {
        return $this->belongsTo(User::class, 'id_user', 'id_user');
    }

    public function charger()
    {
        return $this->belongsTo(Charger::class, 'id_charger', 'id_charger');
    }

    /** Port (konektor) yang dipakai sesi ini. */
    public function port()
    {
        return $this->belongsTo(Port::class, 'id_port', 'id_port');
    }

    public function tarif()
    {
        return $this->belongsTo(Tarif::class, 'id_tarif', 'id_tarif');
    }

    public function vehicle()
    {
        return $this->belongsTo(Vehicle::class, 'id_vehicle', 'id_vehicle');
    }

    public function payment()
    {
        return $this->hasOne(Payment::class, 'id_session', 'id_session');
    }

    /** Estimasi total (charging + parkir) yang di-hold saat sesi dimulai. */
    public function estimasiBiaya(): int
    {
        return (int) $this->estimasi_biaya_charging + (int) $this->estimasi_biaya_parkir;
    }

    /** Apakah sesi berjalan tapi tidak ada heartbeat dalam batas waktu tertentu. */
    public function heartbeatIsStale(int $timeoutSeconds): bool
    {
        if ($this->status !== 'Berlangsung') {
            return false;
        }

        $lastBeat = $this->heartbeat_terakhir ?? $this->waktu_mulai;

        return $lastBeat !== null && $lastBeat->lt(now()->subSeconds($timeoutSeconds));
    }
}
