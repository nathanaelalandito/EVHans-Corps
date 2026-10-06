import React, { useState, useEffect } from 'react';
import { 
    FaBell, FaCog, FaTachometerAlt, FaChargingStation, FaPlug,
    FaFileAlt, FaUser, FaSignOutAlt, FaSyncAlt, FaBolt, 
    FaThermometerHalf, FaNetworkWired, FaPowerOff, FaStop, FaPlay, FaExclamationTriangle, FaPlus, FaEdit, FaTrash, FaTimes 
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

export default function ChargerMonitor({ user, onLogout, setActiveMenu, onNavigateToOpsDash, onNavigateToPort, onNavigateToOpsReport }) {
    const [chargers, setChargers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filterStatus, setFilterStatus] = useState('ALL');

    // State untuk Modal Form (Tambah / Edit Charger) disesuaikan dengan migrasi baru
    const [showModal, setShowModal] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [currentChargerId, setCurrentChargerId] = useState(null);
    const [formData, setFormData] = useState({
        kode_perangkat: '',
        merek_model: '',
        kap_tot_kw: 60,
        status_mesin: 'Active'
    });

    const nameString = typeof user === 'string' 
        ? user 
        : (user?.profile?.nama_lengkap || user?.name || user?.email || '');

    const firstName = (!nameString || nameString === 'Petugas') ? '' : nameString.split(' ')[0];

    // Mengambil data dari endpoint operator
    const fetchChargersData = async () => {
        setLoading(true);
        try {
            const token = getStoredToken(); 
            const response = await axios.get('http://127.0.0.1:8000/api/operator/chargers', {
                headers: { Authorization: `Bearer ${token}` }
            });
            
            console.log("ISI DATA API:", response.data); // Cek lewat F12 Console browser

            setChargers(response.data.data || []); 
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
                // Sesuaikan endpoint POST store charger agar sinkron dengan routing Laravel
                await axios.post('http://127.0.0.1:8000/api/operator/chargers', formData, { headers });
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

                // Petakan aksi ke endpoint backend Laravel yang sesuai
                if (action === 'START') {
                    await axios.post(`http://127.0.0.1:8000/api/operator/charger/${id}/start`, {}, { headers });
                } else if (action === 'STOP') {
                    await axios.post(`http://127.0.0.1:8000/api/operator/charger/${id}/stop`, {}, { headers });
                } else if (action === 'REBOOT') {
                    // Memanggil endpoint backend untuk mengubah status ke maintenance/offline
                    await axios.post(`http://127.0.0.1:8000/api/operator/charger/${id}/reboot`, {}, { headers });
                } else {
                    // Jika ada perintah lain seperti REBOOT, arahkan atau sesuaikan endpoint-nya
                    alert(`Perintah ${action} belum didukung oleh server.`);
                    return;
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

    // Filter status berdasarkan status_mesin (Active, Maintenance, Offline)
    const filteredChargers = filterStatus === 'ALL' 
        ? chargers 
        : chargers.filter(c => c.status_mesin && c.status_mesin.toLowerCase() === filterStatus.toLowerCase());

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
                    <button className="cm-icon-btn" title="Pengaturan" onClick={() => setActiveMenu && setActiveMenu('profils')}><FaCog /></button>
                </div>
            </header>

            {/* --- BODY CONTAINER --- */}
            <div className="cm-body-wrapper">
                
                {/* --- SIDEBAR --- */}
                <aside className="cm-sidebar">
                    <ul className="cm-menu-list">
                        <li className="cm-menu-item" onClick={() => {setActiveMenu && setActiveMenu('dashboard')
                            if (onNavigateToOpsDash) onNavigateToOpsDash();
                        }}><FaTachometerAlt className="cm-menu-icon" /><span>Dashboard</span></li>
                        <li className="cm-menu-item active" onClick={() => setActiveMenu && setActiveMenu('charger')}>
                            <FaChargingStation className="cm-menu-icon" /><span>Manage Charger</span></li>
                        <li className="op-menu-item" onClick={() => { setActiveMenu && setActiveMenu('ports');
                            if(onNavigateToPort) onNavigateToPort();
                        }}>
                            <FaPlug className="op-menu-icon" /><span>Manage port</span>
                        </li>
                        <li className="cm-menu-item" onClick={() => {setActiveMenu && setActiveMenu('report')
                            if (onNavigateToOpsReport) onNavigateToOpsReport();
                        }}><FaFileAlt className="cm-menu-icon" /><span>Manage Report</span></li>
                        <li className="cm-menu-item" onClick={() => setActiveMenu && setActiveMenu('profil')}>
                            <FaUser className="cm-menu-icon" /><span>Profil</span></li>
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
                                                    <button className="cm-btn stop" onClick={() => handleRemoteControl('STOP', chargerId, charger.kode_perangkat)}><FaStop /> Stop</button>
                                                ) : (
                                                    <button className="cm-btn start" onClick={() => handleRemoteControl('START', chargerId, charger.kode_perangkat)}><FaPlay /> Start</button>
                                                )}
                                                <button className="cm-btn reboot" onClick={() => handleRemoteControl('REBOOT', chargerId, charger.kode_perangkat)}><FaPowerOff /> Reboot</button>
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

            {/* --- MODAL FORM OVERLAY (CREATE / UPDATE) --- */}
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
        </div>
    );
}