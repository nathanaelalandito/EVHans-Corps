<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Dompet;
use App\Models\MetodePembayaran;
use App\Models\Payment;
use App\Models\Topup;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Validator;

class DompetPinController extends Controller
{
    /**
     * Batas percobaan PIN salah sebelum dompet dikunci sementara.
     */
    protected int $maxAttempt = 5;

    /**
     * Lama waktu kunci (menit) setelah percobaan salah melebihi batas.
     */
    protected int $lockMinutes = 15;

    /**
     * Ambil (atau buat otomatis jika belum ada) dompet milik user yang login.
     */
    protected function getOrCreateWallet(Request $request): Dompet
    {
        return Dompet::firstOrCreate(
            ['id_user' => $request->user()->id_user],
            ['saldo' => 0, 'status_dompet' => 'aktif']
        );
    }

    /**
     * GET /api/wallet
     * Info ringkas dompet: saldo, status, apakah PIN sudah diset, status kunci.
     */
    public function show(Request $request)
    {
        $wallet = $this->getOrCreateWallet($request);

        return response()->json([
            'saldo' => $wallet->saldo,
            'saldo_ditahan' => $wallet->saldo_ditahan,
            'saldo_tersedia' => max(0, $wallet->saldo - $wallet->saldo_ditahan),
            'status_dompet' => $wallet->status_dompet,
            'pin_sudah_diset' => $wallet->hasPin(),
            'terkunci' => $wallet->isLocked(),
            'terkunci_sampai' => $wallet->isLocked() ? $wallet->locked_until : null,
        ]);
    }

