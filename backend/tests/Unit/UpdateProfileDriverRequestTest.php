<?php

namespace Tests\Unit;

use App\Http\Requests\UpdateProfileDriverRequest;
use App\Models\User;
use Tests\TestCase;

class UpdateProfileDriverRequestTest extends TestCase
{
    public function test_authorize_true(): void
    {
        $req=new UpdateProfileDriverRequest();
        $this->assertTrue($req->authorize());
    }

    public function test_rules_keys(): void
    {
        $req=new UpdateProfileDriverRequest();
        $req->setUserResolver(fn()=> new User(['id_user'=>'U1']));
        $rules=$req->rules();
        foreach (['nama_lengkap','nomor_telepon','alamat','tanggal_lahir','email'] as $k) {
            $this->assertArrayHasKey($k,$rules);
        }
    }

    public function test_messages(): void
    {
        $req=new UpdateProfileDriverRequest();
        $msgs=$req->messages();
        $this->assertArrayHasKey('nomor_telepon.regex',$msgs);
    }
}
