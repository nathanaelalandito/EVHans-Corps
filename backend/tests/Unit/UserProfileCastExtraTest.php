<?php
namespace Tests\Unit;
use App\Models\UserProfile;
use Carbon\Carbon;
use Tests\TestCase;
class UserProfileCastExtraTest extends TestCase
{
    public function test_date(){ $p=new UserProfile(['tanggal_lahir'=>'1995-01-01']); $this->assertInstanceOf(Carbon::class,$p->tanggal_lahir); }
}
