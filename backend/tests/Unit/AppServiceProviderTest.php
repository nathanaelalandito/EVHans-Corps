<?php

namespace Tests\Unit;

use App\Providers\AppServiceProvider;
use Illuminate\Support\Facades\RateLimiter;
use Tests\TestCase;

class AppServiceProviderTest extends TestCase
{
    public function test_boot_registers_login_limiter(): void
    {
        $provider=new AppServiceProvider(app());
        $provider->boot();
        $this->assertNotNull(RateLimiter::limiter('login'));
    }
}
