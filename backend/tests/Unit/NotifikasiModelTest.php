<?php

namespace Tests\Unit;

use App\Models\Notifikasi;
use Carbon\Carbon;
use Tests\TestCase;

class NotifikasiModelTest extends TestCase
{
    public function test_is_unread_null(): void
    {
        $n = new Notifikasi(['dibaca_pada' => null]);
        $this->assertTrue($n->isUnread());
    }

    public function test_is_unread_set(): void
    {
        $n = new Notifikasi(['dibaca_pada' => Carbon::now()]);
        $this->assertFalse($n->isUnread());
    }
}
