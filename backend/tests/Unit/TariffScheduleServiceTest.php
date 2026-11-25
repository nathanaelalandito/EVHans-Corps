<?php

namespace Tests\Unit;

use App\Models\Location;
use App\Models\Tarif;
use App\Models\User;
use App\Models\UserProfile;
use App\Services\TariffScheduleService;
use Carbon\Carbon;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Validation\ValidationException;
use Tests\TestCase;

class TariffScheduleServiceTest extends TestCase
{
    use RefreshDatabase;

    private function makeUser(string $id): User
    {
        $u=User::create(['id_user'=>$id,'email'=>$id.'@t.com','password'=>bcrypt('x'),'peran'=>'admin','status_akun'=>'Aktif']);
        UserProfile::create(['id_user'=>$u->id_user,'nama_lengkap'=>'Admin','nomor_telepon'=>'081234567890','alamat'=>'Jl','tanggal_lahir'=>'1995-01-01']);
        return $u;
    }

    private function makeLocation(): Location
    {
        return Location::create(['nama_lokasi'=>'L','alamat'=>'Jl','latitude'=>-7,'longitude'=>110,'jam_buka'=>'00:00','jam_tutup'=>'23:59','status_loc'=>'Aktif']);
    }

    public function test_create_immediate(): void
    {
        $loc=$this->makeLocation();
        $actor=$this->makeUser('ADM1');
        $tariff=app(TariffScheduleService::class)->create($loc,$actor,[
            'mode'=>'immediate',
            'harga_per_kwh'=>2000,
            'biaya_minimum'=>1000,
            'biaya_parkir_flat'=>500,
        ]);
        $this->assertNotNull($tariff->id_tarif);
        $this->assertSame(1, Tarif::where('id_location',$loc->id_location)->count());
    }

    public function test_create_scheduled_future(): void
    {
        $loc=$this->makeLocation();
        $actor=$this->makeUser('ADM2');
        $future=Carbon::now()->addDays(2);
        $tariff=app(TariffScheduleService::class)->create($loc,$actor,[
            'mode'=>'scheduled',
            'effective_at'=>$future->toDateTimeString(),
            'harga_per_kwh'=>2000,
            'biaya_minimum'=>1000,
            'biaya_parkir_flat'=>500,
        ]);
        $this->assertTrue($tariff->periode_mulai->isFuture());
    }

    public function test_create_scheduled_past_throws(): void
    {
        $loc=$this->makeLocation();
        $actor=$this->makeUser('ADM3');
        $this->expectException(ValidationException::class);
        app(TariffScheduleService::class)->create($loc,$actor,[
            'mode'=>'scheduled',
            'effective_at'=>Carbon::now()->subDay()->toDateTimeString(),
            'harga_per_kwh'=>2000,
            'biaya_minimum'=>1000,
            'biaya_parkir_flat'=>500,
        ]);
    }

    public function test_cancel_scheduled(): void
    {
        $loc=$this->makeLocation();
        $actor=$this->makeUser('ADM4');
        $future=Carbon::now()->addDays(2);
        $tariff=app(TariffScheduleService::class)->create($loc,$actor,[
            'mode'=>'scheduled',
            'effective_at'=>$future->toDateTimeString(),
            'harga_per_kwh'=>2000,
            'biaya_minimum'=>1000,
            'biaya_parkir_flat'=>500,
        ]);
        app(TariffScheduleService::class)->cancelScheduled($tariff,$actor);
        $this->assertDatabaseMissing('tarif',['id_tarif'=>$tariff->id_tarif]);
    }

    public function test_cancel_active_throws(): void
    {
        $loc=$this->makeLocation();
        $actor=$this->makeUser('ADM5');
        $tariff=app(TariffScheduleService::class)->create($loc,$actor,[
            'mode'=>'immediate',
            'harga_per_kwh'=>2000,
            'biaya_minimum'=>1000,
            'biaya_parkir_flat'=>500,
        ]);
        $this->expectException(ValidationException::class);
        app(TariffScheduleService::class)->cancelScheduled($tariff,$actor);
    }

    public function test_reschedule(): void
    {
        $loc=$this->makeLocation();
        $actor=$this->makeUser('ADM6');
        $future=Carbon::now()->addDays(2);
        $tariff=app(TariffScheduleService::class)->create($loc,$actor,[
            'mode'=>'scheduled',
            'effective_at'=>$future->toDateTimeString(),
            'harga_per_kwh'=>2000,
            'biaya_minimum'=>1000,
            'biaya_parkir_flat'=>500,
        ]);
        $newFuture=Carbon::now()->addDays(5);
        $newTariff=app(TariffScheduleService::class)->reschedule($tariff,$actor,[
            'mode'=>'scheduled',
            'effective_at'=>$newFuture->toDateTimeString(),
            'harga_per_kwh'=>3000,
            'biaya_minimum'=>1000,
            'biaya_parkir_flat'=>500,
        ]);
        $this->assertNotNull($newTariff->id_tarif);
        $this->assertTrue($newTariff->periode_mulai->greaterThan($future));
    }
}
