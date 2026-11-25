<?php
namespace Tests\Unit;
use App\Models\AuditLog;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;
class AuditLogCastExtraTest extends TestCase
{
    use RefreshDatabase;
    public function test_casts(){
        $log=AuditLog::create(['aksi'=>'a','entitas'=>'e','data_sebelum'=>['x'=>1],'data_sesudah'=>['y'=>2]]);
        $this->assertSame(['x'=>1],$log->data_sebelum);
        $this->assertSame(['y'=>2],$log->data_sesudah);
    }
}
