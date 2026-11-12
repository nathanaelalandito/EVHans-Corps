import api from './client';

const KONEKTOR_LABEL = { type_2: 'Type 2', ccs2: 'CCS2', chademo: 'CHAdeMO', gbt: 'GB/T' };
export const konektorLabel = (v) => KONEKTOR_LABEL[v] ?? v;

export async function getStations(params = {}) {
    const { data } = await api.get('/stations', { params });
    return data.data ?? data;
}

// Detail lengkap satu station: info lokasi, tarif aktif, dan daftar port (chargers).
export async function getStationDetail(id, params = {}) {
    const { data } = await api.get(`/stations/${id}`, { params });
    return data.data ?? data;
}

// Driver dianggap "sudah sampai" kalau jaraknya <= nilai ini (meter).
// Harus sama dengan CHARGING_ARRIVAL_RADIUS_M di backend (config/charging.php).
export const ARRIVAL_RADIUS_M = 300;

// Jarak garis lurus (haversine) dalam meter. from & to berbentuk { lat, lng }.
export function distanceMeters(from, to) {
    const earthRadiusM = 6371000;
    const toRadians = (degrees) => (degrees * Math.PI) / 180;
    const latDelta = toRadians(to.lat - from.lat);
    const lngDelta = toRadians(to.lng - from.lng);
    const a =
        Math.sin(latDelta / 2) ** 2 +
        Math.cos(toRadians(from.lat)) * Math.cos(toRadians(to.lat)) * Math.sin(lngDelta / 2) ** 2;
    return 2 * earthRadiusM * Math.asin(Math.sqrt(a));
}
