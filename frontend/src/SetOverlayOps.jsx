import React, { useState } from 'react';
import { FaTimes, FaCog, FaVolumeUp, FaSyncAlt } from 'react-icons/fa';

export default function SettingsOverlay({ isOpen, onClose }) {
    const [soundAlert, setSoundAlert] = useState(true);
    const [autoRefresh, setAutoRefresh] = useState(30);

    if (!isOpen) return null;

    return (
        <div className="notif-overlay-backdrop" onClick={onClose}>
            <div className="notif-card-modal settings-size" onClick={(e) => e.stopPropagation()}>
                <div className="notif-modal-header">
                    <div>
                        <h3>Pengaturan Panel Operator</h3>
                        <p>Konfigurasi notifikasi & telemetri stasiun</p>
                    </div>
                    <button className="notif-close-btn" onClick={onClose}><FaTimes /></button>
                </div>

                <div className="settings-body">
                    {/* Setting 1: Suara Notifikasi */}
                    <div className="setting-row">
                        <div>
                            <strong>Bunyi Peringatan Kritis</strong>
                            <p style={{ margin: 0, fontSize: '0.8rem', color: '#666' }}>Beri nada dering saat terjadi malfungsi charger</p>
                        </div>
                        <input 
                            type="checkbox" 
                            checked={soundAlert} 
                            onChange={(e) => setSoundAlert(e.target.checked)} 
                        />
                    </div>

                    {/* Setting 2: Interval Auto Refresh */}
                    <div className="setting-row">
                        <div>
                            <strong>Interval Segarkan Data Otomatis</strong>
                            <p style={{ margin: 0, fontSize: '0.8rem', color: '#666' }}>Sinkronisasi data port dan transaksi</p>
                        </div>
                        <select value={autoRefresh} onChange={(e) => setAutoRefresh(e.target.value)}>
                            <option value="15">Setiap 15 Detik</option>
                            <option value="30">Setiap 30 Detik</option>
                            <option value="60">Setiap 1 Menit</option>
                        </select>
                    </div>

                    <div style={{ marginTop: '20px', textAlign: 'right' }}>
                        <button className="btn-set-maintenance" onClick={onClose}>
                            Simpan Pengaturan
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}