<?php

namespace Tests\Unit;

use App\Http\Controllers\Concerns\ChecksWalletPin;
use App\Models\Dompet;
use App\Models\User;
use App\Models\UserProfile;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Hash;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ChecksWalletPinTester
{
    use ChecksWalletPin;

    public function check(Dompet $wallet, string $pin): ?JsonResponse
    {
        return $this->checkWalletPin($wallet,$pin);
    }
}

class ChecksWalletPinTraitTest extends TestCase
{
    use RefreshDatabase;

    private function makeWallet(array $attrs): Dompet
    {
        $u=User::create(['id_user'=>'U'.uniqid(),'email'=>uniqid().'@t.com','password'=>bcrypt('x'),'peran'=>'driver','status_akun'=>'Aktif']);
        UserProfile::create(['id_user'=>$u->id_user,'nama_lengkap'=>'D','nomor_telepon'=>'081234567890','alamat'=>'Jl','tanggal_lahir'=>'1995-01-01']);
        $wallet=new Dompet(array_merge(['id_user'=>$u->id_user,'status_dompet'=>'Aktif'],$attrs));
        $wallet->save();
        return $wallet;
    }

    public function test_no_pin_returns_409(): void
    {
        $wallet=$this->makeWallet(['pin_transaksi'=>null]);
        $tester=new ChecksWalletPinTester();
        $res=$tester->check($wallet,'1234');
        $this->assertSame(409,$res->getStatusCode());
    }

    public function test_locked_returns_423(): void
    {
        $wallet=$this->makeWallet(['pin_transaksi'=>Hash::make('1234'),'locked_until'=>now()->addMinutes(5)]);
        $tester=new ChecksWalletPinTester();
        $res=$tester->check($wallet,'1234');
        $this->assertSame(423,$res->getStatusCode());
    }

    public function test_wrong_pin_increments(): void
    {
        $wallet=$this->makeWallet(['pin_transaksi'=>Hash::make('1234'),'percobaan_pin_gagal'=>0]);
        $tester=new ChecksWalletPinTester();
        $res=$tester->check($wallet,'0000');
        $this->assertSame(422,$res->getStatusCode());
        $this->assertSame(1,$wallet->fresh()->percobaan_pin_gagal);
    }

    public function test_correct_pin_resets_and_null(): void
    {
        $wallet=$this->makeWallet(['pin_transaksi'=>Hash::make('1234'),'percobaan_pin_gagal'=>2]);
        $tester=new ChecksWalletPinTester();
        $res=$tester->check($wallet,'1234');
        $this->assertNull($res);
        $this->assertSame(0,$wallet->fresh()->percobaan_pin_gagal);
    }

    public function test_third_wrong_locks(): void
    {
        $wallet=$this->makeWallet(['pin_transaksi'=>Hash::make('1234'),'percobaan_pin_gagal'=>2]);
        $tester=new ChecksWalletPinTester();
        $res=$tester->check($wallet,'0000');
        $this->assertSame(423,$res->getStatusCode());
        $this->assertNotNull($wallet->fresh()->locked_until);
        $this->assertSame('Terlalu banyak percobaan salah. Dompet dikunci selama 30 detik.', $res->getData()->message);
        $this->assertTrue($wallet->fresh()->locked_until->lessThanOrEqualTo(now()->addSeconds(31)));
    }
}
