<?php

namespace Tests\Feature;

use App\Models\Dompet;
use App\Models\MetodePembayaran;
use App\Models\Payment;
use App\Models\Topup;
use App\Models\User;
use App\Models\UserProfile;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Log;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

/** Contract checks added during the read-only Driver Part 1 audit. */
class DriverPart1AuditTest extends TestCase
{
    use RefreshDatabase;

    private function driver(string $id, string $email): User
    {
        $user = User::create([
            'id_user' => $id,
            'email' => $email,
            'password' => Hash::make('Password123'),
            'peran' => 'driver',
            'status_akun' => 'Aktif',
        ]);
        UserProfile::create([
            'id_user' => $id,
            'nama_lengkap' => 'Driver '.$id,
            'nomor_telepon' => '081234567890',
            'alamat' => 'Alamat uji',
            'tanggal_lahir' => '1995-01-01',
        ]);
        return $user;
    }

    public function test_registration_phone_accepts_digits_up_to_15_and_rejects_invalid_values(): void
    {
        $base = [
            'name' => 'Driver Baru', 'password' => 'Password123', 'alamat' => 'Alamat uji',
            'tanggal_lahir' => '1995-01-01',
        ];
        foreach (['1234567', '1234567890123456', '123abc456', '0812 3456', '0812-3456', '12 3x', ''] as $phone) {
            $this->postJson('/api/register', $base + ['email' => uniqid().'@test.com', 'nomor_telepon' => $phone])
                ->assertUnprocessable()->assertJsonValidationErrors('nomor_telepon');
        }
        foreach (['12345678', '123456789012345'] as $phone) {
            $this->postJson('/api/register', $base + ['email' => uniqid().'@test.com', 'nomor_telepon' => $phone])
                ->assertCreated();
        }
    }

    public function test_driver_profile_phone_accepts_15_digits_and_rejects_invalid_values(): void
    {
        $driver = $this->driver('DRV0000000001', 'driver1@test.com');
        Sanctum::actingAs($driver);
        foreach (['12345678', '123456789012345'] as $phone) {
            $this->putJson('/api/driver/profile', ['nomor_telepon' => $phone])->assertOk();
        }
        foreach (['1234567', '1234567890123456', '123abc456', '0812 3456', '0812-3456', '12 3x', ''] as $phone) {
            $this->putJson('/api/driver/profile', ['nomor_telepon' => $phone])
                ->assertUnprocessable()->assertJsonValidationErrors('nomor_telepon');
        }
    }

    public function test_operator_phone_endpoints_accept_15_digits_and_reject_invalid_input(): void
    {
        $admin = User::create([
            'id_user' => 'ADM0000000001', 'email' => 'admin@admin.ac.id',
            'password' => Hash::make('Password123'), 'peran' => 'admin', 'status_akun' => 'Aktif',
        ]);
        Sanctum::actingAs($admin);
        $createPayload = [
            'nama_lengkap' => 'Operator Uji', 'email' => 'op1@ops.ac.id',
            'password' => 'Password123', 'nomor_telepon' => '12345678',
        ];
        $created = $this->postJson('/api/operations/operators', $createPayload)->assertCreated();
        $operatorId = $created->json('data.id_user');
        $this->postJson('/api/operations/operators', array_merge($createPayload, [
            'email' => 'op2@ops.ac.id', 'nomor_telepon' => '123456789012345',
        ]))->assertCreated();

        $invalidPhones = ['1234567', '1234567890123456', 'abc123', '0812 3456', '0812-3456', '12 x3', ''];
        foreach ($invalidPhones as $phone) {
            $this->postJson('/api/operations/operators', array_merge($createPayload, [
                'email' => uniqid().'@ops.ac.id', 'nomor_telepon' => $phone,
            ]))->assertUnprocessable()->assertJsonValidationErrors('nomor_telepon');
            $this->putJson("/api/operations/operators/{$operatorId}/profile", [
                'nomor_telepon' => $phone,
            ])->assertUnprocessable()->assertJsonValidationErrors('nomor_telepon');
        }
        foreach (['12345678', '123456789012345'] as $phone) {
            $this->putJson("/api/operations/operators/{$operatorId}/profile", [
                'nomor_telepon' => $phone,
            ])->assertOk();
        }

        $operator = User::findOrFail($operatorId);
        Sanctum::actingAs($operator);
        foreach ($invalidPhones as $phone) {
            $this->putJson('/api/operator/profile', ['nomor_telepon' => $phone, 'alamat' => 'Alamat'])
                ->assertUnprocessable()->assertJsonValidationErrors('nomor_telepon');
        }
        foreach (['12345678', '123456789012345'] as $phone) {
            $this->putJson('/api/operator/profile', [
                'nomor_telepon' => $phone, 'alamat' => 'Alamat',
            ])->assertOk();
        }
    }

