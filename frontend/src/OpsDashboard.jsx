import { useCallback, useEffect, useState } from 'react';
import { FaArrowRight, FaBell, FaBolt, FaCheckCircle, FaChargingStation, FaCog, FaExclamationTriangle, FaFileAlt, FaMapMarkerAlt, FaSignOutAlt, FaStop, FaSyncAlt, FaTachometerAlt } from 'react-icons/fa';
import api from './api/client';
import NotificationOverlay from './NotificationOps';
import OperatorStationPicker from './OperatorStationPicker';
import OperatorSettingsModal from './OperatorSettingsModal';
import { countUnreadNotifications, getNotifSeenAtMs, getOperatorNotifications, markOperatorNotificationsSeen } from './api/operatorNotifications';
import './opsDashboard.css';
import logoECH from './assets/Gemini_Generated_Image_8581rg8581rg8581.jfif.jpeg';

/** Memilih sapaan berdasarkan waktu lokal perangkat Operator. */
function greeting() {
    const hour = new Date().getHours();
    return hour < 10 ? 'Selamat pagi' : hour < 15 ? 'Selamat siang' : hour < 18 ? 'Selamat sore' : 'Selamat malam';
}
/** Memformat waktu pembaruan atau waktu alert dengan format lokal Indonesia. */
function displayTime(value) {
    if (!value) return 'belum disinkronkan';
    return new Intl.DateTimeFormat('id-ID', { hour: '2-digit', minute: '2-digit' }).format(new Date(value));
}
/** Menghitung durasi sesi aktif sejak waktu mulai dalam jam dan menit. */
function duration(value) {
    if (!value) return 'Berlangsung';
    const minutes = Math.max(0, Math.floor((Date.now() - new Date(value).getTime()) / 60000));
    return `${Math.floor(minutes / 60)}j ${String(minutes % 60).padStart(2, '0')}m`;
}
/** Menampilkan metrik dengan placeholder selama data awal belum tersedia. */
function Metric({ icon, label, value, tone, note, loading }) {
    return <article className="op-stat-card"><span className={`op-stat-icon ${tone}`}>{icon}</span><div><p>{label}</p><strong>{loading ? '—' : value}</strong><small>{note}</small></div></article>;
}

