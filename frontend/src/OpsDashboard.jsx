import React, { useState, useEffect } from 'react';
import { 
    FaBell, FaCog, FaTachometerAlt, FaChargingStation, 
    FaFileAlt, FaUser, FaSignOutAlt, FaBolt, FaCheckCircle, 
    FaExclamationTriangle, FaDollarSign, FaSyncAlt, FaPowerOff, FaStop, FaChartLine, FaExclamationCircle
} from 'react-icons/fa';
import './opsDashboard.css';
import logoECH from './assets/Gemini_Generated_Image_8581rg8581rg8581.jfif.jpeg';

function getGreeting() {
    const h = new Date().getHours();
    if (h >= 4 && h < 10) return 'Selamat pagi';
    if (h >= 10 && h < 15) return 'Selamat siang';
    if (h >= 15 && h < 18) return 'Selamat sore';
    return 'Selamat malam';
}

export default function OperatorDashboard({ user, onLogout, setActiveMenu}) {
    const [stats, setStats] = useState({
        activeCharging: 0,
        availablePorts: 0,
        errorPorts: 0,
        totalRevenueToday: 'Rp 0'
    });
    
    const [activeSessions, setActiveSessions] = useState([]);
    const [criticalAlerts, setCriticalAlerts] = useState([]);
    const [loading, setLoading] = useState(true);

    const nameString = typeof user === 'string' 
        ? user 
        : (user?.name || user?.email || '');
    const firstName = (!nameString || nameString === 'Petugas') ? '' : nameString.split(' ')[0];

    const fetchDashboardData = async () => {
        setLoading(true);
        try {
            // TODO: Ganti dengan pemanggilan API ke backend Laravel Anda (Axios / Fetch)
            // const res = await axios.get('/api/dashboard/summary');
            
            // Simulasi data dari database
            setStats({
                activeCharging: 4,
                availablePorts: 8,
                errorPorts: 2,
                totalRevenueToday: 'Rp 2.150.000'
            });

            setCriticalAlerts([
                { id: 1, portId: 'ports', message: 'Port 03: Suhu Tinggi 75°C terdeteksi pada modul DC.' },
                { id: 2, portId: 'ports', message: 'Port 05: Koneksi OCPP server terputus sementara.' }
            ]);

            setActiveSessions([
                { id: 1, port: 'Port SPKLU 01', type: 'CCS2 (DC)', user: 'B 1234 XYZ', power: '45 kW', duration: '35 mnt', energy: '26.4 kWh' },
                { id: 2, port: 'Port SPKLU 04', type: 'AC Type 2', user: 'H 5678 AB', power: '22 kW', duration: '12 mnt', energy: '4.2 kWh' },
            ]);
        } catch (error) {
            console.error("Gagal memuat data dari database:", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchDashboardData();
    }, []);

    const handleRemoteAction = async (actionType, portName) => {
        if (window.confirm(`Konfirmasi: Kirim perintah ${actionType} untuk ${portName}?`)) {
            try {
                // TODO: Hubungkan ke endpoint Laravel Controller (contoh: POST /api/chargers/remote)
                alert(`Perintah ${actionType} berhasil dikirim ke ${portName}`);
                fetchDashboardData();
            } catch (err) {
                alert(`Gagal mengeksekusi perintah: ${err.message}`);
            }
        }
    };

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

                <div className="op-header-right">
                    <button className="op-icon-btn" title="Notifikasi">
                        <FaBell />
                        <span className="op-badge">2</span>
                    </button>
                    <button className="op-icon-btn" title="Pengaturan Akun" onClick={() => setActiveMenu && setActiveMenu('profils')}>
                        <FaCog />
                    </button>
                </div>
            </header>

            {/* --- BODY CONTAINER --- */}
            <div className="op-body-wrapper">
                
                {/* --- SIDEBAR --- */}
                <aside className="op-sidebar">
                    <ul className="op-menu-list">
                        <li className="op-menu-item active" onClick={() => setActiveMenu && setActiveMenu('dashboard')}>
                            <FaTachometerAlt className="op-menu-icon" />
                            <span>Dashboard</span>
                        </li>
                        <li className="op-menu-item" onClick={() => setActiveMenu && setActiveMenu('ports')}>
                            <FaChargingStation className="op-menu-icon" />
                            <span>Port Monitoring</span>
                        </li>
                        <li className="op-menu-item" onClick={() => setActiveMenu && setActiveMenu('reports')}>
                            <FaFileAlt className="op-menu-icon" />
                            <span>Transaction Report</span>
                        </li>
                        <li className="op-menu-item" onClick={() => setActiveMenu && setActiveMenu('profils')}>
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

                        {/* 1. WIDGET "QUICK ALERT / LIVE TICKER" */}
                        {criticalAlerts.length > 0 && (
                            <div className="op-alert-ticker">
                                <FaExclamationCircle className="op-alert-icon-left" />
                                <div className="op-alert-content">
                                    <span className="op-alert-title">Peringatan Kritis Sistem Aktif:</span>
                                    {criticalAlerts.map(alert => (
                                        <span 
                                            key={alert.id} 
                                            className="op-alert-link"
                                            onClick={() => setActiveMenu && setActiveMenu(alert.portId)}
                                        >
                                            {alert.message} (Klik untuk periksa port &rarr;)
                                        </span>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Kartu Statistik Ringkas */}
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
                                    <p>Port Tersedia</p>
                                    <h3>{stats.availablePorts} Port</h3>
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

                        {/* 2 & 3. BAGIAN ANALITIK: GRAFIK UTILITAS & TREN KEBERHASILAN SESI */}
                        {/* 2 & 3. BAGIAN ANALITIK: GRAFIK UTILITAS & TREN KEBERHASILAN SESI */}
                        <div className="op-analytics-grid">
                            
                            {/* Grafik Jam Sibuk (Peak Hours) */}
                            <div className="op-table-card op-chart-box">
                                <div className="op-chart-header">
                                    <h3>Utilitas Jam Sibuk (Peak Hours)</h3>
                                    <FaChartLine className="op-chart-icon-title" />
                                </div>
                                <p className="op-chart-desc">Estimasi kepadatan stasiun berdasarkan data mingguan operasional.</p>
                                <div className="op-bar-chart-container">
                                    <div className="op-bars-wrapper">
                                        <div className="op-bar-item"><div className="op-bar bar-low" style={{ height: '50px' }}></div><span className="op-bar-label">08:00</span></div>
                                        <div className="op-bar-item"><div className="op-bar bar-peak" style={{ height: '115px' }} title="Puncak Tertinggi"></div><span className="op-bar-label bold">12:00</span></div>
                                        <div className="op-bar-item"><div className="op-bar bar-mid" style={{ height: '75px' }}></div><span className="op-bar-label">15:00</span></div>
                                        <div className="op-bar-item"><div className="op-bar bar-peak" style={{ height: '125px' }} title="Puncak Tertinggi"></div><span className="op-bar-label bold">18:00</span></div>
                                        <div className="op-bar-item"><div className="op-bar bar-low" style={{ height: '35px' }}></div><span className="op-bar-label">21:00</span></div>
                                    </div>
                                    <span className="op-chart-footer-note">⚡ Puncak kepadatan tertinggi terjadi pada pukul 12:00 & 18:00 WIB.</span>
                                </div>
                            </div>

                            {/* Tren Success Rate Sesi Hari Ini */}
                            <div className="op-table-card op-chart-box">
                                <div className="op-chart-header">
                                    <h3>Success Rate</h3>
                                    <span className="op-success-pill">95.2% Berhasil</span>
                                </div>
                                <p className="op-chart-desc">Perbandingan sesi sukses vs gagal hari ini.</p>
                                <div className="op-progress-container">
                                    <div className="op-progress-row">
                                        <div className="op-progress-info">
                                            <span>Berhasil (Success)</span>
                                            <span className="text-success">40 Sesi</span>
                                        </div>
                                        <div className="op-progress-track">
                                            <div className="op-progress-fill success" style={{ width: '95%' }}></div>
                                        </div>
                                    </div>
                                    <div className="op-progress-row">
                                        <div className="op-progress-info">
                                            <span>Gagal (Failed)</span>
                                            <span className="text-danger">2 Sesi</span>
                                        </div>
                                        <div className="op-progress-track">
                                            <div className="op-progress-fill danger" style={{ width: '5%' }}></div>
                                        </div>
                                    </div>
                                </div>
                            </div>

                        </div>

                        {/* Sesi Pengisian Daya Aktif & Kontrol Cepat */}
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
                                                                onClick={() => handleRemoteAction('STOP', session.port)}
                                                            >
                                                                <FaStop size={12} />
                                                            </button>
                                                            <button 
                                                                className="op-btn-remote reboot"
                                                                title="Remote Reboot Mesin" 
                                                                onClick={() => handleRemoteAction('REBOOT', session.port)}
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
                                                    Tidak ada sesi pengisian aktif saat ini.
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