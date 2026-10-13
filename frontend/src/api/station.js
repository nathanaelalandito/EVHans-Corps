// station.js — panggilan API untuk charging station (daftar & detail).
// Fungsi melempar error axios apa adanya kalau gagal.
import api from './client';

const KONEKTOR_LABEL = { type_2: 'Type 2', ccs2: 'CCS2', chademo: 'CHAdeMO', gbt: 'GB/T' };
export const konektorLabel = (v) => KONEKTOR_LABEL[v] ?? v;

const STATUS_LOKASI = { aktif: 'Aktif', maintenance: 'Dalam Perawatan', nonaktif: 'Nonaktif' };

// Bentuk respons API -> bentuk yang dipakai peta/daftar di DriverDashboard.
function toDashboardStation(s) {
    return {
        id_location: s.id_location,
        nama_lokasi: s.nama_lokasi,
        alamat: s.alamat,
        lat: s.latitude,
        lng: s.longitude,
        status: STATUS_LOKASI[s.status] ?? s.status,
        charger_tersedia: s.charger_tersedia,
        charger_total: s.charger_total,
        tipe_konektor: (s.tipe_konektor ?? []).map(konektorLabel),
        daya_kw_max: s.daya_kw_max,
        tarif_per_kwh: s.tarif?.harga_per_kwh ?? null,
        jam_buka: s.jam_buka,
        jam_tutup: s.jam_tutup,
    };
}

export async function getStations() {
    const { data } = await api.get('/stations');
    return (data.data ?? data).map(toDashboardStation);
}

// Detail lengkap: info lokasi, tarif, dan daftar port (chargers).
export async function getStationDetail(id) {
    const { data } = await api.get(`/stations/${id}`);
    return data.data ?? data;
}

// Jarak garis lurus (haversine) dalam km, dibulatkan 1 desimal.
export function distanceKm(a, b) {
    const rad = (d) => (d * Math.PI) / 180;
    const dLat = rad(b.lat - a.lat);
    const dLng = rad(b.lng - a.lng);
    const h =
        Math.sin(dLat / 2) ** 2 +
        Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLng / 2) ** 2;
    const km = 2 * 6371 * Math.asin(Math.sqrt(h));
    return Math.round(km * 10) / 10;
}

// Driver dianggap "sudah sampai" kalau jaraknya <= nilai ini (meter).
// Harus sama dengan CHARGING_ARRIVAL_RADIUS_M di backend (config/charging.php).
export const ARRIVAL_RADIUS_M = 300;

// Jarak garis lurus (haversine) dalam meter.
export function distanceMeters(a, b) {
    const rad = (d) => (d * Math.PI) / 180;
    const dLat = rad(b.lat - a.lat);
    const dLng = rad(b.lng - a.lng);
    const h =
        Math.sin(dLat / 2) ** 2 +
        Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLng / 2) ** 2;
    return 2 * 6371000 * Math.asin(Math.sqrt(h));
}

