import React, { useEffect, useState } from 'react';
import './stationDetail.css';
import { getStationDetail, konektorLabel } from './api/station';
import { googleMapsDirectionsUrl } from './api/routing';

const CHARGER_STATUS = {
    tersedia: { text: 'Tersedia', tone: 'ok' },
    'sedang digunakan': { text: 'Digunakan', tone: 'warn' },
    maintenance: { text: 'Perawatan', tone: 'warn' },
    rusak: { text: 'Rusak', tone: 'danger' },
    offline: { text: 'Offline', tone: 'danger' },
};
const chargerStatus = (s) => CHARGER_STATUS[s] ?? { text: s, tone: 'danger' };

const rupiah = (v) => (v == null ? '-' : 'Rp' + Number(v).toLocaleString('id-ID'));

const toMinutes = (hhmm) => {
    const [h, m] = String(hhmm).split(':').map(Number);
    return h * 60 + (m || 0);
};

// "00:00"–"23:59" dianggap buka 24 jam; jam tutup <= jam buka = lewat tengah malam.
function operasional(buka, tutup) {
    if (!buka || !tutup) return { label: '-', open: null };
    if (buka === '00:00' && (tutup === '23:59' || tutup === '00:00')) {
        return { label: '24 jam', open: true };
    }
    const now = new Date();
    const cur = now.getHours() * 60 + now.getMinutes();
    const b = toMinutes(buka);
    const t = toMinutes(tutup);
    const open = t > b ? cur >= b && cur < t : cur >= b || cur < t;
    return { label: `${buka} – ${tutup}`, open };
}

