import React, { useState, useEffect } from 'react';
import { 
    FaBell, FaCog, FaTachometerAlt, FaChargingStation, FaPlug,
    FaFileAlt, FaUser, FaSignOutAlt, FaSyncAlt, FaBolt, 
    FaPowerOff, FaStop, FaPlay, FaExclamationTriangle, FaPlus, FaEdit, FaTrash, FaTimes 
} from 'react-icons/fa';
import axios from 'axios';
import { getStoredToken } from './api/auth';
import './portMonitor.css'; // Menggunakan styling eksternal berseri prt-
import logoECH from './assets/Gemini_Generated_Image_8581rg8581rg8581.jfif.jpeg';

function getGreeting() {
    const h = new Date().getHours();
    if (h >= 4 && h < 10) return 'Selamat pagi';
    if (h >= 10 && h < 15) return 'Selamat siang';
    if (h >= 15 && h < 18) return 'Selamat sore';
    return 'Selamat malam';
}

export default function PortManagement({ user, onLogout, setActiveMenu, onNavigateToOpsDash, onNavigateToOpsReport }) {
    const [ports, setPorts] = useState([]);
    const [chargers, setChargers] = useState([]);
    const [loading, setLoading] = useState(true);

    // State untuk Filter Ganda
    const [filterStatus, setFilterStatus] = useState('ALL');
    const [filterCharger, setFilterCharger] = useState('ALL');

    // State untuk Modal Form (Tambah / Edit Port)
    const [showModal, setShowModal] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [currentPortId, setCurrentPortId] = useState(null);
    const [formData, setFormData] = useState({
        id_charger: '',
        nomor_port: '',
        tipe_konektor: '',
        tipe_charging: 'DC',
        daya_maks_kw: '',
        status_port: 'Available'
    });

    const nameString = typeof user === 'string' 
        ? user 
        : (user?.profile?.nama_lengkap || user?.name || user?.email || '');

    const firstName = (!nameString || nameString === 'Petugas') ? '' : nameString.split(' ')[0];

    // Mengambil data Port & Charger dari API Operator
    const fetchPortData = async () => {
        setLoading(true);
        try {
            const token = getStoredToken(); 
            const headers = { Authorization: `Bearer ${token}` };

            const [portsRes, chargersRes] = await Promise.all([
                axios.get('http://127.0.0.1:8000/api/operator/ports', { headers }),
                axios.get('http://127.0.0.1:8000/api/operator/chargers', { headers })
            ]);

            setPorts(portsRes.data.data || []);
            setChargers(chargersRes.data.data || []);
        } catch (error) {
            console.error("Gagal memuat data port:", error);
            setPorts([]);
            setChargers([]);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchPortData();
    }, []);

    // Buka Modal Tambah Port
    const handleOpenAddModal = () => {
        setIsEditing(false);
        setFormData({
            id_charger: chargers[0]?.id_charger || '',
            nomor_port: '',
            tipe_konektor: '',
            tipe_charging: 'DC',
            daya_maks_kw: 50,
            status_port: 'Available'
        });
        setShowModal(true);
    };

    // Buka Modal Edit Port
    const handleOpenEditModal = (port) => {
        setIsEditing(true);
        setCurrentPortId(port.id_port);
        setFormData({
            id_charger: port.id_charger || '',
            nomor_port: port.nomor_port || '',
            tipe_konektor: port.tipe_konektor || '',
            tipe_charging: port.tipe_charging || 'DC',
            daya_maks_kw: port.daya_maks_kw || 50,
            status_port: port.status_port || 'Available'
        });
        setShowModal(true);
    };

    // Simpan Data (Create / Update Port ke Operator API)
    const handleFormSubmit = async (e) => {
        e.preventDefault();
        try {
            const token = getStoredToken();
            const headers = { Authorization: `Bearer ${token}` };

            if (isEditing) {
                await axios.put(`http://127.0.0.1:8000/api/operator/ports/${currentPortId}`, formData, { headers });
                alert(`Port ${formData.nomor_port} berhasil diperbarui!`);
            } else {
                await axios.post('http://127.0.0.1:8000/api/operator/ports', formData, { headers });
                alert(`Port baru berhasil ditambahkan!`);
            }
            setShowModal(false);
            fetchPortData();
        } catch (err) {
            alert(`Gagal menyimpan data port: ${err.response?.data?.message || err.message}`);
        }
    };

    // Hapus Port
    const handleDeletePort = async (idPort, nomorPort) => {
        if (window.confirm(`Peringatan: Apakah Anda yakin ingin menghapus ${nomorPort}?`)) {
            try {
                const token = getStoredToken();
                const headers = { Authorization: `Bearer ${token}` };
                await axios.delete(`http://127.0.0.1:8000/api/operator/ports/${idPort}`, { headers });
                fetchPortData();
                alert(`Port ${nomorPort} berhasil dihapus.`);
            } catch (err) {
                alert(`Gagal menghapus port: ${err.response?.data?.message || err.message}`);
            }
        }
    };

    // Kontrol Jarak Jauh Port (Start / Stop / Reboot)
    const handleRemoteControl = async (action, portId, nomorPort) => {
        let confirmMsg = `Konfirmasi: Kirim perintah [${action}] untuk ${nomorPort}?`;
        if (window.confirm(confirmMsg)) {
            try {
                const token = getStoredToken();
                const headers = { Authorization: `Bearer ${token}` };

                let endpoint = '';
                if (action === 'START') endpoint = `ports/${portId}/start`;
                else if (action === 'STOP') endpoint = `ports/${portId}/stop`;
                else if (action === 'REBOOT') endpoint = `ports/${portId}/reboot`;

                await axios.post(`http://127.0.0.1:8000/api/operator/${endpoint}`, {}, { headers });

                alert(`Perintah ${action} berhasil dikirim ke ${nomorPort}`);
                fetchPortData();
            } catch (err) {
                alert(`Gagal mengirim perintah ${action}: ${err.response?.data?.message || err.message}`);
            }
        }
    };

    // Logika Filter Ganda (Status & Charger Induk)
    const filteredPorts = ports.filter((port) => {
        const portStatus = (port.status_port || 'Available').toLowerCase();
        const matchStatus = filterStatus === 'ALL' || portStatus === filterStatus.toLowerCase();
        
        const matchCharger = filterCharger === 'ALL' || 
            String(port.id_charger) === String(filterCharger);

        return matchStatus && matchCharger;
    });

    return (
        <div className="prt-layout-container">
            {/* --- HEADER --- */}
            <header className="prt-header">
                <div className="prt-header-left">
                    <div className="prt-logo-box">
                        <img src={logoECH} alt="EV Charge Hub Logo"/>
                    </div>
                    <div className="prt-welcome-text">
                        <h2>{getGreeting()}, Petugas {firstName}</h2>
                        <p>Panel Monitoring & Manajemen Port SPKLU</p>
                    </div>
                </div>

                <div className="prt-header-right">
                    <button className="prt-icon-btn" title="Notifikasi"><FaBell /><span className="prt-badge">2</span></button>
                    <button className="prt-icon-btn" title="Pengaturan" onClick={() => setActiveMenu && setActiveMenu('profils')}><FaCog /></button>
                </div>
            </header>

            {/* --- BODY CONTAINER --- */}
            <div className="prt-body-wrapper">
                
                {/* --- SIDEBAR --- */}
                <aside className="prt-sidebar">
                    <ul className="prt-menu-list">
                        <li className="prt-menu-item" onClick={() => {
                            setActiveMenu && setActiveMenu('dashboard');
                            if (onNavigateToOpsDash) onNavigateToOpsDash();
                        }}>
                            <FaTachometerAlt className="prt-menu-icon" /><span>Dashboard</span>
                        </li>
                        <li className="prt-menu-item" onClick={() => setActiveMenu && setActiveMenu('charger')}>
                            <FaChargingStation className="prt-menu-icon" /><span>Manage Charger</span>
                        </li>
                        <li className="prt-menu-item active" onClick={() => setActiveMenu && setActiveMenu('port')}>
                            <FaPlug className="prt-menu-icon" /><span>Manage Port</span>
                        </li>
                        <li className="prt-menu-item" onClick={() => {
                            setActiveMenu && setActiveMenu('report');
                            if (onNavigateToOpsReport) onNavigateToOpsReport();
                        }}>
                            <FaFileAlt className="prt-menu-icon" /><span>Manage Report</span>
                        </li>
                        <li className="prt-menu-item" onClick={() => setActiveMenu && setActiveMenu('profil')}>
                            <FaUser className="prt-menu-icon" /><span>Profil</span>
                        </li>
                    </ul>
                    <div className="prt-sidebar-footer">
                        <button className="prt-logout-btn" onClick={onLogout}><FaSignOutAlt /> <span>Keluar</span></button>
                    </div>
                </aside>

                {/* --- MAIN CONTENT --- */}
                <main className="prt-main-content">
                    <div className="prt-container">
                        
                        {/* Top Bar dengan Filter Ganda & Tombol Tambah */}
                        <div className="prt-top-bar">
                            <div className="prt-title-area">
                                <h1>Manajemen Port & Nozzle Charger</h1>
                                <p>Kontrol status konektor port, spesifikasi daya, serta penambahan unit port baru.</p>
                            </div>
                            <div className="prt-top-actions" style={{ gap: '10px', flexWrap: 'wrap' }}>
                                <button className="prt-add-btn" onClick={handleOpenAddModal}>
                                    <FaPlus /> Tambah Port Baru
                                </button>
                                
                                {/* Filter 1: Berdasarkan Status Port */}
                                <select className="prt-filter-select" value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}>
                                    <option value="ALL">Semua Status</option>
                                    <option value="Available">Available</option>
                                    <option value="Charging">Charging</option>
                                    <option value="Reserved">Reserved</option>
                                    <option value="Out of Order">Out of Order</option>
                                    <option value="Maintenance">Maintenance</option>
                                </select>

                                {/* Filter 2: Berdasarkan Mesin Charger Induk */}
                                <select className="prt-filter-select" value={filterCharger} onChange={(e) => setFilterCharger(e.target.value)}>
                                    <option value="ALL">Semua Mesin Charger</option>
                                    {chargers.map((ch) => (
                                        <option key={ch.id_charger} value={ch.id_charger}>
                                            {ch.kode_perangkat} ({ch.merek_model})
                                        </option>
                                    ))}
                                </select>

                                <button className="prt-refresh-btn" onClick={fetchPortData} disabled={loading} title="Refresh Data">
                                    <FaSyncAlt className={loading ? "fa-spin" : ""} />
                                </button>
                            </div>
                        </div>

                        {/* Grid Kartu Port */}
                        <div className="prt-grid">
                            {filteredPorts.length > 0 ? (
                                filteredPorts.map((port) => {
                                    const portId = port.id_port;
                                    const nomorPort = port.nomor_port || 'Port 1';
                                    const statusRaw = (port.status_port || 'Available').toLowerCase();
                                    
                                    let statusClass = 'available';
                                    if (statusRaw === 'charging') statusClass = 'charging';
                                    else if (statusRaw === 'reserved') statusClass = 'reserved';
                                    else if (statusRaw === 'out of order') statusClass = 'out-of-order';
                                    else if (statusRaw === 'maintenance') statusClass = 'maintenance';

                                    return (
                                        <div key={portId} className={`prt-port-card status-${statusClass}`}>
                                            
                                            <div className="prt-port-header">
                                                <div>
                                                    <h3>{nomorPort}</h3>
                                                    <span className="prt-port-type">
                                                        Mesin: {port.nama_charger || `ID: ${port.id_charger}`}
                                                    </span>
                                                </div>
                                                <div className="prt-header-badges">
                                                    <span className={`prt-status-badge ${statusClass}`}>
                                                        {port.status_port}
                                                    </span>
                                                    <div className="prt-crud-icons">
                                                        <FaEdit title="Ubah Port" onClick={() => handleOpenEditModal(port)} />
                                                        <FaTrash title="Hapus Port" onClick={() => handleDeletePort(portId, nomorPort)} />
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="prt-metrics-grid">
                                                <div className="prt-metric-item">
                                                    <span className="prt-metric-label"><FaPlug /> Konektor ({port.tipe_charging})</span>
                                                    <span className="prt-metric-val">{port.tipe_konektor}</span>
                                                </div>
                                                <div className="prt-metric-item">
                                                    <span className="prt-metric-label"><FaBolt /> Daya Maksimal</span>
                                                    <span className="prt-metric-val">{port.daya_maks_kw} kW</span>
                                                </div>
                                            </div>

                                            <div className="prt-port-actions">
                                                <button className="prt-btn start" onClick={() => handleRemoteControl('START', portId, nomorPort)}>
                                                    <FaPlay /> Start
                                                </button>
                                                <button className="prt-btn stop" onClick={() => handleRemoteControl('STOP', portId, nomorPort)}>
                                                    <FaStop /> Stop
                                                </button>
                                                <button className="prt-btn reboot" onClick={() => handleRemoteControl('REBOOT', portId, nomorPort)}>
                                                    <FaPowerOff /> Reboot
                                                </button>
                                            </div>

                                        </div>
                                    );
                                })
                            ) : (
                                <div className="prt-empty-state">
                                    <FaExclamationTriangle size={32} />
                                    <p>Tidak ada unit port ditemukan di database operasional.</p>
                                </div>
                            )}
                        </div>

                    </div>
                </main>
            </div>

            {/* --- MODAL FORM OVERLAY (CREATE / UPDATE PORT) --- */}
            {showModal && (
                <div className="prt-modal-overlay">
                    <div className="prt-modal-card">
                        <div className="prt-modal-header">
                            <h3>{isEditing ? 'Ubah Konfigurasi Port' : 'Tambah Unit Port Baru'}</h3>
                            <button className="prt-close-modal" onClick={() => setShowModal(false)}><FaTimes /></button>
                        </div>
                        <form onSubmit={handleFormSubmit} className="prt-form">
                            <div className="prt-form-group">
                                <label>Pilih Mesin Charger Induk</label>
                                <select 
                                    value={formData.id_charger} 
                                    onChange={(e) => setFormData({...formData, id_charger: e.target.value})} 
                                    required
                                >
                                    <option value="">-- Pilih Charger --</option>
                                    {chargers.map((ch) => (
                                        <option key={ch.id_charger} value={ch.id_charger}>
                                            {ch.kode_perangkat} ({ch.merek_model})
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div className="prt-form-group">
                                <label>Nomor Port / Nozzle</label>
                                <input 
                                    type="text" 
                                    placeholder="Contoh: Port A, Port 1" 
                                    value={formData.nomor_port} 
                                    onChange={(e) => setFormData({...formData, nomor_port: e.target.value})} 
                                    required 
                                />
                            </div>

                            <div className="prt-form-row">
                                <div className="prt-form-group">
                                    <label>Tipe Konektor</label>
                                    <input 
                                        type="text" 
                                        placeholder="Contoh: CCS2, CHAdeMO" 
                                        value={formData.tipe_konektor} 
                                        onChange={(e) => setFormData({...formData, tipe_konektor: e.target.value})} 
                                        required 
                                    />
                                </div>
                                <div className="prt-form-group">
                                    <label>Tipe Charging</label>
                                    <select 
                                        value={formData.tipe_charging} 
                                        onChange={(e) => setFormData({...formData, tipe_charging: e.target.value})}
                                    >
                                        <option value="DC">DC</option>
                                        <option value="AC">AC</option>
                                    </select>
                                </div>
                            </div>

                            <div className="prt-form-row">
                                <div className="prt-form-group">
                                    <label>Daya Maksimal (kW)</label>
                                    <input 
                                        type="number" 
                                        step="0.01" 
                                        value={formData.daya_maks_kw} 
                                        onChange={(e) => setFormData({...formData, daya_maks_kw: e.target.value})} 
                                        required 
                                    />
                                </div>
                                <div className="prt-form-group">
                                    <label>Status Port</label>
                                    <select 
                                        value={formData.status_port} 
                                        onChange={(e) => setFormData({...formData, status_port: e.target.value})}
                                    >
                                        <option value="Available">Available</option>
                                        <option value="Charging">Charging</option>
                                        <option value="Reserved">Reserved</option>
                                        <option value="Out of Order">Out of Order</option>
                                        <option value="Maintenance">Maintenance</option>
                                    </select>
                                </div>
                            </div>

                            <div className="prt-modal-actions">
                                <button type="button" className="prt-btn-secondary" onClick={() => setShowModal(false)}>Batal</button>
                                <button type="submit" className="prt-btn-primary">Simpan ke Database</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}