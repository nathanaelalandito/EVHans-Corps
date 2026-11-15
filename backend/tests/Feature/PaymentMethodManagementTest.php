<?php

namespace Tests\Feature;

use App\Models\AuditLog;
use App\Models\Dompet;
use App\Models\MetodePembayaran;
use App\Models\Topup;
use App\Models\User;
use App\Models\UserProfile;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class PaymentMethodManagementTest extends TestCase
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

    private function makeDriver(string $id = 'DRV0000000001', string $email = 'driver@test.ac.id'): User
    {
        $user = User::create([
            'id_user' => $id,
            'email' => $email,
            'password' => bcrypt('password'),
            'peran' => 'driver',
            'status_akun' => 'Aktif',
        ]);

        UserProfile::create([
            'id_user' => $user->id_user,
            'nama_lengkap' => 'Driver Test',
            'nomor_telepon' => '081234567890',
            'alamat' => 'Jl. Test',
            'tanggal_lahir' => '1995-01-01',
        ]);

        Dompet::create([
            'id_user' => $user->id_user,
            'saldo' => 0,
            'saldo_hold' => 0,
            'status_dompet' => 'Aktif',
        ]);

        return $user;
    }

    private function makeMethod(
        string $nama = 'GoPay',
        int $fee = 2000,
        string $status = 'Aktif',
        string $tipe = 'ewallet',
    ): MetodePembayaran {
        return MetodePembayaran::create([
            'nama_metode' => $nama,
            'tipe_metode' => $tipe,
            'biaya_layanan' => $fee,
            'status_metode' => $status,
        ]);
    }

    public function test_m_admin_can_create_list_update_and_change_payment_method_status(): void
    {
        $admin = $this->makeAdmin();
        $this->loginAs($admin);

        $created = $this->postJson('/api/operations/payment-methods', [
            'nama_metode' => 'GoPay',
            'tipe_metode' => 'ewallet',
            'biaya_layanan' => 2000,
        ]);

        $created->assertCreated()
            ->assertJsonPath('data.nama_metode', 'GoPay')
            ->assertJsonPath('data.tipe_metode', 'ewallet')
            ->assertJsonPath('data.biaya_layanan', 2000)
            ->assertJsonPath('data.status_metode', 'Aktif');

        $id = $created->json('data.id_metode');

        $this->getJson('/api/operations/payment-methods')
            ->assertOk()
            ->assertJsonPath('data.0.id_metode', $id)
            ->assertJsonPath('meta.total', 1);

        $this->putJson("/api/operations/payment-methods/{$id}", [
            'nama_metode' => 'GoPay Baru',
            'tipe_metode' => 'va',
            'biaya_layanan' => 3500,
        ])->assertOk()
            ->assertJsonPath('data.nama_metode', 'GoPay Baru')
            ->assertJsonPath('data.tipe_metode', 'va')
            ->assertJsonPath('data.biaya_layanan', 3500);

        $this->putJson("/api/operations/payment-methods/{$id}/status", [
            'status_metode' => 'Nonaktif',
            'alasan' => 'Sedang maintenance',
        ])->assertOk()->assertJsonPath('data.status_metode', 'Nonaktif');

        $this->assertDatabaseHas('metode_pembayaran', [
            'id_metode' => $id,
            'nama_metode' => 'GoPay Baru',
            'tipe_metode' => 'va',
            'biaya_layanan' => 3500,
            'status_metode' => 'Nonaktif',
        ]);
    }

    public function test_n1_rejects_blank_or_empty_payment_method_name(): void
    {
        $this->loginAs($this->makeAdmin());

        foreach (['', '   '] as $name) {
            $this->postJson('/api/operations/payment-methods', [
                'nama_metode' => $name,
                'tipe_metode' => 'ewallet',
                'biaya_layanan' => 0,
            ])->assertUnprocessable()->assertJsonValidationErrors('nama_metode');
        }
    }

    public function test_n2_rejects_case_insensitive_duplicate_name_on_create(): void
    {
        $this->loginAs($this->makeAdmin());
        $this->makeMethod('GoPay');

        $this->postJson('/api/operations/payment-methods', [
            'nama_metode' => 'gopay',
            'tipe_metode' => 'ewallet',
            'biaya_layanan' => 1000,
        ])->assertUnprocessable()->assertJsonValidationErrors('nama_metode');

        $this->assertDatabaseCount('metode_pembayaran', 1);
    }

    public function test_n3_rejects_case_insensitive_duplicate_name_on_update(): void
    {
        $this->loginAs($this->makeAdmin());
        $this->makeMethod('GoPay');
        $dana = $this->makeMethod('DANA', 1000, 'Aktif', 'va');

        $this->putJson("/api/operations/payment-methods/{$dana->id_metode}", [
            'nama_metode' => 'GOPAY',
        ])->assertUnprocessable()->assertJsonValidationErrors('nama_metode');

        $this->assertDatabaseHas('metode_pembayaran', [
            'id_metode' => $dana->id_metode,
            'nama_metode' => 'DANA',
        ]);
    }

    public function test_n4_rejects_invalid_fee_and_type(): void
    {
        $this->loginAs($this->makeAdmin());

        $cases = [
            ['biaya_layanan' => -1],
            ['biaya_layanan' => 1000.5],
            ['biaya_layanan' => 'abc'],
            ['biaya_layanan' => 100001],
            ['tipe_metode' => 'cash'],
            ['tipe_metode' => ''],
        ];

        foreach ($cases as $override) {
            $payload = array_merge([
                'nama_metode' => 'Metode Uji',
                'tipe_metode' => 'ewallet',
                'biaya_layanan' => 0,
            ], $override);

            $this->postJson('/api/operations/payment-methods', $payload)
                ->assertUnprocessable()
                ->assertJsonValidationErrors(array_key_first($override));
        }

        $this->assertDatabaseCount('metode_pembayaran', 0);
    }

    public function test_o_operator_driver_and_guest_cannot_access_payment_method_endpoints(): void
    {
        $method = $this->makeMethod();
        $operator = $this->makeOperator();
        $driver = $this->makeDriver();

        $requests = [
            ['get', '/api/operations/payment-methods', []],
            ['post', '/api/operations/payment-methods', [
                'nama_metode' => 'Metode Baru',
                'tipe_metode' => 'ewallet',
                'biaya_layanan' => 0,
            ]],
            ['put', "/api/operations/payment-methods/{$method->id_metode}", ['biaya_layanan' => 3000]],
            ['put', "/api/operations/payment-methods/{$method->id_metode}/status", ['status_metode' => 'Nonaktif']],
        ];

        foreach ([$operator, $driver] as $user) {
            $this->loginAs($user);
            foreach ($requests as [$httpMethod, $uri, $payload]) {
                $this->json($httpMethod, $uri, $payload)->assertForbidden();
            }
        }

        $this->app['auth']->forgetGuards();
        foreach ($requests as [$httpMethod, $uri, $payload]) {
            $this->json($httpMethod, $uri, $payload)->assertUnauthorized();
        }
    }

    public function test_p_driver_only_sees_active_payment_methods_for_topup(): void
    {
        $driver = $this->makeDriver();
        $active = $this->makeMethod('GoPay', 2000, 'Aktif', 'ewallet');
        $inactive = $this->makeMethod('DANA', 1000, 'Nonaktif', 'va');

        $this->loginAs($driver);

        $response = $this->getJson('/api/topup/methods')->assertOk();

        $ids = collect($response->json('data.methods'))->pluck('id')->all();
        $this->assertContains($active->id_metode, $ids);
        $this->assertNotContains($inactive->id_metode, $ids);
    }

    public function test_q_topup_rejects_inactive_or_unknown_payment_method(): void
    {
        $driver = $this->makeDriver();
        $inactive = $this->makeMethod('DANA', 1000, 'Nonaktif', 'va');

        $this->loginAs($driver);

        $this->postJson('/api/topup', [
            'method' => $inactive->id_metode,
            'amount' => 10000,
        ])->assertUnprocessable()->assertJsonValidationErrors('method');

        $this->postJson('/api/topup', [
            'method' => 999999,
            'amount' => 10000,
        ])->assertUnprocessable()->assertJsonValidationErrors('method');

        $this->assertDatabaseCount('topup', 0);
        $this->assertDatabaseHas('dompet', [
            'id_user' => $driver->id_user,
            'saldo' => 0,
        ]);
    }

    public function test_r_topup_keeps_fee_snapshot_after_payment_method_fee_changes(): void
    {
        $admin = $this->makeAdmin();
        $driver = $this->makeDriver();
        $method = $this->makeMethod('GoPay', 2000);

        $this->loginAs($driver);
        $created = $this->postJson('/api/topup', [
            'method' => $method->id_metode,
            'amount' => 10000,
        ])->assertCreated()
            ->assertJsonPath('data.amount', 10000)
            ->assertJsonPath('data.total', 12000);

        $reference = $created->json('data.reference');
        $topup = Topup::where('referensi', $reference)->firstOrFail();
        $this->assertSame(2000, (int) $topup->biaya_layanan);

        $this->loginAs($admin);
        $this->putJson("/api/operations/payment-methods/{$method->id_metode}", [
            'biaya_layanan' => 5000,
        ])->assertOk();

        $this->loginAs($driver);
        $this->getJson("/api/topup/{$reference}")
            ->assertOk()
            ->assertJsonPath('data.total', 12000);

        $this->postJson("/api/topup/{$reference}/simulate-pay")
            ->assertOk()
            ->assertJsonPath('data.status', 'paid');

        $this->assertDatabaseHas('topup', [
            'referensi' => $reference,
            'biaya_layanan' => 2000,
            'status_topup' => 'Sukses',
        ]);
        $this->assertDatabaseHas('dompet', [
            'id_user' => $driver->id_user,
            'saldo' => 10000,
        ]);
    }

    public function test_s_pending_topup_can_still_settle_or_expire_after_method_deactivated(): void
    {
        $admin = $this->makeAdmin();
        $driver = $this->makeDriver();
        $method = $this->makeMethod('GoPay', 2000);

        $this->loginAs($driver);
        $first = $this->postJson('/api/topup', [
            'method' => $method->id_metode,
            'amount' => 10000,
        ])->assertCreated()->json('data.reference');
        $second = $this->postJson('/api/topup', [
            'method' => $method->id_metode,
            'amount' => 20000,
        ])->assertCreated()->json('data.reference');

        $this->loginAs($admin);
        $this->putJson("/api/operations/payment-methods/{$method->id_metode}/status", [
            'status_metode' => 'Nonaktif',
        ])->assertOk();

        Topup::where('referensi', $second)->firstOrFail()->update([
            'kedaluwarsa_pada' => now()->subMinute(),
        ]);

        $this->loginAs($driver);
        $this->getJson("/api/topup/{$second}")
            ->assertOk()
            ->assertJsonPath('data.status', 'expired');

        $this->postJson("/api/topup/{$first}/simulate-pay")
            ->assertOk()
            ->assertJsonPath('data.status', 'paid');

        $this->postJson("/api/topup/{$second}/simulate-pay")
            ->assertUnprocessable();

        $this->assertDatabaseHas('topup', [
            'referensi' => $first,
            'status_topup' => 'Sukses',
        ]);
        $this->assertDatabaseHas('topup', [
            'referensi' => $second,
            'status_topup' => 'Gagal',
        ]);
        $this->assertDatabaseHas('dompet', [
            'id_user' => $driver->id_user,
            'saldo' => 10000,
        ]);
    }

    public function test_t_payment_methods_have_no_delete_endpoint(): void
    {
        $method = $this->makeMethod();
        $this->loginAs($this->makeAdmin());

        $response = $this->deleteJson("/api/operations/payment-methods/{$method->id_metode}");
        $this->assertContains($response->status(), [404, 405]);

        $this->assertDatabaseHas('metode_pembayaran', ['id_metode' => $method->id_metode]);
    }

    public function test_u_add_update_and_status_change_are_written_to_audit_log(): void
    {
        $admin = $this->makeAdmin();
        $this->loginAs($admin);

        $created = $this->postJson('/api/operations/payment-methods', [
            'nama_metode' => 'GoPay',
            'tipe_metode' => 'ewallet',
            'biaya_layanan' => 2000,
        ])->assertCreated();
        $id = $created->json('data.id_metode');

        $this->putJson("/api/operations/payment-methods/{$id}", [
            'nama_metode' => 'GoPay Baru',
            'alasan' => 'Penyesuaian nama',
        ])->assertOk();

        $this->putJson("/api/operations/payment-methods/{$id}/status", [
            'status_metode' => 'Nonaktif',
            'alasan' => 'Gangguan layanan',
        ])->assertOk();

        $logs = AuditLog::where('entitas', 'metode_pembayaran')
            ->where('id_entitas', (string) $id)
            ->orderBy('id_audit')
            ->get();

        $this->assertCount(3, $logs);
        $this->assertSame('buat_metode_pembayaran', $logs[0]->aksi);
        $this->assertSame($admin->id_user, $logs[0]->id_user);
        $this->assertSame('GoPay', $logs[0]->data_sesudah['nama_metode']);

        $this->assertSame('ubah_metode_pembayaran', $logs[1]->aksi);
        $this->assertSame($admin->id_user, $logs[1]->id_user);
        $this->assertSame('GoPay', $logs[1]->data_sebelum['nama_metode']);
        $this->assertSame('GoPay Baru', $logs[1]->data_sesudah['nama_metode']);
        $this->assertSame('Penyesuaian nama', $logs[1]->alasan);

        $this->assertSame('ubah_status_metode_pembayaran', $logs[2]->aksi);
        $this->assertSame($admin->id_user, $logs[2]->id_user);
        $this->assertSame(['status_metode' => 'Aktif'], $logs[2]->data_sebelum);
        $this->assertSame(['status_metode' => 'Nonaktif'], $logs[2]->data_sesudah);
        $this->assertSame('Gangguan layanan', $logs[2]->alasan);
    }
}
