<?php

namespace Tests\Feature;

use App\Models\Charger;
use App\Models\ChargingSession;
use App\Models\Dompet;
use App\Models\Location;
use App\Models\Notification;
use App\Models\Payment;
use App\Models\Port;
use App\Models\Tarif;
use App\Models\Topup;
use App\Models\User;
use App\Models\UserProfile;
use App\Models\Vehicle;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class IdorDriverTest extends TestCase
{
    use RefreshDatabase;

    private function makeDriver(string $id, string $email): User
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
            'nama_lengkap' => 'Driver',
            'nomor_telepon' => '081234567890',
            'alamat' => 'Jl. Test',
            'tanggal_lahir' => '1995-01-01',
        ]);
        Dompet::create([
            'id_user' => $user->id_user,
            'saldo' => 100000,
            'saldo_hold' => 0,
            'status_dompet' => 'Aktif',
        ]);
        return $user;
    }

    public function test_driver_cannot_access_other_driver_vehicle(): void
    {
        $a = $this->makeDriver('DRV0000000001', 'a@test.com');
        $b = $this->makeDriver('DRV0000000002', 'b@test.com');

        $vehicleB = Vehicle::create([
            'id_user' => $b->id_user,
            'merek' => 'T',
            'model' => 'EV',
            'nomor_polisi' => 'B2EV',
            'tipe_konektor' => 'ccs2',
            'kapasitas_baterai_kwh' => 50,
        ]);

        Sanctum::actingAs($a);
        $this->putJson("/api/vehicles/{$vehicleB->id_vehicle}", ['merek' => 'X'])->assertStatus(404);
        $this->deleteJson("/api/vehicles/{$vehicleB->id_vehicle}")->assertStatus(404);
    }

    public function test_driver_cannot_read_other_driver_payment_invoice_topup_notification(): void
    {
        $a = $this->makeDriver('DRV0000000001', 'a@test.com');
        $b = $this->makeDriver('DRV0000000002', 'b@test.com');

        $location = Location::create(['nama_lokasi' => 'Station', 'alamat' => 'Jl. Test', 'latitude' => -7.8, 'longitude' => 110.36, 'jam_buka' => '00:00', 'jam_tutup' => '23:59', 'status_loc' => 'Aktif']);
        $charger = Charger::create(['id_location' => $location->id_location, 'kode_perangkat' => 'CHG-1', 'merek_model' => 'Test', 'kap_tot_kw' => 50, 'status_mesin' => 'Active']);
        $port = Port::create(['id_charger' => $charger->id_charger, 'nomor_port' => 'Port 1', 'tipe_konektor' => 'ccs2', 'tipe_charging' => 'DC', 'daya_maks_kw' => 1, 'status_port' => 'Charging']);
        $tarif = Tarif::create(['id_location' => $location->id_location, 'harga_per_kwh' => 2500, 'biaya_minimum' => 0, 'biaya_parkir_flat' => 2000, 'periode_mulai' => now()->subDay(), 'periode_berakhir' => now()->addYears(10)]);
        $vehicleB = Vehicle::create(['id_user' => $b->id_user, 'merek' => 'T', 'model' => 'EV', 'nomor_polisi' => 'B2EV', 'tipe_konektor' => 'ccs2', 'kapasitas_baterai_kwh' => 50]);
        $sessionB = ChargingSession::create(['id_user' => $b->id_user, 'id_charger' => $charger->id_charger, 'id_port' => $port->id_port, 'id_tarif' => $tarif->id_tarif, 'id_vehicle' => $vehicleB->id_vehicle, 'waktu_mulai' => now(), 'total_energi_kwh' => 0, 'target_energi_kwh' => 10, 'estimasi_biaya_charging' => 25000, 'estimasi_biaya_parkir' => 2000, 'saldo_hold' => 27000, 'status' => 'Selesai', 'soc_awal' => 20]);

        $metode = \App\Models\MetodePembayaran::create(['nama_metode' => 'Dompet Digital', 'biaya_layanan' => 0, 'status_metode' => 'Aktif']);
        $paymentB = Payment::create(['id_session' => $sessionB->id_session, 'id_metode' => $metode->id_metode, 'jenis_pembayaran' => 'charging', 'total_bayar' => 17000, 'status_pembayaran' => 'Sukses', 'waktu_pembayaran' => now(), 'referensi_gateway' => 'HOLD']);

        $walletB = Dompet::where('id_user', $b->id_user)->first();
        $topupB = Topup::create(['id_user' => $b->id_user, 'id_wallet' => $walletB->id_wallet, 'id_metode' => $metode->id_metode, 'nominal' => 50000, 'biaya_layanan' => 0, 'total_bayar' => 50000, 'status_topup' => 'Sukses', 'referensi' => 'TOPUP-B', 'waktu_topup' => now(), 'kedaluwarsa_pada' => now()->addMinutes(10)]);

        $notifB = \App\Models\Notifikasi::create(['id_user' => $b->id_user, 'tipe' => 'status_charging', 'judul' => 'Test', 'pesan' => 'Test', 'status_baca' => false, 'waktu_kirim' => now()]);

        Sanctum::actingAs($a);
        $this->getJson("/api/payments/{$paymentB->id_payment}")->assertStatus(404);
        $this->getJson("/api/charging-sessions/{$sessionB->id_session}/invoice")->assertStatus(404);
        $this->getJson("/api/topup/{$topupB->referensi}")->assertStatus(404);
        $this->putJson("/api/notifications/{$notifB->id_notifikasi}/read")->assertStatus(404);
    }
}