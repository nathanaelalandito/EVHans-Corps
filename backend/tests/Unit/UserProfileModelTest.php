<?php

namespace Tests\Unit;

use App\Models\UserProfile;
use Carbon\Carbon;
use Tests\TestCase;

class UserProfileModelTest extends TestCase
{
    public function test_casts_tanggal_lahir_date(): void
    {
        $p = new UserProfile(['tanggal_lahir' => '1995-01-01']);
        $this->assertInstanceOf(Carbon::class, $p->tanggal_lahir);
    }

    public function test_fillable(): void
    {
        $p = new UserProfile();
        $this->assertContains('nama_lengkap', $p->getFillable());
    }
}
