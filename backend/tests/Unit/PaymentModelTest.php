<?php

namespace Tests\Unit;

use App\Models\Payment;
use Tests\TestCase;

class PaymentModelTest extends TestCase
{
    public function test_fillable(): void
    {
        $p = new Payment();
        $this->assertContains('total_bayar', $p->getFillable());
        $this->assertContains('status_pembayaran', $p->getFillable());
    }

    public function test_casts_total_bayar_int(): void
    {
        $p = new Payment(['total_bayar' => '12345']);
        $this->assertSame(12345, $p->total_bayar);
    }

    public function test_relations_exist(): void
    {
        $this->assertTrue(method_exists(Payment::class, 'session'));
        $this->assertTrue(method_exists(Payment::class, 'method'));
        $this->assertTrue(method_exists(Payment::class, 'topup'));
    }
}
