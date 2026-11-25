<?php

namespace Tests\Unit;

use App\Http\Controllers\Api\ChargingSessionController;
use PHPUnit\Framework\TestCase;

class ChargingSessionControllerTest extends TestCase
{
    public function test_class_exists(): void
    {
        $this->assertTrue(class_exists(ChargingSessionController::class));
    }

    public function test_has_methods(): void
    {
        $rc=new \ReflectionClass(ChargingSessionController::class);
        $this->assertGreaterThan(0, count($rc->getMethods(\ReflectionMethod::IS_PUBLIC)));
    }
}
