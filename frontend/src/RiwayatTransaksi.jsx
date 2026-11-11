import api from './api/client';
import { useState, useEffect, useRef } from 'react';
import './dompetDigital.css';

// ------------------------------------------------------------------
// Halaman RIWAYAT TRANSAKSI dompet. Sengaja berdiri sendiri (bukan
// sub-layar DompetDigital) supaya menekan "Riwayat Transaksi" di
// pengaturan langsung menampilkan daftar transaksi — tanpa diminta
// PIN dulu dan tanpa kartu saldo / Top Up / Kelola PIN.
// ------------------------------------------------------------------

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

export default function RiwayatTransaksi({ onBack }) {
    const [status, setStatus] = useState('loading'); // 'loading' | 'ready' | 'error'
    const [error, setError] = useState('');
    const [transactions, setTransactions] = useState([]);
    const retryRef = useRef(null);

    const [filterPeriod, setFilterPeriod] = useState('all'); // all | 7 | 30 | custom
    const [filterKeyword, setFilterKeyword] = useState('');
    const [filterFrom, setFilterFrom] = useState('');
    const [filterTo, setFilterTo] = useState('');

    useEffect(() => {
        let cancelled = false;

        const run = async () => {
            setStatus('loading');
            setError('');
            try {
                const { data } = await api.get('/wallet/transactions');
                if (cancelled) return;
                setTransactions(data.transactions || []);
                setStatus('ready');
            } catch (err) {
                if (cancelled) return;
                console.error('Gagal memuat riwayat transaksi:', err);
                setError(extractErrorMessage(err, 'Gagal memuat riwayat transaksi.'));
                setStatus('error');
            }
        };

        retryRef.current = run;
        run();
        return () => {
            cancelled = true;
        };
    }, []);

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
        <div className="dmp-container dmp-riwayat-page">
            <div className="dmp-header">
                <button className="dmp-back-btn" onClick={onBack} aria-label="Kembali">
                    ←
                </button>
                <div className="dmp-title">
                    <span className="dmp-title-main">Riwayat Transaksi</span>
                </div>
                <span className="dmp-header-spacer" />
            </div>

            {status === 'loading' && <div className="dmp-loading">Memuat…</div>}

            {status === 'error' && (
                <div className="dmp-empty">
                    <span className="dmp-empty-icon">⚠️</span>
                    <p>{error}</p>
                    <button type="button" className="dmp-btn-primary" onClick={() => retryRef.current?.()}>
                        Coba lagi
                    </button>
                </div>
            )}

            {status === 'ready' && (
                <>
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
                </>
            )}

            <button className="dmp-text-btn" onClick={onBack}>← Kembali ke beranda</button>
        </div>
    );
}
