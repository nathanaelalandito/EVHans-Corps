import React, { useState, useEffect } from 'react';
import { 
    FaBell, FaCog, FaTachometerAlt, FaChargingStation, FaPlug,
    FaFileAlt, FaUser, FaSignOutAlt, FaSyncAlt, FaBolt, 
    FaArrowLeft, FaTag, FaShieldAlt, FaParking, FaCalendarAlt,
    FaPowerOff, FaPlay, FaStop, FaPlus, FaEdit, FaTrash, FaTimes
} from 'react-icons/fa';
import axios from 'axios';
import { getStoredToken } from './api/auth';
import './ChargerMonitor.css'; // Menggunakan styling yang sama dengan halaman utama
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

    // Modal Form Port
    const [showPortModal, setShowPortModal] = useState(false);
    const [isEditingPort, setIsEditingPort] = useState(false);
    const [currentPortId, setCurrentPortId] = useState(null);
    const [portForm, setPortForm] = useState({
        nomor_port: 'Port 1',
        tipe_konektor: 'CCS2',
        tipe_charging: 'DC',
        daya_maks_kw: 50,
        status_port: 'Available'
    });

    const nameString = typeof user === 'string' 
        ? user 
        : (user?.profile?.nama_lengkap || user?.name || user?.email || '');
    const firstName = (!nameString || nameString === 'Petugas') ? '' : nameString.split(' ')[0];

    const formatRp = (val) => (!val && val !== 0 ? 'Rp 0' : `Rp ${Number(val).toLocaleString('id-ID')}`);
    const formatDate = (val) => (!val ? '-' : new Date(val).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }));

    // Ambil Data Lengkap Charger, Tarif, dan Port
    const fetchDetail = async () => {
        if (!chargerId) return;
        setLoading(true);
        try {
            const token = getStoredToken();
            const res = await axios.get(`http://127.0.0.1:8000/api/operator/chargers/${chargerId}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setDetailData(res.data.data);
        } catch (err) {
            console.error("Gagal load detail charger & tarif:", err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchDetail();
    }, [chargerId]);

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
                <div className="cm-header-right">
                    <button className="cm-icon-btn" title="Notifikasi"><FaBell /><span className="cm-badge">2</span></button>
                    <button className="cm-icon-btn" title="Pengaturan" onClick={onNavigateToOpsProfil}><FaCog /></button>
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
                                    <span className="cm-port-type">{activeCharger.merek_model} • Lokasi #LOC-{activeCharger.id_location || '1'}</span>
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
                                <div style={{ fontSize: '0.85rem', color: '#1b5e20', background: '#f1f8f2', padding: '8px 12px', borderRadius: '6px' }}>
                                    <FaCalendarAlt /> Periode Tarif Aktif: <strong>{formatDate(activeTarif.periode_mulai)} s/d {formatDate(activeTarif.periode_berakhir)}</strong>
                                </div>
                            )}
                        </div>

                        {/* 2. DAFTAR CARD PORT NOZZLE (SUSUNAN MIRIP PERSIS KARTU CHARGER) */}
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

                            {/* GRID KARTU PORT PERSIS SEPERTI HALAMAN MANAGE CHARGER */}
                            <div className="cm-grid">
                                {activePorts.length > 0 ? (
                                    activePorts.map((port, idx) => {
                                        // Bersihkan nama port agar tidak dobel "Port Port 1"
                                        const rawName = port.nomor_port || `${idx + 1}`;
                                        const portTitle = String(rawName).toLowerCase().startsWith('port') 
                                            ? rawName 
                                            : `Port ${rawName}`;

                                        // Kolom mode & daya dari database
                                        const portMode = port.tipe_charging || port.mode_daya || 'DC';
                                        const portPower = port.daya_maks_kw || port.daya_maksimal || '50';

                                        // Format status warna
                                        const pStatus = (port.status_port || 'Available').toLowerCase();
                                        const statusClass = pStatus.replace(/\s+/g, '-');
                                        const isAvailable = pStatus === 'available';

                                        return (
                                            <div key={port.id_port || idx} className={`cm-port-card status-${statusClass}`}>
                                                {/* Header Kartu Port: Nama + Subtitle + Badge Status + Ikon Edit/Hapus */}
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

                                                {/* Kotak Abu-Abu Spesifikasi Persis Seperti Kartu Unit */}
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

                                                {/* Tombol Aksi di Bagian Bawah: Start/Stop & Reboot */}
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

            {/* --- MODAL TAMBAH / EDIT PORT --- */}
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
        </div>
    );
}