<?php

namespace Tests\Unit;

use App\Http\Resources\ProfileDriverResource;
use App\Models\User;
use App\Models\UserProfile;
use Carbon\Carbon;
use Illuminate\Http\Request;
use Tests\TestCase;

class ProfileDriverResourceTest extends TestCase
{
    public function test_to_array(): void
    {
        $user=new User(['id_user'=>'U1','peran'=>'driver','status_akun'=>'Aktif','email'=>'a@b.com','email_verified_at'=>null]);
        $profile=new UserProfile(['nama_lengkap'=>'John','nomor_telepon'=>'0812','alamat'=>'Jl','tanggal_lahir'=>'1990-01-01']);
        $user->setRelation('profile',$profile);
        $arr=(new ProfileDriverResource($user))->toArray(new Request());
        $this->assertSame('U1',$arr['id_user']);
        $this->assertSame('John',$arr['nama_lengkap']);
        $this->assertFalse($arr['email_verified']);
        $this->assertNotNull($arr['umur']);
    }
}
