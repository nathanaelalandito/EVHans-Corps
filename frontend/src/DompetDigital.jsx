import { useState, useEffect } from 'react';
import TopUp from './Topup'; // sesuaikan nama file: Topup.jsx / TopUp.jsx
import './dompetDigital.css';
import {
    getWallet,
    getTransactions,
    getCachedWallet,
    getCachedTransactions,
    createPin,
    changePin as changePinApi,
    disablePin as disablePinApi,
    resetPin,
} from './api/wallet';

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

function formatRupiah(value) {
    return 'Rp' + Number(value || 0).toLocaleString('id-ID');
}

function formatWaktu(value) {
    if (!value) return '-';
    const d = new Date(value);
    return d.toLocaleString('id-ID', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
    });
}

const STATUS_LABEL = {
    sukses: 'Berhasil',
    pending: 'Menunggu',
    gagal: 'Gagal',
    aktif: 'Aktif',
};

function statusLabel(status) {
    return STATUS_LABEL[status] ?? status;
}

export default function DompetDigital({ onBack }) {
    // Tanpa gate PIN: saldo + riwayat langsung tampil saat halaman dibuka.
    // PIN tetap dipakai backend untuk konfirmasi charging (lihat
    // ChargingSessionController), bukan untuk sekadar melihat dompet.
    const [status, setStatus] = useState('wallet'); // 'wallet' | 'managePin' | 'topup'
    const [wallet, setWallet] = useState(() => getCachedWallet() || null);
    const [transactions, setTransactions] = useState(() => getCachedTransactions() || []);

    const [pinSubmitting, setPinSubmitting] = useState(false);
    const [pinError, setPinError] = useState('');

    const [pinNewInput, setPinNewInput] = useState('');
    const [pinConfirmInput, setPinConfirmInput] = useState('');
    const [pinOldInput, setPinOldInput] = useState('');
    const [pinManagerMode, setPinManagerMode] = useState(null); // null | create | change | disable | reset
    const [passwordInput, setPasswordInput] = useState('');

    // Sembunyikan/lihat saldo (ikut pengaturan di kartu saldo beranda).
    const [hideBalance, setHideBalance] = useState(
        () => localStorage.getItem('ev_hide_saldo') === '1'
    );
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

    useEffect(() => {
        let cancelled = false;
        Promise.all([getWallet(), getTransactions()])
            .then(([w, trx]) => {
                if (cancelled) return;
                setWallet(w);
                setTransactions(trx.transactions || []);
            })
            .catch(() => onBack());
        return () => {
            cancelled = true;
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const handleDigits = (setter) => (e) => {
        setter(e.target.value.replace(/\D/g, '').slice(0, 6));
    };
    // Dipanggil TopUp saat user menekan "Kembali ke Beranda"
    const handleTopupDone = async (saldoBaru) => {
        if (typeof saldoBaru === 'number') {
            setWallet((prev) => ({ ...(prev || {}), saldo: saldoBaru }));
        }
        try {
            // Ambil ulang saldo + riwayat supaya top up baru langsung muncul
            const data = await getTransactions();
            setTransactions(data.transactions || []);
            setWallet((prev) => ({ ...(prev || {}), saldo: data.saldo }));
        } catch {
            /* abaikan, data lama tetap tampil */
        }
        setStatus('wallet');
    };

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
            const data = await getWallet();
            setWallet(data);
            setPinNewInput('');
            setPinConfirmInput('');
            setPinError('');
            setPinManagerMode(null);
        } catch (err) {
            setPinError(extractErrorMessage(err, 'Gagal membuat PIN. Coba lagi.'));
        } finally {
            setPinSubmitting(false);
        }
    };

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

    const handleDisablePin = async (e) => {
        e.preventDefault();
        setPinSubmitting(true);
        setPinError('');

        if (pinOldInput.length !== 6) {
            setPinError('Masukkan PIN saat ini (6 digit) untuk konfirmasi.');
            setPinSubmitting(false);
            return;
        }

        try {
            await disablePinApi(pinOldInput);
            const data = await getWallet();
            setWallet(data);
            setPinManagerMode(null);
        } catch (err) {
            setPinError(extractErrorMessage(err, 'Gagal menonaktifkan PIN. Coba lagi.'));
        } finally {
            setPinSubmitting(false);
        }
    };

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
        } catch (err) {
            setPinError(extractErrorMessage(err, 'Gagal mereset PIN. Coba lagi.'));
        } finally {
            setPinSubmitting(false);
        }
    };

    const renderHeader = (title, showBrand = false) => (
        <div className="dmp-header">
            <button className="dmp-back-btn" onClick={onBack} aria-label="Kembali">
                ←
            </button>
            <div className="dmp-title">
                <span className="dmp-title-main">{title}</span>
                {showBrand && <span className="dmp-title-sub">EVChargeHub</span>}
            </div>
            <span className="dmp-header-spacer" />
        </div>
    );

    if (status === 'managePin') {
        const backToWallet = () => {
            setPinError('');
            setPinManagerMode(null);
            setStatus('wallet');
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

                    {/* Belum punya PIN -> langsung form buat PIN */}
                    {!wallet?.pin_sudah_diset && pinManagerMode === null && (
                        <button
                            className="dmp-menu-item"
                            onClick={() => {
                                setPinError('');
                                setPinManagerMode('create');
                            }}
                        >
                            <span className="dmp-menu-icon">🔒</span>
                            <span className="dmp-menu-label">Buat PIN Dompet</span>
                            <span className="dmp-menu-arrow">›</span>
                        </button>
                    )}

                    {wallet?.pin_sudah_diset && pinManagerMode === null && (
                        <>
                            <div className="dmp-pin-status">
                                <span className="dmp-pin-status-icon">🔒</span>
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
                                <span className="dmp-menu-icon">✏️</span>
                                <span className="dmp-menu-label">Ubah PIN</span>
                                <span className="dmp-menu-arrow">›</span>
                            </button>

                            <button
                                className="dmp-menu-item dmp-menu-danger"
                                onClick={() => {
                                    setPinError('');
                                    setPinManagerMode('disable');
                                }}
                            >
                                <span className="dmp-menu-icon">🚫</span>
                                <span className="dmp-menu-label">Nonaktifkan PIN</span>
                                <span className="dmp-menu-arrow">›</span>
                            </button>

                            <button
                                className="dmp-menu-item"
                                onClick={() => {
                                    setPinError('');
                                    setPinManagerMode('reset');
                                }}
                            >
                                <span className="dmp-menu-icon">🔑</span>
                                <span className="dmp-menu-label">Lupa PIN (Reset)</span>
                                <span className="dmp-menu-arrow">›</span>
                            </button>
                        </>
                    )}

                    {pinManagerMode === 'create' && (
                        <form className="dmp-form" onSubmit={handleCreatePin}>
                            <p className="dmp-form-desc">
                                Buat PIN 6 digit untuk konfirmasi top up dan pembayaran dari saldo
                                dompetmu.
                            </p>
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
                                {pinSubmitting ? 'Menyimpan…' : 'Simpan PIN'}
                            </button>
                            <button type="button" className="dmp-text-btn" onClick={backToWallet}>
                                ← Kembali
                            </button>
                        </form>
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

                    {pinManagerMode === 'disable' && (
                        <form className="dmp-form" onSubmit={handleDisablePin}>
                            <p className="dmp-form-desc">
                                Masukkan PIN saat ini untuk menonaktifkan PIN dompet.
                            </p>
                            <label className="dmp-label">PIN Saat Ini</label>
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
                            <button type="submit" className="dmp-btn-primary dmp-btn-danger" disabled={pinSubmitting}>
                                {pinSubmitting ? 'Memproses…' : 'Nonaktifkan PIN'}
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
            onBack={() => setStatus('wallet')}
            onDone={handleTopupDone}
        />
    );
    }

    // status === 'wallet'
    const locked = wallet?.terkunci;

    // Filter riwayat transaksi (sisi klien).
    const filteredTransactions = transactions.filter((trx) => {
        const t = new Date(trx.waktu);

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
            {renderHeader('Dompet Digital', true)}

            <div className="dmp-balance-card">
                <div className="dmp-balance-head">
                    <p className="dmp-balance-label">Saldo Dompet</p>
                    <button
                        type="button"
                        className="dmp-eye-btn"
                        onClick={toggleHideBalance}
                        aria-label={hideBalance ? 'Tampilkan saldo' : 'Sembunyikan saldo'}
                        title={hideBalance ? 'Tampilkan saldo' : 'Sembunyikan saldo'}
                    >
                        {hideBalance ? '🙈' : '👁️'}
                    </button>
                </div>
                <p className="dmp-balance-value">{hideBalance ? 'Rp ••••••' : formatRupiah(wallet?.saldo ?? 0)}</p>
                <div className="dmp-balance-meta">
                    <span className={`dmp-status-badge ${wallet?.status_dompet === 'aktif' ? 'ok' : 'warn'}`}>
                        {statusLabel(wallet?.status_dompet)}
                    </span>
                    {locked && <span className="dmp-status-badge warn">Terkunci sementara</span>}
                </div>
            </div>

            <div className="dmp-actions">
                   <button className="dmp-action"   onClick={() => setStatus('topup')}disabled={locked || wallet?.status_dompet !== 'aktif'}title="Top Up saldo">
                         <span className="dmp-action-icon">➕</span>
                        <span className="dmp-action-label">Top Up</span>
                    </button>
                <button className="dmp-action" onClick={() => setStatus('managePin')}>
                    <span className="dmp-action-icon">🔒</span>
                    <span className="dmp-action-label">Kelola PIN</span>
                </button>
            </div>

            <section className="dmp-mutasi">
                <div className="dmp-mutasi-header">
                    <h3 className="dmp-mutasi-title">Riwayat Transaksi</h3>
                </div>

                {transactions.length === 0 ? (
                    <div className="dmp-empty">
                        <span className="dmp-empty-icon">💸</span>
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
                                <span className="dmp-empty-icon">🔍</span>
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

            <button className="dmp-text-btn" onClick={onBack}>← Kembali ke beranda</button>
        </div>
    );
}