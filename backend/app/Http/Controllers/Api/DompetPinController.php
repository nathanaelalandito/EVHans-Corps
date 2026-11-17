<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Concerns\ChecksWalletPin;
use App\Http\Controllers\Controller;
use App\Models\AuditLog;
use App\Models\Dompet;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Validator;

/** Mengelola saldo dompet digital serta pembuatan dan verifikasi PIN transaksi. */
class DompetPinController extends Controller
{
    use ChecksWalletPin;

    /**
     * Batas percobaan PIN salah sebelum dompet dikunci sementara.
     */
    protected int $maxAttempt = 3;

    /**
     * Lama waktu kunci (menit) setelah percobaan salah melebihi batas.
     */
    protected int $lockMinutes = 15;

    /**
     * Ambil (atau buat otomatis jika belum ada) dompet milik user yang login.
     */
    /** Memuat dompet pengemudi dan membuat record awal jika belum tersedia. */
    protected function getOrCreateWallet(Request $request): Dompet
    {
        return Dompet::firstOrCreate(
            ['id_user' => $request->user()->id_user],
            ['saldo' => 0, 'status_dompet' => 'Aktif']
        );
    }

    /**
     * GET /api/wallet
     * Info ringkas dompet: saldo, status, apakah PIN sudah diset, status kunci.
     */
    /** Mengirim ringkasan dompet tanpa membocorkan PIN transaksi. */
    public function show(Request $request)
    {
        $wallet = $this->getOrCreateWallet($request);

        return response()->json([
            'saldo' => $wallet->saldo,
            'saldo_hold' => (int) $wallet->saldo_hold,
            'saldo_tersedia' => $wallet->saldoTersedia(),
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
    /** Menyimpan PIN pertama dalam bentuk hash setelah validasi format. */
    public function setPin(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'pin' => ['required', 'digits:6', 'confirmed'],
        ]);
        if ($validator->fails()) {
            return response()->json(['errors' => $validator->errors()], 422);
        }
        if ($weakPinError = $this->weakPinError($request, 'pin')) {
            return $weakPinError;
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
        $this->auditPinAction($request, $wallet, 'buat_pin', false);

        return response()->json(['message' => 'PIN dompet berhasil dibuat.']);
    }

    /**
     * PUT /api/wallet/pin
     * Ubah PIN transaksi (butuh PIN lama).
     */
    /** Mengganti PIN setelah PIN lama diverifikasi. */
    public function changePin(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'pin_lama' => ['required', 'digits:6'],
            'pin_baru' => ['required', 'digits:6', 'confirmed', 'different:pin_lama'],
        ]);
        if ($validator->fails()) {
            return response()->json(['errors' => $validator->errors()], 422);
        }
        if ($weakPinError = $this->weakPinError($request, 'pin_baru')) {
            return $weakPinError;
        }

        $wallet = $this->getOrCreateWallet($request);

        if (! $wallet->hasPin()) {
            return response()->json([
                'message' => 'PIN belum diset. Gunakan endpoint set PIN terlebih dahulu.',
            ], 409);
        }

        if ($wallet->isLocked()) {
            return response()->json([
                'message' => 'Dompet terkunci sementara karena terlalu banyak percobaan PIN salah.',
                'terkunci_sampai' => $wallet->locked_until,
            ], 423);
        }

        if (! Hash::check($request->pin_lama, $wallet->pin_transaksi)) {
            return $this->handleFailedAttempt($wallet, 'Verifikasi PIN gagal.');
        }

        $wasSet = $wallet->hasPin();
        $wallet->pin_transaksi = Hash::make($request->pin_baru);
        $wallet->percobaan_pin_gagal = 0;
        $wallet->locked_until = null;
        $wallet->save();
        $this->auditPinAction($request, $wallet, 'ubah_pin', $wasSet);

        return response()->json(['message' => 'PIN dompet berhasil diubah.']);
    }

    /**
     * POST /api/wallet/pin/verify
     * Verifikasi PIN, dipakai modul lain.
     */
    /** Memeriksa PIN transaksi dan menerapkan batas percobaan yang gagal. */
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

