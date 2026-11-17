<?php

namespace App\Console\Commands;

use App\Services\TopupExpiryService;
use Illuminate\Console\Command;

class ExpireTopups extends Command
{
    protected $signature = 'topups:expire';

    protected $description = 'Mark expired pending top ups failed and notify their owners.';

    public function handle(TopupExpiryService $expiryService): int
    {
        $count = $expiryService->expireDue();
        $this->info("Expired {$count} top up(s).");

        return self::SUCCESS;
    }
}