export default function StationDetail({ station, activeVehicle, onClose, onShowRoute }) {
    const [detail, setDetail] = useState(null);
    const [status, setStatus] = useState('loading'); // 'loading' | 'ok' | 'error'

    // Komponen ini dipasang dengan key = id station, jadi state selalu
    // mulai bersih setiap kali station berganti.
    useEffect(() => {
        let cancelled = false;
        getStationDetail(station.id_location)
            .then((d) => {
                if (cancelled) return;
                setDetail(d);
                setStatus('ok');
            })
            .catch(() => {
                if (!cancelled) setStatus('error');
            });
        return () => {
            cancelled = true;
        };
    }, [station.id_location]);

    useEffect(() => {
        const onKey = (e) => e.key === 'Escape' && onClose();
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [onClose]);

    const chargers = detail?.chargers ?? [];
    const vehicleConnector = activeVehicle?.tipe_konektor ?? null;
    const ops = operasional(station.jam_buka, station.jam_tutup);
    const stationOk = station.status === 'Aktif';
    const placeholder = status === 'loading' ? '…' : '-';

    // Ringkasan per tipe konektor: tersedia / total.
    const perKonektor = Object.values(
        chargers.reduce((acc, c) => {
            const k = (acc[c.tipe_konektor] ??= { tipe: c.tipe_konektor, total: 0, tersedia: 0 });
            k.total += 1;
            if (c.status === 'tersedia') k.tersedia += 1;
            return acc;
        }, {})
    );

    const compatibleFree = vehicleConnector
        ? chargers.filter((c) => c.tipe_konektor === vehicleConnector && c.status === 'tersedia').length
        : null;

    const badgeTone = !stationOk ? 'warn' : station.charger_tersedia === 0 ? 'danger' : 'ok';
    const badgeText = !stationOk ? station.status : station.charger_tersedia === 0 ? 'Penuh' : 'Tersedia';

    return (
        <div className="sd-backdrop" onClick={onClose}>
            <section
                className="sd-sheet"
                role="dialog"
                aria-modal="true"
                aria-label={`Detail ${station.nama_lokasi}`}
                onClick={(e) => e.stopPropagation()}
            >
                <header className="sd-head">
                    <div className="sd-head-text">
                        <span className={`sd-badge ${badgeTone}`}>{badgeText}</span>
                        <h2 className="sd-title">{station.nama_lokasi}</h2>
                        <p className="sd-address">{station.alamat}</p>
                    </div>
                    <button className="sd-close" onClick={onClose} aria-label="Tutup detail station">
                        ✕
                    </button>
                </header>

                <div className="sd-body">
                    <div className="sd-summary">
                        <div className="sd-summary-item">
                            <span className="sd-summary-value">
                                {station.charger_tersedia}/{station.charger_total}
                            </span>
                            <span className="sd-summary-label">Port tersedia</span>
                        </div>
                        <div className="sd-summary-item">
                            <span className="sd-summary-value">{station.daya_kw_max} kW</span>
                            <span className="sd-summary-label">Daya maks.</span>
                        </div>
                        <div className="sd-summary-item">
                            <span className="sd-summary-value">{ops.label}</span>
                            <span className="sd-summary-label">
                                {ops.open === null ? 'Jam operasional' : ops.open ? 'Buka sekarang' : 'Tutup sekarang'}
                            </span>
                        </div>
                    </div>

                    <h3 className="sd-section">Tarif</h3>
                    {status === 'ok' && !detail?.tarif ? (
                        <p className="sd-muted">Tarif belum tersedia untuk station ini.</p>
                    ) : (
                        <dl className="sd-tarif">
                            <div>
                                <dt>Per kWh</dt>
                                <dd>{rupiah(detail?.tarif?.harga_per_kwh ?? station.tarif_per_kwh)}</dd>
                            </div>
                            <div>
                                <dt>Biaya minimum</dt>
                                <dd>{detail ? rupiah(detail.tarif?.biaya_minimum) : placeholder}</dd>
                            </div>
                            <div>
                                <dt>Parkir / jam</dt>
                                <dd>{detail ? rupiah(detail.tarif?.biaya_parkir_per_jam) : placeholder}</dd>
                            </div>
                        </dl>
                    )}

                    <h3 className="sd-section">Port charger</h3>

                    {status === 'loading' && <p className="sd-muted" aria-live="polite">Memuat daftar port…</p>}
                    {status === 'error' && (
                        <p className="sd-error" role="alert">
                            Detail port tidak dapat dimuat. Periksa koneksi lalu coba buka lagi.
                        </p>
                    )}

                    {status === 'ok' && (
                        <>
                            {compatibleFree !== null && (
                                <p className={`sd-fit ${compatibleFree > 0 ? 'ok' : 'none'}`}>
                                    {compatibleFree > 0
                                        ? `${compatibleFree} port ${konektorLabel(vehicleConnector)} tersedia untuk kendaraan Anda`
                                        : `Tidak ada port ${konektorLabel(vehicleConnector)} yang tersedia saat ini`}
                                </p>
                            )}

                            <div className="sd-chips">
                                {perKonektor.map((k) => (
                                    <span key={k.tipe} className="sd-chip">
                                        {konektorLabel(k.tipe)} · {k.tersedia}/{k.total} tersedia
                                    </span>
                                ))}
                            </div>

                            <ul className="sd-ports">
                                {chargers.map((c) => {
                                    const st = chargerStatus(c.status);
                                    const fits = vehicleConnector && c.tipe_konektor === vehicleConnector;
                                    return (
                                        <li key={c.id_charger} className={`sd-port ${fits ? 'fits' : ''}`}>
                                            <div className="sd-port-main">
                                                <span className="sd-port-code">{c.kode_perangkat}</span>
                                                <span className="sd-port-meta">
                                                    {konektorLabel(c.tipe_konektor)} · {c.tipe_charging} · {c.daya_kw} kW
                                                    {fits && <span className="sd-port-fit"> · Cocok</span>}
                                                </span>
                                            </div>
                                            <span className={`sd-badge ${st.tone}`}>{st.text}</span>
                                        </li>
                                    );
                                })}
                                {chargers.length === 0 && <li className="sd-muted">Belum ada charger terdaftar.</li>}
                            </ul>
                        </>
                    )}
                </div>

                <footer className="sd-actions">
                    <button className="sd-primary" onClick={() => onShowRoute(station)}>
                        🧭 Tampilkan Rute
                    </button>
                    <a
                        className="sd-secondary"
                        href={googleMapsDirectionsUrl(station)}
                        target="_blank"
                        rel="noopener noreferrer"
                    >
                        Google Maps ↗
                    </a>
                </footer>
            </section>
        </div>
    );
}