export default function OperatorDashboard({ user, onLogout, onNavigateToCharger, onNavigateToOpsReport }) {
    const [dashboard, setDashboard] = useState({ station: null, stats: {}, criticalAlerts: [], activeSessions: [] });
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [lastUpdated, setLastUpdated] = useState(null);
    const [refreshInterval, setRefreshInterval] = useState(30);
    const [modal, setModal] = useState(null);
    const [notifications, setNotifications] = useState({ id_location: null, malfunctions: [], transactions: [], total_unread: 0 });
    const [seenAtMs, setSeenAtMs] = useState(() => getNotifSeenAtMs());
    const [notifModal, setNotifModal] = useState(null);
    const [pendingAction, setPendingAction] = useState(null);
    const [actionReason, setActionReason] = useState('');
    const [processing, setProcessing] = useState(false);
    const [notice, setNotice] = useState('');
    const name = user?.profile?.nama_lengkap || user?.name || user?.email || '';
    const stats = dashboard.stats || {};

    const load = useCallback(async (silent = false) => {
        if (!silent) setLoading(true);
        setError('');
        try {
            const [{ data }, notifData] = await Promise.all([
                api.get('/operator/dashboard'),
                getOperatorNotifications().catch(() => null),
            ]);
            setDashboard({
                station: data.data?.station || null,
                stats: data.data?.stats || {},
                criticalAlerts: data.data?.criticalAlerts || [],
                activeSessions: data.data?.activeSessions || [],
            });
            if (notifData) {
                setNotifications(notifData);
                setSeenAtMs(getNotifSeenAtMs(notifData.id_location));
            }
            setLastUpdated(new Date());
        } catch (err) {
            setError(err.response?.data?.message || 'Data operasional belum dapat dimuat. Periksa koneksi lalu coba lagi.');
        } finally { if (!silent) setLoading(false); }
    }, []);
    useEffect(() => {
        const timer = window.setTimeout(() => load(), 0);
        return () => window.clearTimeout(timer);
    }, [load]);
    useEffect(() => {
        const timer = window.setInterval(() => load(true), refreshInterval * 1000);
        return () => window.clearInterval(timer);
    }, [load, refreshInterval]);
    useEffect(() => {
        if (!notice) return undefined;
        const timer = window.setTimeout(() => setNotice(''), 4000);
        return () => window.clearTimeout(timer);
    }, [notice]);

    /** Menghentikan sesi melalui alur settlement dan menyimpan alasan Operator. */
    const runAction = async () => {
        if (!pendingAction) return;
        setProcessing(true);
        try {
            const { data } = await api.post(`/operator/sessions/${pendingAction.id}/stop`, { alasan: actionReason.trim() });
            setNotice(data.message || 'Perintah berhasil dikirim.');
            setPendingAction(null);
            setActionReason('');
            await load(true);
        } catch (err) {
            setNotice(err.response?.data?.message || 'Perintah tidak dapat dikirim.');
        } finally { setProcessing(false); }
    };
    /** Membuka pop-up notifikasi gangguan dan transaksi lalu menandai sudah dibaca. */
    const openNotifications = (initialTab = null) => {
        const beforeMs = getNotifSeenAtMs(notifications.id_location);
        const updatedSeenMs = markOperatorNotificationsSeen(notifications);
        setSeenAtMs(updatedSeenMs);
        setNotifModal({ initialTab, seenBeforeMs: beforeMs });
    };

    // Badge mencakup gangguan aktif serta transaksi driver yang belum dilihat.
    const alertCount = countUnreadNotifications(notifications, seenAtMs);

    return <div className="op-layout-container">
        <header className="op-header">
            <div className="op-header-left"><img className="op-logo" src={logoECH} alt="EV Charge Hub" /><div><p className="op-eyebrow">PANEL OPERATOR</p><h2>{greeting()}{name ? `, ${name.split(' ')[0]}` : ''}</h2></div></div>
            <div className="op-header-right"><OperatorStationPicker onStationChange={() => load()} /><button className="op-icon-btn" aria-label="Pusat notifikasi" onClick={() => openNotifications()}><FaBell />{alertCount > 0 && <span className="op-badge">{alertCount}</span>}</button><button className="op-icon-btn" aria-label="Pengaturan dashboard" onClick={() => setModal('settings')}><FaCog /></button></div>
        </header>
        <div className="op-body-wrapper">
            <aside className="op-sidebar" aria-label="Navigasi Operator"><nav><button className="op-menu-item active" aria-current="page"><FaTachometerAlt /><span>Dashboard</span></button><button className="op-menu-item" onClick={onNavigateToCharger}><FaChargingStation /><span>Kelola charger</span></button><button className="op-menu-item" onClick={onNavigateToOpsReport}><FaFileAlt /><span>Laporan transaksi</span></button><div className="op-sidebar-exit"><button className="op-logout-btn" onClick={onLogout}><FaSignOutAlt /><span>Keluar</span></button></div></nav></aside>
            <main className="op-main-content"><div className="op-dashboard-container">
                <section className="op-page-head"><div><p className="op-eyebrow">RINGKASAN STASIUN</p><h1>Dashboard operasional</h1><p className="op-station-context"><FaMapMarkerAlt aria-hidden="true" />{dashboard.station?.nama_lokasi || (loading ? 'Memuat station aktif…' : error ? 'Station belum dapat dimuat' : 'Belum ada station tugas')}</p></div><div className="op-refresh-wrap"><span>Terakhir diperbarui {displayTime(lastUpdated)}</span><button className="op-refresh-btn" onClick={() => load()} disabled={loading}><FaSyncAlt className={loading ? 'fa-spin' : ''} />{loading ? 'Memuat' : 'Segarkan'}</button></div></section>
                {error && <section className="op-inline-state error"><FaExclamationTriangle /><div><strong>Data tidak tersinkron</strong><p>{error}</p></div><button onClick={() => load()}>Coba lagi</button></section>}
                {notice && <div className="op-toast" role="status">{notice}</div>}
                {dashboard.criticalAlerts.length > 0 && <section className="op-attention"><div><span className="op-attention-icon"><FaExclamationTriangle /></span><div><p className="op-eyebrow">PERLU TINDAKAN</p><strong>{dashboard.criticalAlerts.length} gangguan unit perlu ditangani</strong><p>Periksa detail gangguan sebelum mengubah status unit.</p></div></div><button onClick={() => openNotifications('malfunction')}>Lihat gangguan <FaArrowRight /></button></section>}
                <section className="op-stats-grid" aria-label="Kondisi port"><Metric loading={loading && !lastUpdated} tone="charging" icon={<FaBolt />} label="Sedang mengisi" value={`${stats.activeCharging || 0} port`} note="Sesi aktif saat ini" /><Metric loading={loading && !lastUpdated} tone="ready" icon={<FaCheckCircle />} label="Port siap" value={`${stats.availablePorts || 0} port`} note="Tersedia untuk driver" /><Metric loading={loading && !lastUpdated} tone="warning" icon={<FaExclamationTriangle />} label="Perlu perhatian" value={`${stats.errorPorts || 0} port`} note="Gangguan atau perawatan" /></section>
                <section className="op-panel op-sessions-panel"><div className="op-panel-head"><div><h2>Sesi pengisian aktif</h2><p>Berhenti otomatis menyelesaikan biaya aktual dan mengembalikan sisa saldo hold.</p></div><span className="op-live-dot">DIPANTAU {refreshInterval} DETIK</span></div>{loading && !lastUpdated ? <div className="op-empty-state">Memuat sesi aktif…</div> : dashboard.activeSessions.length ? <><div className="op-table-responsive"><table className="op-data-table"><thead><tr><th>Port</th><th>Kendaraan</th><th>Daya</th><th>Durasi</th><th>Energi</th><th>Aksi</th></tr></thead><tbody>{dashboard.activeSessions.map(session => <tr key={session.id_session}><td><strong>{session.port}</strong><small>{session.type}</small></td><td>{session.vehicle}</td><td>{session.power}</td><td>{duration(session.startedAt)}</td><td>{session.energy}</td><td><button className="op-danger-action" onClick={() => { setActionReason(''); setPendingAction({ id: session.id_session, target: session.port, label: 'Akhiri sesi charging' }); }}><FaStop />Akhiri sesi</button></td></tr>)}</tbody></table></div><div className="op-session-cards">{dashboard.activeSessions.map(session => <article className="op-session-card" key={`mobile-${session.id_session}`}><div className="op-session-card-head"><div><strong>{session.port}</strong><small>{session.type}</small></div><span>{session.power}</span></div><dl><div><dt>Kendaraan</dt><dd>{session.vehicle}</dd></div><div><dt>Durasi</dt><dd>{duration(session.startedAt)}</dd></div><div><dt>Energi</dt><dd>{session.energy}</dd></div></dl><button className="op-danger-action" onClick={() => { setActionReason(''); setPendingAction({ id: session.id_session, target: session.port, label: 'Akhiri sesi charging' }); }}><FaStop />Akhiri sesi</button></article>)}</div></> : <div className="op-empty-state"><FaChargingStation /><strong>Belum ada sesi pengisian aktif</strong><p>Port yang sedang digunakan akan muncul di sini secara otomatis.</p></div>}</section>
            </div></main>
        </div>
        {notifModal && <NotificationOverlay isOpen onClose={() => setNotifModal(null)} notifications={notifications} initialTab={notifModal.initialTab} seenBeforeMs={notifModal.seenBeforeMs} onRefreshData={() => load(true)} onNavigateToCharger={onNavigateToCharger} />}
        {modal === 'settings' && <OperatorSettingsModal user={user} onClose={() => setModal(null)} onLogout={onLogout} refreshInterval={refreshInterval} onRefreshIntervalChange={setRefreshInterval} onStationChange={() => load()} />}
        <nav className="op-mobile-nav" aria-label="Navigasi Operator"><button className="active" aria-current="page"><FaTachometerAlt /><span>Dashboard</span></button><button onClick={onNavigateToCharger}><FaChargingStation /><span>Charger</span></button><button onClick={onNavigateToOpsReport}><FaFileAlt /><span>Laporan</span></button></nav>
        {pendingAction && <div className="op-modal-backdrop"><section className="op-confirm-dialog" role="alertdialog" aria-modal="true" aria-labelledby="op-stop-title"><span className="op-confirm-icon"><FaExclamationTriangle /></span><h2 id="op-stop-title">{pendingAction.label}?</h2><p>Sesi di <strong>{pendingAction.target}</strong> akan dihentikan. Sistem menghitung biaya dari energi aktual dan mengembalikan sisa saldo hold.</p><label className="op-reason-field">Alasan penghentian<textarea value={actionReason} onChange={event => setActionReason(event.target.value)} minLength={5} maxLength={500} required placeholder="Jelaskan alasan sesi perlu dihentikan" /></label><div><button className="op-cancel-btn" disabled={processing} onClick={() => setPendingAction(null)}>Batal</button><button className="op-danger-action" disabled={processing || actionReason.trim().length < 5} onClick={runAction}>{processing ? 'Memproses…' : 'Hentikan sesi'}</button></div></section></div>}
    </div>;
}
