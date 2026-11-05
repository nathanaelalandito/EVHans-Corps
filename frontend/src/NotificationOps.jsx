import React, { useState } from 'react';
import { FaTimes, FaExclamationTriangle, FaReceipt, FaCheck, FaInfoCircle, FaWrench } from 'react-icons/fa';
import axios from 'axios';
import { getStoredToken } from './api/auth';

/** Panel notifikasi operator dengan aksi tindak lanjut laporan gangguan. */
export default function NotificationOverlay({ isOpen, onClose, notifications, onRefreshData }) {
    const [activeTab, setActiveTab] = useState('malfunction'); // 'malfunction' | 'transaction'
    const [processingId, setProcessingId] = useState(null);

    if (!isOpen) return null;

    const { malfunctions = [], transactions = [] } = notifications || {};

    // Aksi: Terima Malfungsi -> Ubah Status Charger ke Maintenance
    /** Menerima laporan gangguan lalu menyegarkan data notifikasi operator. */
    const handleAcceptMalfunction = async (idCharger, idLog, kodePerangkat) => {
        if (!window.confirm(`Konfirmasi penanganan: Unit ${kodePerangkat} akan otomatis dialihkan ke status MAINTENANCE?`)) return;

        setProcessingId(idLog);
        try {
            const token = getStoredToken();
            await axios.post(`http://127.0.0.1:8000/api/operator/malfunction/${idCharger}/${idLog}/accept`, {}, {
                headers: { Authorization: `Bearer ${token}` }
            });

            alert(`Unit ${kodePerangkat} telah dialihkan ke mode Maintenance.`);
            if (onRefreshData) onRefreshData(); // Muat ulang data
        } catch (err) {
            alert(`Gagal: ${err.response?.data?.message || err.message}`);
        } finally {
            setProcessingId(null);
        }
    };

    return (
        <div className="notif-overlay-backdrop" onClick={onClose}>
            <div className="notif-card-modal" onClick={(e) => e.stopPropagation()}>
                {/* Header Modal */}
                <div className="notif-modal-header">
                    <div>
                        <h3>Pemberitahuan Sistem</h3>
                        <p>Pantau gangguan perangkat dan anomali transaksi stasiun</p>
                    </div>
                    <button className="notif-close-btn" onClick={onClose}><FaTimes /></button>
                </div>

                {/* Tab Pemisah Notifikasi */}
                <div className="notif-tabs">
                    <button 
                        className={`notif-tab-item ${activeTab === 'malfunction' ? 'active' : ''}`}
                        onClick={() => setActiveTab('malfunction')}
                    >
                        <FaExclamationTriangle /> Malfungsi Mesin ({malfunctions.length})
                    </button>
                    <button 
                        className={`notif-tab-item ${activeTab === 'transaction' ? 'active' : ''}`}
                        onClick={() => setActiveTab('transaction')}
                    >
                        <FaReceipt /> Gangguan Transaksi ({transactions.length})
                    </button>
                </div>

                {/* Konten Notifikasi */}
                <div className="notif-content-body">
                    {/* KATEGORI 1: MALFUNGSI UNIT CHARGER (BISA DI-SET MAINTENANCE) */}
                    {activeTab === 'malfunction' && (
                        <div className="notif-list">
                            {malfunctions.length > 0 ? (
                                malfunctions.map((item) => (
                                    <div key={item.id_log} className="notif-item-card alert-danger">
                                        <div className="notif-item-top">
                                            <span className="notif-tag-danger">
                                                <FaWrench /> Malfungsi: <strong>{item.kode_perangkat}</strong>
                                            </span>
                                            <span className="notif-time">{new Date(item.created_at).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}</span>
                                        </div>
                                        <p className="notif-msg-text">{item.deskripsi || 'Terdeteksi anomali suhu / koneksi modul charging.'}</p>
                                        
                                        <div className="notif-item-action">
                                            <button 
                                                className="btn-set-maintenance"
                                                onClick={() => handleAcceptMalfunction(item.id_charger, item.id_log, item.kode_perangkat)}
                                                disabled={processingId === item.id_log}
                                            >
                                                <FaCheck /> {processingId === item.id_log ? 'Memproses...' : 'Terima & Set Maintenance'}
                                            </button>
                                        </div>
                                    </div>
                                ))
                            ) : (
                                <div className="notif-empty">Semua unit charger beroperasi normal.</div>
                            )}
                        </div>
                    )}

                    {/* KATEGORI 2: GANGGUAN TRANSAKSI (HANYA TAMPILAN INFORMASI) */}
                    {activeTab === 'transaction' && (
                        <div className="notif-list">
                            {transactions.length > 0 ? (
                                transactions.map((trx) => (
                                    <div key={trx.id_transaksi} className="notif-item-card alert-warning">
                                        <div className="notif-item-top">
                                            <span className="notif-tag-warning">
                                                <FaInfoCircle /> {trx.kode_transaksi || 'TRX-ERR'}
                                            </span>
                                            <span className="notif-time">{new Date(trx.created_at).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}</span>
                                        </div>
                                        <p className="notif-msg-text">
                                            Pembayaran gagal ({trx.metode_pembayaran || 'E-Wallet'} - Rp {Number(trx.total_biaya || 0).toLocaleString('id-ID')}).
                                            <br/>
                                            <small style={{ color: '#666' }}>{trx.keterangan || 'Gagal otorisasi / timeout dari payment gateway.'}</small>
                                        </p>
                                    </div>
                                ))
                            ) : (
                                <div className="notif-empty">Tidak ada gangguan transaksi saat ini.</div>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
