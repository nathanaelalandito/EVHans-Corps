// routing.js — rute mengemudi dari posisi driver ke station.
//
// PENTING: sengaja memakai fetch biasa, BUKAN instance axios `api` dari
// ./client. Instance itu otomatis menyelipkan token Sanctum ke setiap
// request — jangan sampai token dikirim ke layanan pihak ketiga.
//
// Layanan: server demo publik OSRM (data OpenStreetMap). Cukup untuk
// pengembangan/skala kecil; untuk produksi pertimbangkan OSRM sendiri
// atau penyedia berbayar (ganti OSRM_BASE_URL saja, format respons sama).
const OSRM_BASE_URL = 'https://router.project-osrm.org';

// from/to: { lat, lng }. signal: AbortSignal opsional untuk membatalkan.
// Mengembalikan { coords: [[lat, lng], ...], distanceM, durationS }.
export async function getDrivingRoute(from, to, signal) {
    const path = `${from.lng},${from.lat};${to.lng},${to.lat}`;
    const url = `${OSRM_BASE_URL}/route/v1/driving/${path}?overview=full&geometries=geojson&alternatives=false&steps=false`;

    const res = await fetch(url, { signal });
    if (!res.ok) throw new Error(`Layanan rute membalas ${res.status}`);

    const data = await res.json();
    const best = data.routes?.[0];
    if (data.code !== 'Ok' || !best) {
        const err = new Error('Rute tidak ditemukan');
        err.code = 'NO_ROUTE';
        throw err;
    }

    return {
        // GeoJSON berurutan [lng, lat]; Leaflet butuh [lat, lng].
        coords: best.geometry.coordinates.map(([lng, lat]) => [lat, lng]),
        distanceM: best.distance,
        durationS: best.duration,
    };
}

// Link navigasi Google Maps. Origin sengaja dikosongkan supaya Google
// memakai lokasi perangkat saat ini (di ponsel biasanya membuka aplikasinya).
export function googleMapsDirectionsUrl(to) {
    return `https://www.google.com/maps/dir/?api=1&destination=${to.lat},${to.lng}&travelmode=driving`;
}

// 850 -> "850 m", 12400 -> "12,4 km"
export function formatJarak(meter) {
    const bulat = Math.round(meter);
    if (bulat < 1000) return `${bulat} m`;
    return `${(meter / 1000).toFixed(1).replace('.', ',')} km`;
}

// 20 -> "< 1 mnt", 1680 -> "28 mnt", 5400 -> "1 jam 30 mnt"
export function formatDurasi(detik) {
    const totalMenit = Math.round(detik / 60);
    if (totalMenit < 1) return '< 1 mnt';
    const jam = Math.floor(totalMenit / 60);
    const menit = totalMenit % 60;
    if (jam === 0) return `${menit} mnt`;
    return menit === 0 ? `${jam} jam` : `${jam} jam ${menit} mnt`;
}
