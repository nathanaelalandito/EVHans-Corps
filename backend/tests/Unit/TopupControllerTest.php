<?php

namespace Tests\Unit;

use App\Http\Controllers\Api\TopupController;
use PHPUnit\Framework\TestCase;

class TopupControllerTest extends TestCase
{
    public function test_class_exists(): void
    {
        $this->assertTrue(class_exists(TopupController::class));
    }

    public function test_has_methods(): void
    {
        $rc=new \ReflectionClass(TopupController::class);
        $this->assertGreaterThan(0, count($rc->getMethods(\ReflectionMethod::IS_PUBLIC)));
    }
}
