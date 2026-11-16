import { useState } from 'react';
import { FaChargingStation, FaPrint, FaShareAlt, FaTimes, FaWrench } from 'react-icons/fa';
import { createMalfunctionPdf, malfunctionPdfName } from './utils/malfunctionPdf';
import './malfunctionReportModal.css';

/** Memformat waktu laporan ke tanggal dan jam bahasa Indonesia. */
function formatDate(value) {
    if (!value) return 'Tidak tersedia';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return String(value);
    return new Intl.DateTimeFormat('id-ID', {
        dateStyle: 'long',
        timeStyle: 'short',
    }).format(date);
}

/** Menentukan warna badge sesuai status penanganan gangguan. */
function statusClass(status) {
    if (status === 'Selesai') return 'is-resolved';
    if (status === 'Sedang Ditangani') return 'is-progress';
    return 'is-pending';
}

/** Modal rincian satu laporan gangguan dengan aksi cetak dan bagikan PDF. */
export default function MalfunctionReportModal({ log, onClose }) {
    const [message, setMessage] = useState('');

    if (!log) return null;

    const reportNumber = `LPG-${String(log.id_log ?? '-').padStart(6, '0')}`;
    const status = log.status_tanganan || 'Menunggu';

    const handlePrint = () => {
        setMessage('');
        window.print();
    };

    const handleShare = async () => {
        try {
            const file = new File([createMalfunctionPdf(log)], malfunctionPdfName(log), {
                type: 'application/pdf',
            });

            if (navigator.share && navigator.canShare?.({ files: [file] })) {
                await navigator.share({
                    files: [file],
                    title: `Laporan Gangguan ${reportNumber}`,
                    text: `Laporan gangguan ${log.kode_perangkat || 'perangkat'} di ${log.nama_lokasi || 'station'}`,
                });
                setMessage('PDF laporan siap dibagikan.');
                return;
            }

            const downloadUrl = URL.createObjectURL(file);
            const downloadLink = document.createElement('a');
            downloadLink.href = downloadUrl;
            downloadLink.download = file.name;
            document.body.appendChild(downloadLink);
            downloadLink.click();
            downloadLink.remove();
            window.setTimeout(() => URL.revokeObjectURL(downloadUrl), 60000);
            setMessage('PDF diunduh karena fitur berbagi file tidak tersedia di browser ini.');
        } catch (error) {
            if (error?.name === 'AbortError') return;
            setMessage('PDF belum dapat dibagikan. Coba gunakan tombol Cetak / Simpan PDF.');
        }
    };

    return (
        <div className="malfunction-modal-backdrop" role="presentation" onClick={onClose}>
            <section
                className="malfunction-modal-card"
                role="dialog"
                aria-modal="true"
                aria-labelledby="malfunction-modal-title"
                onClick={(event) => event.stopPropagation()}
            >
                <header className="malfunction-modal-head">
                    <div>
                        <p className="malfunction-modal-eyebrow">DETAIL LAPORAN GANGGUAN</p>
                        <h2 id="malfunction-modal-title">{reportNumber}</h2>
                        <p>{formatDate(log.waktu_terjadi)}</p>
                    </div>
                    <button type="button" className="malfunction-modal-close" aria-label="Tutup detail laporan" onClick={onClose}>
                        <FaTimes aria-hidden="true" />
                    </button>
                </header>

                <div className="malfunction-modal-body">
                    <div className="malfunction-modal-hero">
                        <span className={`malfunction-modal-status ${statusClass(status)}`}>{status}</span>
                        <span className="malfunction-modal-hero-title"><FaWrench aria-hidden="true" /> {log.jenis_error || 'Gangguan perangkat'}</span>
                    </div>

                    <dl className="malfunction-modal-grid">
                        <div><dt>Charger</dt><dd>{log.kode_perangkat || 'Tidak tersedia'}{log.merek_model ? ` (${log.merek_model})` : ''}</dd></div>
                        <div><dt>Station</dt><dd>{log.nama_lokasi || 'Tidak tersedia'}</dd></div>
                        <div><dt>Alamat station</dt><dd>{log.alamat || 'Tidak tersedia'}</dd></div>
                        <div><dt>Sesi terkait</dt><dd>{log.id_session ? `SES-${log.id_session}` : 'Tidak tersedia'}</dd></div>
                        <div><dt>Pelapor</dt><dd>{log.nama_pelapor || 'Sistem / Sensor'}{log.email_pelapor ? <small>{log.email_pelapor}</small> : null}</dd></div>
                        <div><dt>Waktu kejadian</dt><dd>{formatDate(log.waktu_terjadi)}</dd></div>
                        <div><dt>Dibuat</dt><dd>{formatDate(log.created_at)}</dd></div>
                        <div><dt>Terakhir diperbarui</dt><dd>{formatDate(log.updated_at)}</dd></div>
                    </dl>

                    <section className="malfunction-modal-description">
                        <h3><FaChargingStation aria-hidden="true" /> Deskripsi gangguan</h3>
                        <p>{log.deskripsi || 'Tidak ada deskripsi yang dicatat untuk laporan ini.'}</p>
                    </section>
                </div>

                <footer className="malfunction-modal-actions">
                    <button type="button" className="malfunction-modal-button is-secondary" onClick={onClose}>Tutup</button>
                    <button type="button" className="malfunction-modal-button is-primary" onClick={handlePrint}>
                        <FaPrint aria-hidden="true" /> Cetak / Simpan PDF
                    </button>
                    <button type="button" className="malfunction-modal-button is-primary" onClick={handleShare}>
                        <FaShareAlt aria-hidden="true" /> Bagikan PDF
                    </button>
                </footer>
                {message && <p className="malfunction-modal-message" role="status">{message}</p>}
            </section>
        </div>
    );
}
