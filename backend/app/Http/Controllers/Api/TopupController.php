<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Topup;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;

/**
 * Top up berdiri sendiri: memakai tabel topup, dompet, metode_pembayaran,
 * dan user_profile (hanya untuk membaca nomor telepon driver).
 * Tabel payment (khusus pembayaran charging) tidak disentuh.
 */
class TopupController extends Controller
{
    private const MIN_AMOUNT   = 10000;
    private const MAX_AMOUNT   = 5000000;
    private const EXPIRY_HOURS = 24;

    /** GET /api/topup/methods */
    public function methods()
    {
        $methods = DB::table('metode_pembayaran')
            ->where('status_metode', 'aktif')
            ->orderBy('id_metode')
            ->get()
            ->map(function ($m) {
                $type = $this->typeOf($m->nama_metode);

                return [
                    'id'          => $m->id_metode,
                    'name'        => $m->nama_metode,
                    'type'        => $type,
                    'fee'         => (int) $m->biaya_layanan,
                    'description' => $type === 'va'
                        ? 'Transfer ke Virtual Account'
                        : 'Bayar ke nomor ' . $m->nama_metode . ' Anda',
                ];
            })
            ->values();

        return response()->json([
            'success' => true,
            'data'    => [
                'methods'    => $methods,
                'min_amount' => self::MIN_AMOUNT,
                'max_amount' => self::MAX_AMOUNT,
            ],
        ]);
    }

    /** POST /api/topup  { method: id_metode, amount } */
    public function store(Request $request)
    {
        $validated = $request->validate([
            'method' => ['required', 'integer',
                Rule::exists('metode_pembayaran', 'id_metode')->where('status_metode', 'aktif')],
            'amount' => ['required', 'integer', 'min:' . self::MIN_AMOUNT, 'max:' . self::MAX_AMOUNT],
        ]);

        $metode = DB::table('metode_pembayaran')->where('id_metode', $validated['method'])->first();
        $dompet = $this->dompetOf($request);

        if ($dompet->status_dompet !== 'aktif') {
            return response()->json(['success' => false, 'message' => 'Dompet Anda sedang nonaktif.'], 422);
        }

        // Nomor telepon driver: dompet -> user_profile
        $phone = $this->phoneOfWallet($dompet->id_wallet);

        if ($phone === '') {
            return response()->json([
                'success' => false,
                'message' => 'Nomor telepon belum diisi di profil Anda.',
            ], 422);
        }

        $isVa = $this->typeOf($metode->nama_metode) === 'va';

        // VA = kode bank + nomor telepon (tanpa 0 di depan); GoPay/DANA = nomor telepon
        $kodePembayaran = $isVa
            ? $this->bankCodeOf($metode->nama_metode) . ltrim($phone, '0')
            : $phone;

        $topup = Topup::create([
            'id_wallet'        => $dompet->id_wallet,
            'id_payment'       => null, // top up tidak memakai tabel payment
            'id_metode'        => $metode->id_metode,
            'referensi'        => 'EVT' . now()->format('Ymd') . '-' . strtoupper(Str::random(6)),
            'kode_pembayaran'  => $kodePembayaran,
            'nominal'          => $validated['amount'],
            'biaya_layanan'    => (int) $metode->biaya_layanan,
            'status_topup'     => 'pending',
            'waktu_topup'      => now(),
            'kedaluwarsa_pada' => now()->addHours(self::EXPIRY_HOURS),
        ]);

        return response()->json(['success' => true, 'data' => $this->format($topup)], 201);
    }

    /** GET /api/topup/{reference}  (dipakai frontend untuk polling status) */
    public function show(Request $request, string $reference)
    {
        $topup = $this->expireIfNeeded($this->findOwned($request, $reference));

        return response()->json(['success' => true, 'data' => $this->format($topup, true)]);
    }

    /**
     * POST /api/topup/{reference}/simulate-pay
     * Hanya untuk development. Saat memakai gateway asli (Midtrans/Xendit),
     * panggil settle() dari endpoint webhook.
     */
    public function simulatePay(Request $request, string $reference)
    {
        abort_unless(config('app.debug'), 403, 'Simulasi hanya tersedia saat APP_DEBUG=true.');

        $topup = $this->expireIfNeeded($this->findOwned($request, $reference));

        if ($topup->status_topup === 'gagal') {
            return response()->json(['success' => false, 'message' => 'Kode pembayaran sudah kedaluwarsa.'], 422);
        }

        $this->settle($topup->id_topup);

        return response()->json(['success' => true, 'data' => $this->format($topup->fresh(), true)]);
    }

