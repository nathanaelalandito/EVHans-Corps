import api from './client';

// Semua fungsi di sini melempar error axios apa adanya kalau gagal —
// biar komponen yang menampilkan pesan dari error.response.data.

export async function getWallet() {
    const { data } = await api.get('/wallet');
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
