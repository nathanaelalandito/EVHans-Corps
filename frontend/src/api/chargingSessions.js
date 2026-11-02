import api from './client';

export async function validateCharger(payload) {
    const { data } = await api.post('/charging-sessions/validate', payload);
    return data.data ?? data;
}

export async function startChargingSession(payload) {
    const { data } = await api.post('/charging-sessions/start', payload);
    return data.data ?? data;
}

export async function finishChargingSession(id, payload = {}) {
    const { data } = await api.post(`/charging-sessions/${id}/finish`, payload);
    return data.data ?? data;
}

export async function interruptChargingSession(id, payload = {}) {
    const { data } = await api.post(`/charging-sessions/${id}/interrupt`, payload);
    return data.data ?? data;
}

export async function getActiveChargingSession() {
    const { data } = await api.get('/charging-sessions/active');
    return data.data ?? null;
}

export async function getChargingHistory() {
    const { data } = await api.get('/charging-sessions/history');
    return data.data ?? data;
}

export async function getChargingInvoice(id) {
    const { data } = await api.get(`/charging-sessions/${id}/invoice`);
    return data.data ?? data;
}
