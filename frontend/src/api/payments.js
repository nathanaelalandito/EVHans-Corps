import api from './client';

/** Mengambil daftar transaksi pembayaran milik pengguna saat ini. */
export async function getPaymentHistory() {
    const { data } = await api.get('/payments/history');
    return data.data ?? data;
}

/** Mengambil detail satu transaksi untuk menampilkan invoice. */
export async function getPaymentDetail(id) {
    const { data } = await api.get(`/payments/${id}`);
    return data.data ?? data;
}
