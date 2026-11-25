<?php

namespace Tests\Unit;

use App\Models\Vehicle;
use Tests\TestCase;

class VehicleModelTest extends TestCase
{
    public function test_fillable(): void
    {
        $v = new Vehicle();
        $this->assertContains('tipe_konektor', $v->getFillable());
        $this->assertContains('kapasitas_baterai_kwh', $v->getFillable());
    }

    public function test_relations_exist(): void
    {
        $this->assertTrue(method_exists(Vehicle::class, 'user'));
    }
}
