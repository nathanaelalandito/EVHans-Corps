<?php

namespace Tests\Unit;

use App\Http\Controllers\Api\NotificationController;
use PHPUnit\Framework\TestCase;

class NotificationControllerTest extends TestCase
{
    public function test_class_exists(): void
    {
        $this->assertTrue(class_exists(NotificationController::class));
    }

    public function test_has_methods(): void
    {
        $rc=new \ReflectionClass(NotificationController::class);
        $this->assertGreaterThan(0, count($rc->getMethods(\ReflectionMethod::IS_PUBLIC)));
    }
}
