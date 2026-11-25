<?php

namespace App\Helpers;

use InvalidArgumentException;

class MateriHelper
{
    /** Membuat kode unik pertanyaan dengan format UNIT{noUnit}_{noExercise}. */
    public static function formatKodePertanyaan(string|int $noUnit, string|int $noExercise): string
    {
        $unit = trim((string) $noUnit);
        $exercise = trim((string) $noExercise);

        if ($unit === '' || $exercise === '') {
            throw new InvalidArgumentException('Nomor unit dan nomor exercise tidak boleh kosong.');
        }

        return "UNIT{$unit}_{$exercise}";
    }

    /** Membuat nama file PDF untuk exercise. */
    public static function formatNamaPdfExercise(string|int $noUnit, string|int $noExercise): string
    {
        $unit = trim((string) $noUnit);
        $exercise = trim((string) $noExercise);

        if ($unit === '' || $exercise === '') {
            throw new InvalidArgumentException('Nomor unit dan nomor exercise tidak boleh kosong.');
        }

        return "Course - UNIT {$unit} (View Exercise-{$exercise}).pdf";
    }
}