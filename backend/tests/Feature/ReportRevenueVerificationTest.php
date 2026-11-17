<?php
namespace Tests\Feature;
use App\Models\Charger;
use App\Models\ChargingSession;
use App\Models\Dompet;
use App\Models\Location;
use App\Models\MetodePembayaran;
use App\Models\Port;
use App\Models\Tarif;
use App\Models\User;
use App\Models\UserProfile;
use App\Models\Vehicle;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;
class ReportRevenueVerificationTest extends TestCase {
    use RefreshDatabase;
    public function test_reports_include_failed_parking() {
        $admin = User::create(['id_user'=>'ADM0000000001','email'=>'admin@test.ac.id','password'=>bcrypt('p'),'peran'=>'admin','status_akun'=>'Aktif']);
        $driver = User::create(['id_user'=>'DRV0000000001','email'=>'d@test.com','password'=>bcrypt('p'),'peran'=>'driver','status_akun'=>'Aktif']);
        UserProfile::create(['id_user'=>$driver->id_user,'nama_lengkap'=>'D','nomor_telepon'=>'081234567890','alamat'=>'Jl','tanggal_lahir'=>'1995-01-01']);
        $wallet = Dompet::create(['id_user'=>$driver->id_user,'saldo'=>100000,'saldo_hold'=>0,'status_dompet'=>'Aktif']);
        $vehicle = Vehicle::create(['id_user'=>$driver->id_user,'merek'=>'T','model'=>'EV','nomor_polisi'=>'B1EV','tipe_konektor'=>'ccs2','kapasitas_baterai_kwh'=>50]);
        $location = Location::create(['nama_lokasi'=>'Station','alamat'=>'Jl','latitude'=>-7.8,'longitude'=>110.36,'jam_buka'=>'00:00','jam_tutup'=>'23:59','status_loc'=>'Aktif']);
        $charger = Charger::create(['id_location'=>$location->id_location,'kode_perangkat'=>'CHG-1','merek_model'=>'T','kap_tot_kw'=>50,'status_mesin'=>'Active']);
        $port = Port::create(['id_charger'=>$charger->id_charger,'nomor_port'=>'Port 1','tipe_konektor'=>'ccs2','tipe_charging'=>'DC','daya_maks_kw'=>50,'status_port'=>'Charging']);
        $tarif = Tarif::create(['id_location'=>$location->id_location,'harga_per_kwh'=>2500,'biaya_minimum'=>0,'biaya_parkir_flat'=>2000,'periode_mulai'=>now()->subDay(),'periode_berakhir'=>now()->addYears(10)]);
        $session = ChargingSession::create(['id_user'=>$driver->id_user,'id_charger'=>$charger->id_charger,'id_port'=>$port->id_port,'id_tarif'=>$tarif->id_tarif,'id_vehicle'=>$vehicle->id_vehicle,'waktu_mulai'=>now(),'total_energi_kwh'=>0,'target_energi_kwh'=>10,'estimasi_biaya_charging'=>25000,'estimasi_biaya_parkir'=>2000,'saldo_hold'=>27000,'status'=>'Berlangsung','soc_awal'=>20]);
        $method = MetodePembayaran::create(['nama_metode'=>'Dompet Digital','biaya_layanan'=>0,'status_metode'=>'Aktif']);
        \App\Models\Payment::create(['id_session'=>$session->id_session,'id_metode'=>$method->id_metode,'jenis_pembayaran'=>'charging','total_bayar'=>27000,'status_pembayaran'=>'Pending','waktu_pembayaran'=>now(),'referensi_gateway'=>'HOLD']);
        $wallet->saldo_hold=27000; $wallet->save();
        Sanctum::actingAs($driver);
        $this->postJson("/api/charging-sessions/{$session->id_session}/interrupt", ['status'=>'gagal','energi_kwh'=>0,'alasan'=>'Gangguan'])->assertOk();
        Sanctum::actingAs($admin);
        $res = $this->getJson('/api/operations/reports?from='.now()->subDay()->toDateString().'&to='.now()->addDay()->toDateString());
        $res->assertOk();
        $this->assertSame(2000, (int) $res->json('data.stations.0.pendapatan'));
    }
}
