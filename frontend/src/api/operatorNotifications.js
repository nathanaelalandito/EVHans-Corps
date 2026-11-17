import api from './client';

/** Mengalihkan charger ke mode Maintenance dan mencatat alasan penanganan gangguan. */
export async function acceptOperatorMalfunction(idCharger, idLog, alasan) {
    const { data } = await api.post(`/operator/malfunction/${idCharger}/${idLog}/accept`, { alasan });
    return data;
}

/** Menandai laporan gangguan selesai ditangani dengan catatan audit. */
export async function resolveOperatorMalfunction(idCharger, idLog, alasan) {
    const { data } = await api.post(`/operator/malfunction/${idCharger}/${idLog}/resolve`, { alasan });
    return data;
}
