import { useCallback, useEffect, useMemo, useState } from 'react';
import { FaBell, FaBolt, FaChargingStation, FaCog, FaEdit, FaExclamationTriangle, FaFileAlt, FaFilter, FaPlus, FaPlug, FaPowerOff, FaSearch, FaSignOutAlt, FaStop, FaSyncAlt, FaTachometerAlt, FaTimes, FaTrash, FaWrench, FaPlay, FaCheckCircle } from 'react-icons/fa';
import api from './api/client';
import OperatorStationPicker from './OperatorStationPicker';
import OperatorSettingsModal from './OperatorSettingsModal';
import './chargerMonitor.css';
import logoECH from './assets/Gemini_Generated_Image_8581rg8581rg8581.jfif.jpeg';
import { createCharger, updateCharger } from './api/operations';

const EMPTY_FORM = { kode_perangkat: '', merek_model: '', kap_tot_kw: 60, status_mesin: 'Active', alasan: '' };
const labelStatus = { Active: 'Aktif', Maintenance: 'Perawatan', Offline: 'Gangguan' };

/** Memformat nominal tarif agar mudah dipindai pada daftar jadwal. */
function rupiah(value) {
    return `Rp ${Number(value || 0).toLocaleString('id-ID')}`;
}

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
    const [actionReason, setActionReason] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const [notice, setNotice] = useState('');
    const [tarif, setTarif] = useState(null);
    const [tarifSchedules, setTarifSchedules] = useState([]);
    const [editingTarifId, setEditingTarifId] = useState(null);
    const [tarifForm, setTarifForm] = useState({ harga_per_kwh: '', biaya_minimum: '', biaya_parkir_flat: '', mode: 'immediate', effective_at: '' });
    const name = user?.profile?.nama_lengkap || user?.name || user?.email || '';

    const load = useCallback(async (silent = false) => {
        if (!silent) setLoading(true);
        setError('');
        try {
            const [chargerResponse, dashboardResponse, tarifResponse] = await Promise.all([api.get('/operator/chargers'), api.get('/operator/dashboard'), api.get('/operator/tarif')]);
            setChargers(chargerResponse.data.data || []);
            setAlerts(dashboardResponse.data.data?.criticalAlerts || []);
            setTarif(tarifResponse.data.data?.active || null);
            setTarifSchedules(tarifResponse.data.data?.scheduled || []);
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
        setForm(charger ? { kode_perangkat: charger.kode_perangkat || '', merek_model: charger.merek_model || '', kap_tot_kw: charger.kap_tot_kw || 60, status_mesin: charger.status_mesin || 'Active', alasan: '' } : EMPTY_FORM);
        setModal('form');
    };
    const saveForm = async event => {
        event.preventDefault(); setSubmitting(true);
        try {
            const payload = { ...form, alasan: form.alasan.trim() };
            if (editingId) await updateCharger(editingId, payload);
            else await createCharger(localStorage.getItem('ev_active_station_id'), payload);
            setNotice(editingId ? 'Data charger berhasil diperbarui.' : 'Charger baru berhasil ditambahkan.');
            setModal(null); await load(true);
        } catch (err) { setNotice(err.response?.data?.message || 'Data charger tidak dapat disimpan.'); } finally { setSubmitting(false); }
    };
    const runAction = async () => {
        if (!pendingAction) return; setSubmitting(true);
        try {
            const url = pendingAction.type === 'delete' ? `/operator/delchargers/${pendingAction.id}` : `/operator/charger/${pendingAction.id}/${pendingAction.type}`;
            const payload = pendingAction.reasonRequired ? { alasan: actionReason.trim() } : {};
            const response = pendingAction.type === 'delete' ? await api.delete(url) : await api.post(url, payload);
            setNotice(response.data.message || 'Perintah berhasil dikirim.'); setPendingAction(null); setActionReason(''); await load(true);
        } catch (err) { setNotice(err.response?.data?.message || 'Perintah tidak dapat dijalankan.'); } finally { setSubmitting(false); }
    };
    /** Meminta alasan sebelum tindakan yang menghentikan atau merawat unit. */
    const requestAction = (type, charger) => {
        setActionReason('');
        setPendingAction({ type, id: charger.id_charger, target: charger.kode_perangkat, reasonRequired: type !== 'delete', label: type === 'delete' ? 'Hapus unit charger' : type === 'stop' ? 'Nonaktifkan charger' : type === 'start' ? 'Aktifkan charger' : 'Set maintenance' });
    };
    /** Tarif selalu dikelola per station aktif, bukan per unit charger. */
    /** Mengisi formulir tarif dengan nilai aktif dan mode perubahan langsung. */
    const openTarif = () => { setEditingTarifId(null); setTarifForm({ harga_per_kwh: tarif?.harga_per_kwh || '', biaya_minimum: tarif?.biaya_minimum || '', biaya_parkir_flat: tarif?.biaya_parkir_flat || '', mode: 'immediate', effective_at: '' }); setModal('tarif'); };
    /** Menyimpan tarif langsung atau jadwal tarif dan menyegarkan data station. */
    const saveTarif = async event => { event.preventDefault(); setSubmitting(true); try { const payload = { harga_per_kwh: Number(tarifForm.harga_per_kwh), biaya_minimum: Number(tarifForm.biaya_minimum), biaya_parkir_flat: Number(tarifForm.biaya_parkir_flat), mode: tarifForm.mode, ...(tarifForm.mode === 'scheduled' ? { effective_at: tarifForm.effective_at } : {}) }; const response = editingTarifId ? await api.put(`/operator/tarif/${editingTarifId}`, { ...payload, mode: undefined }) : await api.post('/operator/tarif', payload); setNotice(response.data.message); setModal(null); setEditingTarifId(null); await load(true); } catch (err) { setNotice(err.response?.data?.message || 'Tarif tidak dapat disimpan.'); } finally { setSubmitting(false); } };
    /** Memuat jadwal terpilih agar Operator dapat mengubah nilai atau waktunya. */
    const editTariffSchedule = tariff => { const date = new Date(tariff.periode_mulai); date.setMinutes(date.getMinutes() - date.getTimezoneOffset()); setEditingTarifId(tariff.id_tarif); setTarifForm({ harga_per_kwh: String(tariff.harga_per_kwh), biaya_minimum: String(tariff.biaya_minimum), biaya_parkir_flat: String(tariff.biaya_parkir_flat), mode: 'scheduled', effective_at: date.toISOString().slice(0, 16) }); setModal('tarif'); };
    /** Membatalkan jadwal tarif yang belum berlaku. */
    const cancelTariffSchedule = async id => { setSubmitting(true); try { const response = await api.delete(`/operator/tarif/${id}`); setNotice(response.data.message); await load(true); } catch (err) { setNotice(err.response?.data?.message || 'Jadwal tarif tidak dapat dibatalkan.'); } finally { setSubmitting(false); } };

    return <div className="cm-layout-container">
        <header className="cm-header"><div className="cm-header-left"><img className="cm-logo" src={logoECH} alt="EV Charge Hub" /><div><p className="cm-eyebrow">PANEL OPERATOR</p><h2>Kelola charger{ name ? `, ${name.split(' ')[0]}` : ''}</h2></div></div><div className="cm-header-right"><OperatorStationPicker onStationChange={() => load()} /><button className="cm-icon-btn" aria-label="Lihat gangguan" onClick={() => setModal('alerts')}><FaBell />{alerts.length > 0 && <span className="cm-badge">{alerts.length}</span>}</button><button className="cm-icon-btn" aria-label="Pengaturan" onClick={() => setModal('settings')}><FaCog /></button></div></header>
        <div className="cm-body-wrapper"><aside className="cm-sidebar" aria-label="Navigasi Operator"><nav><button className="cm-menu-item" onClick={onNavigateToOpsDash}><FaTachometerAlt /><span>Dashboard</span></button><button className="cm-menu-item active" aria-current="page"><FaChargingStation /><span>Kelola charger</span></button><button className="cm-menu-item" onClick={onNavigateToOpsReport}><FaFileAlt /><span>Laporan transaksi</span></button><div className="cm-sidebar-exit"><button className="cm-logout-btn" onClick={onLogout}><FaSignOutAlt /><span>Keluar</span></button></div></nav></aside>
            <main className="cm-main-content"><div className="cm-container">
                <section className="cm-page-head"><div><p className="cm-eyebrow">INVENTARIS PERANGKAT</p><h1>Kelola charger</h1><p>Kelola status, kapasitas, dan konfigurasi setiap unit di stasiun Anda.</p></div><div className="cm-head-actions"><span>Disinkronkan {lastUpdated ? new Intl.DateTimeFormat('id-ID', { hour: '2-digit', minute: '2-digit' }).format(lastUpdated) : '—'}</span><button className="cm-refresh-btn" onClick={() => load()} disabled={loading}><FaSyncAlt className={loading ? 'fa-spin' : ''} />Segarkan</button><button className="cm-refresh-btn" onClick={openTarif}>Kelola tarif</button><button className="cm-add-btn" onClick={() => openForm()}><FaPlus />Tambah Charger</button></div></section>
                {error && <div className="cm-inline-state"><FaExclamationTriangle /><div><strong>Data tidak tersinkron</strong><p>{error}</p></div><button onClick={() => load()}>Coba lagi</button></div>}
                {notice && <div className="cm-toast" role="status">{notice}</div>}
                {alerts.length > 0 && <section className="cm-attention"><div><FaWrench /><span><strong>{alerts.length} gangguan perangkat perlu ditinjau</strong><small>Pastikan unit terkait sebelum mengubah statusnya.</small></span></div><button onClick={() => setModal('alerts')}>Lihat gangguan</button></section>}
                <section className="cm-summary" aria-label="Ringkasan status unit"><button className={statusFilter === 'ALL' ? 'active' : ''} onClick={() => setStatusFilter('ALL')}><span>Semua unit</span><strong>{chargers.length}</strong></button><button className={statusFilter === 'Active' ? 'active ready' : 'ready'} onClick={() => setStatusFilter('Active')}><span>Aktif</span><strong>{counts.Active || 0}</strong></button><button className={statusFilter === 'Maintenance' ? 'active warning' : 'warning'} onClick={() => setStatusFilter('Maintenance')}><span>Perawatan</span><strong>{counts.Maintenance || 0}</strong></button><button className={statusFilter === 'Offline' ? 'active danger' : 'danger'} onClick={() => setStatusFilter('Offline')}><span>Gangguan</span><strong>{counts.Offline || 0}</strong></button></section>
                <section className="cm-toolbar"><label className="cm-search"><FaSearch /><input value={query} onChange={event => setQuery(event.target.value)} placeholder="Cari kode atau model charger" aria-label="Cari charger" /></label><label className="cm-filter"><FaFilter /><select value={statusFilter} onChange={event => setStatusFilter(event.target.value)}><option value="ALL">Semua status</option><option value="Active">Aktif</option><option value="Maintenance">Perawatan</option><option value="Offline">Gangguan</option></select></label><span>{filteredChargers.length} unit ditampilkan</span></section>
                <section className="cm-grid">{loading && !lastUpdated ? <div className="cm-empty-state">Memuat daftar charger…</div> : filteredChargers.length ? filteredChargers.map(charger => { const status = charger.status_mesin || 'Offline'; return <article key={charger.id_charger} className={`cm-charger-card ${status.toLowerCase()}`}><header><div><span className={`cm-status-badge ${status.toLowerCase()}`}>{labelStatus[status] || status}</span><h2>{charger.kode_perangkat}</h2><p>{charger.merek_model || 'Model belum diisi'}</p></div><div className="cm-card-menu"><button aria-label={`Ubah ${charger.kode_perangkat}`} onClick={() => openForm(charger)}><FaEdit /></button><button className="delete" aria-label={`Hapus ${charger.kode_perangkat}`} onClick={() => requestAction('delete', charger)}><FaTrash /></button></div></header><div className="cm-card-specs"><span><FaBolt /><small>Kapasitas</small><strong>{charger.kap_tot_kw} kW</strong></span><span><FaPlug /><small>Port terdaftar</small><strong>{charger.total_ports ?? 0} port</strong></span></div><footer><button className="cm-detail-btn" onClick={() => onNavigateToDetail?.(charger)}><FaPlug />Lihat detail</button>{status === 'Active' ? <button className="cm-danger-btn" onClick={() => requestAction('stop', charger)}><FaStop />Nonaktifkan</button> : <button className="cm-primary-btn" onClick={() => requestAction('start', charger)}><FaPlay />Aktifkan</button>}<button className="cm-icon-action" aria-label={`Set maintenance ${charger.kode_perangkat}`} onClick={() => requestAction('reboot', charger)}><FaPowerOff /></button></footer></article>; }) : <div className="cm-empty-state"><FaChargingStation /><strong>Tidak ada unit yang cocok</strong><p>Ubah pencarian atau filter status untuk melihat unit lain.</p></div>}</section>
            </div></main></div>
        <nav className="cm-mobile-nav" aria-label="Navigasi Operator"><button onClick={onNavigateToOpsDash}><FaTachometerAlt /><span>Dashboard</span></button><button className="active" aria-current="page"><FaChargingStation /><span>Charger</span></button><button onClick={onNavigateToOpsReport}><FaFileAlt /><span>Laporan</span></button></nav>
        {modal === 'form' && <div className="cm-modal-backdrop" onClick={() => setModal(null)}><section className="cm-modal-card" role="dialog" aria-modal="true" onClick={e => e.stopPropagation()}><header className="cm-modal-head"><div><p className="cm-eyebrow">INFORMASI TEKNIS</p><h2>{editingId ? 'Ubah informasi charger' : 'Tambah charger'}</h2></div><button aria-label="Tutup" onClick={() => setModal(null)}><FaTimes /></button></header><form className="cm-form" onSubmit={saveForm}><p className="cm-tarif-note">Alasan wajib dicatat untuk penambahan atau perubahan spesifikasi. Status operasional diubah melalui aksi pada kartu.</p><label>Kode perangkat<input maxLength="12" value={form.kode_perangkat} onChange={e => setForm({ ...form, kode_perangkat: e.target.value })} required /></label><label>Merek dan model<input value={form.merek_model} onChange={e => setForm({ ...form, merek_model: e.target.value })} placeholder="Contoh: ABB Terra 184" required /></label><label>Kapasitas total (kW)<input type="number" min="1" value={form.kap_tot_kw} onChange={e => setForm({ ...form, kap_tot_kw: Number(e.target.value) })} required /></label><label>Alasan<input value={form.alasan} onChange={e => setForm({ ...form, alasan: e.target.value })} minLength={5} maxLength={500} required placeholder="Alasan pencatatan atau perubahan data" /></label><footer><button type="button" className="cm-cancel-btn" onClick={() => setModal(null)}>Batal</button><button className="cm-primary-btn" disabled={submitting || form.alasan.trim().length < 5}>{submitting ? 'Menyimpan…' : 'Simpan informasi'}</button></footer></form></section></div>}
        {modal === 'tarif' && <div className="cm-modal-backdrop" onClick={() => !submitting && setModal(null)}><section className="cm-modal-card" role="dialog" aria-modal="true" onClick={e => e.stopPropagation()}><header className="cm-modal-head"><div><p className="cm-eyebrow">TARIF STATION AKTIF</p><h2>{editingTarifId ? 'Ubah jadwal tarif' : 'Kelola tarif'}</h2></div><button aria-label="Tutup" onClick={() => setModal(null)}><FaTimes /></button></header><form className="cm-form" onSubmit={saveTarif}><p className="cm-tarif-note">Tarif baru berlaku untuk sesi yang dimulai setelah waktu berlakunya. Sesi aktif tetap memakai tarif saat dimulai.</p><label>Harga per kWh (Rp)<input type="number" min="100" value={tarifForm.harga_per_kwh} onChange={e => setTarifForm({ ...tarifForm, harga_per_kwh: e.target.value })} required /></label><label>Biaya minimum (opsional, default Rp0)<input type="number" min="0" value={tarifForm.biaya_minimum} onChange={e => setTarifForm({ ...tarifForm, biaya_minimum: e.target.value })} /></label><label>Biaya parkir flat per sesi (Rp)<input type="number" min="0" value={tarifForm.biaya_parkir_flat} onChange={e => setTarifForm({ ...tarifForm, biaya_parkir_flat: e.target.value })} required /></label>{!editingTarifId && <label>Waktu berlaku<select value={tarifForm.mode} onChange={e => setTarifForm({ ...tarifForm, mode: e.target.value })}><option value="immediate">Langsung</option><option value="scheduled">Terjadwal</option></select></label>}{tarifForm.mode === 'scheduled' && <label>Mulai berlaku<input type="datetime-local" value={tarifForm.effective_at} onChange={e => setTarifForm({ ...tarifForm, effective_at: e.target.value })} required /></label>}<footer><button type="button" className="cm-cancel-btn" onClick={() => { setModal(null); setEditingTarifId(null); }}>Batal</button><button className="cm-primary-btn" disabled={submitting}>{submitting ? 'Menyimpan…' : editingTarifId ? 'Simpan jadwal' : 'Simpan tarif'}</button></footer></form>{tarifSchedules.length > 0 && <div className="cm-scheduled-tariffs"><h3>Jadwal berikutnya</h3>{tarifSchedules.map(item => <article key={item.id_tarif}><span>{new Date(item.periode_mulai).toLocaleString('id-ID')} · {rupiah(item.harga_per_kwh)}/kWh · parkir flat {rupiah(item.biaya_parkir_flat)}</span><div><button type="button" onClick={() => editTariffSchedule(item)}>Ubah</button><button type="button" disabled={submitting} onClick={() => cancelTariffSchedule(item.id_tarif)}>Batalkan</button></div></article>)}</div>}</section></div>}
        {modal === 'alerts' && <div className="cm-modal-backdrop" onClick={() => setModal(null)}><section className="cm-modal-card" role="dialog" aria-modal="true" onClick={e => e.stopPropagation()}><header className="cm-modal-head"><div><p className="cm-eyebrow">PUSAT NOTIFIKASI</p><h2>Gangguan perangkat</h2></div><button aria-label="Tutup" onClick={() => setModal(null)}><FaTimes /></button></header><div className="cm-alert-list">{alerts.length ? alerts.map(alert => <article key={alert.id}><FaWrench /><div><strong>{alert.chargerCode || 'Unit charger'}</strong><p>{alert.message}</p><button className="cm-danger-btn" onClick={() => { setModal(null); setActionReason(''); setPendingAction({ type: 'reboot', id: alert.idCharger, target: alert.chargerCode || 'unit charger', reasonRequired: true, label: 'Set maintenance' }); }}>Set maintenance</button></div></article>) : <div className="cm-empty-state"><FaCheckCircle /><strong>Tidak ada gangguan aktif</strong></div>}</div></section></div>}
        {modal === 'settings' && <OperatorSettingsModal user={user} onClose={() => setModal(null)} onLogout={onLogout} refreshInterval={refreshInterval} onRefreshIntervalChange={setRefreshInterval} onStationChange={() => load()} />}
        {pendingAction && <div className="cm-modal-backdrop"><section className="cm-confirm-card" role="alertdialog" aria-modal="true"><span><FaExclamationTriangle /></span><h2>{pendingAction.label}?</h2><p>Anda akan menjalankan tindakan pada <strong>{pendingAction.target}</strong>. Pastikan perangkat yang dipilih sudah benar.</p>{pendingAction.reasonRequired && <label className="cm-reason-field">Alasan tindakan<textarea value={actionReason} onChange={event => setActionReason(event.target.value)} minLength={5} maxLength={500} required placeholder="Jelaskan alasan unit perlu dihentikan atau dirawat" /></label>}<footer><button className="cm-cancel-btn" disabled={submitting} onClick={() => setPendingAction(null)}>Batal</button><button className="cm-danger-btn" disabled={submitting || (pendingAction.reasonRequired && actionReason.trim().length < 5)} onClick={runAction}>{submitting ? 'Memproses…' : 'Ya, lanjutkan'}</button></footer></section></div>}
    </div>;
}
