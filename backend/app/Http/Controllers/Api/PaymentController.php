<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Payment;
use App\Models\Port;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\ModelNotFoundException;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/** Menyediakan riwayat dan rincian pembayaran milik pengemudi. */
class PaymentController extends Controller
{
    /** Mengambil riwayat pembayaran milik pengguna yang sedang login. */
    public function history(Request $request): JsonResponse
    {
        $payments = Payment::with([
            'method',
            'refund',
            'session.charger.location',
            'session.port',
            'session.vehicle',
            'session.tarif',
            'topup.wallet',
        ])
            ->where($this->ownedBy($request->user()->id_user))
            ->latest('waktu_pembayaran')
            ->limit(15)
            ->get()
            ->map(fn (Payment $payment) => $this->presentSummary($payment))
            ->values();

        return response()->json(['data' => $payments]);
    }

    /** Menampilkan detail transaksi setelah memastikan transaksi milik pengguna. */
    public function show(Request $request, Payment $payment): JsonResponse
    {
        $payment = Payment::with([
            'method',
            'refund',
            'session.charger.location',
            'session.port',
            'session.vehicle',
            'session.tarif',
            'topup.wallet',
        ])
            ->whereKey($payment->id_payment)
            ->where($this->ownedBy($request->user()->id_user))
            ->first();

        if (! $payment) {
            throw (new ModelNotFoundException)->setModel(Payment::class, [$payment?->id_payment]);
        }

        return response()->json(['data' => $this->presentDetail($payment)]);
    }

    /** Membatasi query pembayaran ke sesi yang dimiliki pengemudi tertentu. */
    private function ownedBy(string $idUser): \Closure
    {
        return function (Builder $query) use ($idUser): void {
            $query
                ->whereHas('session', fn (Builder $session) => $session->where('id_user', $idUser))
                ->orWhereHas('topup.wallet', fn (Builder $wallet) => $wallet->where('id_user', $idUser));
        };
    }

    /** Menyusun data singkat transaksi untuk daftar riwayat. */
    private function presentSummary(Payment $payment): array
    {
        if ($payment->jenis_pembayaran === 'topup') {
            return [
                'id_payment' => $payment->id_payment,
                'id_session' => null,
                'jenis_pembayaran' => 'topup',
                'judul' => 'Top Up Dompet Digital',
                'nama_lokasi' => 'Top Up Dompet Digital',
                'tanggal' => $payment->waktu_pembayaran?->timezone('Asia/Jakarta')->translatedFormat('d M Y, H:i'),
                'energi_kwh' => null,
                'total' => $payment->total_bayar,
                'status' => $this->paymentStatusLabel($payment->status_pembayaran),
                'status_pembayaran' => $payment->status_pembayaran,
                'metode_pembayaran' => $payment->method?->nama_metode,
            ];
        }

        $session = $payment->session;

        return [
            'id_payment' => $payment->id_payment,
            'id_session' => $session?->id_session,
            'jenis_pembayaran' => 'charging',
            'judul' => $session?->charger?->location?->nama_lokasi ?? 'Charging EV',
            'nama_lokasi' => $session?->charger?->location?->nama_lokasi ?? 'Charging EV',
            'tanggal' => $payment->waktu_pembayaran?->timezone('Asia/Jakarta')->translatedFormat('d M Y, H:i'),
            'energi_kwh' => $session ? (float) $session->total_energi_kwh : null,
            'total' => $payment->total_bayar,
            'status' => $this->paymentStatusLabel($payment->status_pembayaran),
            'status_pembayaran' => $payment->status_pembayaran,
            'metode_pembayaran' => $payment->method?->nama_metode,
        ];
    }

    /** Menyusun rincian pembayaran dan sesi untuk tampilan invoice. */
    private function presentDetail(Payment $payment): array
    {
        if ($payment->jenis_pembayaran === 'topup') {
            return [
                'id_payment' => $payment->id_payment,
                'jenis_pembayaran' => 'topup',
                'nama_lokasi' => 'Top Up Dompet Digital',
                'kode_charger' => '-',
                'metode_pembayaran' => $payment->method?->nama_metode,
                'biaya_aktual' => $payment->total_bayar,
                'jumlah_hold' => 0,
                'selisih_dikembalikan' => 0,
                'status' => $this->paymentStatusLabel($payment->status_pembayaran),
                'status_pembayaran' => $payment->status_pembayaran,
                'referensi_gateway' => $payment->referensi_gateway,
                'waktu_pembayaran' => $payment->waktu_pembayaran?->toISOString(),
            ];
        }

        $session = $payment->session;
        $actualKwh = $session ? (float) $session->total_energi_kwh : 0;
        $costBreakdown = $session && $actualKwh > 0
            ? $session->tarif->costFor($actualKwh, (float) ($session->port?->daya_maks_kw ?? $session->charger?->kap_tot_kw ?? 1))
            : null;

        return [
            'id_payment' => $payment->id_payment,
            'id_session' => $session?->id_session,
            'jenis_pembayaran' => 'charging',
            'nama_lokasi' => $session?->charger?->location?->nama_lokasi ?? 'Charging EV',
            'alamat' => $session?->charger?->location?->alamat,
            'kode_charger' => $session?->charger?->kode_perangkat,
            'nomor_port' => $session?->port?->nomor_port,
            'kendaraan' => $session ? [
                'nama' => "{$session->vehicle->merek} {$session->vehicle->model}",
                'nomor_polisi' => $session->vehicle->nomor_polisi,
                'tipe_konektor' => Port::CONNECTOR_LABELS[$session->vehicle->tipe_konektor] ?? $session->vehicle->tipe_konektor,
            ] : null,
            'energi_kwh' => $session ? (float) $session->total_energi_kwh : 0,
            'tarif_per_kwh' => $session?->tarif?->harga_per_kwh ?? 0,
            'biaya_charging' => $costBreakdown['biaya_charging'] ?? 0,
            'biaya_parkir' => $costBreakdown['biaya_parkir'] ?? 0,
            'biaya_aktual' => $payment->total_bayar,
            'saldo_hold' => $session?->saldo_hold ?? 0,
            'jumlah_hold' => $session?->saldo_hold ?? 0,
            'selisih_dikembalikan' => $payment->refund?->nominal ?? 0,
            'metode_pembayaran' => $payment->method?->nama_metode,
            'status' => $this->paymentStatusLabel($payment->status_pembayaran),
            'status_pembayaran' => $payment->status_pembayaran,
            'referensi_gateway' => $payment->referensi_gateway,
            'refund' => $payment->refund ? [
                'nominal' => $payment->refund->nominal,
                'status' => $payment->refund->status_refund,
                'waktu_execute' => $payment->refund->waktu_execute?->toISOString(),
            ] : null,
            'waktu_mulai' => $session?->waktu_mulai?->toISOString(),
            'waktu_selesai' => $session?->waktu_selesai?->toISOString(),
            'waktu_pembayaran' => $payment->waktu_pembayaran?->toISOString(),
        ];
    }

    /** Mengubah kode status transaksi menjadi label yang ditampilkan ke pengguna. */
    private function paymentStatusLabel(string $status): string
    {
        return match (strtolower($status)) {
            'pending' => 'Pending',
            'sukses' => 'Sukses',
            'gagal' => 'Gagal',
            default => ucfirst($status),
        };
    }
}
