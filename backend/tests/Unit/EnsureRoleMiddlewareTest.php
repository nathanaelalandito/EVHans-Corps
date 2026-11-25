<?php

namespace Tests\Unit;

use App\Http\Middleware\EnsureRole;
use App\Models\User;
use Illuminate\Http\Request;
use Symfony\Component\HttpKernel\Exception\HttpException;
use Tests\TestCase;

class EnsureRoleMiddlewareTest extends TestCase
{
    public function test_allowed_role_passes(): void
    {
        $user=new User(['peran'=>'admin']);
        $request=Request::create('/');
        $request->setUserResolver(fn()=>$user);
        $mw=new EnsureRole();
        $res=$mw->handle($request, fn($r)=>'next','admin','operator');
        $this->assertSame('next',$res);
    }

    public function test_disallowed_role_aborts(): void
    {
        $user=new User(['peran'=>'driver']);
        $request=Request::create('/');
        $request->setUserResolver(fn()=>$user);
        $mw=new EnsureRole();
        try {
            $mw->handle($request, fn($r)=>'next','admin');
            $this->fail('expected abort');
        } catch (HttpException $e) {
            $this->assertSame(403,$e->getStatusCode());
        }
    }

    public function test_no_user_aborts(): void
    {
        $request=Request::create('/');
        $request->setUserResolver(fn()=>null);
        $mw=new EnsureRole();
        try {
            $mw->handle($request, fn($r)=>'next','admin');
            $this->fail('expected abort');
        } catch (HttpException $e) {
            $this->assertSame(403,$e->getStatusCode());
        }
    }
}
