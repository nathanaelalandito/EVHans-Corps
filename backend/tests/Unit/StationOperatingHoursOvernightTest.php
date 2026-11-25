<?php

namespace Tests\Unit;

use App\Support\StationOperatingHours;
use Carbon\CarbonImmutable;
use PHPUnit\Framework\TestCase;

class StationOperatingHoursOvernightTest extends TestCase
{
    public function test_overnight_open(): void
    {
        $now=CarbonImmutable::parse('2026-11-18 00:30','Asia/Jakarta');
        $this->assertTrue(StationOperatingHours::isOpen('23:00','01:00',$now));
        $this->assertNull(StationOperatingHours::nextOpenTime('23:00','01:00',$now));
    }

    public function test_overnight_closed(): void
    {
        $now=CarbonImmutable::parse('2026-11-18 12:00','Asia/Jakarta');
        $this->assertFalse(StationOperatingHours::isOpen('23:00','01:00',$now));
    }
}
