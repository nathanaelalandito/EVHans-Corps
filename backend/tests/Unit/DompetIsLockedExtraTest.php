<?php
namespace Tests\Unit;
use App\Models\Dompet;
use Carbon\Carbon;
use Tests\TestCase;
class DompetIsLockedExtraTest extends TestCase
{
    public function test_future(){ $d=new Dompet(['locked_until'=>Carbon::now()->addMinute()]); $this->assertTrue($d->isLocked()); }
    public function test_past(){ $d=new Dompet(['locked_until'=>Carbon::now()->subMinute()]); $this->assertFalse($d->isLocked()); }
    public function test_null(){ $d=new Dompet(['locked_until'=>null]); $this->assertFalse($d->isLocked()); }
}
