import { useCallback, useEffect, useRef, useState } from 'react';
import {
    FiAlertTriangle,
    FiBell,
    FiCheck,
    FiCheckCircle,
    FiCreditCard,
    FiInbox,
    FiInfo,
    FiZap,
} from 'react-icons/fi';
import api from './api/client';
import './notificationsBell.css';

const TYPE_META = {
    charging_selesai: { icon: FiCheckCircle, tone: 'success', label: 'Charging' },
    charging_gagal: { icon: FiAlertTriangle, tone: 'danger', label: 'Charging' },
    topup_gagal: { icon: FiCreditCard, tone: 'danger', label: 'Top Up' },
    charger_gangguan: { icon: FiZap, tone: 'warning', label: 'Charger' },
};

function resolveTypeMeta(type) {
    return TYPE_META[type] || { icon: FiInfo, tone: 'info', label: 'Informasi' };
}

function formatNotificationTime(value) {
    if (!value) return '';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '';

    const diff = Date.now() - date.getTime();
    if (diff >= 0 && diff < 60_000) return 'Baru saja';
    if (diff >= 0 && diff < 3_600_000) return `${Math.max(1, Math.floor(diff / 60_000))} menit lalu`;
    if (diff >= 0 && diff < 86_400_000) return `${Math.floor(diff / 3_600_000)} jam lalu`;
    if (diff >= 0 && diff < 604_800_000) return `${Math.floor(diff / 86_400_000)} hari lalu`;

    return new Intl.DateTimeFormat('id-ID', {
        day: 'numeric',
        month: 'short',
        year: date.getFullYear() === new Date().getFullYear() ? undefined : 'numeric',
    }).format(date);
}

function NotificationSkeleton() {
    return (
        <div className="notifbell-skeleton" aria-hidden="true">
            {[1, 2, 3].map((row) => (
                <div key={row} className="notifbell-skeleton-row">
                    <span className="notifbell-skeleton-icon" />
                    <span className="notifbell-skeleton-copy">
                        <span />
                        <span />
                        <span />
                    </span>
                </div>
            ))}
        </div>
    );
}

