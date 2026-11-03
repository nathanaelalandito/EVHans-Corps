<?php

namespace App\Console\Commands;

use App\Models\ChargingSession;
use App\Models\Dompet;
use App\Models\Location;
use App\Models\MetodePembayaran;
use App\Models\Payment;
use App\Models\Port;
use App\Models\Tarif;
use App\Models\User;
use App\Services\ChargingSessionSettler;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;

/**
 * Simulasi gangguan mendadak pada stasiun tertentu (untuk demo/pengujian UI).
 *
 * Menemukan sesi charging yang sedang berjalan di stasiun, lalu menyelesaikannya
 * sebagai "Gagal": sisa hold dikembalikan, port menjadi Out of Order, dan
 * error_log dibuat sehingga muncul di notifikasi operator.
 *
 * Contoh:
 *   php artisan charging:simulate-failure "EVCharge Hub - Malioboro Mall" --create
 */
class SimulateChargingFailure extends Command
{
    protected $signature = 'charging:simulate-failure
        {station : Nama atau ID lokasi stasiun}
        {--session= : ID sesi aktif tertentu (opsional)}
        {--create : Buat sesi charging demo dulu jika belum ada sesi aktif}
        {--user= : Email driver untuk sesi demo (default: driver aktif pertama)}
        {--energi= : Energi aktual (kWh) yang dicatat di invoice (opsional)}
        {--kategori=perangkat : Kategori gangguan (listrik/perangkat/konektor/lainnya)}';

    protected $description = 'Simulasikan gangguan mendadak pada sesi charging di sebuah stasiun';

    public function handle(ChargingSessionSettler $settler): int
    {
        $location = Location::query()
            ->where('id_location', $this->argument('station'))
            ->orWhere('nama_lokasi', 'like', '%'.$this->argument('station').'%')
            ->first();

        if (! $location) {
            $this->error('Stasiun tidak ditemukan: '.$this->argument('station'));

            return self::FAILURE;
        }

        $session = $this->findActiveSession($location);

        if (! $session) {
            if (! $this->option('create')) {
                $this->error("Tidak ada sesi charging aktif di {$location->nama_lokasi}.");
                $this->line('Tambahkan --create untuk membuat sesi demo lalu menggagalkannya.');

                return self::FAILURE;
            }

            $session = $this->createDemoSession($location, $this->option('user'));
            if (! $session) {
                return self::FAILURE;
            }

            $this->info("Sesi demo #{$session->id_session} dibuat (status Berlangsung).");
        }

        $kategori = (string) $this->option('kategori');
        if (! array_key_exists($kategori, ChargingSession::KATEGORI_GANGGUAN)) {
            $this->error('Kategori tidak valid. Pilih: '.implode(', ', array_keys(ChargingSession::KATEGORI_GANGGUAN)));

            return self::FAILURE;
        }

        $settled = $settler->settle($session, 'Gagal', array_filter([
            'energi_kwh' => $this->option('energi') !== null ? (float) $this->option('energi') : null,
            'kegagalan' => [
                'kategori' => $kategori,
                'sumber' => 'sistem',
                'catatan' => "Simulasi gangguan mendadak di {$location->nama_lokasi} saat pengisian berlangsung.",
                'jenis_error' => 'Simulasi gangguan: '.ChargingSession::KATEGORI_GANGGUAN[$kategori],
                'tingkat' => $kategori === 'listrik' ? 'Kritis' : 'Tinggi',
                'deteksi_otomatis' => true,
            ],
        ], fn ($value) => $value !== null));

        if (! $settled) {
            $this->error('Sesi gagal diproses (mungkin sudah tidak berjalan).');

            return self::FAILURE;
        }

        $this->info("Sesi #{$settled->id_session} di {$location->nama_lokasi} sekarang Gagal.");
        $this->line('Port: '.($settled->port?->nomor_port ?? '-').' ('.$settled->port?->status_port.' )');
        $this->line('Kategori: '.$settled->kegagalan_kategori.' | Sumber: '.$settled->kegagalan_sumber);
        $this->line('Energi aktual: '.$settled->total_energi_kwh.' kWh');
        $this->line('Error log dibuat untuk notifikasi operator.');

        return self::SUCCESS;
    }

