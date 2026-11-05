import api from './client';

const KONEKTOR_LABEL = { type_2: 'Type 2', ccs2: 'CCS2', chademo: 'CHAdeMO', gbt: 'GB/T' };
/** Mengubah kode konektor backend menjadi label yang ditampilkan di UI. */
export const konektorLabel = (v) => KONEKTOR_LABEL[v] ?? v;

const STATUS_LOKASI = { Aktif: 'Aktif', Maintenance: 'Dalam Perawatan', Nonaktif: 'Nonaktif' };

// Bentuk respons API -> bentuk yang dipakai peta/daftar di DriverDashboard.
/** Menyesuaikan nama field station API dengan struktur dashboard driver. */
function toDashboardStation(s) {
    return {
        id_location: s.id_location,
        nama_lokasi: s.nama_lokasi,
        alamat: s.alamat,
        lat: s.lat ?? s.latitude,       // Menangani kedua kemungkinan nama key
        lng: s.lng ?? s.longitude,
        status: STATUS_LOKASI[s.status] ?? s.status,
        charger_tersedia: s.charger_tersedia,
        charger_total: s.charger_total,
        tipe_konektor: (s.tipe_konektor ?? []).map(konektorLabel),
        daya_kw_max: s.daya_kw_max,
        tarif_per_kwh: s.tarif?.harga_per_kwh ?? null,
        jam_buka: s.jam_operasional?.buka ?? s.jam_buka,
        jam_tutup: s.jam_operasional?.tutup ?? s.jam_tutup,
        jarak_km: s.jarak_km,
        rating: s.rating,
        biaya_parkir: s.biaya_parkir ?? 0,
        // Daftar charger + port (dipakai pemilih port di daftar station).
        chargers: s.chargers ?? [],
    };
}

/** Mengambil station dan menormalkan tiap record untuk peta/daftar driver. */
export async function getStations() {
    const { data } = await api.get('/stations');
    return (data.data ?? data).map(toDashboardStation);
}

// Detail lengkap: info lokasi, tarif, dan daftar port (chargers).
/** Mengambil informasi lengkap station, tarif, charger, dan port. */
export async function getStationDetail(id) {
    const { data } = await api.get(`/stations/${id}`);
    return data.data ?? data;
}

// Kendaraan menyimpan 'type_2'/'ccs2', form operator menyimpan 'Type 2'/'CCS2'.
// Samakan keduanya sebelum membandingkan (sama dengan Port::connectorKey di backend).
/** Menyeragamkan format konektor agar kode dan label dapat dibandingkan. */
const connectorKey = (v) => String(v ?? '').toLowerCase().replace(/[^a-z0-9]/g, '');
/** Memeriksa kesesuaian konektor kendaraan dengan konektor port. */
export const sameConnector = (a, b) => connectorKey(a) === connectorKey(b);

// Jarak garis lurus (haversine) dalam km, dibulatkan 1 desimal.
/** Menghitung jarak garis lurus dua koordinat dengan rumus haversine. */
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
export const ARRIVAL_RADIUS_M = 200;

// Jarak garis lurus (haversine) dalam meter.
/** Menghitung jarak haversine dalam meter untuk validasi tiba di station. */
export function distanceMeters(a, b) {
    const rad = (d) => (d * Math.PI) / 180;
    const dLat = rad(b.lat - a.lat);
    const dLng = rad(b.lng - a.lng);
    const h =
        Math.sin(dLat / 2) ** 2 +
        Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLng / 2) ** 2;
    return 2 * 6371000 * Math.asin(Math.sqrt(h));
}
