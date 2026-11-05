import api from './client';

/** Memeriksa apakah port dan kendaraan memenuhi syarat untuk charging. */
export async function validateCharger(payload) {
    const { data } = await api.post('/charging-sessions/validate', payload);
    return data.data ?? data;
}

/** Membuat sesi charging melalui endpoint sesi backend. */
export async function startChargingSession(payload) {
    const { data } = await api.post('/charging-sessions/start', payload);
    return data.data ?? data;
}

/** Menyelesaikan sesi secara normal dengan data akhir opsional dari charger. */
export async function finishChargingSession(id, payload = {}) {
    const { data } = await api.post(`/charging-sessions/${id}/finish`, payload);
    return data.data ?? data;
}

/** Melaporkan sesi yang terhenti akibat gangguan atau kegagalan perangkat. */
export async function interruptChargingSession(id, payload = {}) {
    const { data } = await api.post(`/charging-sessions/${id}/interrupt`, payload);
    return data.data ?? data;
}

/** Mengambil sesi aktif yang akan dipulihkan pada tampilan pengemudi. */
export async function getActiveChargingSession() {
    const { data } = await api.get('/charging-sessions/active');
    return data.data ?? null;
}

/** Mengambil seluruh riwayat sesi charging pengguna. */
export async function getChargingHistory() {
    const { data } = await api.get('/charging-sessions/history');
    return data.data ?? data;
}

/** Mengambil rincian invoice untuk sesi yang sudah diselesaikan. */
export async function getChargingInvoice(id) {
    const { data } = await api.get(`/charging-sessions/${id}/invoice`);
    return data.data ?? data;
}
