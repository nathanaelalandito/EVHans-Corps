import React, { useEffect, useState } from 'react';
import { FiNavigation, FiX } from 'react-icons/fi';
import './stationDetail.css';
import { getStationDetail, konektorLabel, sameConnector } from './api/station';
import { googleMapsDirectionsUrl } from './api/routing';

const PORT_STATUS = {
    Available: { text: 'Tersedia', tone: 'ok' },
    tersedia: { text: 'Tersedia', tone: 'ok' },
    Charging: { text: 'Digunakan', tone: 'warn' },
    'sedang digunakan': { text: 'Digunakan', tone: 'warn' },
    Reserved: { text: 'Dipesan', tone: 'warn' },
    'Out of Order': { text: 'Perawatan', tone: 'danger' },
    Maintenance: { text: 'Perawatan', tone: 'warn' },
    offline: { text: 'Offline', tone: 'danger' },
};
/** Mengubah status port menjadi label dan gaya indikator untuk detail station. */
const portStatus = (s) => PORT_STATUS[s] ?? { text: s || 'Tidak diketahui', tone: 'danger' };

/** Memformat angka biaya ke format rupiah. */
const rupiah = (v) => (v == null ? '-' : 'Rp' + Number(v).toLocaleString('id-ID'));

/** Mengubah teks jam HH:mm menjadi jumlah menit untuk perbandingan waktu. */
const toMinutes = (hhmm) => {
    const [h, m] = String(hhmm).split(':').map(Number);
    return h * 60 + (m || 0);
};

/** Menentukan apakah station buka saat ini, termasuk jam lintas tengah malam. */
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

/** Panel detail station dengan tarif, jam buka, konektor, dan port tersedia. */
export default function StationDetail({ station, activeVehicle, onClose, onShowRoute }) {
    const [detail, setDetail] = useState(null);
    const [status, setStatus] = useState('loading'); // 'loading' | 'ok' | 'error'

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
        /** Menutup panel detail saat pengguna menekan Escape. */
        const onKey = (e) => e.key === 'Escape' && onClose();
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [onClose]);

    const vehicleConnector = activeVehicle?.tipe_konektor ?? null;
    const ops = operasional(station.jam_buka, station.jam_tutup);
    const stationOk = station.status === 'Aktif';
    const placeholder = status === 'loading' ? '…' : '-';

    // Ekstrak semua port dari setiap unit charger di stasiun ini
    const allPorts = [];
    if (detail?.chargers) {
        detail.chargers.forEach((charger) => {
            if (charger.ports && Array.isArray(charger.ports)) {
                charger.ports.forEach((port) => {
                    allPorts.push({
                        ...port,
                        kode_perangkat: charger.kode_perangkat,
                        merek_model: charger.merek_model,
                        status_mesin: charger.status_mesin,
                    });
                });
            }
        });
    }

    // Ringkasan per tipe konektor: tersedia / total.
    const perKonektor = Object.values(
        allPorts.reduce((acc, p) => {
            const tipe = p.tipe_konektor;
            /** Mengelompokkan port agar jumlah total dan tersedia dihitung per konektor. */
            const k = (acc[tipe] ??= { tipe, total: 0, tersedia: 0 });
            k.total += 1;
            if (p.status_port === 'Available' || p.status_port === 'tersedia') k.tersedia += 1;
            return acc;
        }, {})
    );

    const compatibleFree = vehicleConnector
        ? allPorts.filter(
              (p) =>
                  sameConnector(p.tipe_konektor, vehicleConnector) &&
                  (p.status_port === 'Available' || p.status_port === 'tersedia')
          ).length
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
                        <small className="sd-station-code">{station.kode_station}</small>
                        <h2 className="sd-title">{station.nama_lokasi}</h2>
                        <p className="sd-address">{station.alamat}</p>
                    </div>
                    <button className="sd-close" onClick={onClose} aria-label="Tutup detail station">
                        <FiX aria-hidden="true" />
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
                                <dd>{detail ? (Number(detail.tarif?.biaya_minimum ?? 0) > 0 ? rupiah(detail.tarif.biaya_minimum) : 'Tidak ada') : placeholder}</dd>
                            </div>
                            <div>
                                <dt>Parkir flat / sesi</dt>
                                <dd>{detail ? rupiah(detail.tarif?.biaya_parkir_flat) : placeholder}</dd>
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
                                {allPorts.map((p) => {
                                    const st = portStatus(p.status_port);
                                    const fits = vehicleConnector && sameConnector(p.tipe_konektor, vehicleConnector);
                                    return (
                                        <li key={p.id_port} className={`sd-port ${fits ? 'fits' : ''}`}>
                                            <div className="sd-port-main">
                                                <span className="sd-port-code">{p.kode_perangkat} — {p.nomor_port}</span>
                                                <span className="sd-port-meta">
                                                    {konektorLabel(p.tipe_konektor)} · {p.tipe_charging} · {p.daya_maks_kw} kW
                                                    {fits && <span className="sd-port-fit"> · Cocok</span>}
                                                </span>
                                            </div>
                                            <span className={`sd-badge ${st.tone}`}>{st.text}</span>
                                        </li>
                                    );
                                })}
                                {allPorts.length === 0 && <li className="sd-muted">Belum ada port charger terdaftar.</li>}
                            </ul>
                        </>
                    )}
                </div>

                <footer className="sd-actions">
                    <button className="sd-primary" onClick={() => onShowRoute(station)}>
                        <FiNavigation aria-hidden="true" /> Tampilkan Rute
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
