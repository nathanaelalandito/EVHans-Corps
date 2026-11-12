import React, { useState, useEffect } from 'react';
import { 
    FaBell, FaCog, FaTachometerAlt, FaChargingStation, FaPlug,
    FaFileAlt, FaUser, FaSignOutAlt, FaSyncAlt, FaBolt, 
    FaPowerOff, FaStop, FaPlay, FaExclamationTriangle, FaPlus, 
    FaEdit, FaTrash, FaTimes, FaWrench, FaReceipt, FaCheck, FaCheckCircle
} from 'react-icons/fa';
import axios from 'axios';
import { getStoredToken } from './api/auth';
import './chargerMonitor.css';
import logoECH from './assets/Gemini_Generated_Image_8581rg8581rg8581.jfif.jpeg';

function getGreeting() {
    const h = new Date().getHours();
    if (h >= 4 && h < 10) return 'Selamat pagi';
    if (h >= 10 && h < 15) return 'Selamat siang';
    if (h >= 15 && h < 18) return 'Selamat sore';
    return 'Selamat malam';
}

export default function ChargerMonitor({ 
    user, 
    onLogout, 
    setActiveMenu, 
    onNavigateToOpsDash, 
    onNavigateToOpsReport, 
    onNavigateToOpsProfil, 
    onNavigateToDetail 
}) {
    const [chargers, setChargers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filterStatus, setFilterStatus] = useState('ALL');

    // State untuk Modal Form (Tambah / Edit Charger)
    const [showModal, setShowModal] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [currentChargerId, setCurrentChargerId] = useState(null);
    const [formData, setFormData] = useState({
        kode_perangkat: '',
        merek_model: '',
        kap_tot_kw: 60,
        status_mesin: 'Active'
    });

    // STATE UNTUK OVERLAY NOTIFIKASI & PENGATURAN (SAMA SEPERTI DI DASHBOARD)
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

    // Mengambil data charger & notifikasi dari server
    const fetchChargersData = async () => {
        setLoading(true);
        try {
            const token = getStoredToken(); 
            const headers = { Authorization: `Bearer ${token}` };

            // 1. Ambil daftar mesin charger
            const response = await axios.get('http://127.0.0.1:8000/api/operator/chargers', { headers });
            setChargers(response.data.data || []); 

            // 2. Ambil data notifikasi terkini dari backend dashboard
            const resNotif = await axios.get('http://127.0.0.1:8000/api/operator/dashboard', { headers });
            if (resNotif.data?.data) {
                setCriticalAlerts(resNotif.data.data.criticalAlerts || []);
                setTransactionAlerts([
                    { id: 1, kode: 'TRX-8821', user: 'Driver B 1234 XYZ', desc: 'Gagal verifikasi saldo e-wallet.', time: 'Baru saja' }
                ]);
            }
        } catch (error) {
            console.error("Gagal memuat data charger:", error);
            setChargers([]);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchChargersData();
    }, []);

    // Aksi: Terima Malfungsi -> Ubah Status Charger ke Maintenance
    const handleAcceptMalfunction = async (alertItem) => {
        const idCharger = alertItem.id_charger || alertItem.id;
        const kode = alertItem.kode_perangkat || alertItem.message?.split(':')[0] || 'Unit Mesin';

        if (!window.confirm(`Konfirmasi penanganan: Status ${kode} akan otomatis dialihkan ke MAINTENANCE?`)) return;

        setProcessingId(alertItem.id);
        try {
            const token = getStoredToken();
            await axios.post(`http://127.0.0.1:8000/api/operator/charger/${idCharger}/reboot`, {}, {
                headers: { Authorization: `Bearer ${token}` }
            });

            alert(`Laporan diterima. Status ${kode} dialihkan ke Maintenance.`);
            fetchChargersData(); // Segarkan data grid charger
        } catch (err) {
            alert(`Gagal memproses penanganan: ${err.response?.data?.message || err.message}`);
        } finally {
            setProcessingId(null);
        }
    };

    // Buka Modal Tambah Charger
    const handleOpenAddModal = () => {
        setIsEditing(false);
        setFormData({
            kode_perangkat: '',
            merek_model: '',
            kap_tot_kw: 60,
            status_mesin: 'Active'
        });
        setShowModal(true);
    };

    // Buka Modal Edit Charger
    const handleOpenEditModal = (charger) => {
        setIsEditing(true);
        const chargerId = charger.id_charger || charger.id;
        setCurrentChargerId(chargerId);
        setFormData({
            kode_perangkat: charger.kode_perangkat || '',
            merek_model: charger.merek_model || '',
            kap_tot_kw: charger.kap_tot_kw || 60,
            status_mesin: charger.status_mesin || 'Active'
        });
        setShowModal(true);
    };

    // Simpan Data (Create / Update ke Operator API)
    const handleFormSubmit = async (e) => {
        e.preventDefault();
        try {
            const token = getStoredToken();
            const headers = { Authorization: `Bearer ${token}` };

            if (isEditing) {
                await axios.put(`http://127.0.0.1:8000/api/operator/chargers/${currentChargerId}`, formData, { headers });
                alert(`Mesin Charger ${formData.kode_perangkat} berhasil diperbarui!`);
            } else {
                await axios.post('http://127.0.0.1:8000/api/operator/storechargers', formData, { headers });
                alert(`Mesin Charger baru berhasil ditambahkan!`);
            }
            setShowModal(false);
            fetchChargersData();
        } catch (err) {
            alert(`Gagal menyimpan data: ${err.response?.data?.message || err.message}`);
        }
    };

    // Kontrol Jarak Jauh (Start / Stop / Reboot)
    const handleRemoteControl = async (action, id, kode) => {
        if (window.confirm(`Konfirmasi: Kirim perintah [${action}] untuk perangkat ${kode}?`)) {
            try {
                const token = getStoredToken();
                const headers = { Authorization: `Bearer ${token}` };

                if (action === 'START') {
                    await axios.post(`http://127.0.0.1:8000/api/operator/charger/${id}/start`, {}, { headers });
                } else if (action === 'STOP') {
                    await axios.post(`http://127.0.0.1:8000/api/operator/charger/${id}/stop`, {}, { headers });
                } else if (action === 'REBOOT') {
                    await axios.post(`http://127.0.0.1:8000/api/operator/charger/${id}/reboot`, {}, { headers });
                }

                alert(`Perintah ${action} berhasil dikirim ke ${kode}`);
                fetchChargersData();
            } catch (err) {
                alert(`Gagal mengirim perintah ${action}: ${err.response?.data?.message || err.message}`);
            }
        }
    };

    // Hapus Charger
    const handleDeleteCharger = async (id, kode) => {
        if (window.confirm(`Peringatan: Apakah Anda yakin ingin menghapus mesin perangkat ${kode}?`)) {
            try {
                const token = getStoredToken();
                await axios.delete(`http://127.0.0.1:8000/api/operator/delchargers/${id}`, {
                    headers: { Authorization: `Bearer ${token}` }
                });
                fetchChargersData();
                alert(`Perangkat ${kode} berhasil dihapus.`);
            } catch (err) {
                alert(`Gagal menghapus charger: ${err.response?.data?.message || err.message}`);
            }
        }
    };

    const filteredChargers = filterStatus === 'ALL' 
        ? chargers 
        : chargers.filter(c => c.status_mesin && c.status_mesin.toLowerCase() === filterStatus.toLowerCase());

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

                {/* TOMBOL NOTIFIKASI & PENGATURAN OVERLAY */}
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

            {/* --- BODY CONTAINER --- */}
            <div className="cm-body-wrapper">
                
                {/* --- SIDEBAR --- */}
                <aside className="cm-sidebar">
                    <ul className="cm-menu-list">
                        <li className="cm-menu-item" onClick={onNavigateToOpsDash}>
                            <FaTachometerAlt className="cm-menu-icon" /><span>Dashboard</span>
                        </li>
                        <li className="cm-menu-item active">
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
                        
                        {/* Top Bar */}
                        <div className="cm-top-bar">
                            <div className="cm-title-area">
                                <h1>Manajemen & Telemetri Unit Charger</h1>
                                <p>Kontrol penuh atas status mesin, spesifikasi kapasitas, dan penambahan unit baru.</p>
                            </div>
                            <div className="cm-top-actions">
                                <button className="cm-add-btn" onClick={handleOpenAddModal}>
                                    <FaPlus /> Tambah Unit Baru
                                </button>
                                <select className="cm-filter-select" value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}>
                                    <option value="ALL">Semua Status</option>
                                    <option value="Active">Active</option>
                                    <option value="Maintenance">Maintenance</option>
                                    <option value="Offline">Offline</option>
                                </select>
                                <button className="cm-refresh-btn" onClick={fetchChargersData} disabled={loading}>
                                    <FaSyncAlt className={loading ? "fa-spin" : ""} />
                                </button>
                            </div>
                        </div>

                        {/* Grid Kartu Charger */}
                        <div className="cm-grid">
                            {filteredChargers.length > 0 ? (
                                filteredChargers.map((charger) => {
                                    const chargerId = charger.id_charger || charger.id;
                                    const statusClass = (charger.status_mesin || 'Active').toLowerCase();
                                    return (
                                        <div key={chargerId} className={`cm-port-card status-${statusClass}`}>
                                            
                                            <div className="cm-port-header">
                                                <div>
                                                    <h3>{charger.kode_perangkat}</h3>
                                                    <span className="cm-port-type">{charger.merek_model}</span>
                                                </div>
                                                <div className="cm-header-badges">
                                                    <span className={`cm-status-badge ${statusClass}`}>{charger.status_mesin}</span>
                                                    <div className="cm-crud-icons">
                                                        <FaEdit title="Ubah Charger" onClick={() => handleOpenEditModal(charger)} />
                                                        <FaTrash title="Hapus Charger" onClick={() => handleDeleteCharger(chargerId, charger.kode_perangkat)} />
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="cm-metrics-grid">
                                                <div className="cm-metric-item">
                                                    <span className="cm-metric-label"><FaBolt /> Kapasitas Total</span>
                                                    <span className="cm-metric-val">{charger.kap_tot_kw} kW</span>
                                                </div>
                                                <div className="cm-metric-item">
                                                    <span className="cm-metric-label"><FaChargingStation /> Lokasi ID</span>
                                                    <span className="cm-metric-val">#LOC-{charger.id_location || '1'}</span>
                                                </div>
                                            </div>

                                            <div className="cm-port-actions">
                                                {charger.status_mesin === 'Active' ? (
                                                    <button className="cm-btn stop" onClick={() => handleRemoteControl('STOP', chargerId, charger.kode_perangkat)}>
                                                        <FaStop /> Stop
                                                    </button>
                                                ) : (
                                                    <button className="cm-btn start" onClick={() => handleRemoteControl('START', chargerId, charger.kode_perangkat)}>
                                                        <FaPlay /> Start
                                                    </button>
                                                )}
                                                <button className="cm-btn reboot" onClick={() => handleRemoteControl('REBOOT', chargerId, charger.kode_perangkat)}>
                                                    <FaPowerOff /> Reboot
                                                </button>
                                                <button className="cm-btn detail" onClick={() => onNavigateToDetail && onNavigateToDetail(charger)}>
                                                    <FaPlug/> Detail Port
                                                </button>
                                            </div>

                                        </div>
                                    );
                                })
                            ) : (
                                <div className="cm-empty-state">
                                    <FaExclamationTriangle size={32} />
                                    <p>Tidak ada unit charger ditemukan di database operasional.</p>
                                </div>
                            )}
                        </div>

                    </div>
                </main>
            </div>

            {/* --- MODAL FORM TAMBAH / EDIT CHARGER --- */}
            {showModal && (
                <div className="cm-modal-overlay">
                    <div className="cm-modal-card">
                        <div className="cm-modal-header">
                            <h3>{isEditing ? 'Ubah Konfigurasi Mesin Charger' : 'Tambah Unit Charger Baru'}</h3>
                            <button className="cm-close-modal" onClick={() => setShowModal(false)}><FaTimes /></button>
                        </div>
                        <form onSubmit={handleFormSubmit} className="cm-form">
                            <div className="cm-form-group">
                                <label>Kode Perangkat (Maks 12 Karakter)</label>
                                <input 
                                    type="text" 
                                    maxLength="12"
                                    value={formData.kode_perangkat} 
                                    onChange={(e) => setFormData({...formData, kode_perangkat: e.target.value})} 
                                    required 
                                />
                            </div>
                            <div className="cm-form-group">
                                <label>Merek & Model Mesin</label>
                                <input 
                                    type="text" 
                                    placeholder="Contoh: ABB Terra 184 kW"
                                    value={formData.merek_model} 
                                    onChange={(e) => setFormData({...formData, merek_model: e.target.value})} 
                                    required 
                                />
                            </div>
                            <div className="cm-form-row">
                                <div className="cm-form-group">
                                    <label>Kapasitas Total (kW)</label>
                                    <input 
                                        type="number" 
                                        value={formData.kap_tot_kw} 
                                        onChange={(e) => setFormData({...formData, kap_tot_kw: parseInt(e.target.value) || 0})} 
                                        required 
                                    />
                                </div>
                                <div className="cm-form-group">
                                    <label>Status Mesin</label>
                                    <select 
                                        value={formData.status_mesin} 
                                        onChange={(e) => setFormData({...formData, status_mesin: e.target.value})}
                                    >
                                        <option value="Active">Active</option>
                                        <option value="Maintenance">Maintenance</option>
                                        <option value="Offline">Offline</option>
                                    </select>
                                </div>
                            </div>
                            <div className="cm-modal-actions">
                                <button type="button" className="cm-btn-secondary" onClick={() => setShowModal(false)}>Batal</button>
                                <button type="submit" className="cm-btn-primary">Simpan ke Database</button>
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