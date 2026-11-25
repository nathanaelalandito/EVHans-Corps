<?php

namespace Tests\Unit;

use App\Http\Controllers\AuthController;
use PHPUnit\Framework\TestCase;

class AuthControllerTest extends TestCase
{
    public function test_class_exists(): void
    {
        $this->assertTrue(class_exists(AuthController::class));
    }

    public function test_has_methods(): void
    {
        $rc=new \ReflectionClass(AuthController::class);
        $this->assertGreaterThan(0, count($rc->getMethods(\ReflectionMethod::IS_PUBLIC)));
    }
}
