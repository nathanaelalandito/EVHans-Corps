// profile.js
import api from './client';
export async function getProfile() {
    const res = await api.get('/driver/profile');
    return res.data.data ?? res.data;
}
export async function updateProfile(payload) {
    // payload: { nama_lengkap, nomor_telepon, tanggal_lahir, alamat }
    const res = await api.put('/driver/profile', payload); // sesuaikan method/route Laravel-mu
    return res.data.data ?? res.data;
}