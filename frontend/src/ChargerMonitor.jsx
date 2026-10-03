import React, { useState, useEffect } from 'react';
import { 
    FaBell, FaCog, FaTachometerAlt, FaChargingStation, 
    FaFileAlt, FaUser, FaSignOutAlt, FaSyncAlt, FaBolt, 
    FaThermometerHalf, FaNetworkWired, FaPowerOff, FaStop, FaPlay, FaExclamationTriangle 
} from 'react-icons/fa';
import './chargerMonitor.css';
import logoECH from './assets/Gemini_Generated_Image_8581rg8581rg8581.jfif.jpeg';

function getGreeting() {
    const h = new Date().getHours();
    if (h >= 4 && h < 10) return 'Selamat pagi';
    if (h >= 10 && h < 15) return 'Selamat siang';
    if (h >= 15 && h < 18) return 'Selamat sore';
    return 'Selamat malam';
}

export default function ChargerMonitor({ user, onLogout, setActiveMenu }) {
    const [chargers, setChargers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filterStatus, setFilterStatus] = useState('ALL');

    const nameString = typeof user === 'string' 
        ? user 
        : (user?.name || user?.email || '');
    const firstName = (!nameString || nameString === 'Petugas') ? '' : nameString.split(' ')[0];

    // Fungsi ambil data port dari API Laravel
    const fetchChargersData = async () => {
        setLoading(true);
        try {
            // TODO: Hubungkan ke endpoint Laravel Controller (contoh: /api/chargers)
            // const res = await axios.get('/api/chargers');
            // setChargers(res.data);

            // Simulasi data dari database relasional Laravel
            setChargers([
                { id: 1, name: 'Port SPKLU 01', type: 'CCS2 (DC 60kW)', status: 'CHARGING', voltage: '400V', current: '112A', temp: '42°C', ocpp: 'Connected', user: 'B 1234 XYZ' },
                { id: 2, name: 'Port SPKLU 02', type: 'CCS2 (DC 60kW)', status: 'AVAILABLE', voltage: '0V', current: '0A', temp: '28°C', ocpp: 'Connected', user: '-' },
                { id: 3, name: 'Port SPKLU 03', type: 'CHAdeMO (DC 50kW)', status: 'FAULT', voltage: '0V', current: '0A', temp: '75°C', ocpp: 'Connected', user: '-' },
                { id: 4, name: 'Port SPKLU 04', type: 'AC Type 2 (22kW)', status: 'CHARGING', voltage: '380V', current: '32A', temp: '39°C', ocpp: 'Connected', user: 'H 5678 AB' },
                { id: 5, name: 'Port SPKLU 05', type: 'AC Type 2 (22kW)', status: 'OFFLINE', voltage: '0V', current: '0A', temp: '25°C', ocpp: 'Disconnected', user: '-' },
                { id: 6, name: 'Port SPKLU 06', type: 'CCS2 (DC 120kW)', status: 'AVAILABLE', voltage: '0V', current: '0A', temp: '30°C', ocpp: 'Connected', user: '-' },
            ]);
        } catch (error) {
            console.error("Gagal memuat data port:", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchChargersData();
    }, []);

    // Handler perintah remote (Start, Stop, Reboot) ke backend Laravel
    const handleRemoteControl = async (action, portName) => {
        if (window.confirm(`Konfirmasi: Kirim perintah [${action}] untuk ${portName}?`)) {
            try {
                // TODO: axios.post(`/api/chargers/${portId}/control`, { action })
                alert(`Perintah ${action} berhasil dikirim ke ${portName}`);
                fetchChargersData();
            } catch (err) {
                alert(`Gagal mengeksekusi perintah: ${err.message}`);
            }
        }
    };

    // Filter data port berdasarkan status
    const filteredChargers = filterStatus === 'ALL' 
        ? chargers 
        : chargers.filter(c => c.status === filterStatus);

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
                        <p>Panel Monitoring Port SPKLU</p>
                    </div>
                </div>

                <div className="cm-header-right">
                    <button className="cm-icon-btn" title="Notifikasi">
                        <FaBell />
                        <span className="cm-badge">2</span>
                    </button>
                    <button className="cm-icon-btn" title="Pengaturan Akun" onClick={() => setActiveMenu && setActiveMenu('profils')}>
                        <FaCog />
                    </button>
                </div>
            </header>

            {/* --- BODY CONTAINER --- */}
            <div className="cm-body-wrapper">
                
                {/* --- SIDEBAR --- */}
                <aside className="cm-sidebar">
                    <ul className="cm-menu-list">
                        <li className="cm-menu-item" onClick={() => setActiveMenu && setActiveMenu('dashboard')}>
                            <FaTachometerAlt className="cm-menu-icon" />
                            <span>Dashboard</span>
                        </li>
                        <li className="cm-menu-item active" onClick={() => setActiveMenu && setActiveMenu('ports')}>
                            <FaChargingStation className="cm-menu-icon" />
                            <span>Port Monitoring</span>
                        </li>
                        <li className="cm-menu-item" onClick={() => setActiveMenu && setActiveMenu('reports')}>
                            <FaFileAlt className="cm-menu-icon" />
                            <span>Transaction Report</span>
                        </li>
                        <li className="cm-menu-item" onClick={() => setActiveMenu && setActiveMenu('profils')}>
                            <FaUser className="cm-menu-icon" />
                            <span>Profil</span>
                        </li>
                    </ul>

                    <div className="cm-sidebar-footer">
                        <button className="cm-logout-btn" onClick={onLogout}>
                            <FaSignOutAlt /> <span>Keluar</span>
                        </button>
                    </div>
                </aside>

                {/* --- MAIN CONTENT --- */}
                <main className="cm-main-content">
                    <div className="cm-container">
                        
                        {/* Top Bar: Title & Filter */}
                        <div className="cm-top-bar">
                            <div className="cm-title-area">
                                <h1>Monitoring Telemetri Port</h1>
                                <p>Pantau tegangan, arus, suhu, dan kendalikan status unit *charger* secara *real-time*.</p>
                            </div>
                            <div className="cm-top-actions">
                                <select 
                                    className="cm-filter-select" 
                                    value={filterStatus} 
                                    onChange={(e) => setFilterStatus(e.target.value)}
                                >
                                    <option value="ALL">Semua Status</option>
                                    <option value="CHARGING">Sedang Charging</option>
                                    <option value="AVAILABLE">Tersedia</option>
                                    <option value="FAULT">Bermasalah (Fault)</option>
                                    <option value="OFFLINE">Offline</option>
                                </select>
                                <button className="cm-refresh-btn" onClick={fetchChargersData} disabled={loading}>
                                    <FaSyncAlt className={loading ? "fa-spin" : ""} /> {loading ? "Memuat..." : "Refresh"}
                                </button>
                            </div>
                        </div>

                        {/* Grid Kartu Port */}
                        <div className="cm-grid">
                            {filteredChargers.length > 0 ? (
                                filteredChargers.map((port) => (
                                    <div key={port.id} className={`cm-port-card status-${port.status.toLowerCase()}`}>
                                        
                                        {/* Card Header */}
                                        <div className="cm-port-header">
                                            <div>
                                                <h3>{port.name}</h3>
                                                <span className="cm-port-type">{port.type}</span>
                                            </div>
                                            <span className={`cm-status-badge ${port.status.toLowerCase()}`}>
                                                {port.status}
                                            </span>
                                        </div>

                                        {/* Telemetry Metrics */}
                                        <div className="cm-metrics-grid">
                                            <div className="cm-metric-item">
                                                <span className="cm-metric-label"><FaBolt /> Tegangan</span>
                                                <span className="cm-metric-val">{port.voltage}</span>
                                            </div>
                                            <div className="cm-metric-item">
                                                <span className="cm-metric-label"><FaChargingStation /> Arus</span>
                                                <span className="cm-metric-val">{port.current}</span>
                                            </div>
                                            <div className="cm-metric-item">
                                                <span className="cm-metric-label"><FaThermometerHalf /> Suhu Modul</span>
                                                <span className={`cm-metric-val ${parseInt(port.temp) > 70 ? 'text-danger' : ''}`}>{port.temp}</span>
                                            </div>
                                            <div className="cm-metric-item">
                                                <span className="cm-metric-label"><FaNetworkWired /> OCPP</span>
                                                <span className={`cm-metric-val ${port.ocpp === 'Connected' ? 'text-success' : 'text-danger'}`}>{port.ocpp}</span>
                                            </div>
                                        </div>

                                        {/* Additional Info */}
                                        <div className="cm-port-info-footer">
                                            <span>Kendaraan / Pengguna: <strong>{port.user}</strong></span>
                                        </div>

                                        {/* Remote Actions */}
                                        <div className="cm-port-actions">
                                            {port.status === 'CHARGING' ? (
                                                <button className="cm-btn stop" onClick={() => handleRemoteControl('STOP', port.name)}>
                                                    <FaStop /> Remote Stop
                                                </button>
                                            ) : (
                                                <button className="cm-btn start" onClick={() => handleRemoteControl('START', port.name)}>
                                                    <FaPlay /> Remote Start
                                                </button>
                                            )}
                                            <button className="cm-btn reboot" onClick={() => handleRemoteControl('REBOOT', port.name)}>
                                                <FaPowerOff /> Reboot
                                            </button>
                                        </div>

                                    </div>
                                ))
                            ) : (
                                <div className="cm-empty-state">
                                    <FaExclamationTriangle size={32} />
                                    <p>Tidak ada port yang cocok dengan filter status tersebut.</p>
                                </div>
                            )}
                        </div>

                    </div>
                </main>
            </div>
        </div>
    );
}