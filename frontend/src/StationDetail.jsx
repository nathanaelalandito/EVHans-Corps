import { useEffect, useState } from 'react';
import { FiNavigation, FiX } from 'react-icons/fi';
import './stationDetail.css';
import { getStationDetail, konektorLabel, sameConnector, stationAvailabilityLabel, portStatusLabel, chargerStatusLabel } from './api/station';
import { googleMapsDirectionsUrl } from './api/routing';

/** Memformat angka biaya ke format rupiah. */
const rupiah = (v) => (v == null ? '-' : 'Rp' + Number(v).toLocaleString('id-ID'));

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
    const stationOk = station.can_start;
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
            if (station.can_start && portStatusLabel(p.status_port).text === 'Tersedia') k.tersedia += 1;
            return acc;
        }, {})
    );

    const compatiblePorts = vehicleConnector
        ? allPorts.filter((p) => sameConnector(p.tipe_konektor, vehicleConnector)).length
        : null;
    const compatibleFree = vehicleConnector
        ? allPorts.filter((p) => sameConnector(p.tipe_konektor, vehicleConnector)
            && station.can_start && portStatusLabel(p.status_port).text === 'Tersedia').length
        : null;
    const vehicleName = [activeVehicle?.merek, activeVehicle?.model].filter(Boolean).join(' ') || 'kendaraan aktif';
    const chargerGroups = detail?.chargers ?? [];

    const badgeText = stationAvailabilityLabel(station);
    const badgeTone = stationOk ? 'ok' : ['Dalam Perawatan', 'Gangguan'].includes(badgeText) ? 'warn' : 'danger';

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
                                {station.port_tersedia} dari {station.jumlah_port}
                            </span>
                            <span className="sd-summary-label">Port tersedia</span>
                        </div>
                        <div className="sd-summary-item">
                            <span className="sd-summary-value">{station.daya_kw_max} kW</span>
                            <span className="sd-summary-label">Daya maks.</span>
                        </div>
                        <div className="sd-summary-item">
                            <span className="sd-summary-value">{station.jam_buka && station.jam_tutup ? `${station.jam_buka} – ${station.jam_tutup}` : '24 jam'}</span>
                            <span className="sd-summary-label">
                                {station.is_open ? 'Buka sekarang' : station.buka_berikutnya ? `Tutup · buka pukul ${station.buka_berikutnya} WIB` : 'Tutup sekarang'}
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
                            {compatiblePorts !== null && (
                                <p className={`sd-fit ${compatiblePorts > 0 ? 'ok' : 'none'}`}>
                                    {compatiblePorts > 0
                                        ? `Cocok dengan ${vehicleName}`
                                        : `Konektor tidak cocok dengan ${vehicleName}`}
                                    {compatiblePorts > 0 && compatibleFree === 0 && ' · Tidak ada port yang tersedia saat ini'}
                                </p>
                            )}

                            <div className="sd-chips">
                                {perKonektor.map((k) => (
                                    <span key={k.tipe} className="sd-chip">
                                        {konektorLabel(k.tipe)} · {k.tersedia} dari {k.total} tersedia
                                    </span>
                                ))}
                            </div>

                            <div className="sd-charger-groups">
                                {chargerGroups.map((charger) => {
                                    const chargerState = chargerStatusLabel(charger.status_mesin);
                                    return (
                                        <section className="sd-charger-group" key={charger.id_charger}>
                                            <div className="sd-charger-heading">
                                                <strong>{charger.kode_perangkat || 'Charger'}</strong>
                                                <span>{charger.kap_tot_kw ?? '—'} kW · {charger.jumlah_port ?? charger.ports?.length ?? 0} port</span>
                                                <span className={`sd-badge ${chargerState.tone}`}>{chargerState.text}</span>
                                            </div>
                                            <ul className="sd-ports">
                                                {(charger.ports ?? []).map((port) => {
                                                    const portState = portStatusLabel(port.status_port);
                                                    return (
                                                        <li key={port.id_port} className="sd-port">
                                                            <div className="sd-port-main">
                                                                <span className="sd-port-code">{port.nomor_port || `Port ${port.id_port}`}</span>
                                                                <span className="sd-port-meta">
                                                                    {konektorLabel(port.tipe_konektor)} · {port.tipe_charging || 'Jenis arus belum tersedia'} · {port.daya_maks_kw ?? '—'} kW · {rupiah(port.tarif_per_kwh ?? station.tarif_per_kwh)}/kWh
                                                                </span>
                                                            </div>
                                                            <span className={`sd-badge ${portState.tone}`}>{portState.text}</span>
                                                        </li>
                                                    );
                                                })}
                                            </ul>
                                        </section>
                                    );
                                })}
                                {allPorts.length === 0 && <p className="sd-muted">Belum ada port charger terdaftar.</p>}
                            </div>
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
