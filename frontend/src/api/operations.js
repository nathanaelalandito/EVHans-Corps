import api from './client';

/** Mengambil ringkasan station dan charger untuk area operasi. */
export async function getOperationsDashboard() {
    const { data } = await api.get('/operations/dashboard');
    return data.data ?? data;
}

/** Mengubah informasi atau status station melalui endpoint operasi. */
export async function updateStation(id, payload) {
    const { data } = await api.put(`/operations/stations/${id}`, payload);
    return data.data ?? data;
}

/** Membuat record station baru dari data formulir admin/operator. */
export async function createStation(payload) {
    const { data } = await api.post('/operations/stations', payload);
    return data.data ?? data;
}

/** Memperbarui atribut unit charger yang dipilih. */
export async function updateCharger(id, payload) {
    const { data } = await api.put(`/operations/chargers/${id}`, payload);
    return data.data ?? data;
}

/** Menambahkan periode tarif baru untuk satu lokasi. */
export async function createTarif(idLocation, payload) {
    const { data } = await api.post(`/operations/stations/${idLocation}/tarifs`, payload);
    return data.data ?? data;
}

/** Menetapkan operator ke station tertentu. */
export async function assignOperatorStation(idUser, idLocation) {
    const { data } = await api.put(`/operations/operators/${idUser}/station`, { id_location: idLocation });
    return data.data ?? data;
}

/** Mengaktifkan atau menonaktifkan akun operator. */
export async function updateOperatorStatus(idUser, statusAkun) {
    const { data } = await api.put(`/operations/operators/${idUser}/status`, { status_akun: statusAkun });
    return data.data ?? data;
}

/** Membuat akun operator baru melalui operasi admin. */
export async function createOperator(payload) {
    const { data } = await api.post('/operations/operators', payload);
    return data.data ?? data;
}

/** Mengambil catatan aktivitas penting sistem untuk audit. */
export async function getAuditLogs() {
    const { data } = await api.get('/operations/audit-logs');
    return data.data ?? data;
}

/** Membaca nilai konfigurasi sistem yang ditampilkan pada panel admin. */
export async function getSystemConfig() {
    const { data } = await api.get('/operations/config');
    return data.data ?? data;
}

/** Menyimpan perubahan konfigurasi sistem yang dikirim admin. */
export async function updateSystemConfig(payload) {
    const { data } = await api.put('/operations/config', payload);
    return data.data ?? data;
}
