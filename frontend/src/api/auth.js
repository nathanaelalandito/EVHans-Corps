import api from './client';

export async function login(email, password) {
    const { data } = await api.post('/login', { email, password });
    // Simpan token & profil user supaya request berikutnya otomatis
    // ter-autentikasi (lihat interceptor di client.js).
    localStorage.setItem('ev_token', data.token);
    localStorage.setItem('ev_user', JSON.stringify(data.user));
    return data.user;
}

export async function register(payload) {
    const { data } = await api.post('/register', payload);
    return data;
}

export async function logout() {
    try {
        await api.post('/logout');
    } finally {
        localStorage.removeItem('ev_token');
        localStorage.removeItem('ev_user');
    }
}

export function getStoredUser() {
    const raw = localStorage.getItem('ev_user');
    return raw ? JSON.parse(raw) : null;
}

export function getStoredToken() {
    return localStorage.getItem('ev_token');
}
