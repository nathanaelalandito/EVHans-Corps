import api from './client';

// Semua fungsi di sini melempar error axios apa adanya kalau gagal —
// biar komponen yang menampilkan pesan dari error.response.data.

// Cache modul supaya layar dompet/riwayat bisa langsung tampil dari data
// terakhir tanpa menunggu request API. Selalu di-refresh di latar belakang.
let cachedWallet = null;
let cachedTransactions = [];

export function clearWalletCache() {
    cachedWallet = null;
    cachedTransactions = [];
}

export function getCachedWallet() {
    return cachedWallet;
}

export function getCachedTransactions() {
    return cachedTransactions;
}

export async function getWallet() {
    const { data } = await api.get('/wallet');
    cachedWallet = data;
    return data;
}

export async function topUpWallet(nominal, metodePembayaran, pin = '') {
    const { data } = await api.post('/wallet/topup', {
        nominal,
        metode_pembayaran: metodePembayaran,
        pin,
    });
    return data;
}

// Riwayat mutasi dompet: gabungan top up + pembayaran charging.
export async function getTransactions() {
    const { data } = await api.get('/wallet/transactions');
    cachedTransactions = data.transactions || [];
    if (data && typeof data.saldo !== 'undefined') {
        cachedWallet = { ...(cachedWallet || {}), saldo: data.saldo };
    }
    return data;
}

export async function createPin(pin, pinConfirmation) {
    const { data } = await api.post('/wallet/pin', {
        pin,
        pin_confirmation: pinConfirmation,
    });
    return data;
}

export async function changePin(pinLama, pinBaru, pinBaruConfirmation) {
    const { data } = await api.put('/wallet/pin', {
        pin_lama: pinLama,
        pin_baru: pinBaru,
        pin_baru_confirmation: pinBaruConfirmation,
    });
    return data;
}

export async function disablePin(pin) {
    const { data } = await api.delete('/wallet/pin', { data: { pin } });
    return data;
}

export async function verifyPin(pin) {
    const { data } = await api.post('/wallet/pin/verify', { pin });
    return data;
}

export async function resetPin(password, pinBaru, pinBaruConfirmation) {
    const { data } = await api.post('/wallet/pin/reset', {
        password,
        pin_baru: pinBaru,
        pin_baru_confirmation: pinBaruConfirmation,
    });
    return data;
}
