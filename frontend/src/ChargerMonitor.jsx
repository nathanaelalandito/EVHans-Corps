import { useCallback, useEffect, useMemo, useState } from 'react';
import { FaBell, FaBolt, FaChargingStation, FaCog, FaEdit, FaExclamationTriangle, FaFileAlt, FaFilter, FaPlus, FaPlug, FaPowerOff, FaSearch, FaSignOutAlt, FaStop, FaSyncAlt, FaTachometerAlt, FaTimes, FaTrash, FaWrench, FaPlay, FaCheckCircle } from 'react-icons/fa';
import api from './api/client';
import OperatorStationPicker from './OperatorStationPicker';
import OperatorSettingsModal from './OperatorSettingsModal';
import './chargerMonitor.css';
import logoECH from './assets/Gemini_Generated_Image_8581rg8581rg8581.jfif.jpeg';

const EMPTY_FORM = { kode_perangkat: '', merek_model: '', kap_tot_kw: 60, status_mesin: 'Active' };
const labelStatus = { Active: 'Aktif', Maintenance: 'Maintenance', Offline: 'Offline' };

export default function ChargerMonitor({ user, onLogout, onNavigateToOpsDash, onNavigateToOpsReport, onNavigateToDetail }) {
    const [chargers, setChargers] = useState([]);
    const [alerts, setAlerts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [lastUpdated, setLastUpdated] = useState(null);
    const [statusFilter, setStatusFilter] = useState('ALL');
    const [query, setQuery] = useState('');
    const [refreshInterval, setRefreshInterval] = useState(30);
    const [modal, setModal] = useState(null);
    const [form, setForm] = useState(EMPTY_FORM);
    const [editingId, setEditingId] = useState(null);
    const [pendingAction, setPendingAction] = useState(null);
    const [submitting, setSubmitting] = useState(false);
    const [notice, setNotice] = useState('');
    const [tarif, setTarif] = useState(null);
    const [tarifForm, setTarifForm] = useState({ harga_per_kwh: '', biaya_minimum: '', biaya_parkir_pjam: '' });
    const name = user?.profile?.nama_lengkap || user?.name || user?.email || '';

    const load = useCallback(async (silent = false) => {
        if (!silent) setLoading(true);
        setError('');
        try {
            const [chargerResponse, dashboardResponse, tarifResponse] = await Promise.all([api.get('/operator/chargers'), api.get('/operator/dashboard'), api.get('/operator/tarif')]);
            setChargers(chargerResponse.data.data || []);
            setAlerts(dashboardResponse.data.data?.criticalAlerts || []);
            setTarif(tarifResponse.data.data || null);
            setLastUpdated(new Date());
        } catch (err) {
            setError(err.response?.data?.message || 'Daftar charger belum dapat dimuat. Periksa koneksi lalu coba lagi.');
        } finally { if (!silent) setLoading(false); }
    }, []);
    useEffect(() => { const timer = window.setTimeout(() => load(), 0); return () => window.clearTimeout(timer); }, [load]);
    useEffect(() => { const timer = window.setInterval(() => load(true), refreshInterval * 1000); return () => window.clearInterval(timer); }, [load, refreshInterval]);
    useEffect(() => { if (!notice) return undefined; const timer = window.setTimeout(() => setNotice(''), 4000); return () => window.clearTimeout(timer); }, [notice]);

    const filteredChargers = useMemo(() => chargers.filter(charger => {
        const byStatus = statusFilter === 'ALL' || charger.status_mesin === statusFilter;
        const text = `${charger.kode_perangkat || ''} ${charger.merek_model || ''}`.toLowerCase();
        return byStatus && text.includes(query.trim().toLowerCase());
    }), [chargers, statusFilter, query]);
    const counts = useMemo(() => chargers.reduce((acc, item) => ({ ...acc, [item.status_mesin]: (acc[item.status_mesin] || 0) + 1 }), {}), [chargers]);

    /** Form ini hanya mengubah identitas teknis; status dikelola lewat aksi operasional. */
    const openForm = (charger = null) => {
        setEditingId(charger?.id_charger || null);
        setForm(charger ? { kode_perangkat: charger.kode_perangkat || '', merek_model: charger.merek_model || '', kap_tot_kw: charger.kap_tot_kw || 60, status_mesin: charger.status_mesin || 'Active' } : EMPTY_FORM);
        setModal('form');
    };
    const saveForm = async event => {
        event.preventDefault(); setSubmitting(true);
        try {
            const response = editingId ? await api.put(`/operator/chargers/${editingId}`, form) : await api.post('/operator/storechargers', form);
            setNotice(response.data.message || 'Data charger berhasil disimpan.');
            setModal(null); await load(true);
        } catch (err) { setNotice(err.response?.data?.message || 'Data charger tidak dapat disimpan.'); } finally { setSubmitting(false); }
    };
    const runAction = async () => {
        if (!pendingAction) return; setSubmitting(true);
        try {
            const url = pendingAction.type === 'delete' ? `/operator/delchargers/${pendingAction.id}` : `/operator/charger/${pendingAction.id}/${pendingAction.type}`;
            const response = pendingAction.type === 'delete' ? await api.delete(url) : await api.post(url);
            setNotice(response.data.message || 'Perintah berhasil dikirim.'); setPendingAction(null); await load(true);
        } catch (err) { setNotice(err.response?.data?.message || 'Perintah tidak dapat dijalankan.'); } finally { setSubmitting(false); }
    };
    const requestAction = (type, charger) => setPendingAction({ type, id: charger.id_charger, target: charger.kode_perangkat, label: type === 'delete' ? 'Hapus unit charger' : type === 'stop' ? 'Nonaktifkan charger' : type === 'start' ? 'Aktifkan charger' : 'Set maintenance' });
    /** Tarif selalu dikelola per station aktif, bukan per unit charger. */
    const openTarif = () => { setTarifForm({ harga_per_kwh: tarif?.harga_per_kwh || '', biaya_minimum: tarif?.biaya_minimum || '', biaya_parkir_pjam: tarif?.biaya_parkir_pjam || '' }); setModal('tarif'); };
    const saveTarif = async event => { event.preventDefault(); setSubmitting(true); try { const response = await api.post('/operator/tarif', { harga_per_kwh: Number(tarifForm.harga_per_kwh), biaya_minimum: Number(tarifForm.biaya_minimum), biaya_parkir_pjam: Number(tarifForm.biaya_parkir_pjam) }); setNotice(response.data.message); setModal(null); await load(true); } catch (err) { setNotice(err.response?.data?.message || 'Tarif tidak dapat disimpan.'); } finally { setSubmitting(false); } };

    return <div className="cm-layout-container">
        <header className="cm-header"><div className="cm-header-left"><img className="cm-logo" src={logoECH} alt="EV Charge Hub" /><div><p className="cm-eyebrow">PANEL OPERATOR</p><h2>Kelola charger{ name ? `, ${name.split(' ')[0]}` : ''}</h2></div></div><div className="cm-header-right"><OperatorStationPicker onStationChange={() => load()} /><button className="cm-icon-btn" aria-label="Lihat gangguan" onClick={() => setModal('alerts')}><FaBell />{alerts.length > 0 && <span className="cm-badge">{alerts.length}</span>}</button><button className="cm-icon-btn" aria-label="Pengaturan" onClick={() => setModal('settings')}><FaCog /></button></div></header>
        <div className="cm-body-wrapper"><aside className="cm-sidebar"><nav><button className="cm-menu-item" onClick={onNavigateToOpsDash}><FaTachometerAlt />Dashboard</button><button className="cm-menu-item active"><FaChargingStation />Kelola charger</button><button className="cm-menu-item" onClick={onNavigateToOpsReport}><FaFileAlt />Laporan transaksi</button><div className="cm-sidebar-exit"><button className="cm-logout-btn" onClick={onLogout}><FaSignOutAlt />Keluar</button></div></nav></aside>
            <main className="cm-main-content"><div className="cm-container">
                <section className="cm-page-head"><div><p className="cm-eyebrow">INVENTARIS PERANGKAT</p><h1>Kelola charger</h1><p>Kelola status, kapasitas, dan konfigurasi setiap unit di stasiun Anda.</p></div><div className="cm-head-actions"><span>Disinkronkan {lastUpdated ? new Intl.DateTimeFormat('id-ID', { hour: '2-digit', minute: '2-digit' }).format(lastUpdated) : '—'}</span><button className="cm-refresh-btn" onClick={() => load()} disabled={loading}><FaSyncAlt className={loading ? 'fa-spin' : ''} />Segarkan</button><button className="cm-refresh-btn" onClick={openTarif}>Kelola tarif</button><button className="cm-add-btn" onClick={() => openForm()}><FaPlus />Tambah Charger</button></div></section>
                {error && <div className="cm-inline-state"><FaExclamationTriangle /><div><strong>Data tidak tersinkron</strong><p>{error}</p></div><button onClick={() => load()}>Coba lagi</button></div>}
                {notice && <div className="cm-toast" role="status">{notice}</div>}
                {alerts.length > 0 && <section className="cm-attention"><div><FaWrench /><span><strong>{alerts.length} gangguan perangkat perlu ditinjau</strong><small>Pastikan unit terkait sebelum mengubah statusnya.</small></span></div><button onClick={() => setModal('alerts')}>Lihat gangguan</button></section>}
                <section className="cm-summary" aria-label="Ringkasan status unit"><button className={statusFilter === 'ALL' ? 'active' : ''} onClick={() => setStatusFilter('ALL')}><span>Semua unit</span><strong>{chargers.length}</strong></button><button className={statusFilter === 'Active' ? 'active ready' : 'ready'} onClick={() => setStatusFilter('Active')}><span>Aktif</span><strong>{counts.Active || 0}</strong></button><button className={statusFilter === 'Maintenance' ? 'active warning' : 'warning'} onClick={() => setStatusFilter('Maintenance')}><span>Maintenance</span><strong>{counts.Maintenance || 0}</strong></button><button className={statusFilter === 'Offline' ? 'active danger' : 'danger'} onClick={() => setStatusFilter('Offline')}><span>Offline</span><strong>{counts.Offline || 0}</strong></button></section>
                <section className="cm-toolbar"><label className="cm-search"><FaSearch /><input value={query} onChange={event => setQuery(event.target.value)} placeholder="Cari kode atau model charger" aria-label="Cari charger" /></label><label className="cm-filter"><FaFilter /><select value={statusFilter} onChange={event => setStatusFilter(event.target.value)}><option value="ALL">Semua status</option><option value="Active">Aktif</option><option value="Maintenance">Maintenance</option><option value="Offline">Offline</option></select></label><span>{filteredChargers.length} unit ditampilkan</span></section>
                <section className="cm-grid">{loading && !lastUpdated ? <div className="cm-empty-state">Memuat daftar charger…</div> : filteredChargers.length ? filteredChargers.map(charger => { const status = charger.status_mesin || 'Offline'; return <article key={charger.id_charger} className={`cm-charger-card ${status.toLowerCase()}`}><header><div><span className={`cm-status-badge ${status.toLowerCase()}`}>{labelStatus[status] || status}</span><h2>{charger.kode_perangkat}</h2><p>{charger.merek_model || 'Model belum diisi'}</p></div><div className="cm-card-menu"><button aria-label={`Ubah ${charger.kode_perangkat}`} onClick={() => openForm(charger)}><FaEdit /></button><button className="delete" aria-label={`Hapus ${charger.kode_perangkat}`} onClick={() => requestAction('delete', charger)}><FaTrash /></button></div></header><div className="cm-card-specs"><span><FaBolt /><small>Kapasitas</small><strong>{charger.kap_tot_kw} kW</strong></span><span><FaPlug /><small>Port terdaftar</small><strong>{charger.total_ports ?? 0} port</strong></span></div><footer><button className="cm-detail-btn" onClick={() => onNavigateToDetail?.(charger)}><FaPlug />Lihat detail</button>{status === 'Active' ? <button className="cm-danger-btn" onClick={() => requestAction('stop', charger)}><FaStop />Nonaktifkan</button> : <button className="cm-primary-btn" onClick={() => requestAction('start', charger)}><FaPlay />Aktifkan</button>}<button className="cm-icon-action" aria-label={`Set maintenance ${charger.kode_perangkat}`} onClick={() => requestAction('reboot', charger)}><FaPowerOff /></button></footer></article>; }) : <div className="cm-empty-state"><FaChargingStation /><strong>Tidak ada unit yang cocok</strong><p>Ubah pencarian atau filter status untuk melihat unit lain.</p></div>}</section>
            </div></main></div>
        {modal === 'form' && <div className="cm-modal-backdrop" onClick={() => setModal(null)}><section className="cm-modal-card" role="dialog" aria-modal="true" onClick={e => e.stopPropagation()}><header className="cm-modal-head"><div><p className="cm-eyebrow">INFORMASI TEKNIS</p><h2>{editingId ? 'Ubah informasi charger' : 'Tambah charger'}</h2></div><button aria-label="Tutup" onClick={() => setModal(null)}><FaTimes /></button></header><form className="cm-form" onSubmit={saveForm}><p className="cm-tarif-note">Status perangkat dikelola melalui aksi operasional di kartu charger atau halaman detail.</p><label>Kode perangkat<input maxLength="12" value={form.kode_perangkat} onChange={e => setForm({ ...form, kode_perangkat: e.target.value })} required /></label><label>Merek dan model<input value={form.merek_model} onChange={e => setForm({ ...form, merek_model: e.target.value })} placeholder="Contoh: ABB Terra 184" required /></label><label>Kapasitas total (kW)<input type="number" min="1" value={form.kap_tot_kw} onChange={e => setForm({ ...form, kap_tot_kw: Number(e.target.value) })} required /></label><footer><button type="button" className="cm-cancel-btn" onClick={() => setModal(null)}>Batal</button><button className="cm-primary-btn" disabled={submitting}>{submitting ? 'Menyimpan…' : 'Simpan informasi'}</button></footer></form></section></div>}
        {modal === 'tarif' && <div className="cm-modal-backdrop" onClick={() => setModal(null)}><section className="cm-modal-card" role="dialog" aria-modal="true" onClick={e => e.stopPropagation()}><header className="cm-modal-head"><div><p className="cm-eyebrow">TARIF STATION AKTIF</p><h2>Kelola tarif</h2></div><button aria-label="Tutup" onClick={() => setModal(null)}><FaTimes /></button></header><form className="cm-form" onSubmit={saveTarif}><p className="cm-tarif-note">Tarif berlaku untuk seluruh charger pada station aktif dan sesi baru berikutnya.</p><label>Harga per kWh (Rp)<input type="number" min="100" value={tarifForm.harga_per_kwh} onChange={e => setTarifForm({ ...tarifForm, harga_per_kwh: e.target.value })} required /></label><label>Biaya minimum (Rp)<input type="number" min="0" value={tarifForm.biaya_minimum} onChange={e => setTarifForm({ ...tarifForm, biaya_minimum: e.target.value })} required /></label><label>Biaya parkir per jam (Rp)<input type="number" min="0" value={tarifForm.biaya_parkir_pjam} onChange={e => setTarifForm({ ...tarifForm, biaya_parkir_pjam: e.target.value })} required /></label><footer><button type="button" className="cm-cancel-btn" onClick={() => setModal(null)}>Batal</button><button className="cm-primary-btn" disabled={submitting}>{submitting ? 'Menyimpan…' : 'Simpan tarif'}</button></footer></form></section></div>}
        {modal === 'alerts' && <div className="cm-modal-backdrop" onClick={() => setModal(null)}><section className="cm-modal-card" role="dialog" aria-modal="true" onClick={e => e.stopPropagation()}><header className="cm-modal-head"><div><p className="cm-eyebrow">PUSAT NOTIFIKASI</p><h2>Gangguan perangkat</h2></div><button aria-label="Tutup" onClick={() => setModal(null)}><FaTimes /></button></header><div className="cm-alert-list">{alerts.length ? alerts.map(alert => <article key={alert.id}><FaWrench /><div><strong>{alert.chargerCode || 'Unit charger'}</strong><p>{alert.message}</p><button className="cm-danger-btn" onClick={() => { setModal(null); setPendingAction({ type: 'reboot', id: alert.idCharger, target: alert.chargerCode || 'unit charger', label: 'Set maintenance' }); }}>Set maintenance</button></div></article>) : <div className="cm-empty-state"><FaCheckCircle /><strong>Tidak ada gangguan aktif</strong></div>}</div></section></div>}
        {modal === 'settings' && <OperatorSettingsModal user={user} onClose={() => setModal(null)} onLogout={onLogout} refreshInterval={refreshInterval} onRefreshIntervalChange={setRefreshInterval} onStationChange={() => load()} />}
        {pendingAction && <div className="cm-modal-backdrop"><section className="cm-confirm-card" role="alertdialog" aria-modal="true"><span><FaExclamationTriangle /></span><h2>{pendingAction.label}?</h2><p>Anda akan menjalankan tindakan pada <strong>{pendingAction.target}</strong>. Pastikan perangkat yang dipilih sudah benar.</p><footer><button className="cm-cancel-btn" disabled={submitting} onClick={() => setPendingAction(null)}>Batal</button><button className="cm-danger-btn" disabled={submitting} onClick={runAction}>{submitting ? 'Memproses…' : 'Ya, lanjutkan'}</button></footer></section></div>}
    </div>;
}
