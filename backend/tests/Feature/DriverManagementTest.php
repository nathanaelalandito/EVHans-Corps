<?php

namespace Tests\Feature;

use App\Models\AuditLog;
use App\Models\Charger;
use App\Models\ChargingSession;
use App\Models\Dompet;
use App\Models\Location;
use App\Models\MetodePembayaran;
use App\Models\Payment;
use App\Models\Port;
use App\Models\Tarif;
use App\Models\Topup;
use App\Models\User;
use App\Models\UserProfile;
use App\Models\Vehicle;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class DriverManagementTest extends TestCase
{
    use RefreshDatabase;

    private function loginAs(User $user): void
    {
        $this->app['auth']->forgetGuards();
        Sanctum::actingAs($user);
    }

    private function makeAdmin(string $id = 'ADM0000000001'): User
    {
        return User::create([
            'id_user' => $id,
            'email' => strtolower($id).'@test.ac.id',
            'password' => bcrypt('password'),
            'peran' => 'admin',
            'status_akun' => 'Aktif',
        ]);
    }

    private function makeOperator(string $id = 'OPS0000000001'): User
    {
        return User::create([
            'id_user' => $id,
            'email' => strtolower($id).'@test.ac.id',
            'password' => bcrypt('password'),
            'peran' => 'operator',
            'status_akun' => 'Aktif',
        ]);
    }

    private function makeDriver(
        string $id = 'DRV0000000001',
        string $email = 'driver@test.ac.id',
        string $nama = 'Driver Test',
        string $telepon = '081234567890',
        string $status = 'Aktif',
        int $saldo = 0,
        ?string $pin = null,
    ): User {
        $user = User::create([
            'id_user' => $id,
            'email' => $email,
            'password' => bcrypt('password'),
            'peran' => 'driver',
            'status_akun' => $status,
        ]);

        UserProfile::create([
            'id_user' => $user->id_user,
            'nama_lengkap' => $nama,
            'nomor_telepon' => $telepon,
            'alamat' => 'Jl. Test',
            'tanggal_lahir' => '1995-01-01',
        ]);

        Dompet::create([
            'id_user' => $user->id_user,
            'saldo' => $saldo,
            'saldo_hold' => 0,
            'pin_transaksi' => $pin ? Hash::make($pin) : null,
            'status_dompet' => 'Aktif',
        ]);

        return $user;
    }

    private function makeActiveSession(User $driver, int $hold = 30000): ChargingSession
    {
        $wallet = Dompet::where('id_user', $driver->id_user)->firstOrFail();
        $wallet->update(['saldo' => 100000, 'saldo_hold' => $hold]);

        $vehicle = Vehicle::create([
            'id_user' => $driver->id_user,
            'merek' => 'Test',
            'model' => 'EV',
            'nomor_polisi' => 'B1234EV',
            'tipe_konektor' => 'ccs2',
            'kapasitas_baterai_kwh' => 50,
        ]);

        $location = Location::create([
            'nama_lokasi' => 'Test Station',
            'alamat' => 'Jl. Test',
            'latitude' => -7.8,
            'longitude' => 110.36,
            'jam_buka' => '00:00',
            'jam_tutup' => '23:59',
            'status_loc' => 'Aktif',
        ]);

        $charger = Charger::create([
            'id_location' => $location->id_location,
            'kode_perangkat' => 'CHG-DRIVER-TEST',
            'merek_model' => 'Test',
            'kap_tot_kw' => 50,
            'status_mesin' => 'Active',
        ]);

        $port = Port::create([
            'id_charger' => $charger->id_charger,
            'nomor_port' => 'Port 1',
            'tipe_konektor' => 'ccs2',
            'tipe_charging' => 'DC',
            'daya_maks_kw' => 50,
            'status_port' => 'Charging',
        ]);

        $tarif = Tarif::create([
            'id_location' => $location->id_location,
            'harga_per_kwh' => 2500,
            'biaya_minimum' => 0,
            'biaya_parkir_flat' => 2000,
            'periode_mulai' => now()->subDay(),
            'periode_berakhir' => now()->addYears(10),
        ]);

        $session = ChargingSession::create([
            'id_user' => $driver->id_user,
            'id_charger' => $charger->id_charger,
            'id_port' => $port->id_port,
            'id_tarif' => $tarif->id_tarif,
            'id_vehicle' => $vehicle->id_vehicle,
            'waktu_mulai' => now()->subMinutes(10),
            'total_energi_kwh' => 0,
            'target_energi_kwh' => 10,
            'estimasi_biaya_charging' => 25000,
            'estimasi_biaya_parkir' => 2000,
            'saldo_hold' => $hold,
            'status' => 'Berlangsung',
            'soc_awal' => 20,
        ]);

        $metode = MetodePembayaran::create([
            'nama_metode' => 'Dompet Digital',
            'tipe_metode' => 'ewallet',
            'biaya_layanan' => 0,
            'status_metode' => 'Aktif',
        ]);

        Payment::create([
            'id_session' => $session->id_session,
            'id_metode' => $metode->id_metode,
            'jenis_pembayaran' => 'charging',
            'total_bayar' => $hold,
            'status_pembayaran' => 'Pending',
            'waktu_pembayaran' => now(),
            'referensi_gateway' => 'HOLD-DRIVER-1',
        ]);

        return $session;
    }

    private function assertNoSensitiveKeys(array $payload): void
    {
        foreach ($payload as $key => $value) {
            $normalized = strtolower((string) $key);
            foreach (['password', 'passwd', 'pin', 'token', 'hash', 'remember'] as $needle) {
                $this->assertStringNotContainsString($needle, $normalized, "Field sensitif '{$key}' tidak boleh ada di response.");
            }

            if (is_array($value)) {
                $this->assertNoSensitiveKeys($value);
            }
        }
    }

    public function test_a_admin_can_list_search_filter_paginate_and_open_driver_detail(): void
    {
        $admin = $this->makeAdmin();
        $andi = $this->makeDriver('DRV0000000001', 'andi@test.ac.id', 'Andi Wijaya', '081111111111');
        $this->makeDriver('DRV0000000002', 'budi@test.ac.id', 'Budi Santoso', '082222222222', 'Nonaktif');

        $this->loginAs($admin);

        $this->getJson('/api/operations/drivers?search=andi')
            ->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.id_user', $andi->id_user);

        $this->getJson('/api/operations/drivers?status=Nonaktif')
            ->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.email', 'budi@test.ac.id');

        $this->getJson('/api/operations/drivers?per_page=1&page=2')
            ->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('meta.current_page', 2)
            ->assertJsonPath('meta.per_page', 1)
            ->assertJsonPath('meta.total', 2);

        $vehicle = Vehicle::create([
            'id_user' => $andi->id_user,
            'merek' => 'Tesla',
            'model' => 'Model 3',
            'nomor_polisi' => 'AB1234EV',
            'tipe_konektor' => 'ccs2',
            'kapasitas_baterai_kwh' => 60,
        ]);
        $wallet = Dompet::where('id_user', $andi->id_user)->firstOrFail();
        $method = MetodePembayaran::create([
            'nama_metode' => 'GoPay',
            'tipe_metode' => 'ewallet',
            'biaya_layanan' => 1000,
            'status_metode' => 'Aktif',
        ]);
        Topup::create([
            'id_wallet' => $wallet->id_wallet,
            'id_metode' => $method->id_metode,
            'referensi' => 'EVT-TEST-001',
            'nominal' => 50000,
            'biaya_layanan' => 1000,
            'status_topup' => 'Sukses',
            'waktu_topup' => now(),
        ]);

        $detail = $this->getJson("/api/operations/drivers/{$andi->id_user}")
            ->assertOk()
            ->assertJsonPath('data.id_user', $andi->id_user)
            ->assertJsonPath('data.profile.nama_lengkap', 'Andi Wijaya')
            ->assertJsonPath('data.vehicles.0.id_vehicle', $vehicle->id_vehicle)
            ->assertJsonPath('data.wallet.saldo', 0)
            ->assertJsonPath('data.wallet.saldo_tersedia', 0)
            ->assertJsonPath('data.recent_topups.0.referensi', 'EVT-TEST-001')
            ->assertJsonStructure([
                'data' => [
                    'id_user',
                    'email',
                    'status_akun',
                    'profile' => ['nama_lengkap', 'nomor_telepon', 'alamat', 'tanggal_lahir'],
                    'vehicles',
                    'wallet' => ['saldo', 'saldo_hold', 'saldo_tersedia', 'status_dompet'],
                    'recent_sessions',
                    'recent_topups',
                ],
            ]);

        $this->assertCount(0, $detail->json('data.recent_sessions'));
    }

    public function test_b_driver_list_and_detail_never_expose_sensitive_fields(): void
    {
        $admin = $this->makeAdmin();
        $driver = $this->makeDriver(pin: '123456');
        $token = $driver->createToken('driver-web')->plainTextToken;
        $wallet = Dompet::where('id_user', $driver->id_user)->firstOrFail();

        $this->loginAs($admin);

        $list = $this->getJson('/api/operations/drivers')->assertOk();
        $detail = $this->getJson("/api/operations/drivers/{$driver->id_user}")->assertOk();

        $this->assertNoSensitiveKeys($list->json());
        $this->assertNoSensitiveKeys($detail->json());

        foreach ([$list->getContent(), $detail->getContent()] as $content) {
            $this->assertStringNotContainsString('pin_transaksi', $content);
            $this->assertStringNotContainsString('password', $content);
            $this->assertStringNotContainsString('remember_token', $content);
            $this->assertStringNotContainsString($token, $content);
            $this->assertStringNotContainsString($wallet->pin_transaksi, $content);
        }
    }

    public function test_c_operator_cannot_access_driver_management_endpoints(): void
    {
        $operator = $this->makeOperator();
        $driver = $this->makeDriver();

        $this->loginAs($operator);

        $this->getJson('/api/operations/drivers')->assertForbidden();
        $this->getJson("/api/operations/drivers/{$driver->id_user}")->assertForbidden();
        $this->putJson("/api/operations/drivers/{$driver->id_user}/status", [
            'status_akun' => 'Nonaktif',
        ])->assertForbidden();
    }

    public function test_d_driver_role_forbidden_and_guest_unauthenticated(): void
    {
        $driver = $this->makeDriver();
        $otherDriver = $this->makeDriver('DRV0000000002', 'other@test.ac.id');

        $this->loginAs($driver);

        $this->getJson('/api/operations/drivers')->assertForbidden();
        $this->getJson("/api/operations/drivers/{$otherDriver->id_user}")->assertForbidden();
        $this->putJson("/api/operations/drivers/{$otherDriver->id_user}/status", [
            'status_akun' => 'Nonaktif',
        ])->assertForbidden();

        $this->app['auth']->forgetGuards();

        $this->getJson('/api/operations/drivers')->assertUnauthorized();
        $this->getJson("/api/operations/drivers/{$otherDriver->id_user}")->assertUnauthorized();
        $this->putJson("/api/operations/drivers/{$otherDriver->id_user}/status", [
            'status_akun' => 'Nonaktif',
        ])->assertUnauthorized();
    }

    public function test_e_deactivated_driver_cannot_login(): void
    {
        $admin = $this->makeAdmin();
        $driver = $this->makeDriver();

        $this->loginAs($admin);
        $this->putJson("/api/operations/drivers/{$driver->id_user}/status", [
            'status_akun' => 'Nonaktif',
        ])->assertOk();

        $this->app['auth']->forgetGuards();

        $response = $this->postJson('/api/login', [
            'email' => $driver->email,
            'password' => 'password',
        ]);

        $response->assertUnauthorized()
            ->assertJsonPath('message', 'Email atau password salah.')
            ->assertJsonMissing(['message' => 'Akun tidak aktif.']);
        $this->assertStringNotContainsString('nonaktif', strtolower($response->getContent()));
    }

    public function test_f_token_issued_before_deactivation_is_rejected_afterward(): void
    {
        $driver = $this->makeDriver();
        $driverToken = $driver->createToken('driver-web')->plainTextToken;

        $this->app['auth']->forgetGuards();
        $this->withToken($driverToken)->getJson('/api/user')->assertOk();

        $admin = $this->makeAdmin();
        $adminToken = $admin->createToken('admin-web')->plainTextToken;

        $this->app['auth']->forgetGuards();
        $this->withToken($adminToken)->putJson("/api/operations/drivers/{$driver->id_user}/status", [
            'status_akun' => 'Nonaktif',
        ])->assertOk();

        $this->assertDatabaseMissing('personal_access_tokens', [
            'tokenable_id' => $driver->id_user,
        ]);

        $this->app['auth']->forgetGuards();
        $this->withToken($driverToken)->getJson('/api/user')->assertUnauthorized();
    }

    public function test_g_inactive_driver_cannot_start_session_or_create_topup(): void
    {
        $driver = $this->makeDriver();
        $driver->update(['status_akun' => 'Nonaktif']);

        $method = MetodePembayaran::create([
            'nama_metode' => 'GoPay',
            'tipe_metode' => 'ewallet',
            'biaya_layanan' => 0,
            'status_metode' => 'Aktif',
        ]);
        $token = $driver->createToken('leftover')->plainTextToken;

        $this->app['auth']->forgetGuards();
        $this->withToken($token)->postJson('/api/topup', [
            'method' => $method->id_metode,
            'amount' => 10000,
        ])->assertForbidden();

        $this->app['auth']->forgetGuards();
        $this->withToken($token)->postJson('/api/charging-sessions/start', [])->assertForbidden();

        $this->assertDatabaseHas('dompet', [
            'id_user' => $driver->id_user,
            'saldo' => 0,
            'saldo_hold' => 0,
        ]);
        $this->assertDatabaseCount('topup', 0);
        $this->assertDatabaseCount('charging_session', 0);
    }

    public function test_h_deactivation_settles_active_session_and_releases_hold_and_port(): void
    {
        $admin = $this->makeAdmin();
        $driver = $this->makeDriver();
        $session = $this->makeActiveSession($driver);
        $wallet = Dompet::where('id_user', $driver->id_user)->firstOrFail();

        $this->loginAs($admin);
        $this->putJson("/api/operations/drivers/{$driver->id_user}/status", [
            'status_akun' => 'Nonaktif',
        ])->assertOk();

        $wallet->refresh();
        $session->refresh();
        $payment = Payment::where('id_session', $session->id_session)->firstOrFail();
        $port = Port::findOrFail($session->id_port);

        $this->assertSame('Selesai', $session->status);
        $this->assertSame(10.0, (float) $session->total_energi_kwh);
        $this->assertSame(73000, (int) $wallet->saldo);
        $this->assertSame(0, (int) $wallet->saldo_hold);
        $this->assertSame(27000, (int) $payment->total_bayar);
        $this->assertSame('Sukses', $payment->status_pembayaran);
        $this->assertSame(Port::AVAILABLE, $port->status_port);
    }

    public function test_i_reactivation_allows_login_without_changing_wallet_balance(): void
    {
        $admin = $this->makeAdmin();
        $driver = $this->makeDriver(saldo: 12345);

        $this->loginAs($admin);
        $this->putJson("/api/operations/drivers/{$driver->id_user}/status", [
            'status_akun' => 'Nonaktif',
        ])->assertOk();
        $this->putJson("/api/operations/drivers/{$driver->id_user}/status", [
            'status_akun' => 'Aktif',
        ])->assertOk();

        $this->app['auth']->forgetGuards();

        $this->postJson('/api/login', [
            'email' => $driver->email,
            'password' => 'password',
        ])->assertOk()->assertJsonStructure(['token']);

        $this->assertDatabaseHas('dompet', [
            'id_user' => $driver->id_user,
            'saldo' => 12345,
            'saldo_hold' => 0,
        ]);
    }

    public function test_j_status_change_rejects_admin_operator_target_and_invalid_driver_status(): void
    {
        $admin = $this->makeAdmin();
        $operator = $this->makeOperator();
        $driver = $this->makeDriver();

        $this->loginAs($admin);

        $this->putJson("/api/operations/drivers/{$admin->id_user}/status", [
            'status_akun' => 'Nonaktif',
        ])->assertNotFound();

        $this->putJson("/api/operations/drivers/{$operator->id_user}/status", [
            'status_akun' => 'Nonaktif',
        ])->assertNotFound();

        $this->putJson("/api/operations/drivers/{$driver->id_user}/status", [
            'status_akun' => 'Suspend',
        ])->assertUnprocessable()->assertJsonValidationErrors('status_akun');

        $this->putJson("/api/operations/drivers/{$driver->id_user}/status", [
            'status_akun' => 'Banned',
        ])->assertUnprocessable()->assertJsonValidationErrors('status_akun');

        $this->assertDatabaseHas('users', [
            'id_user' => $driver->id_user,
            'status_akun' => 'Aktif',
        ]);
    }

    public function test_k_no_driver_endpoint_can_change_wallet_balance_hold_or_pin(): void
    {
        $admin = $this->makeAdmin();
        $driver = $this->makeDriver(pin: '123456', saldo: 50000);
        $wallet = Dompet::where('id_user', $driver->id_user)->firstOrFail();
        $before = $wallet->only(['saldo', 'saldo_hold', 'pin_transaksi']);

        $this->loginAs($admin);

        $attempts = [
            ['put', "/api/operations/drivers/{$driver->id_user}/saldo", ['saldo' => 999999]],
            ['put', "/api/operations/drivers/{$driver->id_user}/hold", ['saldo_hold' => 999999]],
            ['put', "/api/operations/drivers/{$driver->id_user}/pin", ['pin' => '000000']],
            ['post', "/api/operations/drivers/{$driver->id_user}/saldo", ['saldo' => 999999]],
            ['post', "/api/operations/drivers/{$driver->id_user}/sessions", []],
            ['put', "/api/operations/drivers/{$driver->id_user}/wallet", ['saldo' => 999999]],
        ];

        foreach ($attempts as [$method, $uri, $payload]) {
            $response = $this->json($method, $uri, $payload);
            $this->assertContains($response->status(), [404, 405]);
        }

        $wallet->refresh();
        $this->assertSame($before, $wallet->only(['saldo', 'saldo_hold', 'pin_transaksi']));
    }

    public function test_l_deactivation_and_activation_are_written_to_audit_log_with_actor_and_reason(): void
    {
        $admin = $this->makeAdmin();
        $driver = $this->makeDriver();

        $this->loginAs($admin);
        $this->putJson("/api/operations/drivers/{$driver->id_user}/status", [
            'status_akun' => 'Nonaktif',
            'alasan' => 'Pelanggaran aturan',
        ])->assertOk();
        $this->putJson("/api/operations/drivers/{$driver->id_user}/status", [
            'status_akun' => 'Aktif',
            'alasan' => 'Pemulihan akun',
        ])->assertOk();

        $logs = AuditLog::where('entitas', 'driver')
            ->where('id_entitas', $driver->id_user)
            ->orderBy('id_audit')
            ->get();

        $this->assertCount(2, $logs);
        $this->assertSame('ubah_status_driver', $logs[0]->aksi);
        $this->assertSame($admin->id_user, $logs[0]->id_user);
        $this->assertSame(['status_akun' => 'Aktif'], $logs[0]->data_sebelum);
        $this->assertSame(['status_akun' => 'Nonaktif'], $logs[0]->data_sesudah);
        $this->assertSame('Pelanggaran aturan', $logs[0]->alasan);

        $this->assertSame('ubah_status_driver', $logs[1]->aksi);
        $this->assertSame($admin->id_user, $logs[1]->id_user);
        $this->assertSame(['status_akun' => 'Nonaktif'], $logs[1]->data_sebelum);
        $this->assertSame(['status_akun' => 'Aktif'], $logs[1]->data_sesudah);
        $this->assertSame('Pemulihan akun', $logs[1]->alasan);
    }

    public function test_active_admin_operator_and_driver_pass_account_status_guard(): void
    {
        $admin = $this->makeAdmin();
        $operator = $this->makeOperator();
        $driver = $this->makeDriver();

        $this->loginAs($admin);
        $this->getJson('/api/operations/drivers')
            ->assertOk()
            ->assertJsonPath('meta.total', 1);

        $this->loginAs($operator);
        $this->getJson('/api/operations/dashboard')
            ->assertOk()
            ->assertJsonPath('data.role', 'operator');

        $this->loginAs($driver);
        $this->getJson('/api/charging-sessions/history')
            ->assertOk()
            ->assertJsonCount(0, 'data');

        $this->assertSame('Aktif', $admin->fresh()->status_akun);
        $this->assertSame('Aktif', $operator->fresh()->status_akun);
        $this->assertSame('Aktif', $driver->fresh()->status_akun);
    }

    public function test_h2_deactivation_settlement_matches_invoice_payment_history_and_revenue_report(): void
    {
        $admin = $this->makeAdmin();
        $driver = $this->makeDriver();
        $session = $this->makeActiveSession($driver);
        $locationId = (int) Charger::whereKey($session->id_charger)->value('id_location');

        $this->loginAs($admin);
        $this->putJson("/api/operations/drivers/{$driver->id_user}/status", [
            'status_akun' => 'Nonaktif',
        ])->assertOk();

        $session->refresh();
        $payment = Payment::where('id_session', $session->id_session)->firstOrFail();
        $expectedTotal = (int) $payment->total_bayar;

        $this->assertSame('Selesai', $session->status);
        $this->assertSame('Sukses', $payment->status_pembayaran);
        $this->assertSame(27000, $expectedTotal);

        $this->putJson("/api/operations/drivers/{$driver->id_user}/status", [
            'status_akun' => 'Aktif',
        ])->assertOk();

        $this->loginAs($driver);

        $invoice = $this->getJson("/api/charging-sessions/{$session->id_session}/invoice")
            ->assertOk()
            ->assertJsonPath('data.status', 'Selesai')
            ->assertJsonPath('data.status_pembayaran', 'Sukses')
            ->assertJsonPath('data.biaya_aktual', $expectedTotal)
            ->json('data');

        $history = $this->getJson('/api/charging-sessions/history')
            ->assertOk()
            ->assertJsonCount(1, 'data')
            ->json('data.0');

        $paymentHistory = $this->getJson('/api/payments/history')
            ->assertOk()
            ->assertJsonPath('data.0.status_pembayaran', 'Sukses')
            ->json('data.0');

        $this->loginAs($admin);
        $today = now()->toDateString();
        $report = $this->getJson("/api/operations/reports?from={$today}&to={$today}&id_location={$locationId}")
            ->assertOk()
            ->assertJsonPath('data.summary.sesi_selesai', 1)
            ->json('data');

        $this->assertSame($expectedTotal, (int) $invoice['biaya_aktual']);
        $this->assertSame($expectedTotal, (int) $history['total']);
        $this->assertSame($expectedTotal, (int) $paymentHistory['total']);
        $this->assertSame($expectedTotal, (int) $report['summary']['pendapatan']);
        $this->assertSame($expectedTotal, (int) $report['stations'][0]['pendapatan']);
        $this->assertSame('Selesai', $invoice['status']);
        $this->assertSame('Selesai', $history['status']);
        $this->assertSame(10.0, (float) $invoice['energi_kwh']);
        $this->assertSame(10.0, (float) $history['energi_kwh']);
        $this->assertSame(1, (int) $report['summary']['sesi_selesai']);
    }
}
