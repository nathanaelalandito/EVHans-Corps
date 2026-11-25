<?php

namespace Tests\Unit;

use App\Models\MetodePembayaran;
use Tests\TestCase;

class MetodePembayaranModelTest extends TestCase
{
    public function test_fillable(): void
    {
        $m = new MetodePembayaran();
        $this->assertContains('nama_metode', $m->getFillable());
        $this->assertContains('biaya_layanan', $m->getFillable());
    }

    public function test_casts_biaya_layanan_int(): void
    {
        $m = new MetodePembayaran(['biaya_layanan' => '500']);
        $this->assertSame(500, $m->biaya_layanan);
    }
}
