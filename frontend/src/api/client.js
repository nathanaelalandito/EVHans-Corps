import axios from 'axios';

// Ganti sesuai alamat backend Laravel kamu kalau berbeda.
export const API_BASE_URL = 'http://127.0.0.1:8000/api';

const api = axios.create({
    baseURL: API_BASE_URL,
    headers: { Accept: 'application/json' },
});

// Selipkan token Sanctum (kalau ada) ke setiap request.
api.interceptors.request.use((config) => {
    const token = localStorage.getItem('ev_token');
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
});

// Kalau token sudah tidak valid/kedaluwarsa, backend balas 401 —
// bersihkan sesi lokal supaya user diarahkan balik ke layar login.
api.interceptors.response.use(
    (response) => response,
    (error) => {
        if (error.response && error.response.status === 401) {
            localStorage.removeItem('ev_token');
            localStorage.removeItem('ev_user');
        }
        return Promise.reject(error);
    }
);

export default api;
