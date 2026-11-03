<?php

namespace App\Console\Commands;

use App\Models\ChargingSession;
use App\Services\ChargingSessionSettler;
use Illuminate\Console\Command;

/**
 * Watchdog sesi charging: menandai sesi yang berhenti mendadak (heartbeat
 * hilang, mis. listrik padam atau perangkat mati) sebagai gagal, lalu
 * mengembalikan sisa hold, menandai port Out of Order, dan membuat
 * notifikasi (error_log) untuk operator station.
 */
class DetectChargingFailures extends Command
{
    protected $signature = 'charging:detect-failures {--dry-run : Tampilkan sesi yang terdeteksi tanpa menyelesaikannya}';

    protected $description = 'Deteksi sesi charging yang berhenti mendadak dan tangani otomatis';

    public function handle(ChargingSessionSettler $settler): int
    {
        if (! config('charging.failure_detection_enabled', true)) {
            $this->info('Deteksi kegagalan dinonaktifkan (CHARGING_FAILURE_DETECTION=false).');

            return self::SUCCESS;
        }

        $timeout = (int) config('charging.heartbeat_timeout_seconds', 120);
        $cutoff = now()->subSeconds($timeout);

        $sessions = ChargingSession::with(['charger', 'port', 'vehicle', 'tarif'])
            ->where('status', 'Berlangsung')
            ->where(function ($query) use ($cutoff) {
                $query->where('heartbeat_terakhir', '<', $cutoff)
                    ->orWhere(function ($fallback) use ($cutoff) {
                        $fallback->whereNull('heartbeat_terakhir')
                            ->where('waktu_mulai', '<', $cutoff);
                    });
            })
            ->get();

        if ($sessions->isEmpty()) {
            $this->info('Tidak ada sesi charging yang terputus.');

            return self::SUCCESS;
        }

        $handled = 0;

        foreach ($sessions as $session) {
            $simulation = $settler->simulate($session);
            $finalStatus = $simulation['sudah_penuh'] ? 'Selesai' : 'Gagal';

            if ($this->option('dry-run')) {
                $this->line(sprintf(
                    'Sesi #%d (charger %s) terdeteksi -> %s',
                    $session->id_session,
                    $session->charger?->kode_perangkat ?? '-',
                    $finalStatus
                ));

                continue;
            }

            $options = [];

            if ($finalStatus === 'Gagal') {
                $options['kegagalan'] = [
                    'kategori' => 'perangkat',
                    'sumber' => 'sistem',
                    'catatan' => "Sesi terputus otomatis: tidak ada heartbeat selama {$timeout} detik.",
                    'jenis_error' => 'Sesi terputus (deteksi otomatis)',
                    'tingkat' => 'Kritis',
                    'deteksi_otomatis' => true,
                ];
            }

            $settled = $settler->settle($session, $finalStatus, $options);

            if ($settled) {
                $handled++;
                $this->line(sprintf(
                    'Sesi #%d diselesaikan sebagai %s.',
                    $settled->id_session,
                    $finalStatus
                ));
            }
        }

        $this->info("Selesai. {$handled} sesi ditangani.");

        return self::SUCCESS;
    }
}