    /** Tandai lunas + tambah saldo. Aman dipanggil berulang (idempotent). */
    private function settle(int $topupId): void
    {
        DB::transaction(function () use ($topupId) {
            $topup = Topup::lockForUpdate()->find($topupId);

            if (! $topup || $topup->status_topup !== 'pending') {
                return;
            }

            // waktu_topup diperbarui menjadi waktu pembayaran diterima
            $topup->update(['status_topup' => 'sukses', 'waktu_topup' => now()]);

            DB::table('dompet')->where('id_wallet', $topup->id_wallet)
                ->increment('saldo', $topup->nominal, ['updated_at' => now()]);
        });
    }

    /* ---------------- helper ---------------- */

    private function typeOf(string $namaMetode): string
    {
        return preg_match('/\bva\b/i', $namaMetode) ? 'va' : 'qr';
    }

    /** Nomor telepon driver lewat: dompet (id_wallet) -> user_profile (id_user). */
    private function phoneOfWallet($idWallet): string
    {
        $phone = DB::table('dompet')
            ->join('user_profile', 'user_profile.id_user', '=', 'dompet.id_user')
            ->where('dompet.id_wallet', $idWallet)
            ->value('user_profile.nomor_telepon');

        return preg_replace('/\D/', '', (string) $phone);
    }

    /** Kode bank (prefix VA). Sesuaikan dengan kode resmi bank/gateway Anda. */
    private function bankCodeOf(string $namaMetode): string
    {
        $map = [
            'va bri'  => '77777',
            'seabank' => '90100',
        ];

        return $map[strtolower(trim($namaMetode))] ?? '';
    }

    private function dompetOf(Request $request): object
    {
        $idUser = $request->user()->getKey();

        $dompet = DB::table('dompet')->where('id_user', $idUser)->first();

        if (! $dompet) {
            $id = DB::table('dompet')->insertGetId([
                'id_user' => $idUser, 'saldo' => 0,
                'created_at' => now(), 'updated_at' => now(),
            ], 'id_wallet');
            $dompet = DB::table('dompet')->where('id_wallet', $id)->first();
        }

        return $dompet;
    }

    private function findOwned(Request $request, string $reference): Topup
    {
        return Topup::where('referensi', $reference)
            ->whereIn('id_wallet', DB::table('dompet')
                ->where('id_user', $request->user()->getKey())
                ->select('id_wallet'))
            ->firstOrFail();
    }

    private function expireIfNeeded(Topup $topup): Topup
    {
        if ($topup->status_topup === 'pending' && $topup->kedaluwarsa_pada->isPast()) {
            $topup->update(['status_topup' => 'gagal']);
        }

        return $topup;
    }

    /** Bentuk respons tetap sama dengan yang dipakai frontend: pending | paid | expired. */
    private function format(Topup $topup, bool $withBalance = false): array
    {
        $namaMetode = (string) DB::table('metode_pembayaran')
            ->where('id_metode', $topup->id_metode)
            ->value('nama_metode');

        $data = [
            'reference'    => $topup->referensi,
            'method'       => $topup->id_metode,
            'method_name'  => $namaMetode,
            'type'         => $this->typeOf($namaMetode),
            'amount'       => $topup->nominal,
            'total'        => $topup->nominal + $topup->biaya_layanan,
            'payment_code' => $topup->kode_pembayaran,
            'phone_number' => $this->phoneOfWallet($topup->id_wallet),
            'status'       => ['pending' => 'pending', 'sukses' => 'paid', 'gagal' => 'expired'][$topup->status_topup],
            'expires_at'   => $topup->kedaluwarsa_pada->toIso8601String(),
            'paid_at'      => $topup->status_topup === 'sukses' ? $topup->waktu_topup->toIso8601String() : null,
        ];

        if ($withBalance) {
            $data['saldo'] = (int) DB::table('dompet')->where('id_wallet', $topup->id_wallet)->value('saldo');
        }

        return $data;
    }
}