    public function test_pin_change_hashes_values_and_responses_never_include_pin(): void
    {
        $driver = $this->driver('DRV0000000001', 'driver1@test.com');
        $wallet = Dompet::create([
            'id_user' => $driver->id_user, 'saldo' => 0, 'saldo_hold' => 0,
            'status_dompet' => 'Aktif', 'pin_transaksi' => Hash::make('123456'),
        ]);
        Sanctum::actingAs($driver);
        $response = $this->putJson('/api/wallet/pin', [
            'pin_lama' => '123456', 'pin_baru' => '482917', 'pin_baru_confirmation' => '482917',
        ])->assertOk();
        $this->assertStringNotContainsString('482917', $response->getContent());
        $this->assertTrue(Hash::check('482917', $wallet->fresh()->pin_transaksi));
        $this->getJson('/api/wallet')->assertOk()->assertJsonMissingPath('pin_transaksi');
    }

    public function test_weak_pin_patterns_are_rejected_on_create_change_and_password_reset(): void
    {
        $driver = $this->driver('DRV0000000003', 'pin-rules@test.com');
        Sanctum::actingAs($driver);
        $weakPins = ['111111', '123456', '654321'];

        foreach ($weakPins as $pin) {
            $this->postJson('/api/wallet/pin', ['pin' => $pin, 'pin_confirmation' => $pin])
                ->assertUnprocessable()->assertJsonValidationErrors('pin');
        }

        $wallet = Dompet::create([
            'id_user' => $driver->id_user, 'saldo' => 0, 'saldo_hold' => 0,
            'status_dompet' => 'Aktif', 'pin_transaksi' => Hash::make('482917'),
        ]);
        foreach ($weakPins as $pin) {
            $payload = ['pin_lama' => '482917', 'pin_baru' => $pin, 'pin_baru_confirmation' => $pin];
            $this->putJson('/api/wallet/pin', $payload)->assertUnprocessable()->assertJsonValidationErrors('pin_baru');
            $this->postJson('/api/wallet/pin/reset', [
                'password' => 'Password123', 'pin_baru' => $pin, 'pin_baru_confirmation' => $pin,
            ])->assertUnprocessable()->assertJsonValidationErrors('pin_baru');
        }
        $this->putJson('/api/wallet/pin', [
            'pin_lama' => '482917', 'pin_baru' => '482917', 'pin_baru_confirmation' => '482917',
        ])->assertUnprocessable()->assertJsonValidationErrors('pin_baru');
        $this->postJson('/api/wallet/pin/reset', [
            'password' => 'Password123', 'pin_baru' => '482917', 'pin_baru_confirmation' => '482917',
        ])->assertUnprocessable()->assertJsonValidationErrors('pin_baru');
        $this->assertTrue(Hash::check('482917', $wallet->fresh()->pin_transaksi));
    }

    public function test_wrong_old_pin_is_generic_and_three_failures_lock_wallet_for_fifteen_minutes(): void
    {
        $driver = $this->driver('DRV0000000004', 'pin-lock@test.com');
        Dompet::create([
            'id_user' => $driver->id_user, 'saldo' => 0, 'saldo_hold' => 0,
            'status_dompet' => 'Aktif', 'pin_transaksi' => Hash::make('482917'),
        ]);
        Sanctum::actingAs($driver);
        $payload = ['pin_lama' => '111111', 'pin_baru' => '598263', 'pin_baru_confirmation' => '598263'];
        $this->putJson('/api/wallet/pin', $payload)->assertUnprocessable()
            ->assertJsonPath('message', 'Verifikasi PIN gagal. Sisa percobaan: 2.');
        $this->putJson('/api/wallet/pin', $payload)->assertUnprocessable()
            ->assertJsonPath('message', 'Verifikasi PIN gagal. Sisa percobaan: 1.');
        $this->putJson('/api/wallet/pin', $payload)->assertStatus(423);
        $this->putJson('/api/wallet/pin', array_merge($payload, ['pin_lama' => '482917']))->assertStatus(423);
    }

