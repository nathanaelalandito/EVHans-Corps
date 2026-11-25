<?php

namespace Tests\Unit;

use App\Support\StationOperatingHours;
use Carbon\CarbonImmutable;
use PHPUnit\Framework\TestCase;

class StationOperatingHoursClosedTest extends TestCase
{
    public function test_closed_returns_next_open(): void
    {
        $now=CarbonImmutable::parse('2026-11-17 12:00','Asia/Jakarta');
        $this->assertFalse(StationOperatingHours::isOpen('08:00','10:00',$now));
        $this->assertSame('08:00',StationOperatingHours::nextOpenTime('08:00','10:00',$now));
    }

    public function test_open_time_null_when_open(): void
    {
        $now=CarbonImmutable::parse('2026-11-18 09:00','Asia/Jakarta');
        $this->assertNull(StationOperatingHours::nextOpenTime('08:00','10:00',$now));
    }
}
