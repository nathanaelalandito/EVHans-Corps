<?php

namespace App\Services;

use App\Models\Topup;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

class TopupExpiryService
{
    /** Mark one due pending top up as failed and notify its owner exactly once. */
    public function expireIfDue(int $topupId): bool
    {
        $expired = DB::transaction(function () use ($topupId): ?Topup {
            $topup = Topup::query()->lockForUpdate()->find($topupId);
            if (! $topup || $topup->status_topup !== 'Pending' || ! $topup->kedaluwarsa_pada?->lte(now())) {
                return null;
            }

            $topup->update(['status_topup' => 'Gagal']);

            return $topup->fresh();
        });

        if (! $expired) {
            return false;
        }

        try {
            $userId = DB::table('dompet')->where('id_wallet', $expired->id_wallet)->value('id_user');
            app(NotificationService::class)->notifyTopupFailed((string) $userId, $expired, 'kedaluwarsa');
        } catch (\Throwable $exception) {
            Log::warning('Gagal mengirim notifikasi top up: '.$exception->getMessage());
        }

        return true;
    }

    /** Process all currently expired pending top ups without relying on polling. */
    public function expireDue(): int
    {
        $processed = 0;

        Topup::query()
            ->where('status_topup', 'Pending')
            ->whereNotNull('kedaluwarsa_pada')
            ->where('kedaluwarsa_pada', '<=', now())
            ->select('id_topup')
            ->chunkById(100, function ($rows) use (&$processed): void {
                foreach ($rows as $row) {
                    if ($this->expireIfDue((int) $row->id_topup)) {
                        $processed++;
                    }
                }
            }, 'id_topup');

        return $processed;
    }
}
