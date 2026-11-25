<?php

namespace Tests\Unit;

use App\Models\AuditLog;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class AuditLogModelTest extends TestCase
{
    use RefreshDatabase;

    public function test_audit_log_casts_json_arrays(): void
    {
        $log = AuditLog::create([
            'aksi' => 'test',
            'entitas' => 'x',
            'data_sebelum' => ['a' => 1],
            'data_sesudah' => ['b' => 2],
        ]);

        $this->assertSame(['a' => 1], $log->data_sebelum);
        $this->assertSame(['b' => 2], $log->data_sesudah);
    }

    public function test_audit_log_belongs_to_user_and_location(): void
    {
        $this->assertTrue(method_exists(AuditLog::class, 'user'));
        $this->assertTrue(method_exists(AuditLog::class, 'location'));
    }
}
