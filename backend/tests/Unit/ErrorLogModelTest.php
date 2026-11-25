<?php

namespace Tests\Unit;

use App\Models\ErrorLog;
use Tests\TestCase;

class ErrorLogModelTest extends TestCase
{
    public function test_fillable_contains_expected(): void
    {
        $model = new ErrorLog();
        $this->assertContains('jenis_error', $model->getFillable());
        $this->assertContains('status_tanganan', $model->getFillable());
    }

    public function test_relations_exist(): void
    {
        $this->assertTrue(method_exists(ErrorLog::class, 'charger'));
        $this->assertTrue(method_exists(ErrorLog::class, 'session'));
        $this->assertTrue(method_exists(ErrorLog::class, 'user'));
    }
}
