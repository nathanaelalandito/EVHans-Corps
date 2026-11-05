// profile.js
import api from './client';
/** Memuat profil pengemudi yang sedang terautentikasi. */
export async function getProfile() {
    const res = await api.get('/driver/profile');
    return res.data.data ?? res.data;
}
/** Mengirim perubahan data profil pengemudi ke backend. */
export async function updateProfile(payload) {
    // payload: { nama_lengkap, nomor_telepon, tanggal_lahir, alamat }
    const res = await api.put('/driver/profile', payload); // sesuaikan method/route Laravel-mu
    return res.data.data ?? res.data;
}
