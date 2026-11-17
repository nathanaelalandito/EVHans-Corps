import api from './client';

/** Menghapus konteks yang melekat pada akun, bukan preferensi tampilan pengguna. */
export function clearUserScopedStorage() {
    ['ev_token', 'ev_user', 'ev_active_station_id', 'ev_active_vehicle'].forEach((key) => localStorage.removeItem(key));
    Object.keys(localStorage)
        .filter((key) => key.startsWith('ev_operator_notifications_seen_'))
        .forEach((key) => localStorage.removeItem(key));
}

/** Mengautentikasi pengguna, lalu menyimpan token dan data akun di browser. */
export async function login(email, password) {
    const { data } = await api.post('/login', { email, password });
    clearUserScopedStorage();
    // Simpan token & profil user supaya request berikutnya otomatis
    // ter-autentikasi (lihat interceptor di client.js).
    localStorage.setItem('ev_token', data.token);
    localStorage.setItem('ev_user', JSON.stringify(data.user));
    return data.user;
}

/** Mengirim data registrasi akun pengemudi ke backend. */
export async function register(payload) {
    const { data } = await api.post('/register', payload);
    return data;
}

/** Meminta backend mengakhiri token dan selalu membersihkan sesi lokal. */
export async function logout() {
    try {
        await api.post('/logout');
    } finally {
        clearUserScopedStorage();
    }
}

/** Membaca data akun yang disimpan saat login, atau null jika belum login. */
export function getStoredUser() {
    const raw = localStorage.getItem('ev_user');
    return raw ? JSON.parse(raw) : null;
}

/** Mengambil token akses yang dipakai interceptor request API. */
export function getStoredToken() {
    return localStorage.getItem('ev_token');
}