/** Komponen bell notifikasi dengan polling, panel responsif, dan tandai baca. */
export default function NotificationsBell() {
    const [open, setOpen] = useState(false);
    const [items, setItems] = useState([]);
    const [unread, setUnread] = useState(0);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [readingId, setReadingId] = useState(null);
    const [markingAll, setMarkingAll] = useState(false);
    const timerRef = useRef(null);
    const rootRef = useRef(null);

    const fetchUnread = useCallback(async () => {
        if (document.hidden) return;
        try {
            const { data } = await api.get('/notifications/unread-count');
            setUnread(data?.data?.unread ?? 0);
        } catch {
            // Abaikan error jaringan agar tidak mengganggu UI.
        }
    }, []);

    const fetchList = useCallback(async () => {
        setLoading(true);
        setError('');
        try {
            const { data } = await api.get('/notifications', { params: { per_page: 20 } });
            setItems(data?.data?.data ?? data?.data ?? []);
        } catch {
            setItems([]);
            setError('Gagal memuat notifikasi. Periksa koneksi lalu coba lagi.');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        const initialFetch = setTimeout(fetchUnread, 0);
        timerRef.current = setInterval(fetchUnread, 25000);
        const onVisibility = () => {
            if (!document.hidden) fetchUnread();
        };
        document.addEventListener('visibilitychange', onVisibility);
        return () => {
            clearTimeout(initialFetch);
            clearInterval(timerRef.current);
            document.removeEventListener('visibilitychange', onVisibility);
        };
    }, [fetchUnread]);

    useEffect(() => {
        if (!open) return undefined;

        const handlePointerDown = (event) => {
            if (rootRef.current && !rootRef.current.contains(event.target)) {
                setOpen(false);
            }
        };
        const handleKeyDown = (event) => {
            if (event.key === 'Escape') setOpen(false);
        };

        document.addEventListener('pointerdown', handlePointerDown);
        document.addEventListener('keydown', handleKeyDown);
        return () => {
            document.removeEventListener('pointerdown', handlePointerDown);
            document.removeEventListener('keydown', handleKeyDown);
        };
    }, [open]);

    const markRead = async (id) => {
        const target = items.find((item) => String(item.id_notifikasi) === String(id));
        if (!target || target.dibaca_pada || readingId) return;

        setReadingId(id);
        setError('');
        try {
            await api.put(`/notifications/${id}/read`);
            setItems((prev) => prev.map((item) => (
                String(item.id_notifikasi) === String(id)
                    ? { ...item, dibaca_pada: new Date().toISOString() }
                    : item
            )));
            setUnread((prev) => Math.max(0, prev - 1));
        } catch {
            setError('Gagal menandai notifikasi sebagai dibaca.');
        } finally {
            setReadingId(null);
        }
    };

    const markAllRead = async () => {
        if (unread === 0 || markingAll) return;

        setMarkingAll(true);
        setError('');
        try {
            await api.put('/notifications/read-all');
            setItems((prev) => prev.map((item) => ({ ...item, dibaca_pada: new Date().toISOString() })));
            setUnread(0);
        } catch {
            setError('Gagal menandai semua notifikasi sebagai dibaca.');
        } finally {
            setMarkingAll(false);
        }
    };

    const togglePanel = () => {
        const nextOpen = !open;
        setOpen(nextOpen);
        if (nextOpen) fetchList();
    };

    const hasItems = items.length > 0;
    const badgeLabel = unread > 99 ? '99+' : String(unread);

    return (
        <div className="notifbell-root" ref={rootRef}>
            <button
                type="button"
                className="notifbell-trigger"
                onClick={togglePanel}
                aria-label={unread > 0 ? `Notifikasi, ${unread} belum dibaca` : 'Notifikasi'}
                aria-haspopup="dialog"
                aria-expanded={open}
                aria-controls="notifbell-panel"
            >
                <FiBell aria-hidden="true" />
                {unread > 0 && <span className="notifbell-badge" aria-hidden="true">{badgeLabel}</span>}
            </button>

            {open && (
                <section
                    id="notifbell-panel"
                    className="notifbell-panel"
                    role="dialog"
                    aria-label="Pusat notifikasi"
                >
                    <header className="notifbell-header">
                        <div className="notifbell-heading">
                            <p className="notifbell-eyebrow">PUSAT NOTIFIKASI</p>
                            <div className="notifbell-title-row">
                                <h3>Notifikasi</h3>
                                {unread > 0 && <span className="notifbell-count-pill">{unread} baru</span>}
                            </div>
                            <p className="notifbell-subtitle">Aktivitas akun dan perangkat terbaru.</p>
                        </div>
                        <button
                            type="button"
                            className="notifbell-mark-all"
                            onClick={markAllRead}
                            disabled={unread === 0 || markingAll}
                        >
                            <FiCheck aria-hidden="true" />
                            <span>{markingAll ? 'Memproses...' : 'Tandai semua'}</span>
                        </button>
                    </header>

                    {error && (
                        <div className="notifbell-error" role="alert">
                            <span>{error}</span>
                            <button type="button" onClick={fetchList}>Coba lagi</button>
                        </div>
                    )}

                    <div className="notifbell-body" aria-busy={loading}>
                        {loading && !hasItems && <NotificationSkeleton />}

                        {!loading && hasItems && (
                            <div className="notifbell-list">
                                {items.map((item) => {
                                    const meta = resolveTypeMeta(item.tipe);
                                    const ItemIcon = meta.icon;
                                    const isUnread = !item.dibaca_pada;
                                    const isReading = String(readingId) === String(item.id_notifikasi);

                                    return (
                                        <button
                                            key={item.id_notifikasi}
                                            type="button"
                                            className={`notifbell-item ${isUnread ? 'is-unread' : ''} ${isReading ? 'is-reading' : ''}`}
                                            onClick={() => markRead(item.id_notifikasi)}
                                            aria-label={`${isUnread ? 'Tandai dibaca' : 'Sudah dibaca'}: ${item.judul}`}
                                        >
                                            <span className={`notifbell-item-icon tone-${meta.tone}`}>
                                                <ItemIcon aria-hidden="true" />
                                            </span>
                                            <span className="notifbell-item-main">
                                                <span className="notifbell-item-title-row">
                                                    <strong>{item.judul}</strong>
                                                    {isUnread && <span className="notifbell-unread-dot" aria-hidden="true" />}
                                                </span>
                                                <span className="notifbell-message">{item.pesan}</span>
                                                <span className="notifbell-item-meta">
                                                    <span className={`notifbell-type-pill tone-${meta.tone}`}>{meta.label}</span>
                                                    <span title={item.created_at}>{formatNotificationTime(item.created_at)}</span>
                                                </span>
                                            </span>
                                            <span className="notifbell-item-action" aria-hidden="true">
                                                {isReading ? <span className="notifbell-spinner" /> : isUnread ? <FiCheck /> : null}
                                            </span>
                                        </button>
                                    );
                                })}
                            </div>
                        )}

                        {!loading && !hasItems && !error && (
                            <div className="notifbell-empty">
                                <span className="notifbell-empty-icon"><FiInbox aria-hidden="true" /></span>
                                <strong>Tidak ada notifikasi</strong>
                                <p>Pemberitahuan transaksi, top up, dan charger akan muncul di sini.</p>
                            </div>
                        )}
                    </div>

                    {hasItems && (
                        <footer className="notifbell-footer">
                            Menampilkan {items.length} notifikasi terbaru
                        </footer>
                    )}
                </section>
            )}
        </div>
    );
}
