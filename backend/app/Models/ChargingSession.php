<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

/** Model pencatatan satu proses pengisian kendaraan, dari mulai hingga settlement. */
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
    ];

    /** Pengemudi yang memiliki sesi charging ini. */
    public function user()
    {
        return $this->belongsTo(User::class, 'id_user', 'id_user');
    }

    /** Unit charger yang menjalankan sesi ini. */
    public function charger()
    {
        return $this->belongsTo(Charger::class, 'id_charger', 'id_charger');
    }

    /** Port (konektor) yang dipakai sesi ini. */
    public function port()
    {
        return $this->belongsTo(Port::class, 'id_port', 'id_port');
    }

    /** Tarif yang dibekukan sebagai dasar biaya pada sesi ini. */
    public function tarif()
    {
        return $this->belongsTo(Tarif::class, 'id_tarif', 'id_tarif');
    }

    /** Kendaraan yang diisi pada sesi ini. */
    public function vehicle()
    {
        return $this->belongsTo(Vehicle::class, 'id_vehicle', 'id_vehicle');
    }

    /** Transaksi pembayaran hasil penyelesaian sesi ini. */
    public function payment()
    {
        return $this->hasOne(Payment::class, 'id_session', 'id_session');
    }

    /** Estimasi total (charging + parkir) yang di-hold saat sesi dimulai. */
    public function estimasiBiaya(): int
    {
        return (int) $this->estimasi_biaya_charging + (int) $this->estimasi_biaya_parkir;
    }
}