        if ($wallet->isLocked()) {
            return response()->json([
                'message' => 'Dompet terkunci sementara.',
                'terkunci_sampai' => $wallet->locked_until,
            ], 423);
        }

        if (! Hash::check($request->pin, $wallet->pin_transaksi)) {
            return $this->handleFailedAttempt($wallet, 'PIN salah.');
        }

        if ($wallet->percobaan_pin_gagal > 0) {
            $wallet->percobaan_pin_gagal = 0;
            $wallet->save();
        }

        return response()->json(['message' => 'PIN valid.', 'valid' => true]);
    }

    /**
     * POST /api/wallet/pin/reset
     * Reset PIN saat lupa menggunakan password akun.
     */
    /** Mengatur ulang PIN melalui mekanisme verifikasi yang disediakan endpoint. */
    public function resetPin(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'password' => ['required', 'string'],
            'pin_baru' => ['required', 'digits:6', 'confirmed'],
        ]);
        if ($validator->fails()) {
            return response()->json(['errors' => $validator->errors()], 422);
        }
        if ($weakPinError = $this->weakPinError($request, 'pin_baru')) {
            return $weakPinError;
        }

        $user = $request->user();

        if (! Hash::check($request->password, $user->password)) {
            return response()->json(['message' => 'Password akun salah.'], 422);
        }

        $wallet = $this->getOrCreateWallet($request);
        if ($wallet->hasPin() && Hash::check($request->pin_baru, $wallet->pin_transaksi)) {
            return response()->json([
                'errors' => ['pin_baru' => ['PIN baru tidak boleh sama dengan PIN lama.']],
            ], 422);
        }
        $wasSet = $wallet->hasPin();
        $wallet->pin_transaksi = Hash::make($request->pin_baru);
        $wallet->percobaan_pin_gagal = 0;
        $wallet->locked_until = null;
        $wallet->save();
        $this->auditPinAction($request, $wallet, 'reset_pin', $wasSet);

        return response()->json(['message' => 'PIN dompet berhasil direset.']);
    }

    /**
     * DELETE /api/wallet/pin
     * Nonaktifkan PIN transaksi.
     */
    /** Menonaktifkan PIN setelah identitas transaksi diverifikasi. */
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

        if ($wallet->isLocked()) {
            return response()->json([
                'message' => 'Dompet terkunci sementara.',
                'terkunci_sampai' => $wallet->locked_until,
            ], 423);
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

    /** Menambah hitungan PIN salah dan mengunci dompet jika batas tercapai. */
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

    /** Menolak PIN berulang atau pola berurutan sebelum mengubah dompet. */
    private function weakPinError(Request $request, string $field)
    {
        $pin = $request->input($field);
        if (is_string($pin) && $this->isWeakPin($pin)) {
            return response()->json([
                'errors' => [$field => ['PIN tidak boleh seluruhnya sama atau berupa urutan naik/turun.']],
            ], 422);
        }

        return null;
    }

    /** Memeriksa pola berulang dan urutan bersebelahan tanpa wrap-around. */
    private function isWeakPin(string $pin): bool
    {
        if (strlen($pin) !== 6 || ! ctype_digit($pin)) {
            return false;
        }

        $digits = array_map('intval', str_split($pin));
        $allSame = count(array_unique($digits)) === 1;
        $ascending = true;
        $descending = true;
        for ($index = 1; $index < count($digits); $index++) {
            $ascending = $ascending && $digits[$index] === $digits[$index - 1] + 1;
            $descending = $descending && $digits[$index] === $digits[$index - 1] - 1;
        }

        return $allSame || $ascending || $descending;
    }

    /** Mencatat aksi PIN tanpa menyimpan nilai PIN atau hash. */
    private function auditPinAction(Request $request, Dompet $wallet, string $action, bool $wasSet): void
    {
        AuditLog::create([
            'id_user' => (string) $request->user()->id_user,
            'id_location' => null,
            'aksi' => $action,
            'entitas' => 'dompet',
            'id_entitas' => (string) $wallet->id_wallet,
            'data_sebelum' => ['pin_sudah_diset' => $wasSet],
            'data_sesudah' => ['pin_sudah_diset' => true],
            'alasan' => null,
        ]);
    }

}
