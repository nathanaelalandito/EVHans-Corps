<?php

namespace Tests\Unit;

use App\Models\Topup;
use Tests\TestCase;

class TopupModelTest extends TestCase
{
    public function test_fillable(): void
    {
        $t = new Topup();
        $this->assertContains('nominal', $t->getFillable());
        $this->assertContains('status_topup', $t->getFillable());
    }

    public function test_casts_nominal_int(): void
    {
        $t = new Topup(['nominal' => '5000']);
        $this->assertSame(5000, $t->nominal);
    }

    public function test_relations_exist(): void
    {
        $this->assertTrue(method_exists(Topup::class, 'wallet'));
        $this->assertTrue(method_exists(Topup::class, 'payment'));
        $this->assertTrue(method_exists(Topup::class, 'method'));
    }
}
