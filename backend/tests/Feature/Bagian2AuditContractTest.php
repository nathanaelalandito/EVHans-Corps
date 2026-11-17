<?php

namespace Tests\Feature;

use App\Models\Charger;
use App\Models\ChargingSession;
use App\Models\Dompet;
use App\Models\Location;
use App\Models\MetodePembayaran;
use App\Models\Notifikasi;
use App\Models\Payment;
use App\Models\Port;
use App\Models\StationOperator;
use App\Models\Tarif;
use App\Models\User;
use App\Models\UserProfile;
use App\Models\Vehicle;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class Bagian2AuditContractTest extends TestCase
{
    use RefreshDatabase;

    public function test_checkout_flow_creates_owned_payment_history_entry(): void
    {
        $driver = $this->makeDriver('history@test.com', 'DRV0000000001');
        $method = MetodePembayaran::create([
            'nama_metode' => 'GoPay',
            'tipe_metode' => 'ewallet',
            'biaya_layanan' => 350,
            'status_metode' => 'Aktif',
        ]);
        Sanctum::actingAs($driver);

        $methods = $this->getJson('/api/topup/methods')->assertOk();
        $methods->assertJsonPath('data.methods.0.id', $method->id_metode);
        $created = $this->postJson('/api/topup', ['method' => $method->id_metode, 'amount' => 20000])
            ->assertCreated();
        $reference = $created->json('data.reference');
        $this->assertSame(20350, $created->json('data.total'));
        $this->getJson("/api/topup/{$reference}")->assertOk()->assertJsonPath('data.status', 'pending');

        $this->postJson("/api/topup/{$reference}/simulate-pay")
            ->assertOk()
            ->assertJsonPath('data.status', 'paid')
            ->assertJsonPath('data.saldo', 20000);
        $this->postJson("/api/topup/{$reference}/simulate-pay")->assertOk();
        $this->assertSame(20000, (int) $driver->dompet->fresh()->saldo);
        $this->assertDatabaseCount('payment', 1);
        $this->assertDatabaseHas('topup', [
            'referensi' => $reference,
            'nominal' => 20000,
            'biaya_layanan' => 350,
            'status_topup' => 'Sukses',
        ]);

        $topup = \App\Models\Topup::where('referensi', $reference)->firstOrFail();
        $payment = Payment::where('id_payment', $topup->id_payment)->firstOrFail();
        $this->assertSame('topup', $payment->jenis_pembayaran);
        $this->assertSame(20350, (int) $payment->total_bayar);
        $this->assertSame('Sukses', $payment->status_pembayaran);

        $history = $this->getJson('/api/payments/history')->assertOk()->assertJsonCount(1, 'data');
        $this->assertSame($payment->id_payment, $history->json('data.0.id_payment'));
        $this->assertSame('topup', $history->json('data.0.jenis_pembayaran'));
        $this->assertSame(20350, (int) $history->json('data.0.total'));

        $this->getJson("/api/payments/{$payment->id_payment}")
            ->assertOk()
            ->assertJsonPath('data.jenis_pembayaran', 'topup')
            ->assertJsonPath('data.nominal', 20000)
            ->assertJsonPath('data.biaya_layanan', 350)
            ->assertJsonPath('data.total_dibayar', 20350)
            ->assertJsonPath('data.referensi_gateway', $reference)
            ->assertJsonPath('data.status', 'Sukses')
            ->assertJsonPath('data.biaya_aktual', 20350);

        $other = $this->makeDriver('foreign-history@test.com', 'DRV0000000009');
        Sanctum::actingAs($other);
        $this->getJson("/api/payments/{$payment->id_payment}")->assertNotFound();

        $this->app['auth']->forgetGuards();
        $this->getJson("/api/payments/{$payment->id_payment}")->assertUnauthorized();
        $this->assertSame(20000, (int) $driver->dompet->fresh()->saldo);
    }

    public function test_frontend_notification_list_contract_returns_renderable_and_read_fields(): void
    {
        $driver = $this->makeDriver('notification@test.com', 'DRV0000000002');
        $notification = Notifikasi::create([
            'id_user' => $driver->id_user,
            'tipe' => 'topup_gagal',
            'judul' => 'Top up gagal',
            'pesan' => 'Instruksi pembayaran kedaluwarsa.',
            'id_entitas' => 'EVT-CONTRACT',
            'tipe_entitas' => 'topup',
            'dedup_key' => 'frontend-contract',
        ]);

        Sanctum::actingAs($driver);
        $response = $this->getJson('/api/notifications?page=1&per_page=20')->assertOk();
        $response->assertJsonPath('data.current_page', 1);
        $response->assertJsonPath('data.data.0.id_notifikasi', $notification->id_notifikasi);
        $response->assertJsonPath('data.data.0.tipe', 'topup_gagal');
        $response->assertJsonPath('data.data.0.judul', 'Top up gagal');
        $response->assertJsonPath('data.data.0.pesan', 'Instruksi pembayaran kedaluwarsa.');
        $response->assertJsonPath('data.data.0.dibaca_pada', null);

        $this->putJson("/api/notifications/{$notification->id_notifikasi}/read")->assertOk();
        $this->assertNotNull(Notifikasi::find($notification->id_notifikasi)->dibaca_pada);
    }

    public function test_driver_issue_report_notifies_reporter_admin_and_assigned_operator_only(): void
    {
        $driver = $this->makeDriver('issue@test.com', 'DRV0000000003');
        $location = Location::create([
            'nama_lokasi' => 'Station Issue',
            'alamat' => 'Jl. Test',
            'latitude' => -7.8,
            'longitude' => 110.36,
            'jam_buka' => '00:00',
            'jam_tutup' => '23:59',
            'status_loc' => 'Aktif',
        ]);
        $charger = Charger::create([
            'id_location' => $location->id_location,
            'kode_perangkat' => 'CHG-ISSUE',
            'merek_model' => 'Test',
            'kap_tot_kw' => 50,
            'status_mesin' => 'Active',
        ]);
        $admin = User::create([
            'id_user' => 'ADM0000000001', 'email' => 'admin@audit.test', 'password' => bcrypt('password'),
            'peran' => 'admin', 'status_akun' => 'Aktif',
        ]);
        $operator = User::create([
            'id_user' => 'OPS0000000001', 'email' => 'operator@audit.test', 'password' => bcrypt('password'),
            'peran' => 'operator', 'status_akun' => 'Aktif',
        ]);
        StationOperator::create(['id_user' => $operator->id_user, 'id_location' => $location->id_location]);
        $otherLocation = Location::create([
            'nama_lokasi' => 'Other Station', 'alamat' => 'Jl. Other', 'latitude' => -7.81, 'longitude' => 110.37,
            'jam_buka' => '00:00', 'jam_tutup' => '23:59', 'status_loc' => 'Aktif',
        ]);
        $otherOperator = User::create([
            'id_user' => 'OPS0000000002', 'email' => 'other-operator@audit.test', 'password' => bcrypt('password'),
            'peran' => 'operator', 'status_akun' => 'Aktif',
        ]);
        StationOperator::create(['id_user' => $otherOperator->id_user, 'id_location' => $otherLocation->id_location]);
        $port = Port::create([
            'id_charger' => $charger->id_charger,
            'nomor_port' => 'Port 1',
            'tipe_konektor' => 'ccs2',
            'tipe_charging' => 'DC',
            'daya_maks_kw' => 50,
            'status_port' => 'Charging',
        ]);
        $tariff = Tarif::create([
            'id_location' => $location->id_location,
            'harga_per_kwh' => 2500,
            'biaya_minimum' => 0,
            'biaya_parkir_flat' => 2000,
            'periode_mulai' => now()->subDay(),
            'periode_berakhir' => now()->addDay(),
        ]);
        $vehicle = Vehicle::create([
            'id_user' => $driver->id_user,
            'merek' => 'T',
            'model' => 'EV',
            'nomor_polisi' => 'B3EV',
            'tipe_konektor' => 'ccs2',
            'kapasitas_baterai_kwh' => 50,
        ]);
        $session = ChargingSession::create([
            'id_user' => $driver->id_user,
            'id_charger' => $charger->id_charger,
            'id_port' => $port->id_port,
            'id_tarif' => $tariff->id_tarif,
            'id_vehicle' => $vehicle->id_vehicle,
            'waktu_mulai' => now()->subMinutes(5),
            'total_energi_kwh' => 0,
            'target_energi_kwh' => 10,
            'estimasi_biaya_charging' => 25000,
            'estimasi_biaya_parkir' => 2000,
            'saldo_hold' => 27000,
            'status' => 'Berlangsung',
            'soc_awal' => 20,
        ]);
        $method = MetodePembayaran::create([
            'nama_metode' => 'Dompet Digital',
            'biaya_layanan' => 0,
            'status_metode' => 'Aktif',
        ]);
        Payment::create([
            'id_session' => $session->id_session,
            'id_metode' => $method->id_metode,
            'jenis_pembayaran' => 'charging',
            'total_bayar' => 27000,
            'status_pembayaran' => 'Pending',
            'waktu_pembayaran' => now(),
            'referensi_gateway' => 'HOLD-ISSUE',
        ]);
        $driver->dompet->update(['saldo_hold' => 27000]);

        Sanctum::actingAs($driver);
        $this->postJson("/api/charging-sessions/{$session->id_session}/interrupt", [
            'status' => 'gagal',
            'energi_kwh' => 3,
            'alasan' => 'Gangguan',
        ])->assertOk();

        $this->assertDatabaseHas('notifikasi', [
            'id_user' => $driver->id_user,
            'tipe' => 'charging_gagal',
        ]);
        $this->assertDatabaseHas('notifikasi', [
            'id_user' => $driver->id_user,
            'tipe' => 'charger_gangguan',
        ]);
        $this->assertDatabaseHas('notifikasi', ['id_user' => $admin->id_user, 'tipe' => 'charger_gangguan']);
        $this->assertDatabaseHas('notifikasi', ['id_user' => $operator->id_user, 'tipe' => 'charger_gangguan']);
        $this->assertDatabaseMissing('notifikasi', ['id_user' => $otherOperator->id_user, 'tipe' => 'charger_gangguan']);
        $this->assertSame(1, Notifikasi::where('id_user', $operator->id_user)->where('tipe', 'charger_gangguan')->count());
        $this->assertSame(0, Notifikasi::where('id_user', $otherOperator->id_user)->where('tipe', 'charger_gangguan')->count());
        $this->assertSame(1, Notifikasi::where('id_user', $driver->id_user)->where('tipe', 'charger_gangguan')->count());
        $this->assertSame(1, Notifikasi::where('id_user', $driver->id_user)->where('tipe', 'charging_gagal')->count());

        Sanctum::actingAs($operator);
        $operatorNotice = $this->getJson('/api/notifications')
            ->assertOk()
            ->assertJsonPath('data.data.0.tipe', 'charger_gangguan')
            ->json('data.data.0');
        $this->putJson('/api/notifications/'.$operatorNotice['id_notifikasi'].'/read')->assertOk();
        $this->assertNotNull(Notifikasi::find($operatorNotice['id_notifikasi'])->dibaca_pada);
    }

    private function makeDriver(string $email, string $id): User
    {
        $driver = User::create([
            'id_user' => $id,
            'email' => $email,
            'password' => bcrypt('password'),
            'peran' => 'driver',
            'status_akun' => 'Aktif',
        ]);
        UserProfile::create([
            'id_user' => $driver->id_user,
            'nama_lengkap' => 'Audit Driver',
            'nomor_telepon' => '081234567890',
            'alamat' => 'Jl. Test',
            'tanggal_lahir' => '1995-01-01',
        ]);
        Dompet::create([
            'id_user' => $driver->id_user,
            'saldo' => 0,
            'saldo_hold' => 0,
            'status_dompet' => 'Aktif',
        ]);

        return $driver;
    }
}
