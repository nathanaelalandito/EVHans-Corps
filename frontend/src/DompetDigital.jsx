import { useState, useEffect } from 'react';
import { FiArrowLeft, FiEdit2, FiEye, FiEyeOff, FiKey, FiLock, FiPlus, FiSearch, FiShield, FiCreditCard } from 'react-icons/fi';
import TopUp from './Topup';
import './dompetDigital.css';
import {
    getWallet,
    createPin,
    changePin as changePinApi,
    verifyPin,
    resetPin,
} from './api/wallet';
import { getPaymentHistory } from './api/payments';

/** Memilih pesan backend yang sesuai untuk ditampilkan di halaman dompet. */
function extractErrorMessage(error, fallback) {
    const data = error?.response?.data;
    if (!data) return fallback;
    if (data.message) return data.message;
    if (data.errors) {
        const first = Object.values(data.errors)[0];
        return Array.isArray(first) ? first[0] : fallback;
    }
    return fallback;
}

/** Memformat saldo atau nominal transaksi ke format rupiah. */
function formatRupiah(value) {
    return 'Rp' + Number(value || 0).toLocaleString('id-ID');
}

/** Memformat waktu transaksi agar sesuai lokal Indonesia. */
function formatWaktu(value) {
    if (!value) return '-';
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return String(value);
    return d.toLocaleString('id-ID', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
    });
}

/** Mengubah tanggal ringkasan pembayaran Indonesia menjadi objek Date yang dapat difilter. */
function parseWaktuPembayaran(value) {
    if (!value) return null;
    const parsed = new Date(value);
    if (!Number.isNaN(parsed.getTime())) return parsed;

    const match = String(value).match(/^(\d{1,2})\s+([\p{L}.]+)\s+(\d{4})(?:,\s*(\d{1,2}):(\d{2}))?$/u);
    if (!match) return null;

    const bulan = {
        jan: 0, januari: 0, feb: 1, februari: 1, mar: 2, maret: 2,
        apr: 3, april: 3, mei: 4, jun: 5, juni: 5, jul: 6, juli: 6,
        agu: 7, agustus: 7, sep: 8, september: 8, okt: 9, oktober: 9,
        nov: 10, november: 10, des: 11, desember: 11,
    };
    const monthIndex = bulan[match[2].toLowerCase().replace('.', '')];
    if (monthIndex === undefined) return null;
    return new Date(Number(match[3]), monthIndex, Number(match[1]), Number(match[4] || 0), Number(match[5] || 0));
}

const STATUS_LABEL = {
    sukses: 'Berhasil',
    pending: 'Menunggu',
    gagal: 'Gagal',
    aktif: 'Aktif',
};

/** Menerjemahkan status transaksi dompet ke label antarmuka. */
function statusLabel(status) {
    const normalized = String(status ?? '').toLowerCase();
    return STATUS_LABEL[normalized] ?? status ?? 'Tidak diketahui';
}

/** Mengubah ringkasan pembayaran menjadi format baris mutasi dompet. */
function mapPaymentToWalletTransaction(payment) {
    const isTopup = payment.jenis_pembayaran === 'topup';
    return {
        id: payment.id_payment,
        jenis: payment.judul || (isTopup ? 'Top Up Dompet Digital' : 'Pembayaran Charging'),
        tipe: isTopup ? 'masuk' : 'keluar',
        waktu: parseWaktuPembayaran(payment.tanggal) || payment.tanggal,
        nominal: payment.total,
        status: payment.status_pembayaran || payment.status,
    };
}

