<?php

namespace Tests\Unit;

use App\Http\Controllers\Api\DompetPinController;
use PHPUnit\Framework\TestCase;

class DompetPinControllerTest extends TestCase
{
    public function test_class_exists(): void
    {
        $this->assertTrue(class_exists(DompetPinController::class));
    }

    public function test_has_methods(): void
    {
        $rc=new \ReflectionClass(DompetPinController::class);
        $this->assertGreaterThan(0, count($rc->getMethods(\ReflectionMethod::IS_PUBLIC)));
    }
}
