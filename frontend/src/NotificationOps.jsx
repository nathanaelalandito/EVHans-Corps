import { useState } from 'react';
import {
    FaBolt,
    FaCheck,
    FaCheckCircle,
    FaExclamationTriangle,
    FaInfoCircle,
    FaReceipt,
    FaTimes,
    FaWrench,
} from 'react-icons/fa';
import {
    acceptOperatorMalfunction,
    isTransactionUnread,
    resolveOperatorMalfunction,
} from './api/operatorNotifications';
import './notificationOps.css';

/** Memformat timestamp ISO/SQL ke jam & tanggal ringkas bahasa Indonesia. */
function formatNotifTime(value) {
    if (!value) return '-';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '-';
    return new Intl.DateTimeFormat('id-ID', {
        day: '2-digit',
        month: 'short',
        hour: '2-digit',
        minute: '2-digit',
    }).format(date);
}

/** Memformat nominal rupiah. */
function formatRupiah(value) {
    return `Rp ${Number(value || 0).toLocaleString('id-ID')}`;
}

/** Menentukan gaya kartu & label status transaksi driver. */
function getTransactionTone(trx) {
    if (trx.is_issue) return 'warning';
    if (trx.status_sesi === 'Berlangsung') return 'info';
    if (trx.status_sesi === 'Selesai') return 'success';
    return 'info';
}

/** Menentukan tab awal agar notifikasi paling relevan langsung terlihat saat dibuka. */
function resolveDefaultTab(initialTab, malfunctions, transactions) {
    if (initialTab === 'malfunction' || initialTab === 'transaction') return initialTab;
    const hasPendingMalfunction = malfunctions.some((item) => item.status_tanganan === 'Menunggu');
    if (hasPendingMalfunction) return 'malfunction';
    if (transactions.length > 0) return 'transaction';
    return malfunctions.length > 0 ? 'malfunction' : 'transaction';
}

