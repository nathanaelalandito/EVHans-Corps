import api from './client';

export async function getStations(params = {}) {
    const { data } = await api.get('/stations', { params });
    return data.data ?? data;
}
