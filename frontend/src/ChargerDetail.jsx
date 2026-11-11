import React, { useState, useEffect } from 'react';
import { 
    FaBell, FaCog, FaTachometerAlt, FaChargingStation, FaPlug,
    FaFileAlt, FaUser, FaSignOutAlt, FaSyncAlt, FaBolt, 
    FaArrowLeft, FaTag, FaShieldAlt, FaParking, FaCalendarAlt,
    FaPowerOff, FaPlay, FaStop, FaPlus, FaEdit, FaTrash, FaTimes,
    FaWrench, FaReceipt, FaCheck, FaCheckCircle, FaExclamationTriangle
} from 'react-icons/fa';
import axios from 'axios';
import { getStoredToken } from './api/auth';
import './chargerMonitor.css'; // Menggunakan stylesheet utama
import logoECH from './assets/Gemini_Generated_Image_8581rg8581rg8581.jfif.jpeg';

function getGreeting() {
    const h = new Date().getHours();
    if (h >= 4 && h < 10) return 'Selamat pagi';
    if (h >= 10 && h < 15) return 'Selamat siang';
    if (h >= 15 && h < 18) return 'Selamat sore';
    return 'Selamat malam';
}

export default function ChargerDetail({ 
    user, 
    charger, 
    onBack, 
    onLogout, 
    onNavigateToOpsDash, 
    onNavigateToCharger, 
    onNavigateToOpsReport, 
    onNavigateToOpsProfil 
}) {
    const chargerId = charger?.id_charger || charger?.id;
    
    const [detailData, setDetailData] = useState(null);
    const [loading, setLoading] = useState(true);

    // Modal Form Port (Tambah / Edit)
    const [showPortModal, setShowPortModal] = useState(false);
    const [isEditingPort, setIsEditingPort] = useState(false);
    const [currentPortId, setCurrentPortId] = useState(null);
    const [portForm, setPortForm] = useState({
        id_charger: chargerId,
        nomor_port: 'Port 1',
        tipe_konektor: 'CCS2',
        tipe_charging: 'DC',
        daya_maks_kw: 50,
        status_port: 'Available'
    });

    // Modal Ubah Tarif Stasiun (FR26: Operator & Admin memiliki wewenang final ubah tarif)
    const [showTarifModal, setShowTarifModal] = useState(false);
    const [tarifForm, setTarifForm] = useState({
        harga_per_kwh: '',
        biaya_minimum: '',
        biaya_parkir_pjam: '',
    });

    // STATE LENGKAP UNTUK OVERLAY NOTIFIKASI & PENGATURAN
    const [showNotifModal, setShowNotifModal] = useState(false);
    const [showSettingsModal, setShowSettingsModal] = useState(false);
    const [notifTab, setNotifTab] = useState('malfunction'); // 'malfunction' | 'transaction'
    const [criticalAlerts, setCriticalAlerts] = useState([]);
    const [transactionAlerts, setTransactionAlerts] = useState([]);
    const [processingId, setProcessingId] = useState(null);

    // State Pengaturan
    const [soundAlert, setSoundAlert] = useState(true);
    const [autoRefreshInterval, setAutoRefreshInterval] = useState(30);

    const nameString = typeof user === 'string' 
        ? user 
        : (user?.profile?.nama_lengkap || user?.name || user?.email || '');
    const firstName = (!nameString || nameString === 'Petugas') ? '' : nameString.split(' ')[0];

    const formatRp = (val) => (!val && val !== 0 ? 'Rp 0' : `Rp ${Number(val).toLocaleString('id-ID')}`);
    const formatDate = (val) => (!val ? '-' : new Date(val).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }));

    // Ambil Data Lengkap Charger, Tarif, Port, dan Notifikasi
    const fetchDetail = async () => {
        if (!chargerId) return;
        setLoading(true);
        try {
            const token = getStoredToken();
            const headers = { Authorization: `Bearer ${token}` };

            // 1. Ambil detail charger & tarif
            const res = await axios.get(`http://127.0.0.1:8000/api/operator/chargers/${chargerId}`, { headers });
            setDetailData(res.data.data);

            // 2. Ambil data notifikasi aktif stasiun
            const resNotif = await axios.get('http://127.0.0.1:8000/api/operator/dashboard', { headers });
            if (resNotif.data?.data) {
                setCriticalAlerts(resNotif.data.data.criticalAlerts || []);
                setTransactionAlerts([
                    { id: 1, kode: 'TRX-8821', user: 'Driver B 1234 XYZ', desc: 'Gagal verifikasi saldo e-wallet.', time: 'Baru saja' }
                ]);
            }
        } catch (err) {
            console.error("Gagal load detail charger & tarif:", err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchDetail();
    }, [chargerId]);

    // Aksi: Terima Malfungsi Mesin -> Alihkan ke Maintenance
    const handleAcceptMalfunction = async (alertItem) => {
        const targetChargerId = alertItem.id_charger || alertItem.id;
        const kode = alertItem.kode_perangkat || alertItem.message?.split(':')[0] || 'Unit Mesin';

        if (!window.confirm(`Konfirmasi penanganan: Status ${kode} akan otomatis dialihkan ke MAINTENANCE?`)) return;

        setProcessingId(alertItem.id);
        try {
            const token = getStoredToken();
            await axios.post(`http://127.0.0.1:8000/api/operator/charger/${targetChargerId}/reboot`, {}, {
                headers: { Authorization: `Bearer ${token}` }
            });

            alert(`Laporan diterima. Status ${kode} dialihkan ke Maintenance.`);
            fetchDetail();
        } catch (err) {
            alert(`Gagal memproses penanganan: ${err.response?.data?.message || err.message}`);
        } finally {
            setProcessingId(null);
        }
    };

    // Remote Control Mesin Utama
    const handleRemoteControl = async (action) => {
        if (!window.confirm(`Kirim perintah ${action} untuk mesin ${activeCharger.kode_perangkat}?`)) return;
        try {
            const token = getStoredToken();
            const headers = { Authorization: `Bearer ${token}` };
            if (action === 'START') {
                await axios.post(`http://127.0.0.1:8000/api/operator/charger/${chargerId}/start`, {}, { headers });
            } else if (action === 'STOP') {
                await axios.post(`http://127.0.0.1:8000/api/operator/charger/${chargerId}/stop`, {}, { headers });
            } else if (action === 'REBOOT') {
                await axios.post(`http://127.0.0.1:8000/api/operator/charger/${chargerId}/reboot`, {}, { headers });
            }
            alert(`Perintah ${action} berhasil dikirim!`);
            fetchDetail();
        } catch (err) {
            alert(`Gagal: ${err.response?.data?.message || err.message}`);
        }
    };

    // Aksi Tombol Start/Stop pada Port
    const handleTogglePortStatus = async (port) => {
        const isAvailable = (port.status_port || '').toLowerCase() === 'available';
        const action = isAvailable ? 'STOP' : 'START';
        const targetStatus = isAvailable ? 'Out of Order' : 'Available';

        if (!window.confirm(`Ubah status port ${port.nomor_port || ''} menjadi ${targetStatus}?`)) return;

        try {
            const token = getStoredToken();
            if (action === 'STOP') {
                await axios.post(`http://127.0.0.1:8000/api/operator/port/${port.id_port}/stop`, {}, {
                    headers: { Authorization: `Bearer ${token}` }
                });
            } else {
                await axios.post(`http://127.0.0.1:8000/api/operator/port/${port.id_port}/start`, {}, {
                    headers: { Authorization: `Bearer ${token}` }
                });
            }
            fetchDetail();
        } catch (err) {
            alert(`Gagal mengubah status port: ${err.response?.data?.message || err.message}`);
        }
    };

    // Aksi Reboot Port
    const handleRebootPort = async (portId, portLabel) => {
        if (!window.confirm(`Reboot ${portLabel}?`)) return;
        try {
            const token = getStoredToken();
            await axios.post(`http://127.0.0.1:8000/api/operator/port/${portId}/reboot`, {}, {
                headers: { Authorization: `Bearer ${token}` }
            });
            alert(`Port berhasil direboot.`);
            fetchDetail();
        } catch (err) {
            alert(`Gagal reboot port: ${err.response?.data?.message || err.message}`);
        }
    };

    // Modal Ubah Tarif Stasiun (FR26)
    const handleOpenEditTarif = () => {
        setTarifForm({
            harga_per_kwh: activeTarif?.harga_per_kwh || 2466,
            biaya_minimum: activeTarif?.biaya_minimum || 15000,
            biaya_parkir_pjam: activeTarif?.biaya_parkir_pjam || 5000,
        });
        setShowTarifModal(true);
    };

    const handleTarifSubmit = async (e) => {
        e.preventDefault();
        try {
            const token = getStoredToken();
            const idLoc = activeCharger.id_location;
            await axios.post(`http://127.0.0.1:8000/api/operations/stations/${idLoc}/tarifs`, {
                harga_per_kwh: Number(tarifForm.harga_per_kwh),
                biaya_minimum: Number(tarifForm.biaya_minimum),
                biaya_parkir_pjam: Number(tarifForm.biaya_parkir_pjam),
            }, {
                headers: { Authorization: `Bearer ${token}` }
            });
            alert('Tarif stasiun berhasil diperbarui.');
            setShowTarifModal(false);
            fetchDetail();
        } catch (err) {
            alert(`Gagal menyimpan tarif: ${err.response?.data?.message || err.message}`);
        }
    };

    // Modal Tambah Port
    const handleOpenAddPort = () => {
        setIsEditingPort(false);
        setCurrentPortId(null);
        setPortForm({
            id_charger: chargerId,
            nomor_port: `Port ${(activePorts.length || 0) + 1}`,
            tipe_konektor: 'CCS2',
            tipe_charging: 'DC',
            daya_maks_kw: 50,
            status_port: 'Available'
        });
        setShowPortModal(true);
    };

    // Modal Edit Port
    const handleOpenEditPort = (port) => {
        setIsEditingPort(true);
        setCurrentPortId(port.id_port);
        setPortForm({
            id_charger: chargerId,
            nomor_port: port.nomor_port || `Port ${port.id_port}`,
            tipe_konektor: port.tipe_konektor || 'CCS2',
            tipe_charging: port.tipe_charging || port.mode_daya || 'DC',
            daya_maks_kw: port.daya_maks_kw || port.daya_maksimal || 50,
            status_port: port.status_port || 'Available'
        });
        setShowPortModal(true);
    };

    const handlePortSubmit = async (e) => {
        e.preventDefault();
        try {
            const token = getStoredToken();
            const headers = { Authorization: `Bearer ${token}` };
            if (isEditingPort) {
                await axios.put(`http://127.0.0.1:8000/api/operator/ports/${currentPortId}`, portForm, { headers });
                alert("Data port berhasil diperbarui!");
            } else {
                await axios.post(`http://127.0.0.1:8000/api/operator/storeports`, portForm, { headers });
                alert("Port baru berhasil ditambahkan!");
            }
            setShowPortModal(false);
            fetchDetail();
        } catch (err) {
            alert(`Gagal menyimpan port: ${err.response?.data?.message || err.message}`);
        }
    };

    const handleDeletePort = async (portId, portLabel) => {
        if (!window.confirm(`Hapus ${portLabel}?`)) return;
        try {
            const token = getStoredToken();
            await axios.delete(`http://127.0.0.1:8000/api/operator/delports/${portId}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            alert("Port berhasil dihapus.");
            fetchDetail();
        } catch (err) {
            alert(`Gagal menghapus port: ${err.response?.data?.message || err.message}`);
        }
    };

    const activeCharger = detailData?.charger || charger || {};
    const activeTarif = detailData?.tarif;
    const activePorts = detailData?.ports || [];
    const statusClass = (activeCharger.status_mesin || 'Active').toLowerCase();
    const totalUnreadNotif = criticalAlerts.length + transactionAlerts.length;

    return (
        <div className="cm-layout-container">
            {/* --- HEADER --- */}
            <header className="cm-header">
                <div className="cm-header-left">
                    <div className="cm-logo-box">
                        <img src={logoECH} alt="EV Charge Hub Logo"/>
                    </div>
                    <div className="cm-welcome-text">
                        <h2>{getGreeting()}, Petugas {firstName}</h2>
                        <p>Panel Monitoring & Manajemen Unit Charger SPKLU</p>
                    </div>
                </div>

                {/* TOMBOL NOTIFIKASI & PENGATURAN DI HEADER */}
                <div className="cm-header-right">
                    <button 
                        className="cm-icon-btn" 
                        title="Pemberitahuan Sistem"
                        onClick={() => setShowNotifModal(true)}
                    >
                        <FaBell />
                        {totalUnreadNotif > 0 && <span className="cm-badge">{totalUnreadNotif}</span>}
                    </button>
                    <button 
                        className="cm-icon-btn" 
                        title="Pengaturan" 
                        onClick={() => setShowSettingsModal(true)}
                    >
                        <FaCog />
                    </button>
                </div>
            </header>

            {/* --- BODY WRAPPER --- */}
            <div className="cm-body-wrapper">
                {/* --- SIDEBAR --- */}
                <aside className="cm-sidebar">
                    <ul className="cm-menu-list">
                        <li className="cm-menu-item" onClick={onNavigateToOpsDash}>
                            <FaTachometerAlt className="cm-menu-icon" /><span>Dashboard</span>
                        </li>
                        <li className="cm-menu-item active" onClick={onNavigateToCharger || onBack}>
                            <FaChargingStation className="cm-menu-icon" /><span>Manage Charger</span>
                        </li>
                        <li className="cm-menu-item" onClick={onNavigateToOpsReport}>
                            <FaFileAlt className="cm-menu-icon" /><span>Transaction Report</span>
                        </li>
                        <li className="cm-menu-item" onClick={onNavigateToOpsProfil}>
                            <FaUser className="cm-menu-icon" /><span>Profil</span>
                        </li>
                    </ul>
                    <div className="cm-sidebar-footer">
                        <button className="cm-logout-btn" onClick={onLogout}><FaSignOutAlt /> <span>Keluar</span></button>
                    </div>
                </aside>

                {/* --- MAIN CONTENT --- */}
                <main className="cm-main-content">
                    <div className="cm-container">
                        
                        {/* Tombol Kembali ke Daftar Charger */}
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <button 
                                className="cm-btn" 
                                style={{ background: '#ffffff', color: '#1b5e20', border: '1px solid #c8e6c9', maxWidth: '240px' }} 
                                onClick={onBack}
                            >
                                <FaArrowLeft /> Kembali ke Daftar Charger
                            </button>
                            <span style={{ fontSize: '0.9rem', color: '#4e8550' }}>
                                Unit: <strong>{activeCharger.kode_perangkat}</strong>
                            </span>
                        </div>

                        {/* 1. HERO CARD: DETAIL MESIN & TARIF */}
                        <div className={`cm-port-card status-${statusClass}`}>
                            <div className="cm-port-header">
                                <div>
                                    <h2 style={{ margin: 0, color: '#1b5e20', fontSize: '1.4rem' }}>{activeCharger.kode_perangkat}</h2>
                                    <span className="cm-port-type">
                                        {activeCharger.merek_model} • Lokasi #LOC-{activeCharger.id_location || '1'}
                                    </span>
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <span className={`cm-status-badge ${statusClass}`}>{activeCharger.status_mesin || 'Active'}</span>
                                    {activeCharger.status_mesin === 'Active' ? (
                                        <button className="cm-btn stop" style={{ padding: '6px 12px' }} onClick={() => handleRemoteControl('STOP')}>
                                            <FaStop /> Stop
                                        </button>
                                    ) : (
                                        <button className="cm-btn start" style={{ padding: '6px 12px' }} onClick={() => handleRemoteControl('START')}>
                                            <FaPlay /> Start
                                        </button>
                                    )}
                                    <button className="cm-btn reboot" style={{ padding: '6px 12px' }} onClick={() => handleRemoteControl('REBOOT')}>
                                        <FaPowerOff /> Reboot
                                    </button>
                                </div>
                            </div>

                            {/* Grid Rincian Tarif & Kapasitas */}
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px' }}>
                                <div className="cm-metric-item" style={{ background: '#f9fafb', padding: '12px', borderRadius: '8px', border: '1px solid #e0e0e0' }}>
                                    <span className="cm-metric-label"><FaBolt style={{ color: '#d97706' }} /> Kapasitas Total</span>
                                    <span className="cm-metric-val" style={{ fontSize: '1.1rem' }}>{activeCharger.kap_tot_kw} kW</span>
                                </div>

                                <div className="cm-metric-item" style={{ background: '#f9fafb', padding: '12px', borderRadius: '8px', border: '1px solid #e0e0e0' }}>
                                    <span className="cm-metric-label"><FaTag style={{ color: '#059669' }} /> Tarif Daya Listrik</span>
                                    <span className="cm-metric-val" style={{ fontSize: '1.1rem', color: '#059669' }}>
                                        {activeTarif ? `${formatRp(activeTarif.harga_per_kwh)} / kWh` : 'Rp 2.466 / kWh'}
                                    </span>
                                </div>

                                <div className="cm-metric-item" style={{ background: '#f9fafb', padding: '12px', borderRadius: '8px', border: '1px solid #e0e0e0' }}>
                                    <span className="cm-metric-label"><FaShieldAlt style={{ color: '#0284c7' }} /> Biaya Minimum</span>
                                    <span className="cm-metric-val" style={{ fontSize: '1.1rem' }}>
                                        {activeTarif ? formatRp(activeTarif.biaya_minimum) : 'Rp 15.000'}
                                    </span>
                                </div>

                                <div className="cm-metric-item" style={{ background: '#f9fafb', padding: '12px', borderRadius: '8px', border: '1px solid #e0e0e0' }}>
                                    <span className="cm-metric-label"><FaParking style={{ color: '#7c3aed' }} /> Tarif Parkir Stasiun</span>
                                    <span className="cm-metric-val" style={{ fontSize: '1.1rem' }}>
                                        {activeTarif ? `${formatRp(activeTarif.biaya_parkir_pjam)} / jam` : 'Rp 5.000 / jam'}
                                    </span>
                                </div>
                            </div>

                            {activeTarif && (
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.85rem', color: '#1b5e20', background: '#f1f8f2', padding: '8px 12px', borderRadius: '6px' }}>
                                    <div>
                                        <FaCalendarAlt /> Periode Tarif Aktif: <strong>{formatDate(activeTarif.periode_mulai)} s/d {formatDate(activeTarif.periode_berakhir)}</strong>
                                    </div>
                                    <button 
                                        className="cm-btn" 
                                        type="button"
                                        style={{ background: '#1b5e20', color: '#fff', padding: '4px 10px', fontSize: '0.8rem', width: 'auto' }}
                                        onClick={handleOpenEditTarif}
                                    >
                                        <FaEdit /> Ubah Tarif Stasiun
                                    </button>
                                </div>
                            )}
                        </div>

                        {/* 2. DAFTAR CARD PORT NOZZLE */}
                        <div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
                                <div>
                                    <h3 style={{ margin: 0, color: '#1b5e20', fontSize: '1.25rem' }}>
                                        Daftar Port Nozzle ({activePorts.length})
                                    </h3>
                                    <p style={{ margin: '2px 0 0 0', color: '#4e8550', fontSize: '0.85rem' }}>
                                        Konektor fisik yang terpasang pada unit {activeCharger.kode_perangkat}
                                    </p>
                                </div>
                                <button className="cm-add-btn" onClick={handleOpenAddPort}>
                                    <FaPlus /> Tambah Port Baru
                                </button>
                            </div>

                            {/* GRID KARTU PORT */}
                            <div className="cm-grid">
                                {activePorts.length > 0 ? (
                                    activePorts.map((port, idx) => {
                                        const rawName = port.nomor_port || `${idx + 1}`;
                                        const portTitle = String(rawName).toLowerCase().startsWith('port') 
                                            ? rawName 
                                            : `Port ${rawName}`;

                                        const portMode = port.tipe_charging || port.mode_daya || 'DC';
                                        const portPower = port.daya_maks_kw || port.daya_maksimal || '50';

                                        const pStatus = (port.status_port || 'Available').toLowerCase();
                                        const statusClass = pStatus.replace(/\s+/g, '-');
                                        const isAvailable = pStatus === 'available';

                                        return (
                                            <div key={port.id_port || idx} className={`cm-port-card status-${statusClass}`}>
                                                <div className="cm-port-header">
                                                    <div>
                                                        <h3>{portTitle}</h3>
                                                        <span className="cm-port-type">{port.tipe_konektor}</span>
                                                    </div>
                                                    <div className="cm-header-badges">
                                                        <span className={`cm-status-badge ${statusClass}`}>
                                                            {port.status_port || 'Available'}
                                                        </span>
                                                        <div className="cm-crud-icons">
                                                            <FaEdit title="Ubah Port" onClick={() => handleOpenEditPort(port)} />
                                                            <FaTrash title="Hapus Port" onClick={() => handleDeletePort(port.id_port, portTitle)} />
                                                        </div>
                                                    </div>
                                                </div>

                                                <div className="cm-metrics-grid">
                                                    <div className="cm-metric-item">
                                                        <span className="cm-metric-label"><FaBolt /> Mode Daya</span>
                                                        <span className="cm-metric-val">{portMode}</span>
                                                    </div>
                                                    <div className="cm-metric-item">
                                                        <span className="cm-metric-label"><FaPlug /> Output Max</span>
                                                        <span className="cm-metric-val">{portPower} kW</span>
                                                    </div>
                                                </div>

                                                <div className="cm-port-actions">
                                                    {isAvailable ? (
                                                        <button 
                                                            className="cm-btn stop" 
                                                            onClick={() => handleTogglePortStatus(port)}
                                                        >
                                                            <FaStop /> Stop
                                                        </button>
                                                    ) : (
                                                        <button 
                                                            className="cm-btn start" 
                                                            onClick={() => handleTogglePortStatus(port)}
                                                        >
                                                            <FaPlay /> Start
                                                        </button>
                                                    )}
                                                    <button 
                                                        className="cm-btn reboot" 
                                                        onClick={() => handleRebootPort(port.id_port, portTitle)}
                                                    >
                                                        <FaPowerOff /> Reboot
                                                    </button>
                                                </div>
                                            </div>
                                        );
                                    })
                                ) : (
                                    <div className="cm-empty-state">
                                        <p>{loading ? 'Mengambil data port dari server...' : 'Belum ada port nozzle yang dipasang pada charger ini.'}</p>
                                    </div>
                                )}
                            </div>
                        </div>

                    </div>
                </main>
            </div>

            {/* --- MODAL FORM TAMBAH / EDIT PORT --- */}
            {showPortModal && (
                <div className="cm-modal-overlay">
                    <div className="cm-modal-card">
                        <div className="cm-modal-header">
                            <h3>{isEditingPort ? 'Ubah Konfigurasi Port Nozzle' : 'Tambah Port Nozzle Baru'}</h3>
                            <button className="cm-close-modal" onClick={() => setShowPortModal(false)}><FaTimes /></button>
                        </div>
                        <form onSubmit={handlePortSubmit} className="cm-form">
                            <div className="cm-form-group">
                                <label>Nomor / Nama Port</label>
                                <input 
                                    type="text" 
                                    value={portForm.nomor_port} 
                                    onChange={(e) => setPortForm({...portForm, nomor_port: e.target.value})} 
                                    required 
                                />
                            </div>
                            <div className="cm-form-row">
                                <div className="cm-form-group">
                                    <label>Tipe Konektor</label>
                                    <select 
                                        value={portForm.tipe_konektor} 
                                        onChange={(e) => setPortForm({...portForm, tipe_konektor: e.target.value})}
                                    >
                                        <option value="CCS2">CCS2</option>
                                        <option value="Type 2">Type 2</option>
                                        <option value="CHAdeMO">CHAdeMO</option>
                                        <option value="GB/T">GB/T</option>
                                    </select>
                                </div>
                                <div className="cm-form-group">
                                    <label>Tipe Charging (Mode Daya)</label>
                                    <select 
                                        value={portForm.tipe_charging} 
                                        onChange={(e) => setPortForm({...portForm, tipe_charging: e.target.value})}
                                    >
                                        <option value="DC">DC (Fast Charging)</option>
                                        <option value="AC">AC (Normal Charging)</option>
                                    </select>
                                </div>
                            </div>
                            <div className="cm-form-row">
                                <div className="cm-form-group">
                                    <label>Daya Maksimal (kW)</label>
                                    <input 
                                        type="number" 
                                        step="0.1"
                                        value={portForm.daya_maks_kw} 
                                        onChange={(e) => setPortForm({...portForm, daya_maks_kw: parseFloat(e.target.value) || 0})} 
                                        required 
                                    />
                                </div>
                                <div className="cm-form-group">
                                    <label>Status Port</label>
                                    <select 
                                        value={portForm.status_port} 
                                        onChange={(e) => setPortForm({...portForm, status_port: e.target.value})}
                                    >
                                        <option value="Available">Available</option>
                                        <option value="Charging">Charging</option>
                                        <option value="Maintenance">Maintenance</option>
                                        <option value="Out of Order">Out of Order</option>
                                    </select>
                                </div>
                            </div>
                            <div className="cm-modal-actions">
                                <button type="button" className="cm-btn-secondary" onClick={() => setShowPortModal(false)}>Batal</button>
                                <button type="submit" className="cm-btn-primary">{isEditingPort ? 'Simpan Perubahan' : 'Tambah Port'}</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* --- MODAL FORM UBAH TARIF STASIUN (FR26) --- */}
            {showTarifModal && (
                <div className="cm-modal-overlay">
                    <div className="cm-modal-card">
                        <div className="cm-modal-header">
                            <h3>Ubah Tarif Stasiun SPKLU</h3>
                            <button className="cm-close-modal" onClick={() => setShowTarifModal(false)}><FaTimes /></button>
                        </div>
                        <form onSubmit={handleTarifSubmit} className="cm-form">
                            <div className="cm-form-group">
                                <label>Tarif Daya Listrik (Rp / kWh)</label>
                                <input 
                                    type="number" 
                                    value={tarifForm.harga_per_kwh} 
                                    onChange={(e) => setTarifForm({...tarifForm, harga_per_kwh: e.target.value})} 
                                    required 
                                    min="100"
                                />
                            </div>
                            <div className="cm-form-row">
                                <div className="cm-form-group">
                                    <label>Biaya Minimum (Rp)</label>
                                    <input 
                                        type="number" 
                                        value={tarifForm.biaya_minimum} 
                                        onChange={(e) => setTarifForm({...tarifForm, biaya_minimum: e.target.value})} 
                                        required 
                                        min="0"
                                    />
                                </div>
                                <div className="cm-form-group">
                                    <label>Tarif Parkir (Rp / jam)</label>
                                    <input 
                                        type="number" 
                                        value={tarifForm.biaya_parkir_pjam} 
                                        onChange={(e) => setTarifForm({...tarifForm, biaya_parkir_pjam: e.target.value})} 
                                        required 
                                        min="0"
                                    />
                                </div>
                            </div>
                            <p style={{ fontSize: '0.82rem', color: '#6b7280', margin: '4px 0 12px' }}>
                                Sesuai PRD, operator dan admin memiliki wewenang final untuk memperbarui tarif stasiun.
                            </p>
                            <div className="cm-modal-actions">
                                <button type="button" className="cm-btn-secondary" onClick={() => setShowTarifModal(false)}>Batal</button>
                                <button type="submit" className="cm-btn-primary">Simpan Tarif Baru</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* ========================================================
                1. OVERLAY NOTIFIKASI POP-UP (PREFIX CM)
               ======================================================== */}
            {showNotifModal && (
                <div className="cm-modal-backdrop" onClick={() => setShowNotifModal(false)}>
                    <div className="cm-modal-dialog" onClick={(e) => e.stopPropagation()}>
                        
                        <div className="cm-modal-head">
                            <div>
                                <h3>Pusat Pemberitahuan Stasiun</h3>
                                <p>Monitoring malfungsi unit charger & anomali transaksi</p>
                            </div>
                            <button className="cm-modal-close" onClick={() => setShowNotifModal(false)}>
                                <FaTimes />
                            </button>
                        </div>

                        {/* 2 Tab Notifikasi */}
                        <div className="cm-notif-tabs">
                            <button 
                                className={`cm-tab-btn ${notifTab === 'malfunction' ? 'active' : ''}`}
                                onClick={() => setNotifTab('malfunction')}
                            >
                                <FaExclamationTriangle /> Malfungsi Mesin ({criticalAlerts.length})
                            </button>
                            <button 
                                className={`cm-tab-btn ${notifTab === 'transaction' ? 'active' : ''}`}
                                onClick={() => setNotifTab('transaction')}
                            >
                                <FaReceipt /> Gangguan Transaksi ({transactionAlerts.length})
                            </button>
                        </div>

                        <div className="cm-modal-body">
                            {/* TAB 1: MALFUNGSI MESIN */}
                            {notifTab === 'malfunction' && (
                                <div className="cm-notif-list">
                                    {criticalAlerts.length > 0 ? (
                                        criticalAlerts.map((alert) => (
                                            <div key={alert.id} className="cm-notif-card danger">
                                                <div className="cm-notif-title-line">
                                                    <span className="cm-notif-badge-danger">
                                                        <FaWrench /> Peringatan Sistem
                                                    </span>
                                                    <span className="cm-notif-time">Aktif Saat Ini</span>
                                                </div>
                                                <p className="cm-notif-text">{alert.message}</p>

                                                <div className="cm-notif-footer-actions">
                                                    <button 
                                                        className="cm-btn-action-maintenance"
                                                        onClick={() => handleAcceptMalfunction(alert)}
                                                        disabled={processingId === alert.id}
                                                    >
                                                        <FaCheck /> {processingId === alert.id ? 'Memproses...' : 'Terima & Set Maintenance'}
                                                    </button>
                                                </div>
                                            </div>
                                        ))
                                    ) : (
                                        <div className="cm-notif-empty">
                                            <FaCheckCircle size={30} style={{ color: '#059669', marginBottom: '8px' }} />
                                            <p>Semua unit mesin charger beroperasi normal.</p>
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* TAB 2: GANGGUAN TRANSAKSI */}
                            {notifTab === 'transaction' && (
                                <div className="cm-notif-list">
                                    {transactionAlerts.length > 0 ? (
                                        transactionAlerts.map((trx) => (
                                            <div key={trx.id} className="cm-notif-card warning">
                                                <div className="cm-notif-title-line">
                                                    <span className="cm-notif-badge-warning">
                                                        <FaReceipt /> {trx.kode || 'TRX-ERROR'}
                                                    </span>
                                                    <span className="cm-notif-time">{trx.time || 'Hari ini'}</span>
                                                </div>
                                                <p className="cm-notif-text">
                                                    <strong>{trx.user}</strong>: {trx.desc}
                                                </p>
                                                <span className="cm-info-note">
                                                    *Informasi saja: driver diarahkan mencoba metode bayar lain.
                                                </span>
                                            </div>
                                        ))
                                    ) : (
                                        <div className="cm-notif-empty">
                                            <FaCheckCircle size={30} style={{ color: '#059669', marginBottom: '8px' }} />
                                            <p>Tidak ada gangguan transaksi yang tercatat.</p>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* ========================================================
                2. OVERLAY PENGATURAN PANEL OPERATOR (PREFIX CM)
               ======================================================== */}
            {showSettingsModal && (
                <div className="cm-modal-backdrop" onClick={() => setShowSettingsModal(false)}>
                    <div className="cm-modal-dialog settings-box" onClick={(e) => e.stopPropagation()}>
                        <div className="cm-modal-head">
                            <div>
                                <h3>Pengaturan Panel Operator</h3>
                                <p>Preferensi notifikasi dan telemetri stasiun</p>
                            </div>
                            <button className="cm-modal-close" onClick={() => setShowSettingsModal(false)}>
                                <FaTimes />
                            </button>
                        </div>

                        <div className="cm-modal-body">
                            <div className="cm-setting-item">
                                <div>
                                    <strong>Suara Alarm Gangguan</strong>
                                    <p>Bunyikan alarm browser saat terdeteksi malfungsi unit mesin</p>
                                </div>
                                <input 
                                    type="checkbox" 
                                    checked={soundAlert} 
                                    onChange={(e) => setSoundAlert(e.target.checked)} 
                                />
                            </div>

                            <div className="cm-setting-item">
                                <div>
                                    <strong>Auto-Refresh Data</strong>
                                    <p>Interval sinkronisasi data telemetri otomatis</p>
                                </div>
                                <select 
                                    value={autoRefreshInterval} 
                                    onChange={(e) => setAutoRefreshInterval(Number(e.target.value))}
                                >
                                    <option value={15}>Setiap 15 Detik</option>
                                    <option value={30}>Setiap 30 Detik</option>
                                    <option value={60}>Setiap 1 Menit</option>
                                </select>
                            </div>

                            <div style={{ marginTop: '20px', display: 'flex', justifyContent: 'flex-end' }}>
                                <button 
                                    className="cm-btn-action-maintenance" 
                                    style={{ background: '#1b5e20' }}
                                    onClick={() => {
                                        alert("Pengaturan preferensi berhasil disimpan.");
                                        setShowSettingsModal(false);
                                    }}
                                >
                                    Simpan Pengaturan
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}