    public function test_pin_changes_are_audited_without_pin_or_hash_and_never_logged(): void
    {
        $driver = $this->driver('DRV0000000005', 'pin-audit@test.com');
        Sanctum::actingAs($driver);
        Log::spy();

        $created = $this->postJson('/api/wallet/pin', ['pin' => '482917', 'pin_confirmation' => '482917'])->assertOk();
        $wallet = Dompet::where('id_user', $driver->id_user)->firstOrFail();
        $hashAfterCreate = $wallet->pin_transaksi;
        $changed = $this->putJson('/api/wallet/pin', [
            'pin_lama' => '482917', 'pin_baru' => '598263', 'pin_baru_confirmation' => '598263',
        ])->assertOk();
        $hashAfterChange = $wallet->fresh()->pin_transaksi;
        $reset = $this->postJson('/api/wallet/pin/reset', [
            'password' => 'Password123', 'pin_baru' => '713408', 'pin_baru_confirmation' => '713408',
        ])->assertOk();
        $hashAfterReset = $wallet->fresh()->pin_transaksi;

        foreach ([$created, $changed, $reset] as $response) {
            $this->assertStringNotContainsString('482917', $response->getContent());
            $this->assertStringNotContainsString('598263', $response->getContent());
            $this->assertStringNotContainsString('713408', $response->getContent());
            $this->assertStringNotContainsString($hashAfterCreate, $response->getContent());
            $this->assertStringNotContainsString($hashAfterChange, $response->getContent());
            $this->assertStringNotContainsString($hashAfterReset, $response->getContent());
        }

        $logs = DB::table('audit_logs')->where('id_user', $driver->id_user)->where('entitas', 'dompet')->orderBy('id_audit')->get();
        $this->assertSame(['buat_pin', 'ubah_pin', 'reset_pin'], $logs->pluck('aksi')->all());
        foreach ($logs as $log) {
            $this->assertNotNull($log->created_at);
            $this->assertStringNotContainsString('482917', $log->data_sebelum.$log->data_sesudah);
            $this->assertStringNotContainsString('598263', $log->data_sebelum.$log->data_sesudah);
            $this->assertStringNotContainsString('713408', $log->data_sebelum.$log->data_sesudah);
            $this->assertStringNotContainsString($hashAfterCreate, $log->data_sebelum.$log->data_sesudah);
            $this->assertStringNotContainsString($hashAfterChange, $log->data_sebelum.$log->data_sesudah);
            $this->assertStringNotContainsString($hashAfterReset, $log->data_sebelum.$log->data_sesudah);
        }
        Log::shouldNotHaveReceived('info');
        Log::shouldNotHaveReceived('warning');
        Log::shouldNotHaveReceived('error');
    }

    public function test_pin_routes_require_auth_and_cannot_change_another_drivers_wallet(): void
    {
        $this->postJson('/api/wallet/pin', ['pin' => '482917', 'pin_confirmation' => '482917'])->assertUnauthorized();

        $driverA = $this->driver('DRV0000000006', 'pin-a@test.com');
        $driverB = $this->driver('DRV0000000007', 'pin-b@test.com');
        $walletA = Dompet::create([
            'id_user' => $driverA->id_user, 'saldo' => 0, 'saldo_hold' => 0,
            'status_dompet' => 'Aktif', 'pin_transaksi' => Hash::make('482917'),
        ]);
        $walletB = Dompet::create([
            'id_user' => $driverB->id_user, 'saldo' => 0, 'saldo_hold' => 0,
            'status_dompet' => 'Aktif', 'pin_transaksi' => Hash::make('598263'),
        ]);
        Sanctum::actingAs($driverA);
        $this->putJson('/api/wallet/pin', [
            'id_user' => $driverB->id_user,
            'pin_lama' => '482917', 'pin_baru' => '713408', 'pin_baru_confirmation' => '713408',
        ])->assertOk();
        $this->assertTrue(Hash::check('713408', $walletA->fresh()->pin_transaksi));
        $this->assertTrue(Hash::check('598263', $walletB->fresh()->pin_transaksi));
    }

    public function test_payment_invoice_is_private_and_requires_authentication(): void
    {
        $owner = $this->driver('DRV0000000001', 'owner@test.com');
        $other = $this->driver('DRV0000000002', 'other@test.com');
        $wallet = Dompet::create(['id_user' => $owner->id_user, 'saldo' => 0, 'saldo_hold' => 0, 'status_dompet' => 'Aktif']);
        $method = MetodePembayaran::create(['nama_metode' => 'GoPay', 'biaya_layanan' => 0, 'status_metode' => 'Aktif']);
        $payment = Payment::create([
            'id_session' => null, 'id_metode' => $method->id_metode, 'jenis_pembayaran' => 'topup',
            'total_bayar' => 10000, 'status_pembayaran' => 'Sukses', 'waktu_pembayaran' => now(),
            'referensi_gateway' => 'TEST-RECEIPT',
        ]);
        Topup::create(['id_wallet' => $wallet->id_wallet, 'id_payment' => $payment->id_payment, 'id_metode' => $method->id_metode, 'referensi' => 'TEST-RECEIPT', 'nominal' => 10000, 'biaya_layanan' => 250, 'status_topup' => 'Sukses', 'waktu_topup' => now()]);

        $this->getJson('/api/payments/'.$payment->id_payment)->assertUnauthorized();
        Sanctum::actingAs($other);
        $this->getJson('/api/payments/'.$payment->id_payment)->assertNotFound();
        Sanctum::actingAs($owner);
        $this->getJson('/api/payments/'.$payment->id_payment)
            ->assertOk()
            ->assertJsonPath('data.id_payment', $payment->id_payment)
            ->assertJsonPath('data.nominal', 10000)
            ->assertJsonPath('data.biaya_layanan', 250)
            ->assertJsonPath('data.total_dibayar', 10000)
            ->assertJsonPath('data.referensi_gateway', 'TEST-RECEIPT');
    }
}
