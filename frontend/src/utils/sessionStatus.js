/** Memetakan status sesi/transaksi ke tone badge yang konsisten. */
export function sessionStatusTone(status) {
    const value = String(status ?? '').trim().toLowerCase();
    if (!value) return 'neutral';
    if (['gagal', 'terhenti', 'dibatalkan', 'failed', 'cancelled', 'canceled'].includes(value)) {
        return 'danger';
    }
    if (['selesai', 'sukses', 'success', 'berhasil'].includes(value)) {
        return 'ok';
    }
    if (['berlangsung', 'charging', 'berjalan', 'aktif'].includes(value)) {
        return 'info';
    }
    if (['pending', 'menunggu', 'estimasi', 'waiting'].includes(value)) {
        return 'warn';
    }
    return 'neutral';
}
