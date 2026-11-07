import { useCallback, useEffect, useState } from 'react';
import { FaBell, FaBolt, FaCheckCircle, FaChargingStation, FaCog, FaExclamationTriangle, FaFileAlt, FaPowerOff, FaSignOutAlt, FaStop, FaSyncAlt, FaTachometerAlt, FaWrench, FaTimes, FaArrowRight } from 'react-icons/fa';
import api from './api/client';
import OperatorStationPicker from './OperatorStationPicker';
import OperatorSettingsModal from './OperatorSettingsModal';
import './opsDashboard.css';
import logoECH from './assets/Gemini_Generated_Image_8581rg8581rg8581.jfif.jpeg';

function greeting() {
    const hour = new Date().getHours();
    return hour < 10 ? 'Selamat pagi' : hour < 15 ? 'Selamat siang' : hour < 18 ? 'Selamat sore' : 'Selamat malam';
}
function displayTime(value) {
    if (!value) return 'belum disinkronkan';
    return new Intl.DateTimeFormat('id-ID', { hour: '2-digit', minute: '2-digit' }).format(new Date(value));
}
function duration(value) {
    if (!value) return 'Berlangsung';
    const minutes = Math.max(0, Math.floor((Date.now() - new Date(value).getTime()) / 60000));
    return `${Math.floor(minutes / 60)}j ${String(minutes % 60).padStart(2, '0')}m`;
}
function Metric({ icon, label, value, tone, note }) {
    return <article className="op-stat-card"><span className={`op-stat-icon ${tone}`}>{icon}</span><div><p>{label}</p><strong>{value}</strong><small>{note}</small></div></article>;
}

