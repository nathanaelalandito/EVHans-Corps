import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { 
    FaBell, FaCog, FaTachometerAlt, FaChargingStation, FaPlug,
    FaFileAlt, FaUser, FaSignOutAlt, FaSearch, FaFilter, 
    FaDownload, FaSyncAlt, FaCheckCircle, FaTimesCircle, FaClock,
    FaTimes, FaExclamationTriangle, FaReceipt, FaWrench, FaCheck
} from 'react-icons/fa';
import { getStoredToken } from './api/auth';
import './opsReport.css';
import logoECH from './assets/Gemini_Generated_Image_8581rg8581rg8581.jfif.jpeg';

function getGreeting() {
    const h = new Date().getHours();
    if (h >= 4 && h < 10) return 'Selamat pagi';
    if (h >= 10 && h < 15) return 'Selamat siang';
    if (h >= 15 && h < 18) return 'Selamat sore';
    return 'Selamat malam';
}

export default function OpsReport({ 
    user, 
    onLogout, 
    setActiveMenu, 
    onNavigateToOpsDash, 
    onNavigateToCharger, 
    onNavigateToOpsProfil 
}) {
    const [transactions, setTransactions] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filterStatus, setFilterStatus] = useState('');
    const [searchTerm, setSearchTerm] = useState('');

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

    const nameString = typeof user === 'string' 
        ? user 
        : (user?.profile?.nama_lengkap || user?.name || user?.email || '');

    const firstName = (!nameString || nameString === 'Petugas') ? '' : nameString.split(' ')[0];

    // Ambil Data Laporan Transaksi & Notifikasi dari Backend
    const fetchReports = async () => {
        setLoading(true);
        try {
            const token = getStoredToken();
            const headers = { Authorization: `Bearer ${token}` };

            // 1. Ambil data riwayat transaksi operasional
            const response = await axios.get('http://127.0.0.1:8000/api/operator/reports', {
                params: { status: filterStatus },
                headers: headers
            });

            if (response.data && response.data.status === 'success') {
                // Mendukung baik format array langsung maupun paginate Laravel
                const txData = response.data.data?.data || response.data.data || [];
                setTransactions(txData);
            }

            // 2. Ambil data notifikasi aktif
            const resNotif = await axios.get('http://127.0.0.1:8000/api/operator/dashboard', { headers });
            if (resNotif.data?.data) {
                setCriticalAlerts(resNotif.data.data.criticalAlerts || []);
                setTransactionAlerts([
                    { id: 1, kode: 'TRX-8821', user: 'Driver B 1234 XYZ', desc: 'Gagal verifikasi saldo e-wallet.', time: 'Baru saja' }
                ]);
            }
        } catch (error) {
            console.error("Gagal memuat laporan transaksi:", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchReports();
    }, [filterStatus]);

    // Aksi: Terima Malfungsi Mesin -> Alihkan ke Maintenance
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
            fetchReports();
        } catch (err) {
            alert(`Gagal memproses: ${err.response?.data?.message || err.message}`);
        } finally {
            setProcessingId(null);
        }
    };

    const filteredTransactions = transactions.filter(tx => 
        tx.kode_perangkat?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        String(tx.id || tx.id_session || '').includes(searchTerm)
    );

    const handleExportCSV = () => {
        if (transactions.length === 0) {
            alert("Tidak ada data untuk diekspor.");
            return;
        }
        alert("Fitur ekspor laporan CSV sedang diproses...");
    };

    const totalUnreadNotif = criticalAlerts.length + transactionAlerts.length;

    return (
        <div className="rep-layout-container">
            {/* --- HEADER --- */}
            <header className="rep-header">
                <div className="rep-header-left">
                    <div className="rep-logo-box">
                        <img src={logoECH} alt="EV Charge Hub Logo"/>
                    </div>
                    <div className="rep-welcome-text">
                        <h2>{getGreeting()}, Petugas {firstName}</h2>
                        <p>Transaction & Operational Report</p>
                    </div>
                </div>

                {/* TOMBOL NOTIFIKASI & PENGATURAN */}
                <div className="rep-header-right">
                    <button 
                        className="rep-icon-btn" 
                        title="Pemberitahuan Sistem"
                        onClick={() => setShowNotifModal(true)}
                    >
                        <FaBell />
                        {totalUnreadNotif > 0 && <span className="rep-badge">{totalUnreadNotif}</span>}
                    </button>
                    <button 
                        className="rep-icon-btn" 
                        title="Pengaturan" 
                        onClick={() => setShowSettingsModal(true)}
                    >
                        <FaCog />
                    </button>
                </div>
            </header>

            {/* --- BODY CONTAINER --- */}
            <div className="rep-body-wrapper">
                
                {/* --- SIDEBAR --- */}
                <aside className="rep-sidebar">
                    <ul className="rep-menu-list">
                        <li className="rep-menu-item" onClick={onNavigateToOpsDash}>
                            <FaTachometerAlt className="rep-menu-icon" />
                            <span>Dashboard</span>
                        </li>
                        <li className="rep-menu-item" onClick={onNavigateToCharger}>
                            <FaChargingStation className="rep-menu-icon" />
                            <span>Manage Charger</span>
                        </li>
                        <li className="rep-menu-item active">
                            <FaFileAlt className="rep-menu-icon" />
                            <span>Transaction Report</span>
                        </li>
                        <li className="rep-menu-item" onClick={onNavigateToOpsProfil}>
                            <FaUser className="rep-menu-icon" />
                            <span>Profil</span>
                        </li>
                    </ul>

                    <div className="rep-sidebar-footer">
                        <button className="rep-logout-btn" onClick={onLogout}>
                            <FaSignOutAlt /> <span>Keluar</span>
                        </button>
                    </div>
                </aside>

                {/* --- MAIN CONTENT --- */}
                <main className="rep-main-content">
                    <div className="rep-dashboard-container">
                        
                        {/* Baris Atas: Judul & Tombol Aksi */}
                        <div className="rep-dash-top-bar">
                            <div className="rep-dash-title">
                                <h1>Transaction & Operational Report</h1>
                                <p>Arsip riwayat pengisian daya, durasi, total energi, dan status transaksi stasiun.</p>
                            </div>
                            <div style={{ display: 'flex', gap: '10px' }}>
                                <button className="rep-refresh-btn" onClick={fetchReports} disabled={loading}>
                                    <FaSyncAlt className={loading ? "fa-spin" : ""} /> {loading ? "Memuat..." : "Segarkan"}
                                </button>
                                <button className="rep-refresh-btn success" onClick={handleExportCSV}>
                                    <FaDownload /> Ekspor Laporan
                                </button>
                            </div>
                        </div>

                        {/* Filter & Search Bar Card */}
                        <div className="tr-filter-card">
                            <div className="tr-filter-wrapper">
                                <div className="tr-search-box">
                                    <FaSearch style={{ color: '#6b7280' }} />
                                    <input 
                                        type="text" 
                                        placeholder="Cari berdasarkan kode perangkat atau ID..." 
                                        value={searchTerm}
                                        onChange={(e) => setSearchTerm(e.target.value)}
                                    />
                                </div>

                                <div className="tr-select-box">
                                    <FaFilter style={{ color: '#6b7280' }} />
                                    <select 
                                        value={filterStatus} 
                                        onChange={(e) => setFilterStatus(e.target.value)}
                                    >
                                        <option value="">Semua Status</option>
                                        <option value="completed">Berhasil (Completed)</option>
                                        <option value="failed">Gagal (Failed)</option>
                                        <option value="active">Aktif (Active)</option>
                                    </select>
                                </div>
                            </div>
                        </div>

                        {/* Tabel Riwayat Transaksi */}
                        <div className="rep-table-card">
                            <h3>Riwayat Transaksi Stasiun (Live Database)</h3>
                            <div className="rep-table-responsive">
                                <table className="rep-data-table">
                                    <thead>
                                        <tr>
                                            <th>ID / Waktu</th>
                                            <th>Perangkat (Port)</th>
                                            <th>Konektor</th>
                                            <th>Total Energi (kWh)</th>
                                            <th>Biaya (Rp)</th>
                                            <th>Status Transaksi</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {filteredTransactions.length > 0 ? (
                                            filteredTransactions.map((tx) => (
                                                <tr key={tx.id || tx.id_session}>
                                                    <td>
                                                        <strong>#TX-{tx.id || tx.id_session}</strong><br/>
                                                        <span className="rep-sub-text">{tx.created_at}</span>
                                                    </td>
                                                    <td><strong>{tx.kode_perangkat || 'Port Charger'}</strong></td>
                                                    <td><span className="rep-sub-text uppercase">{tx.tipe_konektor || 'CCS2'}</span></td>
                                                    <td>{tx.total_energy || tx.kwh_used || '0'} kWh</td>
                                                    <td>Rp {Number(tx.total_cost || tx.total_biaya || 0).toLocaleString('id-ID')}</td>
                                                    <td>
                                                        <span className={`rep-status-badge ${tx.status || 'completed'}`}>
                                                            {tx.status === 'completed' && <FaCheckCircle />}
                                                            {tx.status === 'failed' && <FaTimesCircle />}
                                                            {tx.status === 'active' && <FaClock />}
                                                            {tx.status || 'Completed'}
                                                        </span>
                                                    </td>
                                                </tr>
                                            ))
                                        ) : (
                                            <tr>
                                                <td colSpan="6" className="rep-empty-row">
                                                    Tidak ada riwayat transaksi ditemukan di database untuk filter ini.
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
                1. OVERLAY NOTIFIKASI POP-UP (PREFIX REP)
               ======================================================== */}
            {showNotifModal && (
                <div className="rep-modal-backdrop" onClick={() => setShowNotifModal(false)}>
                    <div className="rep-modal-dialog" onClick={(e) => e.stopPropagation()}>
                        
                        <div className="rep-modal-head">
                            <div>
                                <h3>Pusat Pemberitahuan Stasiun</h3>
                                <p>Monitoring malfungsi unit charger & anomali transaksi</p>
                            </div>
                            <button className="rep-modal-close" onClick={() => setShowNotifModal(false)}>
                                <FaTimes />
                            </button>
                        </div>

                        {/* 2 Tab Notifikasi */}
                        <div className="rep-notif-tabs">
                            <button 
                                className={`rep-tab-btn ${notifTab === 'malfunction' ? 'active' : ''}`}
                                onClick={() => setNotifTab('malfunction')}
                            >
                                <FaExclamationTriangle /> Malfungsi Mesin ({criticalAlerts.length})
                            </button>
                            <button 
                                className={`rep-tab-btn ${notifTab === 'transaction' ? 'active' : ''}`}
                                onClick={() => setNotifTab('transaction')}
                            >
                                <FaReceipt /> Gangguan Transaksi ({transactionAlerts.length})
                            </button>
                        </div>

                        <div className="rep-modal-body">
                            {/* TAB 1: MALFUNGSI MESIN (BISA LANGSUNG SET MAINTENANCE) */}
                            {notifTab === 'malfunction' && (
                                <div className="rep-notif-list">
                                    {criticalAlerts.length > 0 ? (
                                        criticalAlerts.map((alert) => (
                                            <div key={alert.id} className="rep-notif-card danger">
                                                <div className="rep-notif-title-line">
                                                    <span className="rep-notif-badge-danger">
                                                        <FaWrench /> Peringatan Sistem
                                                    </span>
                                                    <span className="rep-notif-time">Aktif Saat Ini</span>
                                                </div>
                                                <p className="rep-notif-text">{alert.message}</p>

                                                <div className="rep-notif-footer-actions">
                                                    <button 
                                                        className="rep-btn-action-maintenance"
                                                        onClick={() => handleAcceptMalfunction(alert)}
                                                        disabled={processingId === alert.id}
                                                    >
                                                        <FaCheck /> {processingId === alert.id ? 'Memproses...' : 'Terima & Set Maintenance'}
                                                    </button>
                                                    <button 
                                                        className="rep-btn-action-link"
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
                                        <div className="rep-notif-empty">
                                            <FaCheckCircle size={30} style={{ color: '#059669', marginBottom: '8px' }} />
                                            <p>Semua unit mesin charger beroperasi normal.</p>
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* TAB 2: GANGGUAN TRANSAKSI (HANYA INFORMASI) */}
                            {notifTab === 'transaction' && (
                                <div className="rep-notif-list">
                                    {transactionAlerts.length > 0 ? (
                                        transactionAlerts.map((trx) => (
                                            <div key={trx.id} className="rep-notif-card warning">
                                                <div className="rep-notif-title-line">
                                                    <span className="rep-notif-badge-warning">
                                                        <FaReceipt /> {trx.kode || 'TRX-ERROR'}
                                                    </span>
                                                    <span className="rep-notif-time">{trx.time || 'Hari ini'}</span>
                                                </div>
                                                <p className="rep-notif-text">
                                                    <strong>{trx.user}</strong>: {trx.desc}
                                                </p>
                                                <span className="rep-info-note">
                                                    *Informasi saja: driver diarahkan mencoba metode bayar lain.
                                                </span>
                                            </div>
                                        ))
                                    ) : (
                                        <div className="rep-notif-empty">
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
                2. OVERLAY PENGATURAN (PREFIX REP)
               ======================================================== */}
            {showSettingsModal && (
                <div className="rep-modal-backdrop" onClick={() => setShowSettingsModal(false)}>
                    <div className="rep-modal-dialog settings-box" onClick={(e) => e.stopPropagation()}>
                        <div className="rep-modal-head">
                            <div>
                                <h3>Pengaturan Panel Operator</h3>
                                <p>Preferensi notifikasi dan telemetri stasiun</p>
                            </div>
                            <button className="rep-modal-close" onClick={() => setShowSettingsModal(false)}>
                                <FaTimes />
                            </button>
                        </div>

                        <div className="rep-modal-body">
                            <div className="rep-setting-item">
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

                            <div className="rep-setting-item">
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
                                    className="rep-btn-action-maintenance" 
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