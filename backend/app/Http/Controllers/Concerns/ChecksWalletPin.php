<?php

namespace App\Http\Controllers\Concerns;

use App\Models\Dompet;
use Illuminate\Support\Facades\Hash;

/**
 * Verifikasi PIN dompet + penguncian setelah terlalu banyak percobaan salah.
 * Dipakai bersama oleh DompetPinController dan ChargingSessionController.
 */
trait ChecksWalletPin
{
    /** Batas percobaan PIN salah sebelum dompet dikunci sementara. */
    protected int $maxAttempt = 5;

    /** Lama waktu kunci (menit) setelah percobaan salah melebihi batas. */
    protected int $lockMinutes = 15;

    /**
     * Cek PIN untuk sebuah transaksi. Mengembalikan null kalau PIN valid,
     * atau JsonResponse (error) yang harus langsung dikembalikan ke klien.
     */
    protected function checkWalletPin(Dompet $wallet, string $pin, string $failMessage = 'PIN salah.')
    {
        if (! $wallet->hasPin()) {
            return response()->json([
                'message' => 'PIN dompet belum dibuat. Buat PIN di Pengaturan dulu.',
                'kode' => 'pin_belum_ada',
            ], 409);
        }

        if ($lockResponse = $this->blockIfLocked($wallet)) {
            return $lockResponse;
        }

        if (! Hash::check($pin, $wallet->pin_transaksi)) {
            return $this->handleFailedAttempt($wallet, $failMessage);
        }

        if ($wallet->percobaan_pin_gagal > 0) {
            $wallet->percobaan_pin_gagal = 0;
            $wallet->save();
        }

        return null;
    }

    /** Cek apakah dompet sedang terkunci akibat terlalu banyak percobaan salah. */
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

    /** Tambah hitungan percobaan gagal, kunci dompet jika sudah melebihi batas. */
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
}
