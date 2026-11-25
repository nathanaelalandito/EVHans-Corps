<?php
namespace Tests\Unit;
use App\Support\StationOperatingHours;
use PHPUnit\Framework\TestCase;
class StationOperatingHoursAllDayTest extends TestCase
{
    public function test_all_day(){ $this->assertTrue(StationOperatingHours::isOpen('00:00','23:59')); }
    public function test_missing(){ $this->assertTrue(StationOperatingHours::isOpen(null,null)); }
}
