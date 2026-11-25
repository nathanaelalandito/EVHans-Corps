<?php

namespace Tests\Unit;

use Database\Factories\UserFactory;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class UserFactoryTest extends TestCase
{
    use RefreshDatabase;

    public function test_factory_creates_user(): void
    {
        $user = UserFactory::new()->create();
        $this->assertNotNull($user->id_user);
        $this->assertNotNull($user->email);
    }
}
