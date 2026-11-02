import React, { useState, useEffect } from 'react';
import { 
    FaBell, FaCog, FaTachometerAlt, FaChargingStation, FaPlug, 
    FaFileAlt, FaUser, FaSignOutAlt, FaBolt, FaCheckCircle, 
    FaExclamationTriangle, FaDollarSign, FaSyncAlt, FaPowerOff, FaStop, 
    FaChartLine, FaExclamationCircle, FaTimes, FaWrench, FaReceipt, FaCheck, FaVolumeUp
} from 'react-icons/fa';
import axios from 'axios';
import { getStoredToken } from './api/auth';
import './opsDashboard.css';
import logoECH from './assets/Gemini_Generated_Image_8581rg8581rg8581.jfif.jpeg';

function getGreeting() {
    const h = new Date().getHours();
    if (h >= 4 && h < 10) return 'Selamat pagi';
    if (h >= 10 && h < 15) return 'Selamat siang';
    if (h >= 15 && h < 18) return 'Selamat sore';
    return 'Selamat malam';
}

export default function OperatorDashboard({ user, onLogout, setActiveMenu, onNavigateToCharger, 
    onNavigateToPort, onNavigateToOpsReport, onNavigateToOpsProfil}) {
    
    const [stats, setStats] = useState({
        activeCharging: 0,
        activeCharge: 0,
        errorPorts: 0,
        totalRevenueToday: 'Rp 0'
    });
    
    const [activeSessions, setActiveSessions] = useState([]);
    const [criticalAlerts, setCriticalAlerts] = useState([]);
    const [transactionAlerts, setTransactionAlerts] = useState([]); // Notifikasi Transaksi
    const [loading, setLoading] = useState(true);

    // STATE UNTUK MODEL OVERLAY (POP-UP)
    const [showNotifModal, setShowNotifModal] = useState(false);
    const [showSettingsModal, setShowSettingsModal] = useState(false);
    const [notifTab, setNotifTab] = useState('malfunction'); // 'malfunction' | 'transaction'
    const [processingId, setProcessingId] = useState(null);

    // State Pengaturan
    const [soundAlert, setSoundAlert] = useState(true);
    const [autoRefreshInterval, setAutoRefreshInterval] = useState(30);

    const nameString = typeof user === 'string' 
        ? user 
        : (user?.profile?.nama_lengkap || user?.name || user?.email || '');

    const firstName = (!nameString || nameString === 'Petugas') ? '' : nameString.split(' ')[0];

    // AMBIL DATA REAL DARI DATABASE
    const fetchDashboardData = async () => {
        setLoading(true);
        try {
            const token = getStoredToken();
            const res = await axios.get('http://127.0.0.1:8000/api/operator/dashboard', {
                headers: { Authorization: `Bearer ${token}` }
            });

            if (res.data?.data) {
                setStats(res.data.data.stats || {
                    activeCharging: 0,
                    availablePorts: 0,
                    errorPorts: 0,
                    totalRevenueToday: 'Rp 0'
                });
                setCriticalAlerts(res.data.data.criticalAlerts || []);
                setActiveSessions(res.data.data.activeSessions || []);
                setTransactionAlerts(res.data.data.transactionAlerts || [
                    { id: 1, kode: 'TRX-8821', user: 'Driver B 1234 XYZ', desc: 'Gagal verifikasi saldo e-wallet.', time: 'Baru saja' }
                ]);
            }
        } catch (error) {
            console.error("Gagal memuat data real dashboard:", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchDashboardData();
    }, []);

    // AKSI 1: TERIMA MALFUNGSI -> UBAH MESIN JADI MAINTENANCE
    const handleAcceptMalfunction = async (alertItem) => {
        const idCharger = alertItem.id_charger || alertItem.id;
        const kode = alertItem.kode_perangkat || alertItem.message?.split(':')[0] || 'Unit Mesin';

        if (!window.confirm(`Konfirmasi: Terima laporan gangguan dan alihkan status ${kode} ke mode MAINTENANCE?`)) return;

        setProcessingId(alertItem.id);
        try {
            const token = getStoredToken();
            // Ubah status mesin menjadi Maintenance di backend
            await axios.post(`http://127.0.0.1:8000/api/operator/charger/${idCharger}/reboot`, {}, {
                headers: { Authorization: `Bearer ${token}` }
            });

            alert(`Laporan diterima. Status ${kode} berhasil dialihkan ke Maintenance.`);
            fetchDashboardData(); // Segarkan data dashboard
        } catch (err) {
            alert(`Gagal memproses penanganan: ${err.response?.data?.message || err.message}`);
        } finally {
            setProcessingId(null);
        }
    };

    // Remote Control Port dari Tabel
    const handleRemoteAction = async (actionType, portId, portName) => {
        if (window.confirm(`Konfirmasi: Kirim perintah ${actionType} untuk ${portName}?`)) {
            try {
                const token = getStoredToken();
                const headers = { Authorization: `Bearer ${token}` };
                
                if (actionType === 'STOP') {
                    await axios.post(`http://127.0.0.1:8000/api/operator/port/${portId}/stop`, {}, { headers });
                } else if (actionType === 'REBOOT') {
                    await axios.post(`http://127.0.0.1:8000/api/operator/port/${portId}/reboot`, {}, { headers });
                }

                alert(`Perintah ${actionType} berhasil dikirim.`);
                fetchDashboardData();
            } catch (err) {
                alert(`Gagal mengeksekusi perintah: ${err.response?.data?.message || err.message}`);
            }
        }
    };

    const totalUnreadNotif = criticalAlerts.length + transactionAlerts.length;

    return (
        <div className="op-layout-container">
            {/* --- HEADER --- */}
            <header className="op-header">
                <div className="op-header-left">
                    <div className="op-logo-box">
                        <img src={logoECH} alt="EV Charge Hub Logo"/>
                    </div>
                    <div className="op-welcome-text">
                        <h2>{getGreeting()}, Petugas {firstName}</h2>
                        <p>Kami siap bertugas</p>
                    </div>
                </div>

                {/* TOMBOL NOTIFIKASI & PENGATURAN */}
                <div className="op-header-right">
                    {/* Buka Overlay Notifikasi */}
                    <button 
                        className="op-icon-btn" 
                        title="Pemberitahuan Sistem"
                        onClick={() => setShowNotifModal(true)}
                    >
                        <FaBell />
                        {totalUnreadNotif > 0 && <span className="op-badge">{totalUnreadNotif}</span>}
                    </button>

                    {/* Buka Overlay Pengaturan */}
                    <button 
                        className="op-icon-btn" 
                        title="Pengaturan Panel" 
                        onClick={() => setShowSettingsModal(true)}
                    >
                        <FaCog />
                    </button>
                </div>
            </header>

            {/* --- BODY CONTAINER --- */}
            <div className="op-body-wrapper">
                
                {/* --- SIDEBAR --- */}
                <aside className="op-sidebar">
                    <ul className="op-menu-list">
                        <li className="op-menu-item active">
                            <FaTachometerAlt className="op-menu-icon" />
                            <span>Dashboard</span>
                        </li>
                        <li className="op-menu-item" onClick={onNavigateToCharger}>
                            <FaChargingStation className="op-menu-icon" />
                            <span>Manage Charger</span>
                        </li>
                        <li className="op-menu-item" onClick={onNavigateToOpsReport}>
                            <FaFileAlt className="op-menu-icon" />
                            <span>Transaction Report</span>
                        </li>
                        <li className="op-menu-item" onClick={onNavigateToOpsProfil}>
                            <FaUser className="op-menu-icon" />
                            <span>Profil</span>
                        </li>
                    </ul>

                    <div className="op-sidebar-footer">
                        <button className="op-logout-btn" onClick={onLogout}>
                            <FaSignOutAlt /> <span>Keluar</span>
                        </button>
                    </div>
                </aside>

                {/* --- MAIN CONTENT --- */}
                <main className="op-main-content">
                    <div className="op-dashboard-container">
                        
                        {/* Baris Atas: Judul & Tombol Refresh */}
                        <div className="op-dash-top-bar">
                            <div className="op-dash-title">
                                <h1>Dashboard Operasional SPKLU</h1>
                                <p>Pusat kendali real-time, telemetri, dan analitik performa stasiun pengisian.</p>
                            </div>
                            <button className="op-refresh-btn" onClick={fetchDashboardData} disabled={loading}>
                                <FaSyncAlt className={loading ? "fa-spin" : ""} /> {loading ? "Memuat..." : "Segarkan Data"}
                            </button>
                        </div>

                        {/* WIDGET LIVE TICKER: Menampilkan Notifikasi Malfungsi Cepat */}
                        {criticalAlerts.length > 0 && (
                            <div className="op-alert-ticker">
                                <FaExclamationCircle className="op-alert-icon-left" />
                                <div className="op-alert-content">
                                    <span className="op-alert-title">Peringatan Kritis Sistem Aktif:</span>
                                    {criticalAlerts.map(alert => (
                                        <span 
                                            key={alert.id} 
                                            className="op-alert-link"
                                            onClick={() => setShowNotifModal(true)}
                                        >
                                            {alert.message} (Klik untuk tangani &rarr;)
                                        </span>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* KARTU STATISTIK RINGKAS */}
                        <div className="op-stats-grid">
                            <div className="op-stat-card">
                                <div className="op-stat-icon bolt"><FaBolt /></div>
                                <div className="op-stat-info">
                                    <p>Sedang Charging</p>
                                    <h3>{stats.activeCharging} Port</h3>
                                </div>
                            </div>

                            <div className="op-stat-card">
                                <div className="op-stat-icon check"><FaCheckCircle /></div>
                                <div className="op-stat-info">
                                    <p>Unit Aktif</p>
                                    <h3>{stats.activeCharge} Unit</h3>
                                </div>
                            </div>

                            <div className="op-stat-card">
                                <div className="op-stat-icon warning"><FaExclamationTriangle /></div>
                                <div className="op-stat-info">
                                    <p>Port Bermasalah (Fault)</p>
                                    <h3>{stats.errorPorts} Port</h3>
                                </div>
                            </div>

                            <div className="op-stat-card">
                                <div className="op-stat-icon money"><FaDollarSign /></div>
                                <div className="op-stat-info">
                                    <p>Pendapatan Hari Ini</p>
                                    <h3>{stats.totalRevenueToday}</h3>
                                </div>
                            </div>
                        </div>

                        {/* GRAFIK UTILITAS & PERFORMA */}
                        <div className="op-analytics-grid">
                            <div className="op-table-card op-chart-box">
                                <div className="op-chart-header">
                                    <h3>Utilitas Jam Sibuk (Peak Hours)</h3>
                                    <FaChartLine className="op-chart-icon-title" />
                                </div>
                                <p className="op-chart-desc">Estimasi kepadatan stasiun berdasarkan data operasional.</p>
                                <div className="op-bar-chart-container">
                                    <div className="op-bars-wrapper">
                                        <div className="op-bar-item"><div className="op-bar bar-low" style={{ height: '50px' }}></div><span className="op-bar-label">08:00</span></div>
                                        <div className="op-bar-item"><div className="op-bar bar-peak" style={{ height: '115px' }} title="Puncak Tertinggi"></div><span className="op-bar-label bold">12:00</span></div>
                                        <div className="op-bar-item"><div className="op-bar bar-mid" style={{ height: '75px' }}></div><span className="op-bar-label">15:00</span></div>
                                        <div className="op-bar-item"><div className="op-bar bar-peak" style={{ height: '125px' }} title="Puncak Tertinggi"></div><span className="op-bar-label bold">18:00</span></div>
                                        <div className="op-bar-item"><div className="op-bar bar-low" style={{ height: '35px' }}></div><span className="op-bar-label">21:00</span></div>
                                    </div>
                                    <span className="op-chart-footer-note">⚡ Puncak kepadatan stasiun terjadi pada pukul 12:00 & 18:00 WIB.</span>
                                </div>
                            </div>

                            <div className="op-table-card op-chart-box">
                                <div className="op-chart-header">
                                    <h3>Status Performa Port</h3>
                                    <span className="op-success-pill">
                                        {stats.availablePorts + stats.activeCharging > 0 
                                            ? `${Math.round(((stats.availablePorts + stats.activeCharging) / (stats.availablePorts + stats.activeCharging + stats.errorPorts || 1)) * 100)}% Operasional`
                                            : '100% Siap'}
                                    </span>
                                </div>
                                <p className="op-chart-desc">Rasio kesiapan port nozzle pengisian hari ini.</p>
                                <div className="op-progress-container">
                                    <div className="op-progress-row">
                                        <div className="op-progress-info">
                                            <span>Siap / Digunakan</span>
                                            <span className="text-success">{stats.availablePorts + stats.activeCharging} Port</span>
                                        </div>
                                        <div className="op-progress-track">
                                            <div className="op-progress-fill success" style={{ 
                                                width: `${Math.round(((stats.availablePorts + stats.activeCharging) / ((stats.availablePorts + stats.activeCharging + stats.errorPorts) || 1)) * 100)}%` 
                                            }}></div>
                                        </div>
                                    </div>
                                    <div className="op-progress-row">
                                        <div className="op-progress-info">
                                            <span>Bermasalah / Maintenance</span>
                                            <span className="text-danger">{stats.errorPorts} Port</span>
                                        </div>
                                        <div className="op-progress-track">
                                            <div className="op-progress-fill danger" style={{ 
                                                width: `${Math.round((stats.errorPorts / ((stats.availablePorts + stats.activeCharging + stats.errorPorts) || 1)) * 100)}%` 
                                            }}></div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* TABEL SESI PENGISIAN DAYA AKTIF */}
                        <div className="op-table-card">
                            <h3>Sesi Pengisian Daya Aktif (Live Database)</h3>
                            <div className="op-table-responsive">
                                <table className="op-data-table">
                                    <thead>
                                        <tr>
                                            <th>Port & Tipe</th>
                                            <th>Pengguna / Kendaraan</th>
                                            <th>Daya Output (kW)</th>
                                            <th>Durasi Sesi</th>
                                            <th>Energi Masuk</th>
                                            <th>Aksi Cepat (Remote)</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {activeSessions.length > 0 ? (
                                            activeSessions.map((session) => (
                                                <tr key={session.id}>
                                                    <td>
                                                        <strong>{session.port}</strong><br/>
                                                        <span className="op-sub-text">{session.type}</span>
                                                    </td>
                                                    <td>{session.user}</td>
                                                    <td><span className="op-power-val">{session.power}</span></td>
                                                    <td>{session.duration}</td>
                                                    <td>{session.energy}</td>
                                                    <td>
                                                        <div className="op-action-btns">
                                                            <button 
                                                                className="op-btn-remote stop"
                                                                title="Remote Stop" 
                                                                onClick={() => handleRemoteAction('STOP', session.id, session.port)}
                                                            >
                                                                <FaStop size={12} />
                                                            </button>
                                                            <button 
                                                                className="op-btn-remote reboot"
                                                                title="Remote Reboot Mesin" 
                                                                onClick={() => handleRemoteAction('REBOOT', session.id, session.port)}
                                                            >
                                                                <FaPowerOff size={12} />
                                                            </button>
                                                        </div>
                                                    </td>
                                                </tr>
                                            ))
                                        ) : (
                                            <tr>
                                                <td colSpan="6" className="op-empty-row">
                                                    Tidak ada sesi pengisian aktif saat ini di stasiun.
                                                </td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>

                    </div>
                </main>
            </div>

            {/* ========================================================
                1. OVERLAY POP-UP NOTIFIKASI (MALFUNGSI & TRANSAKSI)
               ======================================================== */}
            {showNotifModal && (
                <div className="op-modal-backdrop" onClick={() => setShowNotifModal(false)}>
                    <div className="op-modal-dialog" onClick={(e) => e.stopPropagation()}>
                        
                        <div className="op-modal-head">
                            <div>
                                <h3>Pusat Pemberitahuan Stasiun</h3>
                                <p>Monitoring malfungsi unit charger & anomali transaksi</p>
                            </div>
                            <button className="op-modal-close" onClick={() => setShowNotifModal(false)}>
                                <FaTimes />
                            </button>
                        </div>

                        {/* 2 Tab Pemisah Notifikasi */}
                        <div className="op-notif-tabs">
                            <button 
                                className={`op-tab-btn ${notifTab === 'malfunction' ? 'active' : ''}`}
                                onClick={() => setNotifTab('malfunction')}
                            >
                                <FaExclamationTriangle /> Malfungsi Mesin ({criticalAlerts.length})
                            </button>
                            <button 
                                className={`op-tab-btn ${notifTab === 'transaction' ? 'active' : ''}`}
                                onClick={() => setNotifTab('transaction')}
                            >
                                <FaReceipt /> Gangguan Transaksi ({transactionAlerts.length})
                            </button>
                        </div>

                        <div className="op-modal-body">
                            {/* TAB 1: MALFUNGSI MESIN (ACTIONABLE -> BISA LANGSUNG SET MAINTENANCE) */}
                            {notifTab === 'malfunction' && (
                                <div className="op-notif-list">
                                    {criticalAlerts.length > 0 ? (
                                        criticalAlerts.map((alert) => (
                                            <div key={alert.id} className="op-notif-card danger">
                                                <div className="op-notif-title-line">
                                                    <span className="op-notif-badge-danger">
                                                        <FaWrench /> Peringatan Sistem
                                                    </span>
                                                    <span className="op-notif-time">Aktif Saat Ini</span>
                                                </div>
                                                <p className="op-notif-text">{alert.message}</p>

                                                <div className="op-notif-footer-actions">
                                                    {/* TOMBOL AKSI: MENGUBAH MESIN MENJADI MAINTENANCE */}
                                                    <button 
                                                        className="op-btn-action-maintenance"
                                                        onClick={() => handleAcceptMalfunction(alert)}
                                                        disabled={processingId === alert.id}
                                                    >
                                                        <FaCheck /> {processingId === alert.id ? 'Memproses...' : 'Terima & Set Maintenance'}
                                                    </button>
                                                    <button 
                                                        className="op-btn-action-link"
                                                        onClick={() => {
                                                            setShowNotifModal(false);
                                                            if (onNavigateToCharger) onNavigateToCharger();
                                                        }}
                                                    >
                                                        Periksa di Manage Charger &rarr;
                                                    </button>
                                                </div>
                                            </div>
                                        ))
                                    ) : (
                                        <div className="op-notif-empty">
                                            <FaCheckCircle size={30} style={{ color: '#059669', marginBottom: '8px' }} />
                                            <p>Semua unit mesin charger beroperasi normal.</p>
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* TAB 2: GANGGUAN TRANSAKSI (HANYA INFORMASI / VIEW ONLY) */}
                            {notifTab === 'transaction' && (
                                <div className="op-notif-list">
                                    {transactionAlerts.length > 0 ? (
                                        transactionAlerts.map((trx) => (
                                            <div key={trx.id} className="op-notif-card warning">
                                                <div className="op-notif-title-line">
                                                    <span className="op-notif-badge-warning">
                                                        <FaReceipt /> {trx.kode || 'TRX-ERROR'}
                                                    </span>
                                                    <span className="op-notif-time">{trx.time || 'Hari ini'}</span>
                                                </div>
                                                <p className="op-notif-text">
                                                    <strong>{trx.user}</strong>: {trx.desc}
                                                </p>
                                                <span className="op-info-note">
                                                    *Informasi saja: driver diarahkan mencoba metode bayar lain.
                                                </span>
                                            </div>
                                        ))
                                    ) : (
                                        <div className="op-notif-empty">
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
                2. OVERLAY POP-UP PENGATURAN PANEL OPERATOR
               ======================================================== */}
            {showSettingsModal && (
                <div className="op-modal-backdrop" onClick={() => setShowSettingsModal(false)}>
                    <div className="op-modal-dialog settings-box" onClick={(e) => e.stopPropagation()}>
                        <div className="op-modal-head">
                            <div>
                                <h3>Pengaturan Panel Operator</h3>
                                <p>Preferensi notifikasi dan telemetri stasiun</p>
                            </div>
                            <button className="op-modal-close" onClick={() => setShowSettingsModal(false)}>
                                <FaTimes />
                            </button>
                        </div>

                        <div className="op-modal-body">
                            <div className="op-setting-item">
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

                            <div className="op-setting-item">
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
                                    className="op-btn-action-maintenance" 
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