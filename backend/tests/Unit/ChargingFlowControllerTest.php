<?php

namespace Tests\Unit;

use App\Http\Controllers\Api\ChargingFlowController;
use PHPUnit\Framework\TestCase;

class ChargingFlowControllerTest extends TestCase
{
    public function test_class_exists(): void
    {
        $this->assertTrue(class_exists(ChargingFlowController::class));
    }

    public function test_has_methods(): void
    {
        $rc=new \ReflectionClass(ChargingFlowController::class);
        $this->assertGreaterThan(0, count($rc->getMethods(\ReflectionMethod::IS_PUBLIC)));
    }
}
