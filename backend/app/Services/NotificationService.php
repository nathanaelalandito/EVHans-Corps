<?php

namespace App\Services;

use App\Models\Charger;
use App\Models\Notifikasi;
use App\Models\User;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

class NotificationService
{
    public function notifySessionCompleted($session, int $actualCost, int $refund): void
    {
        $this->safeCreate($session->id_user, 'charging_selesai', 'Charging selesai', "Sesi charging selesai. Biaya aktual Rp{$actualCost}, sisa hold Rp{$refund} dikembalikan.", $session->id_session, 'charging_session', "session_completed:{$session->id_session}");
    }

    public function notifySessionFailed($session, string $status, int $actualCost, int $refund): void
    {
        $this->safeCreate($session->id_user, 'charging_gagal', "Charging {$status}", "Sesi charging {$status}. Biaya aktual Rp{$actualCost}, sisa hold Rp{$refund} dikembalikan.", $session->id_session, 'charging_session', "session_failed:{$session->id_session}:{$status}");
    }

    public function notifyTopupFailed(string $userId, $topup, string $reason): void
    {
        $this->safeCreate($userId, 'topup_gagal', 'Top up gagal', "Top up {$topup->referensi} gagal: {$reason}.", $topup->id_topup ?? null, 'topup', "topup_failed:{$topup->id_topup}:{$reason}");
    }

    public function notifyChargerIssue(Charger $charger, string $status, ?string $reason = null, array $driverIds = []): void
    {
        $recipients = collect();

        $admins = User::where('peran', 'admin')->where('status_akun', 'Aktif')->pluck('id_user');
        $recipients = $recipients->merge($admins);

        $operatorIds = DB::table('station_operators')
            ->where('id_location', $charger->id_location)
            ->pluck('id_user');
        $recipients = $recipients->merge($operatorIds);

        $activeDriverIds = DB::table('charging_session')
            ->where('id_charger', $charger->id_charger)
            ->where('status', 'Berlangsung')
            ->pluck('id_user');
        $recipients = $recipients->merge($activeDriverIds);
        $recipients = $recipients->merge($driverIds);

        foreach ($recipients->unique() as $userId) {
            $this->safeCreate(
                $userId,
                'charger_gangguan',
                'Gangguan charger',
                "Charger {$charger->kode_perangkat} berstatus {$status}." . ($reason ? " Alasan: {$reason}." : ''),
                $charger->id_charger,
                'charger',
                "charger_issue:{$charger->id_charger}:{$status}:{$userId}"
            );
        }
    }

    private function safeCreate(?string $userId, string $type, string $title, string $message, $entityId, string $entityType, string $dedupKey): void
    {
        if (! $userId) {
            return;
        }

        try {
            Notifikasi::firstOrCreate(
                ['dedup_key' => $dedupKey],
                [
                    'id_user' => $userId,
                    'tipe' => $type,
                    'judul' => $title,
                    'pesan' => $message,
                    'id_entitas' => $entityId !== null ? (string) $entityId : null,
                    'tipe_entitas' => $entityType,
                ]
            );
        } catch (\Throwable $e) {
            Log::warning('Gagal membuat notifikasi: ' . $e->getMessage());
        }
    }
}
