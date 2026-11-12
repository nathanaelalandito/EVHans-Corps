import api from './client';

/** Mengambil ringkasan station dan charger untuk area operasi. */
export async function getOperationsDashboard() {
    const { data } = await api.get('/operations/dashboard');
    return data.data ?? data;
}

/** Mengambil laporan agregat operasi dengan filter periode, station, dan charger. */
export async function getOperationsReport(filters) {
    const { data } = await api.get('/operations/reports', { params: filters });
    return data.data ?? data;
}

/** Mengubah informasi atau status station melalui endpoint operasi. */
export async function updateStation(id, payload) {
    const { data } = await api.put(`/operations/stations/${id}`, payload);
    return data.data ?? data;
}

/** Mengganti daftar Operator pada satu station tanpa memengaruhi station lain. */
export async function assignStationOperators(stationId, operatorIds) {
    const { data } = await api.put(`/operations/stations/${stationId}/operators`, { id_operators: operatorIds });
    return data;
}

/** Membuat record station baru dari data formulir admin/operator. */
export async function createStation(payload) {
    const { data } = await api.post('/operations/stations', payload);
    return data.data ?? data;
}

/** Mencari kandidat koordinat alamat station melalui proxy geocoding backend. */
export async function searchStationLocations(query) {
    const { data } = await api.get('/operations/station-location-search', { params: { query } });
    return data.data ?? data;
}

/** Memperbarui atribut unit charger yang dipilih. */
export async function updateCharger(id, payload) {
    const { data } = await api.put(`/operations/chargers/${id}`, payload);
    return data.data ?? data;
}

/** Membuat charger pada station yang dapat diakses Admin atau Operator. */
export async function createCharger(stationId, payload) {
    const { data } = await api.post(`/operations/stations/${stationId}/chargers`, payload);
    return data.data ?? data;
}

/** Membuat port pada charger yang dapat diakses Admin atau Operator. */
export async function createPort(chargerId, payload) {
    const { data } = await api.post(`/operations/chargers/${chargerId}/ports`, payload);
    return data.data ?? data;
}

/** Memperbarui data teknis port pada station yang dapat dikelola staf. */
export async function updatePort(id, payload) {
    const { data } = await api.put(`/operations/ports/${id}`, payload);
    return data.data ?? data;
}

/** Menambahkan periode tarif baru untuk satu lokasi. */
export async function createTarif(idLocation, payload) {
    const { data } = await api.post(`/operations/stations/${idLocation}/tarifs`, payload);
    return data.data ?? data;
}

/** Memperbarui nominal atau waktu berlaku tarif yang masih terjadwal. */
export async function updateScheduledTarif(idTarif, payload) {
    const { data } = await api.put(`/operations/tarifs/${idTarif}`, payload);
    return data.data ?? data;
}

/** Membatalkan tarif yang belum mencapai waktu berlaku. */
export async function cancelScheduledTarif(idTarif) {
    const { data } = await api.delete(`/operations/tarifs/${idTarif}`);
    return data;
}

/** Menyinkronkan seluruh station yang ditugaskan kepada satu operator. */
export async function assignOperatorStation(idUser, idLocations) {
    const { data } = await api.put(`/operations/operators/${idUser}/station`, { id_locations: idLocations });
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
