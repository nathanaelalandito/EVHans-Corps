<?php
namespace Tests\Unit;
use App\Models\User;
use PHPUnit\Framework\TestCase;
class UserIncrementingExtraTest extends TestCase
{
    public function test_incrementing_false(){ $u=new User(); $this->assertFalse($u->getIncrementing()); }
    public function test_key_type(){ $u=new User(); $this->assertSame('string',$u->getKeyType()); }
}
