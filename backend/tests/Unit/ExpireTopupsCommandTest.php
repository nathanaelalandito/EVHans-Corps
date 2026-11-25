<?php

namespace Tests\Unit;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ExpireTopupsCommandTest extends TestCase
{
    use RefreshDatabase;

    public function test_command_runs(): void
    {
        $this->artisan('topups:expire')->assertExitCode(0);
    }
}
