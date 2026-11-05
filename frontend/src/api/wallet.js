import api from './client';

// Semua fungsi di sini melempar error axios apa adanya kalau gagal —
// biar komponen yang menampilkan pesan dari error.response.data.

/** Mengambil saldo, status dompet, dan informasi PIN untuk pengguna aktif. */
export async function getWallet() {
    const { data } = await api.get('/wallet');
    return data;
}

/** Menambahkan saldo melalui endpoint top up dompet dan metode yang dipilih. */
export async function topUpWallet(nominal, metodePembayaran, pin = '') {
    const { data } = await api.post('/wallet/topup', {
        nominal,
        metode_pembayaran: metodePembayaran,
        pin,
    });
    return data;
}

/** Menetapkan PIN transaksi pertama beserta konfirmasi nilainya. */
export async function createPin(pin, pinConfirmation) {
    const { data } = await api.post('/wallet/pin', {
        pin,
        pin_confirmation: pinConfirmation,
    });
    return data;
}

/** Mengganti PIN dengan memverifikasi PIN lama dan kecocokan konfirmasi. */
export async function changePin(pinLama, pinBaru, pinBaruConfirmation) {
    const { data } = await api.put('/wallet/pin', {
        pin_lama: pinLama,
        pin_baru: pinBaru,
        pin_baru_confirmation: pinBaruConfirmation,
    });
    return data;
}

/** Meminta backend menonaktifkan perlindungan PIN setelah verifikasi. */
export async function disablePin(pin) {
    const { data } = await api.delete('/wallet/pin', { data: { pin } });
    return data;
}

/** Memverifikasi PIN sebelum pengguna melanjutkan aksi yang dilindungi. */
export async function verifyPin(pin) {
    const { data } = await api.post('/wallet/pin/verify', { pin });
    return data;
}

/** Mengatur ulang PIN dengan autentikasi password akun. */
export async function resetPin(password, pinBaru, pinBaruConfirmation) {
    const { data } = await api.post('/wallet/pin/reset', {
        password,
        pin_baru: pinBaru,
        pin_baru_confirmation: pinBaruConfirmation,
    });
    return data;
}
