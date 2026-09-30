import api from './client';

// Selama satu sesi SPA, data dompet disimpan di cache modul supaya layar
// dompet bisa langsung tampil tanpa menunggu request API (yang di dev
// server butuh ~500ms). Data selalu di-refresh di latar belakang.

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

export async function getTransactions() {
    const { data } = await api.get('/wallet/transactions');
    cachedTransactions = data.transactions || [];
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
