import api from './client';

export async function getOperationsDashboard() {
    const { data } = await api.get('/operations/dashboard');
    return data.data ?? data;
}

export async function updateStation(id, payload) {
    const { data } = await api.put(`/operations/stations/${id}`, payload);
    return data.data ?? data;
}

export async function createStation(payload) {
    const { data } = await api.post('/operations/stations', payload);
    return data.data ?? data;
}

export async function updateCharger(id, payload) {
    const { data } = await api.put(`/operations/chargers/${id}`, payload);
    return data.data ?? data;
}

export async function createTarif(idLocation, payload) {
    const { data } = await api.post(`/operations/stations/${idLocation}/tarifs`, payload);
    return data.data ?? data;
}

export async function assignOperatorStation(idUser, idLocation) {
    const { data } = await api.put(`/operations/operators/${idUser}/station`, { id_location: idLocation });
    return data.data ?? data;
}

export async function updateOperatorStatus(idUser, statusAkun) {
    const { data } = await api.put(`/operations/operators/${idUser}/status`, { status_akun: statusAkun });
    return data.data ?? data;
}

export async function createOperator(payload) {
    const { data } = await api.post('/operations/operators', payload);
    return data.data ?? data;
}

export async function getAuditLogs() {
    const { data } = await api.get('/operations/audit-logs');
    return data.data ?? data;
}

export async function getSystemConfig() {
    const { data } = await api.get('/operations/config');
    return data.data ?? data;
}

export async function updateSystemConfig(payload) {
    const { data } = await api.put('/operations/config', payload);
    return data.data ?? data;
}