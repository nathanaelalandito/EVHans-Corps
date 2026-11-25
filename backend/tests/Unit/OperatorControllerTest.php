<?php

namespace Tests\Unit;

use App\Http\Controllers\Api\OperatorController;
use PHPUnit\Framework\TestCase;

class OperatorControllerTest extends TestCase
{
    public function test_class_exists(): void
    {
        $this->assertTrue(class_exists(OperatorController::class));
    }

    public function test_has_methods(): void
    {
        $rc=new \ReflectionClass(OperatorController::class);
        $this->assertGreaterThan(0, count($rc->getMethods(\ReflectionMethod::IS_PUBLIC)));
    }
}
