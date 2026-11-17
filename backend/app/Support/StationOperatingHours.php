<?php

namespace App\Support;

use Carbon\CarbonImmutable;

/** Jam operasional station dihitung konsisten dalam zona waktu operasional WIB. */
final class StationOperatingHours
{
    public static function isOpen(?string $openTime, ?string $closeTime, ?CarbonImmutable $now = null): bool
    {
        if (! $openTime || ! $closeTime) {
            return true;
        }

        $openTime = substr($openTime, 0, 5);
        $closeTime = substr($closeTime, 0, 5);
        if ($openTime === '00:00' && in_array($closeTime, ['23:59', '00:00'], true)) {
            return true;
        }

        $current = ($now ?? CarbonImmutable::now('Asia/Jakarta'))->setTimezone('Asia/Jakarta')->format('H:i');

        return $closeTime > $openTime
            ? ($current >= $openTime && $current < $closeTime)
            : ($current >= $openTime || $current < $closeTime);
    }

    public static function nextOpenTime(?string $openTime, ?string $closeTime, ?CarbonImmutable $now = null): ?string
    {
        if (! $openTime || ! $closeTime || self::isOpen($openTime, $closeTime, $now)) {
            return null;
        }

        return substr($openTime, 0, 5);
    }
}
