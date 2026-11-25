<?php

namespace Tests\Unit;

use App\Helpers\MateriHelper;
use InvalidArgumentException;
use PHPUnit\Framework\TestCase;

class MateriModelTest extends TestCase
{
    public function test_format_kode_pertanyaan_mengembalikan_format_yang_benar(): void
    {
        $this->assertSame('UNIT3_2', MateriHelper::formatKodePertanyaan(3, 2));
    }

    public function test_format_kode_pertanyaan_menghapus_spasi_berlebih(): void
    {
        $this->assertSame('UNIT3_2', MateriHelper::formatKodePertanyaan('  3 ', ' 2  '));
    }

    public function test_format_kode_pertanyaan_melempar_exception_jika_kosong(): void
    {
        $this->expectException(InvalidArgumentException::class);
        MateriHelper::formatKodePertanyaan('', '   ');
    }

    public function test_format_nama_pdf_exercise_sesuai_pola(): void
    {
        $this->assertSame(
            'Course - UNIT 3 (View Exercise-2).pdf',
            MateriHelper::formatNamaPdfExercise(3, 2)
        );
    }
}