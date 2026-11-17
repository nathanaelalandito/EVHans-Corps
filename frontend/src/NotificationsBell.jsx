import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import {
    FiAlertTriangle,
    FiBell,
    FiCheck,
    FiCheckCircle,
    FiChevronDown,
    FiCreditCard,
    FiInbox,
    FiInfo,
    FiX,
    FiZap,
} from 'react-icons/fi';
import api from './api/client';
import './notificationsBell.css';

const TYPE_META = {
    charging_selesai: { icon: FiCheckCircle, tone: 'success', label: 'Charging', group: 'charging' },
    charging_gagal: { icon: FiAlertTriangle, tone: 'danger', label: 'Charging', group: 'charging' },
    topup_gagal: { icon: FiCreditCard, tone: 'danger', label: 'Pembayaran', group: 'payment' },
    charger_gangguan: { icon: FiZap, tone: 'warning', label: 'Gangguan', group: 'issue' },
};

function resolveTypeMeta(type) {
    return TYPE_META[type] || { icon: FiInfo, tone: 'info', label: 'Informasi', group: 'other' };
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

function dateKey(value) {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '';
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
}

function groupLabel(value) {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return 'Lainnya';
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const itemDate = new Date(date);
    itemDate.setHours(0, 0, 0, 0);
    const diffDays = Math.round((today.getTime() - itemDate.getTime()) / 86400000);
    if (diffDays === 0) return 'Hari ini';
    if (diffDays === 1) return 'Kemarin';
    return new Intl.DateTimeFormat('id-ID', { day: 'numeric', month: 'long', year: 'numeric' }).format(date);
}

function formatIndoDate(value) {
    if (!value) return '';
    const date = new Date(value + 'T00:00:00');
    if (Number.isNaN(date.getTime())) return value;
    return new Intl.DateTimeFormat('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }).format(date);
}

function startOfDay(date) {
    const next = new Date(date);
    next.setHours(0, 0, 0, 0);
    return next;
}

/** Komponen bell notifikasi dengan polling, panel modal, dan tandai baca. */
export default function NotificationsBell() {
    const [open, setOpen] = useState(false);
    const [items, setItems] = useState([]);
    const [unread, setUnread] = useState(0);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [readingId, setReadingId] = useState(null);
    const [markingAll, setMarkingAll] = useState(false);

    const [page, setPage] = useState(1);
    const [hasMore, setHasMore] = useState(false);
    const [loadingMore, setLoadingMore] = useState(false);

    const [statusFilter, setStatusFilter] = useState('all');
    const [datePreset, setDatePreset] = useState('all');
    const [customFrom, setCustomFrom] = useState('');
    const [customTo, setCustomTo] = useState('');
    const [datePopoverOpen, setDatePopoverOpen] = useState(false);
    const [dateError, setDateError] = useState('');

    const timerRef = useRef(null);
    const panelRef = useRef(null);
    const triggerRef = useRef(null);

    const fetchUnread = useCallback(async () => {
        if (document.hidden) return;
        try {
            const { data } = await api.get('/notifications/unread-count');
            setUnread(data?.data?.unread ?? 0);
        } catch {
            // Abaikan error jaringan agar tidak mengganggu UI.
        }
    }, []);

    const fetchList = useCallback(async (nextPage = 1, append = false) => {
        if (append) setLoadingMore(true);
        else setLoading(true);
        setError('');
        try {
            const { data } = await api.get('/notifications', { params: { page: nextPage, per_page: 20 } });
            const paginator = data?.data ?? {};
            const pageItems = Array.isArray(paginator?.data) ? paginator.data : (Array.isArray(data?.data) ? data.data : []);
            if (append) {
                setItems((prev) => [...prev, ...pageItems]);
            } else {
                setItems(pageItems);
            }
            setPage(paginator?.current_page ?? nextPage);
            setHasMore(Boolean(paginator?.next_page_url) || (paginator?.current_page ?? nextPage) < (paginator?.last_page ?? 1));
        } catch {
            if (!append) {
                setItems([]);
                setError('Gagal memuat notifikasi. Periksa koneksi lalu coba lagi.');
            }
        } finally {
            if (append) setLoadingMore(false);
            else setLoading(false);
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

        const fetchTimer = setTimeout(() => fetchList(1, false), 0);

        const handlePointerDown = (event) => {
            if (panelRef.current && !panelRef.current.contains(event.target)) {
                setOpen(false);
            }
        };
        const handleKeyDown = (event) => {
            if (event.key === 'Escape') {
                setOpen(false);
                return;
            }
            if (event.key !== 'Tab') return;
            const focusable = panelRef.current?.querySelectorAll(
                'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
            );
            if (!focusable || focusable.length === 0) return;
            const first = focusable[0];
            const last = focusable[focusable.length - 1];
            if (event.shiftKey && document.activeElement === first) {
                event.preventDefault();
                last.focus();
            } else if (!event.shiftKey && document.activeElement === last) {
                event.preventDefault();
                first.focus();
            }
        };

        document.addEventListener('pointerdown', handlePointerDown);
        document.addEventListener('keydown', handleKeyDown);

        const previousOverflow = document.body.style.overflow;
        document.body.style.overflow = 'hidden';

        const focusTimer = setTimeout(() => {
            panelRef.current?.focus();
        }, 0);

        const triggerNode = triggerRef.current;
        return () => {
            clearTimeout(fetchTimer);
            document.removeEventListener('pointerdown', handlePointerDown);
            document.removeEventListener('keydown', handleKeyDown);
            document.body.style.overflow = previousOverflow;
            clearTimeout(focusTimer);
            triggerNode?.focus();
        };
    }, [open, fetchList]);

    const markRead = async (id) => {
        const target = items.find((item) => String(item.id_notifikasi) === String(id));
        if (!target || target.dibaca_pada) return;

        setItems((prev) => prev.map((item) => (
            String(item.id_notifikasi) === String(id)
                ? { ...item, dibaca_pada: new Date().toISOString() }
                : item
        )));
        setUnread((prev) => Math.max(0, prev - 1));

        setReadingId(id);
        try {
            await api.put(`/notifications/${id}/read`);
        } catch {
            setItems((prev) => prev.map((item) => (
                String(item.id_notifikasi) === String(id)
                    ? { ...item, dibaca_pada: target.dibaca_pada }
                    : item
            )));
            setUnread((prev) => prev + 1);
        } finally {
            setReadingId(null);
        }
    };

    const markAllRead = async () => {
        if (unread === 0 || markingAll) return;
        setMarkingAll(true);
        const previous = items;
        setItems((prev) => prev.map((item) => ({ ...item, dibaca_pada: new Date().toISOString() })));
        setUnread(0);
        try {
            await api.put('/notifications/read-all');
        } catch {
            setItems(previous);
            fetchUnread();
        } finally {
            setMarkingAll(false);
        }
    };

    const togglePanel = () => {
        const nextOpen = !open;
        setOpen(nextOpen);
        if (nextOpen) {
            setStatusFilter('all');
            setDatePreset('all');
            setCustomFrom('');
            setCustomTo('');
            setDateError('');
            setDatePopoverOpen(false);
        }
    };

    const loadMore = () => {
        if (!hasMore || loadingMore) return;
        fetchList(page + 1, true);
    };

    const todayKey = dateKey(new Date());
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayKey = dateKey(yesterday);

    const filteredItems = useMemo(() => {
        return items.filter((item) => {
            if (statusFilter === 'unread' && item.dibaca_pada) return false;
            if (statusFilter === 'charging' && !['charging_selesai', 'charging_gagal'].includes(item.tipe)) return false;
            if (statusFilter === 'payment' && item.tipe !== 'topup_gagal') return false;
            if (statusFilter === 'issue' && item.tipe !== 'charger_gangguan') return false;

            if (datePreset === 'all') return true;
            const itemDate = new Date(item.created_at);
            if (Number.isNaN(itemDate.getTime())) return true;
            const itemDay = startOfDay(itemDate);

            if (datePreset === 'today') return dateKey(item.created_at) === todayKey;
            if (datePreset === 'yesterday') return dateKey(item.created_at) === yesterdayKey;
            if (datePreset === '7d') {
                const from = startOfDay(new Date());
                from.setDate(from.getDate() - 6);
                return itemDay >= from;
            }
            if (datePreset === '30d') {
                const from = startOfDay(new Date());
                from.setDate(from.getDate() - 29);
                return itemDay >= from;
            }
            if (datePreset === 'custom') {
                if (customFrom) {
                    const from = startOfDay(new Date(customFrom + 'T00:00:00'));
                    if (itemDay < from) return false;
                }
                if (customTo) {
                    const to = startOfDay(new Date(customTo + 'T00:00:00'));
                    to.setDate(to.getDate() + 1);
                    if (itemDay >= to) return false;
                }
                return true;
            }
            return true;
        });
    }, [items, statusFilter, datePreset, customFrom, customTo, todayKey, yesterdayKey]);

    const grouped = useMemo(() => {
        const groups = [];
        const map = new Map();
        filteredItems.forEach((item) => {
            const label = groupLabel(item.created_at);
            if (!map.has(label)) {
                map.set(label, []);
                groups.push({ label, items: map.get(label) });
            }
            map.get(label).push(item);
        });
        return groups;
    }, [filteredItems]);

    const counts = useMemo(() => ({
        all: items.length,
        unread: items.filter((item) => !item.dibaca_pada).length,
        charging: items.filter((item) => ['charging_selesai', 'charging_gagal'].includes(item.tipe)).length,
        payment: items.filter((item) => item.tipe === 'topup_gagal').length,
        issue: items.filter((item) => item.tipe === 'charger_gangguan').length,
    }), [items]);

    const showChip = (key) => key === 'all' || key === 'unread' ? counts[key] > 0 : counts[key] > 0;

    const activeDateLabel = datePreset === 'today' ? 'Hari ini'
        : datePreset === 'yesterday' ? 'Kemarin'
        : datePreset === '7d' ? '7 hari terakhir'
        : datePreset === '30d' ? '30 hari terakhir'
        : datePreset === 'custom' ? `${formatIndoDate(customFrom) || '...'} – ${formatIndoDate(customTo) || '...'}` : '';

    const hasActiveFilters = statusFilter !== 'all' || datePreset !== 'all';

    const handleApplyCustomDate = () => {
        setDateError('');
        if (customFrom && customTo) {
            const from = new Date(customFrom + 'T00:00:00');
            const to = new Date(customTo + 'T00:00:00');
            if (from > to) {
                setDateError('"Dari" tidak boleh setelah "Sampai".');
                return;
            }
        }
        const today = startOfDay(new Date());
        if (customFrom && new Date(customFrom + 'T00:00:00') > today) {
            setDateError('Tanggal tidak boleh di masa depan.');
            return;
        }
        if (customTo && new Date(customTo + 'T00:00:00') > today) {
            setDateError('Tanggal tidak boleh di masa depan.');
            return;
        }
        setDatePreset('custom');
        setDatePopoverOpen(false);
    };

    const resetDateFilter = () => {
        setDatePreset('all');
        setCustomFrom('');
        setCustomTo('');
        setDateError('');
        setDatePopoverOpen(false);
    };

    const clearAllFilters = () => {
        setStatusFilter('all');
        resetDateFilter();
    };

    const badgeLabel = unread > 99 ? '99+' : String(unread);

    const handleBackdropClick = (event) => {
        if (event.target === event.currentTarget) setOpen(false);
    };

    const portalTarget = typeof document !== 'undefined' ? document.body : null;

    const bellButton = (
        <button
            ref={triggerRef}
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
    );

    if (!open || !portalTarget) {
        return bellButton;
    }

    const modal = (
        <div className="notifbell-modal" onMouseDown={handleBackdropClick}>
            <div className="notifbell-backdrop" aria-hidden="true" />
            <div
                ref={panelRef}
                id="notifbell-panel"
                className="notifbell-panel"
                role="dialog"
                aria-modal="true"
                aria-labelledby="notifbell-title"
                tabIndex={-1}
            >
                <header className="notifbell-header">
                    <div className="notifbell-heading">
                        <p className="notifbell-eyebrow">PUSAT NOTIFIKASI</p>
                        <div className="notifbell-title-row">
                            <h3 id="notifbell-title">Notifikasi</h3>
                            {unread > 0 && <span className="notifbell-count-pill">{unread} baru</span>}
                        </div>
                        <p className="notifbell-subtitle">Aktivitas akun dan perangkat terbaru.</p>
                    </div>
                    <div className="notifbell-header-actions">
                        <button
                            type="button"
                            className="notifbell-mark-all"
                            onClick={markAllRead}
                            disabled={unread === 0 || markingAll}
                        >
                            <FiCheck aria-hidden="true" />
                            <span>{markingAll ? 'Memproses...' : 'Tandai semua'}</span>
                        </button>
                        <button
                            type="button"
                            className="notifbell-close"
                            onClick={() => setOpen(false)}
                            aria-label="Tutup notifikasi"
                        >
                            <FiX aria-hidden="true" />
                        </button>
                    </div>
                </header>

                <div className="notifbell-filters">
                    <div className="notifbell-chip-row" role="tablist" aria-label="Filter status notifikasi">
                        {showChip('all') && (
                            <button
                                type="button"
                                className={`notifbell-chip ${statusFilter === 'all' ? 'is-active' : ''}`}
                                onClick={() => setStatusFilter('all')}
                            >
                                Semua <span className="notifbell-chip-count">{counts.all}</span>
                            </button>
                        )}
                        {showChip('unread') && (
                            <button
                                type="button"
                                className={`notifbell-chip ${statusFilter === 'unread' ? 'is-active' : ''}`}
                                onClick={() => setStatusFilter('unread')}
                            >
                                Belum dibaca <span className="notifbell-chip-count">{counts.unread}</span>
                            </button>
                        )}
                        {showChip('charging') && (
                            <button
                                type="button"
                                className={`notifbell-chip ${statusFilter === 'charging' ? 'is-active' : ''}`}
                                onClick={() => setStatusFilter('charging')}
                            >
                                Charging <span className="notifbell-chip-count">{counts.charging}</span>
                            </button>
                        )}
                        {showChip('payment') && (
                            <button
                                type="button"
                                className={`notifbell-chip ${statusFilter === 'payment' ? 'is-active' : ''}`}
                                onClick={() => setStatusFilter('payment')}
                            >
                                Pembayaran <span className="notifbell-chip-count">{counts.payment}</span>
                            </button>
                        )}
                        {showChip('issue') && (
                            <button
                                type="button"
                                className={`notifbell-chip ${statusFilter === 'issue' ? 'is-active' : ''}`}
                                onClick={() => setStatusFilter('issue')}
                            >
                                Gangguan <span className="notifbell-chip-count">{counts.issue}</span>
                            </button>
                        )}
                    </div>

                    <div className="notifbell-date-control">
                        <button
                            type="button"
                            className={`notifbell-date-button ${datePreset !== 'all' ? 'is-active' : ''}`}
                            onClick={() => setDatePopoverOpen((value) => !value)}
                            aria-expanded={datePopoverOpen}
                            aria-haspopup="dialog"
                        >
                            📅 {datePreset === 'all' ? 'Tanggal' : activeDateLabel}
                            <FiChevronDown aria-hidden="true" />
                        </button>
                        {datePreset !== 'all' && (
                            <button type="button" className="notifbell-date-clear" onClick={resetDateFilter} aria-label="Hapus filter tanggal">
                                <FiX aria-hidden="true" />
                            </button>
                        )}
                    </div>

                    {datePopoverOpen && (
                        <div className="notifbell-date-popover" role="dialog" aria-label="Filter tanggal">
                            <div className="notifbell-date-presets">
                                {[
                                    { key: 'all', label: 'Semua tanggal' },
                                    { key: 'today', label: 'Hari ini' },
                                    { key: 'yesterday', label: 'Kemarin' },
                                    { key: '7d', label: '7 hari terakhir' },
                                    { key: '30d', label: '30 hari terakhir' },
                                ].map((preset) => (
                                    <button
                                        key={preset.key}
                                        type="button"
                                        className={`notifbell-date-preset ${datePreset === preset.key ? 'is-active' : ''}`}
                                        onClick={() => {
                                            setDatePreset(preset.key);
                                            setDateError('');
                                            if (preset.key !== 'custom') setDatePopoverOpen(false);
                                        }}
                                    >
                                        {preset.label}
                                    </button>
                                ))}
                                <button
                                    type="button"
                                    className={`notifbell-date-preset ${datePreset === 'custom' ? 'is-active' : ''}`}
                                    onClick={() => setDatePreset('custom')}
                                >
                                    Pilih rentang
                                </button>
                            </div>

                            {datePreset === 'custom' && (
                                <div className="notifbell-date-range">
                                    <label className="notifbell-date-field">
                                        <span>Dari</span>
                                        <input
                                            type="date"
                                            className="notifbell-date-input"
                                            value={customFrom}
                                            max={todayKey}
                                            onChange={(event) => setCustomFrom(event.target.value)}
                                        />
                                        <small>{formatIndoDate(customFrom)}</small>
                                    </label>
                                    <label className="notifbell-date-field">
                                        <span>Sampai</span>
                                        <input
                                            type="date"
                                            className="notifbell-date-input"
                                            value={customTo}
                                            max={todayKey}
                                            onChange={(event) => setCustomTo(event.target.value)}
                                        />
                                        <small>{formatIndoDate(customTo)}</small>
                                    </label>
                                    {dateError && <p className="notifbell-date-error" role="alert">{dateError}</p>}
                                    <div className="notifbell-date-actions">
                                        <button type="button" className="notifbell-date-reset" onClick={resetDateFilter}>Reset</button>
                                        <button type="button" className="notifbell-date-apply" onClick={handleApplyCustomDate}>Terapkan</button>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    {hasActiveFilters && (
                        <div className="notifbell-active-filters">
                            {statusFilter !== 'all' && (
                                <button type="button" className="notifbell-active-chip" onClick={() => setStatusFilter('all')}>
                                    {statusFilter === 'unread' ? 'Belum dibaca' : statusFilter === 'charging' ? 'Charging' : statusFilter === 'payment' ? 'Pembayaran' : 'Gangguan'} ✕
                                </button>
                            )}
                            {datePreset !== 'all' && (
                                <button type="button" className="notifbell-active-chip" onClick={resetDateFilter}>
                                    {activeDateLabel} ✕
                                </button>
                            )}
                            {hasActiveFilters && (statusFilter !== 'all' || datePreset !== 'all') && (statusFilter !== 'all' && datePreset !== 'all') && (
                                <button type="button" className="notifbell-clear-all" onClick={clearAllFilters}>
                                    Hapus semua filter
                                </button>
                            )}
                        </div>
                    )}
                </div>

                <div className="notifbell-body" aria-busy={loading}>
                    {loading && (
                        <div className="notifbell-skeleton">
                            {[1, 2, 3, 4].map((row) => (
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
                    )}

                    {!loading && error && (
                        <div className="notifbell-state">
                            <FiInbox aria-hidden="true" />
                            <strong>Gagal memuat notifikasi</strong>
                            <p>{error}</p>
                            <button type="button" onClick={() => fetchList(1, false)}>Coba lagi</button>
                        </div>
                    )}

                    {!loading && !error && filteredItems.length === 0 && (
                        <div className="notifbell-state">
                            <FiBell aria-hidden="true" />
                            <strong>{items.length === 0 ? 'Belum ada notifikasi' : 'Tidak ada notifikasi untuk filter ini'}</strong>
                            <p>{items.length === 0 ? 'Pemberitahuan transaksi, top up, dan charger akan muncul di sini.' : 'Coba ubah atau hapus filter.'}</p>
                            {hasActiveFilters && <button type="button" onClick={clearAllFilters}>Hapus filter</button>}
                        </div>
                    )}

                    {!loading && !error && filteredItems.length > 0 && (
                        <div className="notifbell-list">
                            {grouped.map((group) => (
                                <section key={group.label} className="notifbell-group">
                                    <h4 className="notifbell-group-header">{group.label}</h4>
                                    {group.items.map((item) => {
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
                                                    <span className="notifbell-item-message">{item.pesan}</span>
                                                    <span className="notifbell-item-meta">
                                                        <span className={`notifbell-type-pill tone-${meta.tone}`}>{meta.label}</span>
                                                        <span title={item.created_at}>{formatNotificationTime(item.created_at)}</span>
                                                    </span>
                                                </span>
                                                <span className="notifbell-item-action" aria-hidden="true">
                                                    {isReading ? <span className="notifbell-spinner" /> : null}
                                                </span>
                                            </button>
                                        );
                                    })}
                                </section>
                            ))}

                            {hasMore && (
                                <div className="notifbell-load-more">
                                    <button type="button" onClick={loadMore} disabled={loadingMore}>
                                        {loadingMore ? 'Memuat...' : 'Muat lebih banyak'}
                                    </button>
                                    {items.length > filteredItems.length && (
                                        <p className="notifbell-filter-note">Filter diterapkan pada data yang sudah dimuat. Muat lebih banyak untuk mencari lebih lama.</p>
                                    )}
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {filteredItems.length > 0 && !loading && (
                    <footer className="notifbell-footer">
                        Menampilkan {filteredItems.length} dari {items.length} notifikasi
                    </footer>
                )}
            </div>
        </div>
    );

    return (
        <>
            {bellButton}
            {createPortal(modal, portalTarget)}
        </>
    );
}
