<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Port extends Model
{
    use HasFactory;

    protected $table = 'ports';
    protected $primaryKey = 'id_port';

    protected $fillable = [
        'id_charger',
        'nomor_port',
        'tipe_konektor',
        'tipe_charging',
        'daya_maks_kw',
        'status_port',
    ];

    protected $casts = [
        'daya_maks_kw' => 'float',
    ];

    public const CONNECTOR_LABELS = [
        'type_2' => 'Type 2',
        'ccs2' => 'CCS2',
        'chademo' => 'CHAdeMO',
        'gbt' => 'GB/T',
    ];

    /** Nilai enum `status_port`. */
    public const AVAILABLE = 'Available';
    public const CHARGING = 'Charging';

    // Relasi: Banyak Port milik 1 Charger
    public function charger()
    {
        return $this->belongsTo(Charger::class, 'id_charger', 'id_charger');
    }

    public function sessions()
    {
        return $this->hasMany(ChargingSession::class, 'id_port', 'id_port');
    }

    /**
     * Samakan penulisan konektor: kendaraan menyimpan 'type_2' / 'ccs2',
     * seeder menyimpan hal yang sama, sedangkan form operator menyimpan label
     * ('Type 2', 'CCS2'). Semuanya dipetakan ke satu kunci, mis. 'type2', 'gbt'.
     */
    public static function connectorKey(?string $connector): string
    {
        return preg_replace('/[^a-z0-9]/', '', strtolower((string) $connector));
    }

    public function connectorLabel(): string
    {
        return self::CONNECTOR_LABELS[$this->tipe_konektor] ?? (string) $this->tipe_konektor;
    }

    /** Apakah konektor port ini cocok dengan konektor kendaraan? */
    public function matchesConnector(?string $vehicleConnector): bool
    {
        return self::connectorKey($this->tipe_konektor) === self::connectorKey($vehicleConnector);
    }

    public function isAvailable(): bool
    {
        return strtolower((string) $this->status_port) === 'available';
    }
}