/** Panel pop-up notifikasi operator untuk memantau gangguan perangkat dan transaksi driver. */
export default function NotificationOverlay({
    isOpen = true,
    onClose,
    notifications,
    initialTab = null,
    seenBeforeMs = null,
    onRefreshData,
    onNavigateToCharger,
}) {
    const { malfunctions = [], transactions = [] } = notifications || {};
    const [activeTab, setActiveTab] = useState(() => resolveDefaultTab(initialTab, malfunctions, transactions));
    const [txFilter, setTxFilter] = useState('all'); // 'all' | 'normal' | 'issue'
    const [pendingAction, setPendingAction] = useState(null); // { mode: 'accept' | 'resolve', item }
    const [reason, setReason] = useState('');
    const [processingId, setProcessingId] = useState(null);
    const [feedback, setFeedback] = useState(null);

    if (!isOpen) return null;

    const filteredTransactions = transactions.filter((trx) => {
        if (txFilter === 'issue') return Boolean(trx.is_issue);
        if (txFilter === 'normal') return !trx.is_issue;
        return true;
    });

    const openReasonPrompt = (mode, item) => {
        setFeedback(null);
        setPendingAction({ mode, item });
        setReason(
            mode === 'accept'
                ? `Tindak lanjut gangguan ${item.kode_perangkat}: ${item.deskripsi || 'periksa unit'}`.slice(0, 200)
                : `Unit ${item.kode_perangkat} telah diperiksa dan gangguan selesai ditangani.`.slice(0, 200),
        );
    };

    const handleSubmitAction = async (event) => {
        event.preventDefault();
        if (!pendingAction) return;

        const trimmedReason = reason.trim();
        if (trimmedReason.length < 5) {
            setFeedback({ type: 'error', message: 'Alasan tindakan minimal 5 karakter.' });
            return;
        }

        const { mode, item } = pendingAction;
        setProcessingId(item.id_log);
        setFeedback(null);

        try {
            const response =
                mode === 'accept'
                    ? await acceptOperatorMalfunction(item.id_charger, item.id_log, trimmedReason)
                    : await resolveOperatorMalfunction(item.id_charger, item.id_log, trimmedReason);

            setFeedback({
                type: 'success',
                message: response?.message || 'Status gangguan berhasil diperbarui.',
            });
            setPendingAction(null);
            setReason('');
            if (onRefreshData) await onRefreshData();
        } catch (err) {
            setFeedback({
                type: 'error',
                message: err.response?.data?.message || err.message || 'Gagal memperbarui status gangguan.',
            });
        } finally {
            setProcessingId(null);
        }
    };

    return (
        <div className="notif-overlay-backdrop" onClick={onClose}>
            <section
                className="notif-card-modal"
                role="dialog"
                aria-modal="true"
                aria-label="Pusat Notifikasi Operator"
                onClick={(e) => e.stopPropagation()}
            >
                <header className="notif-modal-header">
                    <div>
                        <p className="notif-eyebrow">PUSAT NOTIFIKASI</p>
                        <h3>Pemberitahuan Stasiun</h3>
                        <p>Pantau transaksi driver dan laporan gangguan perangkat secara bersamaan</p>
                    </div>
                    <button type="button" className="notif-close-btn" aria-label="Tutup notifikasi" onClick={onClose}>
                        <FaTimes />
                    </button>
                </header>

                <div className="notif-tabs" role="tablist">
                    <button
                        type="button"
                        role="tab"
                        aria-selected={activeTab === 'transaction'}
                        className={`notif-tab-item ${activeTab === 'transaction' ? 'active' : ''}`}
                        onClick={() => setActiveTab('transaction')}
                    >
                        <FaReceipt />
                        <span>Transaksi Dilakukan</span>
                        <span className="notif-tab-count">{transactions.length}</span>
                    </button>
                    <button
                        type="button"
                        role="tab"
                        aria-selected={activeTab === 'malfunction'}
                        className={`notif-tab-item ${activeTab === 'malfunction' ? 'active' : ''}`}
                        onClick={() => setActiveTab('malfunction')}
                    >
                        <FaExclamationTriangle />
                        <span>Gangguan Perangkat</span>
                        <span className="notif-tab-count">{malfunctions.length}</span>
                    </button>
                </div>

                {feedback && (
                    <div className={`notif-feedback ${feedback.type}`} role="status">
                        {feedback.message}
                    </div>
                )}

                {activeTab === 'transaction' && (
                    <div className="notif-filter-row" aria-label="Filter transaksi">
                        <button
                            type="button"
                            className={`notif-filter-chip ${txFilter === 'all' ? 'active' : ''}`}
                            onClick={() => setTxFilter('all')}
                        >
                            Semua ({transactions.length})
                        </button>
                        <button
                            type="button"
                            className={`notif-filter-chip ${txFilter === 'normal' ? 'active' : ''}`}
                            onClick={() => setTxFilter('normal')}
                        >
                            Berjalan &amp; Selesai ({transactions.filter((t) => !t.is_issue).length})
                        </button>
                        <button
                            type="button"
                            className={`notif-filter-chip ${txFilter === 'issue' ? 'active' : ''}`}
                            onClick={() => setTxFilter('issue')}
                        >
                            Gagal / Batal ({transactions.filter((t) => t.is_issue).length})
                        </button>
                    </div>
                )}

                <div className="notif-content-body">
                    {activeTab === 'transaction' && (
                        <div className="notif-list">
                            {filteredTransactions.length > 0 ? (
                                filteredTransactions.map((trx) => {
                                    const tone = getTransactionTone(trx);
                                    const isUnread = isTransactionUnread(trx, seenBeforeMs);

                                    return (
                                        <article key={trx.id_transaksi} className={`notif-item-card alert-${tone}`}>
                                            <div className="notif-item-top">
                                                <div className="notif-badges-group">
                                                    <span className={`notif-tag ${tone}`}>
                                                        {trx.is_issue ? <FaInfoCircle /> : <FaBolt />}
                                                        <span>{trx.kode_transaksi}</span>
                                                    </span>
                                                    <span className={`notif-status-pill ${tone}`}>
                                                        {trx.status_sesi}
                                                    </span>
                                                    {isUnread && <span className="notif-new-pill">Baru</span>}
                                                </div>
                                                <span className="notif-time">
                                                    {formatNotifTime(trx.waktu_aktivitas || trx.created_at)}
                                                </span>
                                            </div>

                                            <p className="notif-msg-text">
                                                <strong>{trx.nama_driver || 'Pengemudi'}</strong>
                                                {trx.kendaraan ? ` (${trx.kendaraan})` : ''} — {trx.keterangan}
                                            </p>

                                            <div className="notif-meta-row">
                                                <span>
                                                    Unit: <strong>{trx.kode_perangkat || '-'}</strong>
                                                    {trx.nomor_port ? ` · ${trx.nomor_port}` : ''}
                                                </span>
                                                <span>
                                                    Nominal: <strong>{formatRupiah(trx.total_biaya)}</strong>
                                                </span>
                                                <span>
                                                    Metode: <strong>{trx.metode_pembayaran || 'Dompet Digital'}</strong>
                                                </span>
                                                {trx.status_pembayaran && (
                                                    <span>
                                                        Pembayaran: <strong>{trx.status_pembayaran}</strong>
                                                    </span>
                                                )}
                                            </div>
                                        </article>
                                    );
                                })
                            ) : (
                                <div className="notif-empty">
                                    <FaReceipt />
                                    <strong>Belum ada notifikasi transaksi</strong>
                                    <span>Transaksi pengisian driver pada stasiun ini akan muncul di sini.</span>
                                </div>
                            )}
                        </div>
                    )}

                    {activeTab === 'malfunction' && (
                        <div className="notif-list">
                            {malfunctions.length > 0 ? (
                                malfunctions.map((item) => {
                                    const isPendingForm = pendingAction?.item?.id_log === item.id_log;
                                    const isHandled = item.status_tanganan === 'Sedang Ditangani';

                                    return (
                                        <article key={item.id_log} className="notif-item-card alert-danger">
                                            <div className="notif-item-top">
                                                <div className="notif-badges-group">
                                                    <span className="notif-tag danger">
                                                        <FaWrench />
                                                        <span>{item.kode_perangkat}</span>
                                                    </span>
                                                    <span className={`notif-status-pill ${isHandled ? 'warning' : 'danger'}`}>
                                                        {item.status_tanganan || 'Menunggu'}
                                                    </span>
                                                    {item.nomor_port && (
                                                        <span className="notif-status-pill">{item.nomor_port}</span>
                                                    )}
                                                </div>
                                                <span className="notif-time">
                                                    {formatNotifTime(item.waktu_terjadi || item.created_at)}
                                                </span>
                                            </div>

                                            <p className="notif-msg-text">
                                                {item.jenis_error ? <strong>{item.jenis_error}: </strong> : null}
                                                {item.deskripsi || 'Terdeteksi kendala operasional pada unit charger.'}
                                            </p>

                                            {!isPendingForm && (
                                                <div className="notif-item-action">
                                                    {item.status_mesin !== 'Maintenance' && (
                                                        <button
                                                            type="button"
                                                            className="btn-set-maintenance"
                                                            onClick={() => openReasonPrompt('accept', item)}
                                                            disabled={processingId === item.id_log}
                                                        >
                                                            <FaWrench /> Terima &amp; Set Maintenance
                                                        </button>
                                                    )}
                                                    <button
                                                        type="button"
                                                        className="btn-resolve-notif"
                                                        onClick={() => openReasonPrompt('resolve', item)}
                                                        disabled={processingId === item.id_log}
                                                    >
                                                        <FaCheck /> Tandai Selesai
                                                    </button>
                                                    {onNavigateToCharger && (
                                                        <button
                                                            type="button"
                                                            className="btn-link-charger"
                                                            onClick={() => {
                                                                onClose?.();
                                                                onNavigateToCharger();
                                                            }}
                                                        >
                                                            Buka Kelola Charger
                                                        </button>
                                                    )}
                                                </div>
                                            )}

                                            {isPendingForm && (
                                                <form className="notif-reason-box" onSubmit={handleSubmitAction}>
                                                    <label htmlFor={`notif-reason-${item.id_log}`}>
                                                        {pendingAction.mode === 'accept'
                                                            ? 'Alasan pengalihan ke Maintenance'
                                                            : 'Catatan penyelesaian gangguan'}
                                                    </label>
                                                    <textarea
                                                        id={`notif-reason-${item.id_log}`}
                                                        value={reason}
                                                        onChange={(e) => setReason(e.target.value)}
                                                        minLength={5}
                                                        maxLength={500}
                                                        required
                                                        placeholder="Minimal 5 karakter untuk catatan audit..."
                                                    />
                                                    <div className="notif-reason-actions">
                                                        <button
                                                            type="button"
                                                            className="btn-cancel-reason"
                                                            disabled={processingId === item.id_log}
                                                            onClick={() => setPendingAction(null)}
                                                        >
                                                            Batal
                                                        </button>
                                                        <button
                                                            type="submit"
                                                            className="btn-resolve-notif"
                                                            disabled={processingId === item.id_log || reason.trim().length < 5}
                                                        >
                                                            {processingId === item.id_log ? 'Memproses...' : 'Konfirmasi'}
                                                        </button>
                                                    </div>
                                                </form>
                                            )}
                                        </article>
                                    );
                                })
                            ) : (
                                <div className="notif-empty">
                                    <FaCheckCircle />
                                    <strong>Semua unit charger beroperasi normal</strong>
                                    <span>Tidak ada laporan gangguan yang menunggu penanganan.</span>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </section>
        </div>
    );
}
