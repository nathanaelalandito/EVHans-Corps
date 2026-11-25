<?php

namespace Tests\Unit;

use App\Http\Controllers\Api\OperationsController;
use PHPUnit\Framework\TestCase;

class OperationsControllerTest extends TestCase
{
    public function test_class_exists(): void
    {
        $this->assertTrue(class_exists(OperationsController::class));
    }

    public function test_has_methods(): void
    {
        $rc=new \ReflectionClass(OperationsController::class);
        $this->assertGreaterThan(0, count($rc->getMethods(\ReflectionMethod::IS_PUBLIC)));
    }
}
