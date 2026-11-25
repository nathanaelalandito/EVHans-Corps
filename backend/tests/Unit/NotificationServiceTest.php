<?php

namespace Tests\Unit;

use App\Models\ChargingSession;
use App\Models\Notifikasi;
use App\Models\User;
use App\Models\UserProfile;
use App\Services\NotificationService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class NotificationServiceTest extends TestCase
{
    use RefreshDatabase;

    private function makeUser(string $id, string $role='driver', string $status='Aktif'): User
    {
        $u=User::create(['id_user'=>$id,'email'=>$id.'@t.com','password'=>bcrypt('x'),'peran'=>$role,'status_akun'=>$status]);
        UserProfile::create(['id_user'=>$u->id_user,'nama_lengkap'=>'Name','nomor_telepon'=>'081234567890','alamat'=>'Jl','tanggal_lahir'=>'1995-01-01']);
        return $u;
    }

    public function test_notify_session_completed_creates_notification(): void
    {
        $user=$this->makeUser('DRV1');
        $session=(object)['id_user'=>$user->id_user,'id_session'=>'SES1'];
        app(NotificationService::class)->notifySessionCompleted($session,100,50);
        $this->assertSame(1, Notifikasi::where('id_user',$user->id_user)->count());
    }

    public function test_notify_session_completed_dedups(): void
    {
        $user=$this->makeUser('DRV2');
        $session=(object)['id_user'=>$user->id_user,'id_session'=>'SES2'];
        $svc=app(NotificationService::class);
        $svc->notifySessionCompleted($session,100,50);
        $svc->notifySessionCompleted($session,100,50);
        $this->assertSame(1, Notifikasi::where('id_user',$user->id_user)->count());
    }

    public function test_notify_topup_failed(): void
    {
        $user=$this->makeUser('DRV3');
        $topup=(object)['id_topup'=>1,'referensi'=>'REF1'];
        app(NotificationService::class)->notifyTopupFailed($user->id_user,$topup,'kedaluwarsa');
        $this->assertSame(1, Notifikasi::where('id_user',$user->id_user)->count());
    }

    public function test_notify_operator_created_notifies_admins(): void
    {
        $admin=$this->makeUser('ADM1','admin','Aktif');
        $operator=$this->makeUser('OPS1','operator','Aktif');
        app(NotificationService::class)->notifyOperatorCreated($operator);
        $this->assertSame(1, Notifikasi::where('id_user',$admin->id_user)->count());
    }

    public function test_notify_charger_issue(): void
    {
        $admin=$this->makeUser('ADM2','admin','Aktif');
        $loc=\App\Models\Location::create(['nama_lokasi'=>'L','alamat'=>'Jl','latitude'=>-7,'longitude'=>110,'jam_buka'=>'00:00','jam_tutup'=>'23:59','status_loc'=>'Aktif']);
        $charger=\App\Models\Charger::create(['id_location'=>$loc->id_location,'kode_perangkat'=>'CHG','merek_model'=>'M','kap_tot_kw'=>10,'status_mesin'=>'Active']);
        app(NotificationService::class)->notifyChargerIssue($charger,'Offline','reason',[]);
        $this->assertGreaterThanOrEqual(1, Notifikasi::where('id_user',$admin->id_user)->count());
    }
}