    /**
     * POST /api/wallet/pin
     * Set PIN transaksi pertama kali (hanya jika belum pernah diset).
     */
    public function setPin(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'pin' => ['required', 'digits:6', 'confirmed'],
        ]);

        if ($validator->fails()) {
            return response()->json(['errors' => $validator->errors()], 422);
        }

        $wallet = $this->getOrCreateWallet($request);

        if ($wallet->hasPin()) {
            return response()->json([
                'message' => 'PIN sudah pernah diset. Gunakan endpoint ubah PIN untuk menggantinya.',
            ], 409);
        }

        $wallet->pin_transaksi = Hash::make($request->pin);
        $wallet->percobaan_pin_gagal = 0;
        $wallet->locked_until = null;
        $wallet->save();

        return response()->json(['message' => 'PIN dompet berhasil dibuat.']);
    }

    /**
     * PUT /api/wallet/pin
     * Ubah PIN transaksi (butuh PIN lama).
     */
    public function changePin(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'pin_lama' => ['required', 'digits:6'],
            'pin_baru' => ['required', 'digits:6', 'confirmed', 'different:pin_lama'],
        ]);

        if ($validator->fails()) {
            return response()->json(['errors' => $validator->errors()], 422);
        }

        $wallet = $this->getOrCreateWallet($request);

        if (! $wallet->hasPin()) {
            return response()->json([
                'message' => 'PIN belum diset. Gunakan endpoint set PIN terlebih dahulu.',
            ], 409);
        }

        if ($lockResponse = $this->blockIfLocked($wallet)) {
            return $lockResponse;
        }

        if (! Hash::check($request->pin_lama, $wallet->pin_transaksi)) {
            return $this->handleFailedAttempt($wallet, 'PIN lama salah.');
        }

        $wallet->pin_transaksi = Hash::make($request->pin_baru);
        $wallet->percobaan_pin_gagal = 0;
        $wallet->locked_until = null;
        $wallet->save();

        return response()->json(['message' => 'PIN dompet berhasil diubah.']);
    }

    /**
     * POST /api/wallet/pin/verify
     * Verifikasi PIN, dipakai modul lain (mis. sebelum topup/pembayaran).
     */
    public function verifyPin(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'pin' => ['required', 'digits:6'],
        ]);

        if ($validator->fails()) {
            return response()->json(['errors' => $validator->errors()], 422);
        }

        $wallet = $this->getOrCreateWallet($request);

        if (! $wallet->hasPin()) {
            return response()->json(['message' => 'PIN belum diset.'], 409);
        }

        if ($lockResponse = $this->blockIfLocked($wallet)) {
            return $lockResponse;
        }

        if (! Hash::check($request->pin, $wallet->pin_transaksi)) {
            return $this->handleFailedAttempt($wallet, 'PIN salah.');
        }

        // Reset percobaan gagal setelah verifikasi berhasil
        if ($wallet->percobaan_pin_gagal > 0) {
            $wallet->percobaan_pin_gagal = 0;
            $wallet->save();
        }

        return response()->json(['message' => 'PIN valid.', 'valid' => true]);
    }

    /**
     * POST /api/wallet/topup
     * Prototype top up instant untuk driver sebelum integrasi payment gateway.
     */
    public function topUp(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'nominal' => ['required', 'integer', 'min:10000', 'max:5000000'],
            'metode_pembayaran' => ['required', 'in:Mandiri,OVO,BCA,BRI,BNI'],
            'pin' => ['nullable', 'digits:6'],
        ]);

        if ($validator->fails()) {
            return response()->json(['errors' => $validator->errors()], 422);
        }

        $this->getOrCreateWallet($request);

        $result = DB::transaction(function () use ($request) {
            $wallet = Dompet::where('id_user', $request->user()->id_user)->lockForUpdate()->firstOrFail();

            if ($wallet->status_dompet !== 'aktif') {
                return response()->json(['message' => 'Dompet Digital sedang tidak aktif.'], 409);
            }

            if ($wallet->hasPin()) {
                if (! $request->filled('pin')) {
                    return response()->json(['message' => 'PIN Dompet diperlukan untuk top up.'], 422);
                }

                if ($lockResponse = $this->blockIfLocked($wallet)) {
                    return $lockResponse;
                }

                if (! Hash::check($request->pin, $wallet->pin_transaksi)) {
                    return $this->handleFailedAttempt($wallet, 'PIN salah.');
                }
            }

            $method = $this->paymentMethod((string) $request->metode_pembayaran);
            $nominal = (int) $request->nominal;
            $reference = 'TOPUP-'.now()->format('YmdHis').'-'.$wallet->id_wallet;

            $payment = Payment::create([
                'id_session' => null,
                'id_metode' => $method->id_metode,
                'jenis_pembayaran' => 'topup',
                'total_bayar' => $nominal,
                'status_pembayaran' => 'sukses',
                'waktu_pembayaran' => now(),
                'referensi_gateway' => $reference,
            ]);

            Topup::create([
                'id_wallet' => $wallet->id_wallet,
                'id_payment' => $payment->id_payment,
                'nominal' => $nominal,
                'status_topup' => 'sukses',
                'waktu_topup' => now(),
            ]);

            $wallet->saldo += $nominal;
            $wallet->percobaan_pin_gagal = 0;
            $wallet->locked_until = null;
            $wallet->save();

            return [
                'wallet' => $wallet,
                'payment' => $payment->load('method'),
            ];
        });

        if ($result instanceof JsonResponse) {
            return $result;
        }

        $wallet = $result['wallet'];
        $payment = $result['payment'];

        return response()->json([
            'message' => 'Top up Dompet Digital berhasil.',
            'id_payment' => $payment->id_payment,
            'referensi_gateway' => $payment->referensi_gateway,
            'metode_pembayaran' => $payment->method->nama_metode,
            'saldo' => $wallet->saldo,
            'saldo_ditahan' => $wallet->saldo_ditahan,
            'saldo_tersedia' => max(0, $wallet->saldo - $wallet->saldo_ditahan),
        ]);
    }

    /**
     * POST /api/wallet/pin/reset
     * Reset PIN saat lupa, verifikasi memakai password akun (bukan PIN lama).
     */
    public function resetPin(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'password' => ['required', 'string'],
            'pin_baru' => ['required', 'digits:6', 'confirmed'],
        ]);

        if ($validator->fails()) {
            return response()->json(['errors' => $validator->errors()], 422);
        }

        $user = $request->user();

        if (! Hash::check($request->password, $user->password)) {
            return response()->json(['message' => 'Password akun salah.'], 422);
        }

        $wallet = $this->getOrCreateWallet($request);
        $wallet->pin_transaksi = Hash::make($request->pin_baru);
        $wallet->percobaan_pin_gagal = 0;
        $wallet->locked_until = null;
        $wallet->save();

        return response()->json(['message' => 'PIN dompet berhasil direset.']);
    }

    /**
     * DELETE /api/wallet/pin
     * Nonaktifkan PIN transaksi. Wajib konfirmasi pakai PIN yang sedang aktif.
     */
    public function disablePin(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'pin' => ['required', 'digits:6'],
        ]);

        if ($validator->fails()) {
            return response()->json(['errors' => $validator->errors()], 422);
        }

        $wallet = $this->getOrCreateWallet($request);

        if (! $wallet->hasPin()) {
            return response()->json(['message' => 'PIN belum diset.'], 409);
        }

        if ($lockResponse = $this->blockIfLocked($wallet)) {
            return $lockResponse;
        }

        if (! Hash::check($request->pin, $wallet->pin_transaksi)) {
            return $this->handleFailedAttempt($wallet, 'PIN salah.');
        }

        $wallet->pin_transaksi = null;
        $wallet->percobaan_pin_gagal = 0;
        $wallet->locked_until = null;
        $wallet->save();

        return response()->json(['message' => 'PIN dompet berhasil dinonaktifkan.']);
    }

    /**
     * Cek apakah dompet sedang terkunci akibat terlalu banyak percobaan salah.
     */
    protected function blockIfLocked(Dompet $wallet)
    {
        if ($wallet->isLocked()) {
            return response()->json([
                'message' => 'Dompet terkunci sementara karena terlalu banyak percobaan PIN salah. Coba lagi nanti.',
                'terkunci_sampai' => $wallet->locked_until,
            ], 423); // 423 Locked
        }

        return null;
    }

    /**
     * Tambah hitungan percobaan gagal, kunci dompet jika sudah melebihi batas.
     */
    protected function handleFailedAttempt(Dompet $wallet, string $message)
    {
        $wallet->percobaan_pin_gagal += 1;

        if ($wallet->percobaan_pin_gagal >= $this->maxAttempt) {
            $wallet->locked_until = now()->addMinutes($this->lockMinutes);
            $wallet->percobaan_pin_gagal = 0;
            $wallet->save();

            return response()->json([
                'message' => "Terlalu banyak percobaan salah. Dompet dikunci selama {$this->lockMinutes} menit.",
                'terkunci_sampai' => $wallet->locked_until,
            ], 423);
        }

        $wallet->save();

        $sisa = $this->maxAttempt - $wallet->percobaan_pin_gagal;

        return response()->json([
            'message' => "{$message} Sisa percobaan: {$sisa}.",
        ], 422);
    }

    protected function paymentMethod(string $name): MetodePembayaran
    {
        return MetodePembayaran::firstOrCreate(
            ['nama_metode' => $name],
            ['biaya_layanan' => 0, 'status_metode' => 'aktif']
        );
    }
}
