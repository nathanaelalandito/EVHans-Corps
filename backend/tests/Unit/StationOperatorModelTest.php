<?php

namespace Tests\Unit;

use App\Models\StationOperator;
use Tests\TestCase;

class StationOperatorModelTest extends TestCase
{
    public function test_fillable(): void
    {
        $m = new StationOperator();
        $this->assertContains('id_user', $m->getFillable());
        $this->assertContains('id_location', $m->getFillable());
    }

    public function test_relations_exist(): void
    {
        $this->assertTrue(method_exists(StationOperator::class, 'user'));
        $this->assertTrue(method_exists(StationOperator::class, 'location'));
    }
}
