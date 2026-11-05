// vehicle.js — panggilan API untuk kelola kendaraan (CRUD).
// Semua fungsi melempar error axios apa adanya kalau gagal —
// biar komponen yang menampilkan pesan dari error.response.data.
import api from './client';

/** Mengambil seluruh kendaraan milik pengemudi yang sedang login. */
export async function getVehicles() {
    const { data } = await api.get('/vehicles');
    return data.data ?? data;
}

/** Mengirim data kendaraan baru untuk disimpan oleh backend. */
export async function createVehicle(payload) {
    // payload: { merek, model, nomor_polisi, tipe_konektor }
    const { data } = await api.post('/vehicles', payload);
    return data.data ?? data;
}

/** Mengirim perubahan data kendaraan berdasarkan ID kendaraan. */
export async function updateVehicle(id, payload) {
    const { data } = await api.put(`/vehicles/${id}`, payload);
    return data.data ?? data;
}

/** Meminta backend menghapus kendaraan berdasarkan ID. */
export async function deleteVehicle(id) {
    const { data } = await api.delete(`/vehicles/${id}`);
    return data;
}
