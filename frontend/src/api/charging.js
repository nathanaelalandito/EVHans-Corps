// charging.js — panggilan API untuk sesi charging.
// Alur mulai: prepare (deteksi baterai) -> estimate (hitung biaya) -> start (PIN + hold saldo).
// Fungsi melempar error axios apa adanya kalau gagal.
import api from './client';

// Bentuk respons API -> bentuk `activeSession` yang dipakai DriverDashboard.
export function toDashboardSession(s) {
    return {
        id_session: s.id_session,
        id_location: s.id_location,
        nama_lokasi: s.nama_lokasi,
        kode_charger: s.kode_charger,
        status: s.sudah_penuh ? 'Penuh' : 'Charging',
        sudah_penuh: !!s.sudah_penuh,
        soc_sekarang: s.soc_sekarang ?? s.soc_awal ?? null,
        durasi_detik: s.durasi_detik ?? null,
        energi_kwh: s.energi_kwh ?? 0,
        target_kwh: s.target_energi_kwh ?? null,
        estimasi_biaya: s.estimasi_biaya ?? null,
        saldo_hold: s.saldo_hold ?? 0,
        tarif_per_kwh: s.tarif_per_kwh ?? 0,
        biaya_parkir: s.biaya_parkir_per_jam ?? 0,
        soc_awal: s.soc_awal ?? null,
        waktu_mulai: new Date(s.waktu_mulai).getTime(),
    };
}

// payload: { id_charger, id_vehicle, latitude, longitude }
// -> { soc_awal (acak sementara), kapasitas_baterai_kwh, min_target_kwh, max_target_kwh (= kWh sampai 100%), kode_charger, ... }
export async function prepareCharging(payload) {
    const { data } = await api.post('/charging/prepare', payload);
    return data.data ?? data;
}

// payload: { id_charger, id_vehicle, soc_awal, target_kwh }
// -> { target_kwh, soc_estimasi, durasi_menit, biaya_charging, biaya_parkir, total, saldo_tersedia, saldo_cukup, kekurangan, ... }
export async function estimateCharging(payload) {
    const { data } = await api.post('/charging/estimate', payload);
    return data.data ?? data;
}

// payload: { id_charger, id_vehicle, soc_awal, target_kwh, pin, latitude, longitude }
export async function startCharging(payload) {
    const { data } = await api.post('/charging/start', payload);
    return toDashboardSession(data.data ?? data);
}

// null kalau tidak ada sesi berjalan.
export async function getActiveSession() {
    const { data } = await api.get('/charging/active');
    return data.data ? toDashboardSession(data.data) : null;
}

export async function stopCharging(idSession) {
    const { data } = await api.post(`/charging/${idSession}/stop`);
    return data;
}