/** Halaman saldo, riwayat top up, dan pengaturan keamanan PIN dompet. */
export default function DompetDigital({ onBack }) {
    const [status, setStatus] = useState('loading');
    const [wallet, setWallet] = useState(null);
    const [transactions, setTransactions] = useState([]);
    const [contentLoading, setContentLoading] = useState(false);
    const [contentError, setContentError] = useState('');
    const [historyError, setHistoryError] = useState('');

    const [pinInput, setPinInput] = useState('');
    const [pinSubmitting, setPinSubmitting] = useState(false);
    const [pinError, setPinError] = useState('');
    const [pinCreatedInSession, setPinCreatedInSession] = useState(false);

    const [pinNewInput, setPinNewInput] = useState('');
    const [pinConfirmInput, setPinConfirmInput] = useState('');
    const [pinOldInput, setPinOldInput] = useState('');
    const [pinManagerMode, setPinManagerMode] = useState(null); // null | change | disable | reset
    const [passwordInput, setPasswordInput] = useState('');

    // Sembunyikan/lihat saldo (ikut pengaturan di kartu saldo beranda).
    const [hideBalance, setHideBalance] = useState(
        () => localStorage.getItem('ev_hide_saldo') === '1'
    );
    /** Menyembunyikan atau menampilkan nominal saldo pada layar. */
    const toggleHideBalance = () =>
        setHideBalance((v) => {
            const next = !v;
            localStorage.setItem('ev_hide_saldo', next ? '1' : '0');
            return next;
        });

    // Filter riwayat transaksi (sisi klien).
    const [filterPeriod, setFilterPeriod] = useState('all'); // all | 7 | 30 | custom
    const [filterKeyword, setFilterKeyword] = useState('');
    const [filterFrom, setFilterFrom] = useState('');
    const [filterTo, setFilterTo] = useState('');

    /** Memeriksa status PIN saat halaman dibuka dan menampilkan langkah yang sesuai. */
    const loadWalletGate = async () => {
        setStatus('loading');
        setContentError('');
        try {
            const data = await getWallet();
            setWallet(data);
            setStatus(data.pin_sudah_diset ? 'topup' : 'createPin');
        } catch (error) {
            setContentError(extractErrorMessage(error, 'Informasi dompet tidak dapat dimuat.'));
            setStatus('loadError');
        }
    };

    /** Memuat saldo dan riwayat pembayaran setelah Driver lolos PIN. */
    const loadWalletContent = async () => {
        setContentLoading(true);
        setContentError('');
        setHistoryError('');
        const [walletResult, historyResult] = await Promise.allSettled([
            getWallet(),
            getPaymentHistory(),
        ]);

        if (walletResult.status === 'fulfilled') {
            setWallet(walletResult.value);
        } else {
            setContentError(extractErrorMessage(walletResult.reason, 'Saldo dompet tidak dapat dimuat.'));
        }

        if (historyResult.status === 'fulfilled') {
            setTransactions(historyResult.value.map(mapPaymentToWalletTransaction));
        } else {
            setHistoryError(extractErrorMessage(historyResult.reason, 'Riwayat transaksi tidak dapat dimuat.'));
        }

        setContentLoading(false);
    };

    useEffect(() => {
        let cancelled = false;
        getWallet()
            .then((data) => {
                if (cancelled) return;
                setWallet(data);
                setStatus(data.pin_sudah_diset ? 'topup' : 'createPin');
            })
            .catch((error) => {
                if (cancelled) return;
                setContentError(extractErrorMessage(error, 'Informasi dompet tidak dapat dimuat.'));
                setStatus('loadError');
            });
        return () => {
            cancelled = true;
        };
    }, []);

    /** Membuat handler field PIN yang hanya menerima digit. */
    const handleDigits = (setter) => (e) => {
        setter(e.target.value.replace(/\D/g, '').slice(0, 6));
    };
    /** Mengembalikan Driver ke dashboard setelah top up selesai. */
    const handleTopupDone = () => {
        onBack?.();
    };

    /** Memverifikasi PIN sebelum membuka form Top Up. */
    const handleVerifyPin = async (e) => {
        e.preventDefault();
        setPinSubmitting(true);
        setPinError('');

        if (pinInput.length !== 6) {
            setPinError('PIN harus terdiri dari 6 digit angka.');
            setPinSubmitting(false);
            return;
        }

        try {
            await verifyPin(pinInput);
            setPinInput('');
            setStatus('topup');
        } catch (err) {
            setPinError(extractErrorMessage(err, 'PIN salah. Coba lagi.'));
            if (err?.response?.status === 423) {
                setWallet((current) => ({
                    ...(current || {}),
                    terkunci: true,
                    terkunci_sampai: err.response.data?.terkunci_sampai ?? null,
                }));
            }
        } finally {
            setPinSubmitting(false);
        }
    };

    /** Membuat PIN pertama lalu langsung membuka form Top Up. */
    const handleCreatePin = async (e) => {
        e.preventDefault();
        setPinSubmitting(true);
        setPinError('');

        if (pinNewInput.length !== 6) {
            setPinError('PIN harus terdiri dari 6 digit angka.');
            setPinSubmitting(false);
            return;
        }
        if (pinNewInput !== pinConfirmInput) {
            setPinError('Konfirmasi PIN tidak sama dengan PIN baru.');
            setPinSubmitting(false);
            return;
        }

        try {
            await createPin(pinNewInput, pinConfirmInput);
            setPinInput('');
            setPinNewInput('');
            setPinConfirmInput('');
            setPinError('');
            setPinCreatedInSession(true);
            setStatus('topup');
        } catch (err) {
            setPinError(extractErrorMessage(err, 'Gagal membuat PIN. Coba lagi.'));
        } finally {
            setPinSubmitting(false);
        }
    };

    /** Mengganti PIN dompet setelah memeriksa nilai lama dan konfirmasi. */
    const handleChangePin = async (e) => {
        e.preventDefault();
        setPinSubmitting(true);
        setPinError('');

        if (pinOldInput.length !== 6) {
            setPinError('PIN lama harus 6 digit angka.');
            setPinSubmitting(false);
            return;
        }
        if (pinNewInput.length !== 6) {
            setPinError('PIN baru harus terdiri dari 6 digit angka.');
            setPinSubmitting(false);
            return;
        }
        if (pinNewInput === pinOldInput) {
            setPinError('PIN baru tidak boleh sama dengan PIN lama.');
            setPinSubmitting(false);
            return;
        }
        if (pinNewInput !== pinConfirmInput) {
            setPinError('Konfirmasi PIN baru tidak sama.');
            setPinSubmitting(false);
            return;
        }

        try {
            await changePinApi(pinOldInput, pinNewInput, pinConfirmInput);
            setPinOldInput('');
            setPinNewInput('');
            setPinConfirmInput('');
            setPinManagerMode(null);
        } catch (err) {
            setPinError(extractErrorMessage(err, 'Gagal mengubah PIN. Coba lagi.'));
        } finally {
            setPinSubmitting(false);
        }
    };

    /** Mengatur ulang PIN dengan password akun dan PIN baru. */
    const handleResetPin = async (e) => {
        e.preventDefault();
        setPinSubmitting(true);
        setPinError('');

        if (!passwordInput) {
            setPinError('Masukkan password akun kamu.');
            setPinSubmitting(false);
            return;
        }
        if (pinNewInput.length !== 6) {
            setPinError('PIN baru harus terdiri dari 6 digit angka.');
            setPinSubmitting(false);
            return;
        }
        if (pinNewInput !== pinConfirmInput) {
            setPinError('Konfirmasi PIN baru tidak sama dengan PIN baru.');
            setPinSubmitting(false);
            return;
        }

        try {
            await resetPin(passwordInput, pinNewInput, pinConfirmInput);
            setPasswordInput('');
            setPinNewInput('');
            setPinConfirmInput('');
            setPinError('');
            setPinManagerMode(null);
            setStatus('topup');
        } catch (err) {
            setPinError(extractErrorMessage(err, 'Gagal mereset PIN. Coba lagi.'));
        } finally {
            setPinSubmitting(false);
        }
    };

    /** Merender header alur Top Up dengan navigasi kembali. */
    const renderHeader = (title, showBrand = false) => (
        <div className="dmp-header">
            <button className="dmp-back-btn" onClick={onBack} aria-label="Kembali">
                <FiArrowLeft aria-hidden="true" />
            </button>
            <div className="dmp-title">
                <span className="dmp-title-main">{title}</span>
                {showBrand && <span className="dmp-title-sub">EVChargeHub</span>}
            </div>
            <span className="dmp-header-spacer" />
        </div>
    );

    if (status === 'loading') {
        return (
            <div className="dmp-container">
                {renderHeader('Top Up Saldo', true)}
                <div className="dmp-loading">Memuat…</div>
            </div>
        );
    }

    if (status === 'loadError') {
        return (
            <div className="dmp-container">
                {renderHeader('Top Up Saldo', true)}
                <section className="dmp-lock-card" role="alert">
                    <div className="dmp-lock-icon"><FiCreditCard aria-hidden="true" /></div>
                    <h2 className="dmp-lock-title">Dompet belum dapat dibuka</h2>
                    <p className="dmp-lock-desc">{contentError}</p>
                    <button type="button" className="dmp-btn-primary" onClick={loadWalletGate}>Coba Lagi</button>
                    <button type="button" className="dmp-text-btn" onClick={onBack}>Kembali ke Beranda</button>
                </section>
            </div>
        );
    }

    if (status === 'createPin') {
        return (
            <div className="dmp-container">
                {renderHeader('Top Up Saldo', true)}
                <div className="dmp-lock-card">
                    <div className="dmp-lock-icon"><FiShield aria-hidden="true" /></div>
                    <h2 className="dmp-lock-title">Buat PIN Dompet</h2>
                    <p className="dmp-lock-desc">
                        Buat PIN 6 digit untuk melindungi transaksi sebelum melanjutkan Top Up.
                    </p>

                    {pinError && <p className="dmp-form-error">{pinError}</p>}

                    <form className="dmp-form" onSubmit={handleCreatePin}>
                        <label className="dmp-label" htmlFor="dmp-pin-new">PIN Baru</label>
                        <input
                            id="dmp-pin-new"
                            className="dmp-input"
                            type="password"
                            inputMode="numeric"
                            autoComplete="off"
                            maxLength={6}
                            placeholder="••••••"
                            value={pinNewInput}
                            onChange={handleDigits(setPinNewInput)}
                        />

                        <label className="dmp-label" htmlFor="dmp-pin-confirm">Konfirmasi PIN Baru</label>
                        <input
                            id="dmp-pin-confirm"
                            className="dmp-input"
                            type="password"
                            inputMode="numeric"
                            autoComplete="off"
                            maxLength={6}
                            placeholder="••••••"
                            value={pinConfirmInput}
                            onChange={handleDigits(setPinConfirmInput)}
                        />

                        <button type="submit" className="dmp-btn-primary" disabled={pinSubmitting}>
                            {pinSubmitting ? 'Menyimpan…' : 'Buat PIN & Lanjut Top Up'}
                        </button>
                    </form>

                    <button className="dmp-text-btn" onClick={onBack}>← Kembali ke beranda</button>
                </div>
            </div>
        );
    }

    if (status === 'unlock') {
        return (
            <div className="dmp-container">
                {renderHeader('Top Up Saldo', true)}
                <div className="dmp-lock-card">
                    <div className="dmp-lock-icon"><FiLock aria-hidden="true" /></div>
                    <h2 className="dmp-lock-title">Masukkan PIN Dompet</h2>
                    <p className="dmp-lock-desc">
                        Masukkan PIN 6 digit untuk melanjutkan Top Up.
                    </p>

                    {wallet?.terkunci && (
                        <div className="dmp-locked-banner">
                            Dompet terkunci sementara karena terlalu banyak percobaan PIN salah.{' '}
                            {wallet.terkunci_sampai
                                ? `Coba lagi setelah ${formatWaktu(wallet.terkunci_sampai)}.`
                                : 'Coba lagi nanti.'}
                        </div>
                    )}

                    {pinError && <p className="dmp-form-error">{pinError}</p>}

                    <form className="dmp-form" onSubmit={handleVerifyPin}>
                        <label className="dmp-label" htmlFor="dmp-pin">PIN Dompet</label>
                        <input
                            id="dmp-pin"
                            className="dmp-input"
                            type="password"
                            inputMode="numeric"
                            autoComplete="off"
                            maxLength={6}
                            placeholder="••••••"
                            value={pinInput}
                            onChange={handleDigits(setPinInput)}
                            disabled={Boolean(wallet?.terkunci)}
                        />

                        <button
                            type="submit"
                            className="dmp-btn-primary"
                            disabled={pinSubmitting || wallet?.terkunci}
                        >
                            {pinSubmitting ? 'Memeriksa…' : 'Lanjut Top Up'}
                        </button>
                    </form>

                    <button type="button" className="dmp-link-btn" onClick={() => { setPinError(''); setPinManagerMode(null); setStatus('managePin'); }}>
                        Kelola PIN
                    </button>

                    {wallet?.terkunci && (
                        <button type="button" className="dmp-link-btn" onClick={loadWalletGate}>
                            Periksa status PIN lagi
                        </button>
                    )}

                    <button type="button" className="dmp-link-btn" onClick={onBack}>← Kembali ke beranda</button>
                </div>
            </div>
        );
    }

    if (status === 'resetPin') {
        return (
            <div className="dmp-container">
                {renderHeader('Top Up Saldo', true)}
                <div className="dmp-lock-card">
                    <div className="dmp-lock-icon"><FiKey aria-hidden="true" /></div>
                    <h2 className="dmp-lock-title">Reset PIN Dompet</h2>
                    <p className="dmp-lock-desc">
                        Verifikasi identitasmu dengan password akun, lalu tentukan PIN baru.
                    </p>

                    {pinError && <p className="dmp-form-error">{pinError}</p>}

                    <form className="dmp-form" onSubmit={handleResetPin}>
                        <label className="dmp-label" htmlFor="dmp-reset-password">Password Akun</label>
                        <input
                            id="dmp-reset-password"
                            className="dmp-input"
                            type="password"
                            autoComplete="current-password"
                            placeholder="••••••••"
                            value={passwordInput}
                            onChange={(e) => setPasswordInput(e.target.value)}
                        />

                        <label className="dmp-label" htmlFor="dmp-reset-pin-new">PIN Baru</label>
                        <input
                            id="dmp-reset-pin-new"
                            className="dmp-input"
                            type="password"
                            inputMode="numeric"
                            autoComplete="off"
                            maxLength={6}
                            placeholder="••••••"
                            value={pinNewInput}
                            onChange={handleDigits(setPinNewInput)}
                        />

                        <label className="dmp-label" htmlFor="dmp-reset-pin-confirm">Konfirmasi PIN Baru</label>
                        <input
                            id="dmp-reset-pin-confirm"
                            className="dmp-input"
                            type="password"
                            inputMode="numeric"
                            autoComplete="off"
                            maxLength={6}
                            placeholder="••••••"
                            value={pinConfirmInput}
                            onChange={handleDigits(setPinConfirmInput)}
                        />

                        <button type="submit" className="dmp-btn-primary" disabled={pinSubmitting}>
                            {pinSubmitting ? 'Menyimpan…' : 'Reset PIN'}
                        </button>
                    </form>

                    <button className="dmp-link-btn" onClick={() => { setPinError(''); setStatus('topup'); }}>
                        ← Kembali ke Top Up
                    </button>
                </div>
            </div>
        );
    }

    if (status === 'managePin') {
        /** Menutup pengelolaan PIN dan mengembalikan Driver ke form Top Up. */
        const backToWallet = () => {
            setPinError('');
            setPinManagerMode(null);
            setStatus('topup');
        };

        return (
            <div className="dmp-container">
                <div className="dmp-header">
                    <button className="dmp-back-btn" onClick={backToWallet} aria-label="Kembali ke dompet">
                        ←
                    </button>
                    <span className="dmp-title">Kelola PIN Dompet</span>
                    <span className="dmp-header-spacer" />
                </div>

                <div className="dmp-manage-card">
                    {pinError && <p className="dmp-form-error">{pinError}</p>}

                    {pinManagerMode === null && (
                        <>
                            <div className="dmp-pin-status">
                                <span className="dmp-pin-status-icon"><FiLock aria-hidden="true" /></span>
                                <div>
                                    <p className="dmp-pin-status-title">PIN Dompet Aktif</p>
                                    <p className="dmp-pin-status-sub">•• •• ••</p>
                                </div>
                                <span className="dmp-pin-status-badge">Aktif</span>
                            </div>

                            <button
                                className="dmp-menu-item"
                                onClick={() => {
                                    setPinError('');
                                    setPinManagerMode('change');
                                }}
                            >
                                <span className="dmp-menu-icon"><FiEdit2 aria-hidden="true" /></span>
                                <span className="dmp-menu-label">Ubah PIN</span>
                                <span className="dmp-menu-arrow">›</span>
                            </button>

                            <button
                                className="dmp-menu-item"
                                onClick={() => {
                                    setPinError('');
                                    setPinManagerMode('reset');
                                }}
                            >
                                <span className="dmp-menu-icon"><FiKey aria-hidden="true" /></span>
                                <span className="dmp-menu-label">Lupa PIN (Reset)</span>
                                <span className="dmp-menu-arrow">›</span>
                            </button>
                        </>
                    )}

                    {pinManagerMode === 'change' && (
                        <form className="dmp-form" onSubmit={handleChangePin}>
                            <p className="dmp-form-desc">Masukkan PIN lama lalu tentukan PIN baru.</p>
                            <label className="dmp-label">PIN Lama</label>
                            <input
                                className="dmp-input"
                                type="password"
                                inputMode="numeric"
                                autoComplete="off"
                                maxLength={6}
                                placeholder="••••••"
                                value={pinOldInput}
                                onChange={handleDigits(setPinOldInput)}
                            />
                            <label className="dmp-label">PIN Baru</label>
                            <input
                                className="dmp-input"
                                type="password"
                                inputMode="numeric"
                                autoComplete="off"
                                maxLength={6}
                                placeholder="••••••"
                                value={pinNewInput}
                                onChange={handleDigits(setPinNewInput)}
                            />
                            <label className="dmp-label">Konfirmasi PIN Baru</label>
                            <input
                                className="dmp-input"
                                type="password"
                                inputMode="numeric"
                                autoComplete="off"
                                maxLength={6}
                                placeholder="••••••"
                                value={pinConfirmInput}
                                onChange={handleDigits(setPinConfirmInput)}
                            />
                            <button type="submit" className="dmp-btn-primary" disabled={pinSubmitting}>
                                {pinSubmitting ? 'Menyimpan…' : 'Simpan PIN Baru'}
                            </button>
                            <button type="button" className="dmp-text-btn" onClick={backToWallet}>
                                ← Kembali
                            </button>
                        </form>
                    )}

                    {pinManagerMode === 'reset' && (
                        <form className="dmp-form" onSubmit={handleResetPin}>
                            <p className="dmp-form-desc">
                                Verifikasi dengan password akun, lalu buat PIN baru.
                            </p>
                            <label className="dmp-label">Password Akun</label>
                            <input
                                className="dmp-input"
                                type="password"
                                autoComplete="current-password"
                                placeholder="••••••••"
                                value={passwordInput}
                                onChange={(e) => setPasswordInput(e.target.value)}
                            />
                            <label className="dmp-label">PIN Baru</label>
                            <input
                                className="dmp-input"
                                type="password"
                                inputMode="numeric"
                                autoComplete="off"
                                maxLength={6}
                                placeholder="••••••"
                                value={pinNewInput}
                                onChange={handleDigits(setPinNewInput)}
                            />
                            <label className="dmp-label">Konfirmasi PIN Baru</label>
                            <input
                                className="dmp-input"
                                type="password"
                                inputMode="numeric"
                                autoComplete="off"
                                maxLength={6}
                                placeholder="••••••"
                                value={pinConfirmInput}
                                onChange={handleDigits(setPinConfirmInput)}
                            />
                            <button type="submit" className="dmp-btn-primary" disabled={pinSubmitting}>
                                {pinSubmitting ? 'Menyimpan…' : 'Reset PIN'}
                            </button>
                            <button type="button" className="dmp-text-btn" onClick={backToWallet}>
                                ← Kembali
                            </button>
                        </form>
                    )}
                </div>
            </div>
        );
    }
    
    if (status === 'topup') {
        return (
            <TopUp
                onBack={onBack}
                onDone={handleTopupDone}
                wallet={wallet}
                skipPinConfirmation={pinCreatedInSession}
                onManagePin={() => { setPinCreatedInSession(false); setPinError(''); setPinManagerMode(null); setStatus('managePin'); }}
            />
        );
    }

    // status === 'wallet'
    const locked = wallet?.terkunci;
    const walletIsActive = String(wallet?.status_dompet ?? '').toLowerCase() === 'aktif';

    // Filter riwayat transaksi (sisi klien).
    const filteredTransactions = transactions.filter((trx) => {
        const t = parseWaktuPembayaran(trx.waktu);
        if (!t) return false;

        if (filterPeriod === '7' || filterPeriod === '30') {
            const cutoff = new Date();
            cutoff.setDate(cutoff.getDate() - Number(filterPeriod));
            if (t < cutoff) return false;
        }

        if (filterPeriod === 'custom' && filterFrom) {
            const from = new Date(filterFrom);
            from.setHours(0, 0, 0, 0);
            if (t < from) return false;
        }
        if (filterPeriod === 'custom' && filterTo) {
            const to = new Date(filterTo);
            to.setHours(23, 59, 59, 999);
            if (t > to) return false;
        }

        if (filterKeyword.trim()) {
            const kw = filterKeyword.trim().toLowerCase();
            const haystack = `${trx.id} ${trx.jenis} ${trx.status}`.toLowerCase();
            if (!haystack.includes(kw)) return false;
        }

        return true;
    });

    return (
        <div className="dmp-container">
                {renderHeader('Top Up Saldo', true)}
            <main className="dmp-content">
                {contentLoading && <p className="dmp-content-loading">Memperbarui data dompet…</p>}
                {contentError && (
                    <div className="dmp-inline-error" role="alert">
                        <span>{contentError}</span>
                        <button type="button" className="dmp-link-btn" onClick={loadWalletContent}>Coba lagi</button>
                    </div>
                )}

                <section className="dmp-balance-card" aria-label="Ringkasan saldo dompet">
                    <div className="dmp-balance-head">
                        <p className="dmp-balance-label">Saldo Dompet</p>
                        <button
                            type="button"
                            className="dmp-eye-btn"
                            onClick={toggleHideBalance}
                            aria-label={hideBalance ? 'Tampilkan saldo' : 'Sembunyikan saldo'}
                            title={hideBalance ? 'Tampilkan saldo' : 'Sembunyikan saldo'}
                        >
                            {hideBalance ? <FiEye aria-hidden="true" /> : <FiEyeOff aria-hidden="true" />}
                        </button>
                    </div>
                    <p className="dmp-balance-value">{hideBalance ? 'Rp ••••••' : formatRupiah(wallet?.saldo ?? 0)}</p>
                    <div className="dmp-balance-meta">
                        <span className={`dmp-status-badge ${walletIsActive ? 'ok' : 'warn'}`}>
                            {statusLabel(wallet?.status_dompet)}
                        </span>
                        {locked && <span className="dmp-status-badge warn">PIN terkunci sementara</span>}
                    </div>
                    {/* Saldo tersedia memperhitungkan hold charging agar Driver tahu dana yang bisa dipakai. */}
                    <div className="dmp-balance-breakdown">
                        <div className="dmp-balance-detail">
                            <span>Saldo tersedia</span>
                            <strong>{hideBalance ? 'Rp ••••••' : formatRupiah(wallet?.saldo_tersedia ?? wallet?.saldo ?? 0)}</strong>
                        </div>
                        <div className="dmp-balance-detail">
                            <span>Saldo tertahan</span>
                            <strong>{hideBalance ? 'Rp ••••••' : formatRupiah(wallet?.saldo_hold ?? 0)}</strong>
                            <small>Untuk sesi charging yang masih berjalan</small>
                        </div>
                    </div>
                </section>

                <div className="dmp-actions">
                    <button
                        type="button"
                        className="dmp-action"
                        onClick={() => setStatus('topup')}
                        disabled={locked || !walletIsActive}
                    >
                        <span className="dmp-action-icon"><FiPlus aria-hidden="true" /></span>
                        <span className="dmp-action-label">Top Up</span>
                    </button>
                    <button type="button" className="dmp-action" onClick={() => setStatus('managePin')}>
                        <span className="dmp-action-icon"><FiLock aria-hidden="true" /></span>
                        <span className="dmp-action-label">Kelola PIN</span>
                    </button>
                </div>

                <section className="dmp-mutasi">
                <div className="dmp-mutasi-header">
                    <h3 className="dmp-mutasi-title">Riwayat Transaksi</h3>
                </div>

                {historyError ? (
                    <div className="dmp-inline-error" role="alert">
                        <span>{historyError}</span>
                        <button type="button" className="dmp-link-btn" onClick={loadWalletContent}>Coba lagi</button>
                    </div>
                ) : contentLoading && transactions.length === 0 ? (
                    <p className="dmp-empty-compact">Memuat riwayat transaksi…</p>
                ) : transactions.length === 0 ? (
                    <div className="dmp-empty">
                        <span className="dmp-empty-icon"><FiCreditCard aria-hidden="true" /></span>
                        <p>Belum ada transaksi. Aktivitas top up dan pembayaran akan muncul di sini.</p>
                    </div>
                ) : (
                    <>
                        <div className="dmp-filter">
                            <div className="dmp-filter-pills">
                                {[
                                    { v: 'all', l: 'Semua' },
                                    { v: '7', l: '7 hari' },
                                    { v: '30', l: '30 hari' },
                                    { v: 'custom', l: 'Custom' },
                                ].map((p) => (
                                    <button
                                        key={p.v}
                                        type="button"
                                        className={`dmp-filter-pill ${filterPeriod === p.v ? 'active' : ''}`}
                                        onClick={() => setFilterPeriod(p.v)}
                                    >
                                        {p.l}
                                    </button>
                                ))}
                            </div>

                            <input
                                className="dmp-filter-search"
                                type="search"
                                placeholder="Cari transaksi…"
                                value={filterKeyword}
                                onChange={(e) => setFilterKeyword(e.target.value)}
                            />

                            {filterPeriod === 'custom' && (
                                <div className="dmp-filter-dates">
                                    <input
                                        type="date"
                                        value={filterFrom}
                                        onChange={(e) => setFilterFrom(e.target.value)}
                                    />
                                    <span>s/d</span>
                                    <input
                                        type="date"
                                        value={filterTo}
                                        onChange={(e) => setFilterTo(e.target.value)}
                                    />
                                </div>
                            )}
                        </div>

                        {filteredTransactions.length === 0 ? (
                            <div className="dmp-empty">
                                <span className="dmp-empty-icon"><FiSearch aria-hidden="true" /></span>
                                <p>Tidak ada transaksi yang cocok dengan filter.</p>
                            </div>
                        ) : (
                            <ul className="dmp-mutasi-list">
                                {filteredTransactions.map((trx) => {
                                    const isCharging = trx.jenis === 'Pembayaran Charging';
                                    const arah = trx.tipe === 'masuk' ? 'masuk' : 'keluar';
                                    const extra = isCharging ? ' charging' : '';

                                    return (
                                        <li key={trx.id} className="dmp-trx">
                                            <span className={`dmp-trx-icon ${arah}${extra}`}>
                                                {trx.tipe === 'masuk' ? '↓' : '↑'}
                                            </span>
                                            <div className="dmp-trx-info">
                                                <p className="dmp-trx-name">{trx.jenis}</p>
                                                <p className="dmp-trx-time">{formatWaktu(trx.waktu)}</p>
                                            </div>
                                            <div className="dmp-trx-right">
                                                <p className={`dmp-trx-nominal ${arah}${extra}`}>
                                                    {trx.tipe === 'masuk' ? '+' : '−'} {formatRupiah(trx.nominal)}
                                                </p>
                                                <p className={`dmp-trx-status ${trx.status}`}>{statusLabel(trx.status)}</p>
                                            </div>
                                        </li>
                                    );
                                })}
                            </ul>
                        )}
                    </>
                )}
            </section>

                <button type="button" className="dmp-text-btn" onClick={onBack}>Kembali ke Beranda</button>
            </main>
        </div>
    );
}
