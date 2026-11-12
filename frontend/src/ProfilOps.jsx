import React, { useState, useEffect } from 'react';
import { 
    FaBell, FaCog, FaTachometerAlt, FaChargingStation, FaPlug,
    FaFileAlt, FaUser, FaSignOutAlt, FaSyncAlt, FaShieldAlt,
    FaTimes, FaExclamationTriangle, FaReceipt, FaWrench, FaCheck, FaCheckCircle
} from 'react-icons/fa';
import axios from 'axios';
import { getStoredToken } from './api/auth';
import './profilOps.css';
import './chargerMonitor.css'; // Mengimpor CSS overlay modal (.cm-)
import logoECH from './assets/Gemini_Generated_Image_8581rg8581rg8581.jfif.jpeg';
import defaultAvatar from './assets/Gemini_Generated_Image_8581rg8581rg8581.jfif.jpeg';

/** Menentukan sapaan operator berdasarkan waktu lokal. */
function getGreeting() {
    const h = new Date().getHours();
    if (h >= 4 && h < 10) return 'Selamat pagi';
    if (h >= 10 && h < 15) return 'Selamat siang';
    if (h >= 15 && h < 18) return 'Selamat sore';
    return 'Selamat malam';
}

/** Menampilkan profil dan informasi station yang ditugaskan kepada operator. */
export default function ProfilOps({ 
    user, 
    onLogout, 
    setActiveMenu, 
    onNavigateToOpsDash, 
    onNavigateToCharger, 
    onNavigateToOpsReport 
}) {
    const [profileData, setProfileData] = useState(null);
    const [loading, setLoading] = useState(true);

    // STATE UNTUK OVERLAY NOTIFIKASI & PENGATURAN
    const [showNotifModal, setShowNotifModal] = useState(false);
    const [showSettingsModal, setShowSettingsModal] = useState(false);
    const [notifTab, setNotifTab] = useState('malfunction'); // 'malfunction' | 'transaction'
    const [criticalAlerts, setCriticalAlerts] = useState([]);
    const [transactionAlerts, setTransactionAlerts] = useState([]);
    const [processingId, setProcessingId] = useState(null);

    // State Pengaturan
    const [soundAlert, setSoundAlert] = useState(true);
    const [autoRefreshInterval, setAutoRefreshInterval] = useState(30);

    /** Mengambil data profil operator beserta informasi penugasannya. */
    const fetchProfileData = async () => {
        setLoading(true);
        try {
            const token = getStoredToken();
            const headers = { Authorization: `Bearer ${token}` };

            // 1. Ambil data profil operator
            const response = await axios.get('http://127.0.0.1:8000/api/operator/profile', { headers });
            setProfileData(response.data.data || null);

            // 2. Ambil data notifikasi aktif stasiun
            const resNotif = await axios.get('http://127.0.0.1:8000/api/operator/dashboard', { headers });
            if (resNotif.data?.data) {
                setCriticalAlerts(resNotif.data.data.criticalAlerts || []);
                setTransactionAlerts([
                    { id: 1, kode: 'TRX-8821', user: 'Driver B 1234 XYZ', desc: 'Gagal verifikasi saldo e-wallet.', time: 'Baru saja' }
                ]);
            }
        } catch (error) {
            console.error("Gagal memuat profil operator:", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchProfileData();
    }, []);

    // Aksi: Terima Malfungsi -> Ubah Status Charger ke Maintenance
    /** Mencatat tindak lanjut kendala dari halaman profil operator. */
    const handleAcceptMalfunction = async (alertItem) => {
        const idCharger = alertItem.id_charger || alertItem.id;
        const kode = alertItem.kode_perangkat || alertItem.message?.split(':')[0] || 'Unit Mesin';

        if (!window.confirm(`Konfirmasi penanganan: Status ${kode} akan otomatis dialihkan ke MAINTENANCE?`)) return;

        setProcessingId(alertItem.id);
        try {
            const token = getStoredToken();
            const reason = alertItem.message || `Tindak lanjut gangguan pada ${kode}`;
            await axios.post(`http://127.0.0.1:8000/api/operator/charger/${idCharger}/reboot`, { alasan: `Tindak lanjut laporan: ${reason}`.slice(0, 500) }, {
                headers: { Authorization: `Bearer ${token}` }
            });

            alert(`Laporan diterima. Status ${kode} dialihkan ke Maintenance.`);
            fetchProfileData(); // Segarkan notifikasi
        } catch (err) {
            alert(`Gagal memproses penanganan: ${err.response?.data?.message || err.message}`);
        } finally {
            setProcessingId(null);
        }
    };

    const userData = profileData?.user || {};
    const userProfile = profileData?.profile || {}; 
    const assignment = profileData?.assignment || {};

    const fullName = userProfile.nama_lengkap || userData.name || (typeof user === 'string' ? user : (user?.profile?.nama_lengkap || user?.name || 'Petugas Operator'));
    const firstName = fullName.split(' ')[0];
    const totalUnreadNotif = criticalAlerts.length + transactionAlerts.length;

    return (
        <div className="prf-layout-container">
            {/* --- HEADER --- */}
            <header className="prf-header">
                <div className="prf-header-left">
                    <div className="prf-logo-box">
                        <img src={logoECH} alt="EV Charge Hub Logo"/>
                    </div>
                    <div className="prf-welcome-text">
                        <h2>{getGreeting()}, Petugas {firstName}</h2>
                        <p>Kami siap bertugas</p>
                    </div>
                </div>

                {/* TOMBOL NOTIFIKASI & PENGATURAN DI HEADER */}
                <div className="prf-header-right">
                    <button 
                        className="prf-icon-btn" 
                        title="Pemberitahuan Sistem"
                        onClick={() => setShowNotifModal(true)}
                    >
                        <FaBell />
                        {totalUnreadNotif > 0 && <span className="prf-badge">{totalUnreadNotif}</span>}
                    </button>
                    <button 
                        className="prf-icon-btn" 
                        title="Pengaturan" 
                        onClick={() => setShowSettingsModal(true)}
                    >
                        <FaCog />
                    </button>
                </div>
            </header>

            {/* --- BODY WRAPPER --- */}
            <div className="prf-body-wrapper">
                
                {/* --- SIDEBAR --- */}
                <aside className="prf-sidebar">
                    <ul className="prf-menu-list">
                        <li className="prf-menu-item" onClick={() => {
                            if (setActiveMenu) setActiveMenu('dashboard');
                            if (onNavigateToOpsDash) onNavigateToOpsDash();
                        }}>
                            <FaTachometerAlt className="prf-menu-icon" /><span>Dashboard</span>
                        </li>
                        <li className="prf-menu-item" onClick={() => { 
                            if (setActiveMenu) setActiveMenu('charger');
                            if (onNavigateToCharger) onNavigateToCharger();
                        }}>
                            <FaChargingStation className="prf-menu-icon" /><span>Manage Charger</span>
                        </li>
                        <li className="prf-menu-item" onClick={() => {
                            if (setActiveMenu) setActiveMenu('report');
                            if (onNavigateToOpsReport) onNavigateToOpsReport();
                        }}>
                            <FaFileAlt className="prf-menu-icon" /><span>Transaction Report</span>
                        </li>
                        <li className="prf-menu-item active">
                            <FaUser className="prf-menu-icon" /><span>Profil</span>
                        </li>
                    </ul>
                    <div className="prf-sidebar-footer">
                        <button className="prf-logout-btn" onClick={onLogout}><FaSignOutAlt /> <span>Keluar</span></button>
                    </div>
                </aside>

                {/* --- MAIN CONTENT --- */}
                <main className="prf-main-content">
                    <div className="prf-container">
                        
                        <div className="prf-content-title">
                            <h1>Profil Operator Stasiun</h1>
                        </div>

                        {loading ? (
                            <div className="prf-empty-state">
                                <p>Memuat informasi profil...</p>
                            </div>
                        ) : (
                            <div className="prf-profile-card-wrapper">
                                
                                <div className="prf-profile-top-section">
                                    <div className="prf-avatar-box">
                                        <img src={userProfile.foto || defaultAvatar} alt="Avatar Operator" />
                                    </div>
                                    <div className="prf-profile-heading">
                                        <h2>Welcome, <span className="prf-highlight-name">{firstName}</span></h2>
                                        <p className="prf-sub-status"><FaShieldAlt /> Status: <strong>Aktif / Bertugas</strong></p>
                                    </div>
                                    <div className="prf-refresh-action">
                                        <button className="prf-refresh-btn" onClick={fetchProfileData} title="Refresh Data">
                                            <FaSyncAlt className={loading ? "fa-spin" : ""} />
                                        </button>
                                    </div>
                                </div>

                                <hr className="prf-divider" />

                                <div className="prf-details-grid">
                                    <div className="prf-detail-row">
                                        <span className="prf-detail-label">Nama Lengkap:</span>
                                        <span className="prf-detail-value">{fullName}</span>
                                    </div>

                                    <div className="prf-detail-row">
                                        <span className="prf-detail-label">Email Akun:</span>
                                        <span className="prf-detail-value">{userData.email || '-'}</span>
                                    </div>

                                    <div className="prf-detail-row">
                                        <span className="prf-detail-label">Nomor Kontak / Telp:</span>
                                        <span className="prf-detail-value">{userProfile.nomor_telepon ||'-'}</span>
                                    </div>

                                    <div className="prf-detail-row">
                                        <span className="prf-detail-label">Lokasi Penugasan SPKLU:</span>
                                        <span className="prf-detail-value">{assignment.nama_lokasi || 'Belum Ditugaskan'}</span>
                                    </div>

                                    <div className="prf-detail-row">
                                        <span className="prf-detail-label">Alamat Stasiun:</span>
                                        <span className="prf-detail-value">
                                            {assignment.alamat ||'-'}
                                        </span>
                                    </div>

                                    <div className="prf-detail-row">
                                        <span className="prf-detail-label">ID Station / Lokasi:</span>
                                        <span className="prf-detail-value">#LOC-{assignment.id_location || assignment.id || 'N/A'}</span>
                                    </div>
                                </div>

                            </div>
                        )}

                    </div>
                </main>
            </div>

{/* ========================================================
                1. OVERLAY NOTIFIKASI POP-UP (PREFIX PRF)
               ======================================================== */}
            {showNotifModal && (
                <div className="prf-modal-backdrop" onClick={() => setShowNotifModal(false)}>
                    <div className="prf-modal-dialog" onClick={(e) => e.stopPropagation()}>
                        
                        <div className="prf-modal-head">
                            <div>
                                <h3>Pusat Pemberitahuan Stasiun</h3>
                                <p>Monitoring malfungsi unit charger & anomali transaksi</p>
                            </div>
                            <button className="prf-modal-close" onClick={() => setShowNotifModal(false)}>
                                <FaTimes />
                            </button>
                        </div>

                        {/* 2 Tab Notifikasi */}
                        <div className="prf-notif-tabs">
                            <button 
                                className={`prf-tab-btn ${notifTab === 'malfunction' ? 'active' : ''}`}
                                onClick={() => setNotifTab('malfunction')}
                            >
                                <FaExclamationTriangle /> Malfungsi Mesin ({criticalAlerts.length})
                            </button>
                            <button 
                                className={`prf-tab-btn ${notifTab === 'transaction' ? 'active' : ''}`}
                                onClick={() => setNotifTab('transaction')}
                            >
                                <FaReceipt /> Gangguan Transaksi ({transactionAlerts.length})
                            </button>
                        </div>

                        <div className="prf-modal-body">
                            {/* TAB 1: MALFUNGSI MESIN */}
                            {notifTab === 'malfunction' && (
                                <div className="prf-notif-list">
                                    {criticalAlerts.length > 0 ? (
                                        criticalAlerts.map((alert) => (
                                            <div key={alert.id} className="prf-notif-card danger">
                                                <div className="prf-notif-title-line">
                                                    <span className="prf-notif-badge-danger">
                                                        <FaWrench /> Peringatan Sistem
                                                    </span>
                                                    <span className="prf-notif-time">Aktif Saat Ini</span>
                                                </div>
                                                <p className="prf-notif-text">{alert.message}</p>

                                                <div className="prf-notif-footer-actions">
                                                    <button 
                                                        className="prf-btn-action-maintenance"
                                                        onClick={() => handleAcceptMalfunction(alert)}
                                                        disabled={processingId === alert.id}
                                                    >
                                                        <FaCheck /> {processingId === alert.id ? 'Memproses...' : 'Terima & Set Maintenance'}
                                                    </button>
                                                    <button 
                                                        className="prf-btn-action-link"
                                                        onClick={() => {
                                                            setShowNotifModal(false);
                                                            if (onNavigateToCharger) onNavigateToCharger();
                                                        }}
                                                    >
                                                        Buka Manage Charger &rarr;
                                                    </button>
                                                </div>
                                            </div>
                                        ))
                                    ) : (
                                        <div className="prf-notif-empty">
                                            <FaCheckCircle size={30} style={{ color: '#059669', marginBottom: '8px' }} />
                                            <p>Semua unit mesin charger beroperasi normal.</p>
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* TAB 2: GANGGUAN TRANSAKSI */}
                            {notifTab === 'transaction' && (
                                <div className="prf-notif-list">
                                    {transactionAlerts.length > 0 ? (
                                        transactionAlerts.map((trx) => (
                                            <div key={trx.id} className="prf-notif-card warning">
                                                <div className="prf-notif-title-line">
                                                    <span className="prf-notif-badge-warning">
                                                        <FaReceipt /> {trx.kode || 'TRX-ERROR'}
                                                    </span>
                                                    <span className="prf-notif-time">{trx.time || 'Hari ini'}</span>
                                                </div>
                                                <p className="prf-notif-text">
                                                    <strong>{trx.user}</strong>: {trx.desc}
                                                </p>
                                                <span className="prf-info-note">
                                                    *Informasi saja: driver diarahkan mencoba metode bayar lain.
                                                </span>
                                            </div>
                                        ))
                                    ) : (
                                        <div className="prf-notif-empty">
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
                2. OVERLAY PENGATURAN (PREFIX PRF)
               ======================================================== */}
            {showSettingsModal && (
                <div className="prf-modal-backdrop" onClick={() => setShowSettingsModal(false)}>
                    <div className="prf-modal-dialog settings-box" onClick={(e) => e.stopPropagation()}>
                        <div className="prf-modal-head">
                            <div>
                                <h3>Pengaturan Panel Operator</h3>
                                <p>Preferensi notifikasi dan telemetri stasiun</p>
                            </div>
                            <button className="prf-modal-close" onClick={() => setShowSettingsModal(false)}>
                                <FaTimes />
                            </button>
                        </div>

                        <div className="prf-modal-body">
                            <div className="prf-setting-item">
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

                            <div className="prf-setting-item">
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
                                    className="prf-btn-action-maintenance" 
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
