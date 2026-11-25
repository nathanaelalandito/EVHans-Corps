<?php

namespace Tests\Unit;

use App\Support\StationOperatingHours;
use Carbon\CarbonImmutable;
use PHPUnit\Framework\TestCase;

class StationOperatingHoursTest extends TestCase
{
    public function test_missing_hours_means_open(): void
    {
        $this->assertTrue(StationOperatingHours::isOpen(null, null));
        $this->assertTrue(StationOperatingHours::isOpen('', ''));
    }

    public function test_overnight_hours(): void
    {
        $now = CarbonImmutable::parse('2026-11-18 00:30', 'Asia/Jakarta');
        $this->assertTrue(StationOperatingHours::isOpen('23:00', '01:00', $now));
        $this->assertNull(StationOperatingHours::nextOpenTime('23:00', '01:00', $now));
    }

    public function test_closed_hours_returns_next_open(): void
    {
        $now = CarbonImmutable::parse('2026-11-17 12:00', 'Asia/Jakarta');
        $this->assertFalse(StationOperatingHours::isOpen('08:00', '10:00', $now));
        $this->assertSame('08:00', StationOperatingHours::nextOpenTime('08:00', '10:00', $now));
    }
}
