<?php

namespace Tests\Unit;

use App\Models\Dompet;
use App\Models\Topup;
use App\Models\User;
use App\Models\UserProfile;
use App\Services\TopupExpiryService;
use Carbon\Carbon;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class TopupExpiryServiceTest extends TestCase
{
    use RefreshDatabase;

    private function makeUser(string $id): User
    {
        $u=User::create(['id_user'=>$id,'email'=>$id.'@t.com','password'=>bcrypt('x'),'peran'=>'driver','status_akun'=>'Aktif']);
        UserProfile::create(['id_user'=>$u->id_user,'nama_lengkap'=>'D','nomor_telepon'=>'081234567890','alamat'=>'Jl','tanggal_lahir'=>'1995-01-01']);
        Dompet::create(['id_user'=>$u->id_user,'saldo'=>0,'saldo_hold'=>0,'status_dompet'=>'Aktif']);
        return $u;
    }

    public function test_expire_if_due_marks_failed(): void
    {
        $user=$this->makeUser('DRV1');
        $wallet=Dompet::where('id_user',$user->id_user)->first();
        $topup=Topup::create([
            'id_wallet'=>$wallet->id_wallet,
            'nominal'=>10000,
            'status_topup'=>'Pending',
            'kedaluwarsa_pada'=>Carbon::now()->subMinute(),
            'referensi'=>'REF1',
            'waktu_topup'=>Carbon::now()->subMinutes(5),
        ]);
        $res=app(TopupExpiryService::class)->expireIfDue($topup->id_topup);
        $this->assertTrue($res);
        $this->assertSame('Gagal', $topup->fresh()->status_topup);
    }

    public function test_expire_if_due_not_due(): void
    {
        $user=$this->makeUser('DRV2');
        $wallet=Dompet::where('id_user',$user->id_user)->first();
        $topup=Topup::create([
            'id_wallet'=>$wallet->id_wallet,
            'nominal'=>10000,
            'status_topup'=>'Pending',
            'kedaluwarsa_pada'=>Carbon::now()->addHour(),
            'referensi'=>'REF2',
            'waktu_topup'=>Carbon::now(),
        ]);
        $res=app(TopupExpiryService::class)->expireIfDue($topup->id_topup);
        $this->assertFalse($res);
        $this->assertSame('Pending', $topup->fresh()->status_topup);
    }

    public function test_expire_if_due_already_failed(): void
    {
        $user=$this->makeUser('DRV3');
        $wallet=Dompet::where('id_user',$user->id_user)->first();
        $topup=Topup::create([
            'id_wallet'=>$wallet->id_wallet,
            'nominal'=>10000,
            'status_topup'=>'Gagal',
            'kedaluwarsa_pada'=>Carbon::now()->subMinute(),
            'referensi'=>'REF3',
            'waktu_topup'=>Carbon::now()->subMinutes(5),
        ]);
        $this->assertFalse(app(TopupExpiryService::class)->expireIfDue($topup->id_topup));
    }

    public function test_expire_due_processes(): void
    {
        $user=$this->makeUser('DRV4');
        $wallet=Dompet::where('id_user',$user->id_user)->first();
        Topup::create([
            'id_wallet'=>$wallet->id_wallet,
            'nominal'=>10000,
            'status_topup'=>'Pending',
            'kedaluwarsa_pada'=>Carbon::now()->subMinute(),
            'referensi'=>'REF4',
            'waktu_topup'=>Carbon::now()->subMinutes(5),
        ]);
        $count=app(TopupExpiryService::class)->expireDue();
        $this->assertSame(1,$count);
    }
}
