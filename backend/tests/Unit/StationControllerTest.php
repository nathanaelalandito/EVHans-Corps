<?php

namespace Tests\Unit;

use App\Http\Controllers\Api\StationController;
use PHPUnit\Framework\TestCase;

class StationControllerTest extends TestCase
{
    public function test_class_exists(): void
    {
        $this->assertTrue(class_exists(StationController::class));
    }

    public function test_has_methods(): void
    {
        $rc=new \ReflectionClass(StationController::class);
        $this->assertGreaterThan(0, count($rc->getMethods(\ReflectionMethod::IS_PUBLIC)));
    }
}
