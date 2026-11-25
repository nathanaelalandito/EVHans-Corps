<?php
namespace Tests\Unit;
use App\Models\Notifikasi;
use Carbon\Carbon;
use Tests\TestCase;
class NotifikasiIsUnreadExtraTest extends TestCase
{
    public function test_unread(){ $n=new Notifikasi(['dibaca_pada'=>null]); $this->assertTrue($n->isUnread()); }
    public function test_read(){ $n=new Notifikasi(['dibaca_pada'=>Carbon::now()]); $this->assertFalse($n->isUnread()); }
}
