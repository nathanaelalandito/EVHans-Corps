import { useCallback, useEffect, useRef, useState } from 'react';
import { FiBell } from 'react-icons/fi';
import api from './api/client';

/** Komponen bell notifikasi dengan polling dan tandai baca. */
export default function NotificationsBell() {
    const [open, setOpen] = useState(false);
    const [items, setItems] = useState([]);
    const [unread, setUnread] = useState(0);
    const timerRef = useRef(null);

    const fetchUnread = useCallback(async () => {
        if (document.hidden) return;
        try {
            const { data } = await api.get('/notifications/unread-count');
            setUnread(data?.data?.unread ?? 0);
        } catch (e) {
            // Abaikan error jaringan agar tidak mengganggu UI.
        }
    }, []);

    const fetchList = useCallback(async () => {
        try {
            const { data } = await api.get('/notifications', { params: { per_page: 20 } });
            setItems(data?.data?.data ?? data?.data ?? []);
        } catch (e) {
            setItems([]);
        }
    }, []);

    useEffect(() => {
        fetchUnread();
        timerRef.current = setInterval(fetchUnread, 25000);
        const onVisibility = () => {
            if (!document.hidden) fetchUnread();
        };
        document.addEventListener('visibilitychange', onVisibility);
        return () => {
            clearInterval(timerRef.current);
            document.removeEventListener('visibilitychange', onVisibility);
        };
    }, [fetchUnread]);

    useEffect(() => {
        if (open) fetchList();
    }, [open, fetchList]);

    const markRead = async (id) => {
        try {
            await api.put(`/notifications/${id}/read`);
            setItems((prev) => prev.map((n) => (n.id_notifikasi === id ? { ...n, dibaca_pada: new Date().toISOString() } : n)));
            setUnread((prev) => Math.max(0, prev - 1));
        } catch (e) {
            // Abaikan.
        }
    };

    const markAllRead = async () => {
        try {
            await api.put('/notifications/read-all');
            setItems((prev) => prev.map((n) => ({ ...n, dibaca_pada: new Date().toISOString() })));
            setUnread(0);
        } catch (e) {
            // Abaikan.
        }
    };

    return (
        <div style={{ position: 'relative', display: 'inline-block' }}>
            <button type="button" onClick={() => setOpen((v) => !v)} aria-label="Notifikasi">
                <FiBell />
                {unread > 0 && <span style={{ position: 'absolute', top: -4, right: -4, background: 'red', color: 'white', borderRadius: '999px', padding: '0 6px', fontSize: '11px' }}>{unread}</span>}
            </button>
            {open && (
                <div style={{ position: 'absolute', right: 0, top: '100%', width: 320, maxHeight: 400, overflow: 'auto', background: 'white', border: '1px solid #ddd', borderRadius: 8, zIndex: 1000, padding: 8 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                        <strong>Notifikasi</strong>
                        <button type="button" onClick={markAllRead}>Tandai semua</button>
                    </div>
                    {items.length === 0 && <p>Tidak ada notifikasi.</p>}
                    {items.map((n) => (
                        <div key={n.id_notifikasi} style={{ padding: 8, borderBottom: '1px solid #eee', opacity: n.dibaca_pada ? 0.6 : 1 }}>
                            <div><strong>{n.judul}</strong></div>
                            <div>{n.pesan}</div>
                            <div style={{ fontSize: 11, color: '#666' }}>{n.created_at}</div>
                            {!n.dibaca_pada && <button type="button" onClick={() => markRead(n.id_notifikasi)}>Tandai dibaca</button>}
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
