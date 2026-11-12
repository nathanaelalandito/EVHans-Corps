import api from './client';

const SEEN_STORAGE_PREFIX = 'ev_ops_notif_seen_';
const INITIAL_WINDOW_MS = 24 * 60 * 60 * 1000;

/** Mengambil kunci penyimpanan waktu baca notifikasi per station aktif. */
function getSeenStorageKey(stationId) {
    const resolvedId = stationId ?? (localStorage.getItem('ev_active_station_id') || 'default');
    return `${SEEN_STORAGE_PREFIX}${resolvedId}`;
}

/** Mengubah string waktu ISO/SQL menjadi milidetik, atau null bila tidak valid. */
export function parseNotifTimeMs(value) {
    if (!value) return null;
    const ms = new Date(value).getTime();
    return Number.isNaN(ms) ? null : ms;
}

/** Membaca batas waktu terakhir operator melihat notifikasi pada station tertentu. */
export function getNotifSeenAtMs(stationId) {
    const raw = localStorage.getItem(getSeenStorageKey(stationId));
    if (!raw) return null;
    const parsed = Number(raw);
    return Number.isFinite(parsed) ? parsed : null;
}

/** Menentukan apakah item transaksi termasuk baru/belum dibaca operator. */
export function isTransactionUnread(transaction, seenAtMs) {
    const txMs = parseNotifTimeMs(transaction?.waktu_aktivitas || transaction?.created_at);
    if (txMs == null) return false;
    if (seenAtMs != null) return txMs > seenAtMs;
    return Date.now() - txMs <= INITIAL_WINDOW_MS;
}

/** Menghitung jumlah badge notifikasi (gangguan aktif + transaksi baru). */
export function countUnreadNotifications(notifications, seenAtMs) {
    const malfunctions = notifications?.malfunctions || [];
    const transactions = notifications?.transactions || [];
    const unreadTx = transactions.filter((item) => isTransactionUnread(item, seenAtMs)).length;
    return malfunctions.length + unreadTx;
}

/** Menyimpan timestamp baca terbaru untuk station aktif dan mengembalikan nilainya. */
export function markOperatorNotificationsSeen(notifications) {
    const transactions = notifications?.transactions || [];
    const latestTxMs = transactions.reduce((max, item) => {
        const ms = parseNotifTimeMs(item?.waktu_aktivitas || item?.created_at) ?? 0;
        return Math.max(max, ms);
    }, 0);
    const seenMs = Math.max(Date.now(), latestTxMs);
    localStorage.setItem(getSeenStorageKey(notifications?.id_location), String(seenMs));
    return seenMs;
}

/** Mengambil notifikasi gangguan dan transaksi driver untuk station aktif operator. */
export async function getOperatorNotifications() {
    const { data } = await api.get('/operator/notifications');
    return data?.data ?? { id_location: null, malfunctions: [], transactions: [], total_unread: 0 };
}

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
