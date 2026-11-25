<?php

namespace Tests\Unit;

use App\Models\User;
use Tests\TestCase;

class UserModelTest extends TestCase
{
    public function test_incrementing_false(): void
    {
        $u = new User();
        $this->assertFalse($u->getIncrementing());
    }

    public function test_key_type_string(): void
    {
        $u = new User();
        $this->assertSame('string', $u->getKeyType());
    }

    public function test_relations_exist(): void
    {
        foreach (['profile','dompet','vehicles','chargingSessions','errorLog','stationoperator'] as $r) {
            $this->assertTrue(method_exists(User::class, $r), $r);
        }
    }
}
