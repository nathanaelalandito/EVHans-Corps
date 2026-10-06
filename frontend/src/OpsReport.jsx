import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { 
    FaBell, FaCog, FaTachometerAlt, FaChargingStation, FaPlug,
    FaFileAlt, FaUser, FaSignOutAlt, FaSearch, FaFilter, 
    FaDownload, FaSyncAlt, FaCheckCircle, FaTimesCircle, FaClock 
} from 'react-icons/fa';
import './opsReport.css'; // Menggunakan CSS eksternal
import logoECH from './assets/Gemini_Generated_Image_8581rg8581rg8581.jfif.jpeg';

function getGreeting() {
    const h = new Date().getHours();
    if (h >= 4 && h < 10) return 'Selamat pagi';
    if (h >= 10 && h < 15) return 'Selamat siang';
    if (h >= 15 && h < 18) return 'Selamat sore';
    return 'Selamat malam';
}

export default function OpsReport({ user, onLogout, setActiveMenu, onNavigateToOpsDash, onNavigateToCharger, onNavigateToPort}) {
    const [transactions, setTransactions] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filterStatus, setFilterStatus] = useState('');
    const [searchTerm, setSearchTerm] = useState('');
    const [criticalAlerts] = useState([]); // Dapat disesuaikan dengan badge notifikasi jika diperlukan

    const nameString = typeof user === 'string' 
        ? user 
        : (user?.profile?.nama_lengkap || user?.name || user?.email || '');

    const firstName = (!nameString || nameString === 'Petugas') ? '' : nameString.split(' ')[0];

    const fetchReports = async () => {
        setLoading(true);
        try {
            const response = await axios.get('/api/operator/operational-reports', {
                params: { status: filterStatus },
                headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
            });

            if (response.data && response.data.status === 'success') {
                setTransactions(response.data.data);
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

    const filteredTransactions = transactions.filter(tx => 
        tx.kode_perangkat?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        String(tx.id || '').includes(searchTerm)
    );

    const handleExportCSV = () => {
        if (transactions.length === 0) {
            alert("Tidak ada data untuk diekspor.");
            return;
        }
        alert("Fitur ekspor laporan berhasil dipicu.");
    };

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

                <div className="rep-header-right">
                    <button className="rep-icon-btn" title="Notifikasi">
                        <FaBell />
                        {criticalAlerts.length > 0 && <span className="rep-badge">{criticalAlerts.length}</span>}
                    </button>
                    <button className="rep-icon-btn" title="Pengaturan Akun" onClick={() => setActiveMenu && setActiveMenu('profils')}>
                        <FaCog />
                    </button>
                </div>
            </header>

            {/* --- BODY CONTAINER --- */}
            <div className="rep-body-wrapper">
                
                {/* --- SIDEBAR --- */}
                <aside className="rep-sidebar">
                    <ul className="rep-menu-list">
                        <li className="rep-menu-item" onClick={() => { setActiveMenu && setActiveMenu('dashboard');
                            if (onNavigateToOpsDash) onNavigateToOpsDash();
                        }}>
                            <FaTachometerAlt className="rep-menu-icon" />
                            <span>Dashboard</span>
                        </li>
                        <li className="rep-menu-item" onClick={() => {  setActiveMenu && setActiveMenu('charger'); 
                            if (onNavigateToCharger) onNavigateToCharger(); 
                        }}>
                            <FaChargingStation className="rep-menu-icon" />
                            <span>Manage Charger</span>
                        </li>
                        <li className="op-menu-item" onClick={() => { setActiveMenu && setActiveMenu('ports');
                            if(onNavigateToPort) onNavigateToPort();
                        }}>
                            <FaPlug className="op-menu-icon" /><span>Manage port</span>
                        </li>
                        <li className="rep-menu-item active" onClick={() => setActiveMenu && setActiveMenu('reports')}>
                            <FaFileAlt className="op-menu-icon" />
                            <span>Transaction Report</span>
                        </li>
                        <li className="rep-menu-item" onClick={() => setActiveMenu && setActiveMenu('profils')}>
                            <FaUser className="rep-menu-icon" />
                            <span>Profil</span>
                        </li>
                    </ul>

                    <div className="rep-sidebar-footer">
                        <button className="op-logout-btn" onClick={onLogout}>
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
                                        placeholder="Cari berdasarkan kode perangkat..." 
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
                                                    <td><strong>Port {tx.kode_perangkat}</strong></td>
                                                    <td><span className="rep-sub-text uppercase">{tx.tipe_konektor}</span></td>
                                                    <td>{tx.total_energy || tx.kwh_used || '0'} kWh</td>
                                                    <td>Rp {Number(tx.total_cost || tx.total_biaya || 0).toLocaleString('id-ID')}</td>
                                                    <td>
                                                        <span className={`rep-status-badge ${tx.status}`}>
                                                            {tx.status === 'completed' && <FaCheckCircle />}
                                                            {tx.status === 'failed' && <FaTimesCircle />}
                                                            {tx.status === 'active' && <FaClock />}
                                                            {tx.status}
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
        </div>
    );
}