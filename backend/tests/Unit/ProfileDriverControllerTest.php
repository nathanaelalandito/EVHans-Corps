<?php

namespace Tests\Unit;

use App\Http\Controllers\Api\ProfileDriverController;
use PHPUnit\Framework\TestCase;

class ProfileDriverControllerTest extends TestCase
{
    public function test_class_exists(): void
    {
        $this->assertTrue(class_exists(ProfileDriverController::class));
    }

    public function test_has_methods(): void
    {
        $rc=new \ReflectionClass(ProfileDriverController::class);
        $this->assertGreaterThan(0, count($rc->getMethods(\ReflectionMethod::IS_PUBLIC)));
    }
}
