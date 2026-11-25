<?php

namespace Tests\Unit;

use App\Http\Controllers\Api\UserController;
use PHPUnit\Framework\TestCase;

class UserControllerTest extends TestCase
{
    public function test_class_exists(): void
    {
        $this->assertTrue(class_exists(UserController::class));
    }

    public function test_has_methods(): void
    {
        $rc=new \ReflectionClass(UserController::class);
        $this->assertGreaterThan(0, count($rc->getMethods(\ReflectionMethod::IS_PUBLIC)));
    }
}