export default function OperatorDashboard({ user, onLogout, onNavigateToCharger, onNavigateToOpsReport }) {
    const [dashboard, setDashboard] = useState({ stats: {}, criticalAlerts: [], activeSessions: [], transactionAlerts: [] });
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [lastUpdated, setLastUpdated] = useState(null);
    const [refreshInterval, setRefreshInterval] = useState(30);
    const [modal, setModal] = useState(null);
    const [pendingAction, setPendingAction] = useState(null);
    const [processing, setProcessing] = useState(false);
    const [notice, setNotice] = useState('');
    const name = user?.profile?.nama_lengkap || user?.name || user?.email || '';
    const stats = dashboard.stats || {};
    const usablePorts = (stats.availablePorts || 0) + (stats.activeCharging || 0);
    const allPorts = usablePorts + (stats.errorPorts || 0);
    const readiness = allPorts ? Math.round((usablePorts / allPorts) * 100) : 0;

    const load = useCallback(async (silent = false) => {
        if (!silent) setLoading(true);
        setError('');
        try {
            const { data } = await api.get('/operator/dashboard');
            setDashboard({
                stats: data.data?.stats || {},
                criticalAlerts: data.data?.criticalAlerts || [],
                activeSessions: data.data?.activeSessions || [],
                transactionAlerts: data.data?.transactionAlerts || [],
            });
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

    const runAction = async () => {
        if (!pendingAction) return;
        setProcessing(true);
        try {
            const path = pendingAction.type === 'maintenance'
                ? `/operator/charger/${pendingAction.id}/reboot`
                : `/operator/port/${pendingAction.id}/${pendingAction.type === 'stop' ? 'stop' : 'reboot'}`;
            const { data } = await api.post(path);
            setNotice(data.message || 'Perintah berhasil dikirim.');
            setPendingAction(null);
            await load(true);
        } catch (err) {
            setNotice(err.response?.data?.message || 'Perintah tidak dapat dikirim.');
        } finally { setProcessing(false); }
    };
    const alertCount = dashboard.criticalAlerts.length + dashboard.transactionAlerts.length;

    return <div className="op-layout-container">
        <header className="op-header">
            <div className="op-header-left"><img className="op-logo" src={logoECH} alt="EV Charge Hub" /><div><p className="op-eyebrow">PANEL OPERATOR</p><h2>{greeting()}{name ? `, ${name.split(' ')[0]}` : ''}</h2></div></div>
            <div className="op-header-right"><OperatorStationPicker onStationChange={() => load()} /><button className="op-icon-btn" aria-label="Pusat notifikasi" onClick={() => setModal('alerts')}><FaBell />{alertCount > 0 && <span className="op-badge">{alertCount}</span>}</button><button className="op-icon-btn" aria-label="Pengaturan dashboard" onClick={() => setModal('settings')}><FaCog /></button></div>
        </header>
        <div className="op-body-wrapper">
            <aside className="op-sidebar"><nav><button className="op-menu-item active"><FaTachometerAlt />Dashboard</button><button className="op-menu-item" onClick={onNavigateToCharger}><FaChargingStation />Kelola charger</button><button className="op-menu-item" onClick={onNavigateToOpsReport}><FaFileAlt />Laporan transaksi</button><div className="op-sidebar-exit"><button className="op-logout-btn" onClick={onLogout}><FaSignOutAlt />Keluar</button></div></nav></aside>
            <main className="op-main-content"><div className="op-dashboard-container">
                <section className="op-page-head"><div><p className="op-eyebrow">RINGKASAN STASIUN</p><h1>Dashboard operasional</h1><p>Prioritaskan gangguan, pantau sesi aktif, dan tindak lanjuti unit dengan aman.</p></div><div className="op-refresh-wrap"><span>Terakhir diperbarui {displayTime(lastUpdated)}</span><button className="op-refresh-btn" onClick={() => load()} disabled={loading}><FaSyncAlt className={loading ? 'fa-spin' : ''} />{loading ? 'Memuat' : 'Segarkan'}</button></div></section>
                {error && <section className="op-inline-state error"><FaExclamationTriangle /><div><strong>Data tidak tersinkron</strong><p>{error}</p></div><button onClick={() => load()}>Coba lagi</button></section>}
                {notice && <div className="op-toast" role="status">{notice}</div>}
                {dashboard.criticalAlerts.length > 0 && <section className="op-attention"><div><span className="op-attention-icon"><FaExclamationTriangle /></span><div><p className="op-eyebrow">PERLU TINDAKAN</p><strong>{dashboard.criticalAlerts.length} gangguan unit perlu ditangani</strong><p>Periksa detail gangguan sebelum mengubah status unit.</p></div></div><button onClick={() => setModal('alerts')}>Lihat gangguan <FaArrowRight /></button></section>}
                <section className="op-stats-grid"><Metric tone="charging" icon={<FaBolt />} label="Sedang mengisi" value={`${stats.activeCharging || 0} port`} note="Sesi aktif saat ini" /><Metric tone="ready" icon={<FaCheckCircle />} label="Port siap" value={`${stats.availablePorts || 0} port`} note="Tersedia untuk driver" /><Metric tone="warning" icon={<FaExclamationTriangle />} label="Perlu perhatian" value={`${stats.errorPorts || 0} port`} note="Fault atau maintenance" /><Metric tone="revenue" icon="Rp" label="Pendapatan hari ini" value={stats.totalRevenueToday || 'Rp 0'} note="Transaksi berhasil" /></section>
                <section className="op-content-grid"><article className="op-panel"><div className="op-panel-head"><div><h2>Kesiapan port</h2><p>Ringkasan ketersediaan perangkat saat ini.</p></div><strong className={`op-readiness ${readiness < 100 ? 'attention' : ''}`}>{readiness}% siap</strong></div><div className="op-readiness-bar"><span style={{ width: `${readiness}%` }} /></div><div className="op-health-legend"><span><i className="ready" />Tersedia <strong>{stats.availablePorts || 0}</strong></span><span><i className="charging" />Digunakan <strong>{stats.activeCharging || 0}</strong></span><span><i className="fault" />Gangguan <strong>{stats.errorPorts || 0}</strong></span></div></article><article className="op-panel"><div className="op-panel-head"><div><h2>Langkah berikutnya</h2><p>Fokus kerja operator hari ini.</p></div></div><ol className="op-next-list">{dashboard.criticalAlerts.length > 0 && <li><FaWrench />Tinjau {dashboard.criticalAlerts.length} gangguan perangkat</li>}{(stats.activeCharging || 0) > 0 && <li><FaBolt />Pantau {stats.activeCharging} sesi charging aktif</li>}{!dashboard.criticalAlerts.length && !(stats.activeCharging || 0) && <li><FaCheckCircle />Semua kondisi operasional normal</li>}</ol></article></section>
                <section className="op-panel op-sessions-panel"><div className="op-panel-head"><div><h2>Sesi pengisian aktif</h2><p>Data diperbarui otomatis setiap {refreshInterval} detik.</p></div><span className="op-live-dot">LIVE</span></div>{loading && !lastUpdated ? <div className="op-empty-state">Memuat sesi aktif…</div> : dashboard.activeSessions.length ? <div className="op-table-responsive"><table className="op-data-table"><thead><tr><th>Port</th><th>Kendaraan</th><th>Daya</th><th>Durasi</th><th>Energi</th><th>Aksi</th></tr></thead><tbody>{dashboard.activeSessions.map(session => <tr key={session.id}><td><strong>{session.port}</strong><small>{session.type}</small></td><td>{session.vehicle}</td><td>{session.power}</td><td>{duration(session.startedAt)}</td><td>{session.energy}</td><td><div className="op-action-btns"><button className="op-secondary-action" onClick={() => setPendingAction({ type: 'reboot', id: session.id, target: session.port, label: 'Reboot port' })}><FaPowerOff />Reboot</button><button className="op-danger-action" onClick={() => setPendingAction({ type: 'stop', id: session.id, target: session.port, label: 'Hentikan sesi' })}><FaStop />Hentikan</button></div></td></tr>)}</tbody></table></div> : <div className="op-empty-state"><FaChargingStation /><strong>Belum ada sesi pengisian aktif</strong><p>Port yang sedang digunakan akan muncul di sini secara otomatis.</p></div>}</section>
            </div></main>
        </div>
        {modal === 'alerts' && <div className="op-modal-backdrop" onClick={() => setModal(null)}><section className="op-modal-dialog" role="dialog" aria-modal="true" onClick={e => e.stopPropagation()}><header className="op-modal-head"><div><p className="op-eyebrow">PUSAT NOTIFIKASI</p><h2>Gangguan operasional</h2></div><button className="op-modal-close" aria-label="Tutup" onClick={() => setModal(null)}><FaTimes /></button></header><div className="op-modal-body">{dashboard.criticalAlerts.length ? dashboard.criticalAlerts.map(alert => <article className="op-alert-card" key={alert.id}><span><FaWrench /></span><div><strong>{alert.chargerCode || 'Unit charger'}</strong><p>{alert.message}</p><small>{alert.occurredAt ? `Dilaporkan ${displayTime(alert.occurredAt)}` : 'Perlu verifikasi'}</small><div className="op-alert-actions"><button className="op-link-action" onClick={() => { setModal(null); onNavigateToCharger(); }}>Buka kelola charger</button><button className="op-danger-action" onClick={() => { setModal(null); setPendingAction({ type: 'maintenance', id: alert.idCharger, target: alert.chargerCode || 'unit charger', label: 'Set maintenance' }); }}>Set maintenance</button></div></div></article>) : <div className="op-empty-state"><FaCheckCircle /><strong>Tidak ada gangguan aktif</strong></div>}</div></section></div>}
        {modal === 'settings' && <OperatorSettingsModal user={user} onClose={() => setModal(null)} onLogout={onLogout} refreshInterval={refreshInterval} onRefreshIntervalChange={setRefreshInterval} onStationChange={() => load()} />}
        {pendingAction && <div className="op-modal-backdrop"><section className="op-confirm-dialog" role="alertdialog" aria-modal="true"><span className="op-confirm-icon"><FaExclamationTriangle /></span><h2>{pendingAction.label}?</h2><p>Anda akan menjalankan perintah pada <strong>{pendingAction.target}</strong>. Pastikan unit dan sesi yang dipilih sudah benar.</p><div><button className="op-cancel-btn" disabled={processing} onClick={() => setPendingAction(null)}>Batal</button><button className="op-danger-action" disabled={processing} onClick={runAction}>{processing ? 'Mengirim…' : 'Ya, lanjutkan'}</button></div></section></div>}
    </div>;
}
