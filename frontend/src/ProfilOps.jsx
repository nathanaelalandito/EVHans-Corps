import React, { useState, useEffect } from 'react';
import { 
    FaBell, FaCog, FaTachometerAlt, FaChargingStation, FaPlug,
    FaFileAlt, FaUser, FaSignOutAlt, FaSyncAlt, FaShieldAlt 
} from 'react-icons/fa';
import axios from 'axios';
import { getStoredToken } from './api/auth';
import './profilOps.css';
import logoECH from './assets/Gemini_Generated_Image_8581rg8581rg8581.jfif.jpeg';
import defaultAvatar from './assets/Gemini_Generated_Image_8581rg8581rg8581.jfif.jpeg';

function getGreeting() {
    const h = new Date().getHours();
    if (h >= 4 && h < 10) return 'Selamat pagi';
    if (h >= 10 && h < 15) return 'Selamat siang';
    if (h >= 15 && h < 18) return 'Selamat sore';
    return 'Selamat malam';
}

export default function ProfilOps({ user, onLogout, setActiveMenu, onNavigateToOpsDash, onNavigateToOpsReport }) {
    const [profileData, setProfileData] = useState(null);
    const [loading, setLoading] = useState(true);

    const fetchProfileData = async () => {
        setLoading(true);
        try {
            const token = getStoredToken();
            const response = await axios.get('http://127.0.0.1:8000/api/operator/profile', {
                headers: { Authorization: `Bearer ${token}` }
            });
            setProfileData(response.data.data || null);
        } catch (error) {
            console.error("Gagal memuat profil operator:", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchProfileData();
    }, []);

    const userData = profileData?.user || {};
    const userProfile = profileData?.profile || {}; 
    const assignment = profileData?.assignment || {};

    const fullName = userProfile.nama_lengkap || userData.name || (typeof user === 'string' ? user : (user?.profile?.nama_lengkap || user?.name || 'Petugas Operator'));
    const firstName = fullName.split(' ')[0];

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

                <div className="prf-header-right">
                    <button className="prf-icon-btn" title="Notifikasi"><FaBell /><span className="prf-badge">2</span></button>
                    <button className="prf-icon-btn" title="Pengaturan" onClick={() => setActiveMenu && setActiveMenu('profil')}><FaCog /></button>
                </div>
            </header>

            {/* --- BODY WRAPPER --- */}
            <div className="prf-body-wrapper">
                
                {/* --- SIDEBAR --- */}
                <aside className="prf-sidebar">
                    <ul className="prf-menu-list">
                        <li className="prf-menu-item" onClick={() => {
                            setActiveMenu && setActiveMenu('dashboard');
                            if (onNavigateToOpsDash) onNavigateToOpsDash();
                        }}>
                            <FaTachometerAlt className="prf-menu-icon" /><span>Dashboard</span>
                        </li>
                        <li className="prf-menu-item" onClick={() => setActiveMenu && setActiveMenu('charger')}>
                            <FaChargingStation className="prf-menu-icon" /><span>Manage Charger</span>
                        </li>
                        <li className="prf-menu-item" onClick={() => setActiveMenu && setActiveMenu('port')}>
                            <FaPlug className="prf-menu-icon" /><span>Manage Port</span>
                        </li>
                        <li className="prf-menu-item" onClick={() => {
                            setActiveMenu && setActiveMenu('report');
                            if (onNavigateToOpsReport) onNavigateToOpsReport();
                        }}>
                            <FaFileAlt className="prf-menu-icon" /><span>Manage Report</span>
                        </li>
                        <li className="prf-menu-item active" onClick={() => setActiveMenu && setActiveMenu('profil')}>
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
        </div>
    );
}