// charging.js — panggilan API untuk sesi charging.
// Alur mulai: prepare (deteksi baterai) -> estimate (hitung biaya) -> start (PIN + hold saldo).
// Fungsi melempar error axios apa adanya kalau gagal.
import api from './client';

// Bentuk respons API -> bentuk `activeSession` yang dipakai DriverDashboard.
/** Menormalkan respons sesi backend ke bentuk yang dipakai dashboard driver. */
export function toDashboardSession(s) {
    return {
        id_session: s.id_session,
        id_location: s.id_location,
        nama_lokasi: s.nama_lokasi,
        kode_charger: s.kode_charger,
        nomor_port: s.nomor_port ?? null,
        status: s.sudah_penuh ? 'Penuh' : 'Charging',
        sudah_penuh: !!s.sudah_penuh,
        soc_sekarang: s.soc_sekarang ?? s.soc_awal ?? null,
        durasi_detik: s.durasi_detik ?? null,
        energi_kwh: s.energi_kwh ?? 0,
        target_kwh: s.target_energi_kwh ?? null,
        estimasi_biaya: s.estimasi_biaya ?? null,
        biaya_berjalan: s.biaya_berjalan ?? null,
        saldo_hold: s.saldo_hold ?? 0,
        tarif_per_kwh: s.tarif_per_kwh ?? 0,
        biaya_parkir: s.biaya_parkir_per_jam ?? 0,
        soc_awal: s.soc_awal ?? null,
        id_payment: s.id_payment ?? null,
        waktu_mulai: new Date(s.waktu_mulai).getTime(),
    };
}

// payload: { id_port, id_vehicle, latitude, longitude }
// -> { soc_awal (acak sementara), kapasitas_baterai_kwh, min_target_kwh, max_target_kwh (= kWh sampai 100%), kode_charger, ... }
/** Meminta backend memvalidasi kendaraan/port dan mengembalikan batas energi. */
export async function prepareCharging(payload) {
    const { data } = await api.post('/charging-sessions/prepare', payload);
    return data.data ?? data;
}

// payload: { id_port, id_vehicle, soc_awal, target_kwh }
// -> { target_kwh, soc_estimasi, durasi_menit, biaya_charging, biaya_parkir, total, saldo_tersedia, saldo_cukup, kekurangan, ... }
/** Meminta estimasi biaya dan kecukupan saldo sebelum transaksi dimulai. */
export async function estimateCharging(payload) {
    const { data } = await api.post('/charging-sessions/estimate', payload);
    return data.data ?? data;
}

// payload: { id_port, id_vehicle, soc_awal, target_kwh, pin, latitude, longitude }
/** Memulai sesi charging lalu menormalkan responsnya untuk dashboard. */
export async function startCharging(payload) {
    const { data } = await api.post('/charging-sessions/start', payload);
    return toDashboardSession(data.data ?? data);
}

// null kalau tidak ada sesi berjalan.
/** Memulihkan sesi berjalan pengguna, atau null jika sesi tidak ada. */
export async function getActiveSession() {
    const { data } = await api.get('/charging-sessions/active');
    return data.data ? toDashboardSession(data.data) : null;
}

/** Meminta backend menghentikan sesi dan menyelesaikan transaksinya. */
export async function stopCharging(idSession) {
    const { data } = await api.post(`/charging-sessions/${idSession}/stop`);
    return data;
}