    private function findActiveSession(Location $location): ?ChargingSession
    {
        $query = ChargingSession::query()->where('status', 'Berlangsung');

        if ($id = $this->option('session')) {
            return $query->whereKey($id)->first();
        }

        return $query
            ->whereHas('charger', fn ($q) => $q->where('id_location', $location->id_location))
            ->latest('waktu_mulai')
            ->first();
    }

    private function createDemoSession(Location $location, ?string $email): ?ChargingSession
    {
        $driver = User::query()
            ->where('peran', 'driver')
            ->where('status_akun', 'Aktif')
            ->when($email, fn ($q) => $q->where('email', $email))
            ->get()
            ->first(fn (User $user) => $user->dompet()->exists() && $user->vehicles()->exists());

        if (! $driver) {
            $this->error('Tidak ada driver aktif dengan dompet dan kendaraan. Jalankan seeder driver terlebih dahulu.');

            return null;
        }

        $vehicle = $driver->vehicles()->first();
        $tarif = Tarif::where('id_location', $location->id_location)->latest('id_tarif')->first();
        $port = Port::whereHas('charger', fn ($q) => $q->where('id_location', $location->id_location))
            ->where('status_port', Port::AVAILABLE)
            ->get()
            ->first(fn (Port $p) => $p->matchesConnector($vehicle->tipe_konektor))
            ?? Port::whereHas('charger', fn ($q) => $q->where('id_location', $location->id_location))
                ->where('status_port', Port::AVAILABLE)
                ->first();

        if (! $tarif || ! $port) {
            $this->error('Tarif atau port tersedia tidak ditemukan di stasiun ini.');

            return null;
        }

        $wallet = Dompet::where('id_user', $driver->id_user)->first();
        $target = 20.0;
        $cost = $tarif->costFor($target, (float) $port->daya_maks_kw);

        if (! $wallet || $wallet->saldoTersedia() < $cost['total']) {
            $this->error('Saldo dompet driver tidak cukup untuk membuat sesi demo.');

            return null;
        }

        return DB::transaction(function () use ($driver, $vehicle, $tarif, $port, $cost) {
            $wallet = Dompet::where('id_user', $driver->id_user)->lockForUpdate()->firstOrFail();
            $claimed = Port::where('id_port', $port->id_port)
                ->where('status_port', Port::AVAILABLE)
                ->update(['status_port' => Port::CHARGING]);

            if ($claimed === 0) {
                return null;
            }

            $wallet->saldo_hold = (int) $wallet->saldo_hold + $cost['total'];
            $wallet->save();

            $session = ChargingSession::create([
                'id_user' => $driver->id_user,
                'id_charger' => $port->id_charger,
                'id_port' => $port->id_port,
                'id_tarif' => $tarif->id_tarif,
                'id_vehicle' => $vehicle->id_vehicle,
                'waktu_mulai' => now()->subMinutes(3),
                'total_energi_kwh' => 0,
                'target_energi_kwh' => $cost['target_kwh'],
                'estimasi_biaya_charging' => $cost['biaya_charging'],
                'estimasi_biaya_parkir' => $cost['biaya_parkir'],
                'saldo_hold' => $cost['total'],
                'status' => 'Berlangsung',
                'soc_awal' => 30,
                'heartbeat_terakhir' => now(),
            ]);

            $method = MetodePembayaran::firstOrCreate(
                ['nama_metode' => 'Dompet Digital'],
                ['biaya_layanan' => 0, 'status_metode' => 'Aktif']
            );

            Payment::create([
                'id_session' => $session->id_session,
                'id_metode' => $method->id_metode,
                'jenis_pembayaran' => 'charging',
                'total_bayar' => $cost['total'],
                'status_pembayaran' => 'Pending',
                'waktu_pembayaran' => now(),
                'referensi_gateway' => 'HOLD-'.now()->format('YmdHis').'-'.$session->id_session,
            ]);

            return $session;
        });
    }
}
