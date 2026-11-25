<?php

namespace Tests\Unit;

use App\Http\Middleware\EnsureAccountActive;
use App\Models\User;
use Illuminate\Http\Request;
use Tests\TestCase;

class EnsureAccountActiveMiddlewareTest extends TestCase
{
    public function test_active_user_passes(): void
    {
        $user=new User(['status_akun'=>'Aktif']);
        $request=Request::create('/');
        $request->setUserResolver(fn()=>$user);
        $mw=new EnsureAccountActive();
        $res=$mw->handle($request, fn($r)=>'next');
        $this->assertSame('next',$res);
    }

    public function test_inactive_user_blocked(): void
    {
        $user=new User(['status_akun'=>'Nonaktif']);
        $request=Request::create('/');
        $request->setUserResolver(fn()=>$user);
        $mw=new EnsureAccountActive();
        $res=$mw->handle($request, fn($r)=>'next');
        $this->assertSame(403,$res->getStatusCode());
        $this->assertSame('Akun Anda sedang dinonaktifkan.', $res->getData()->message);
    }

    public function test_no_user_passes(): void
    {
        $request=Request::create('/');
        $request->setUserResolver(fn()=>null);
        $mw=new EnsureAccountActive();
        $res=$mw->handle($request, fn($r)=>'next');
        $this->assertSame('next',$res);
    }
}
