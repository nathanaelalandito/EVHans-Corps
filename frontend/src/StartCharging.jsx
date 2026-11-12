import React, { useEffect, useState } from 'react';
import { FiBarChart2, FiCheck, FiZap } from 'react-icons/fi';
import './startCharging.css';
import { getStationDetail, konektorLabel, sameConnector } from './api/station';
import { prepareCharging, estimateCharging, startCharging } from './api/charging';

const TARGET_PERCENT_SHORTCUTS = [80, 100];

/** Membulatkan energi ke bawah dalam kelipatan 0,5 kWh. */
const roundDownHalf = (x) => Math.floor(x * 2) / 2;

/** Menghitung energi yang dibutuhkan untuk mencapai persentase baterai target. */
function kwhToReach(percent, p) {
    const need = (p.kapasitas_baterai_kwh * (percent - p.soc_awal)) / 100;
    return Math.min(p.max_target_kwh, Math.max(p.min_target_kwh, roundDownHalf(need)));
}

/** Memperkirakan SOC akhir berdasarkan energi yang akan masuk ke baterai. */
const socAfter = (kwh, p) => Math.min(100, Math.round(p.soc_awal + (kwh / p.kapasitas_baterai_kwh) * 100));

/** Memformat nominal biaya charging sebagai rupiah. */
const rupiah = (v) => (v == null ? '-' : 'Rp' + Number(v).toLocaleString('id-ID'));

/** Menyajikan durasi menit dalam format jam/menit yang ringkas. */
function durasiLabel(menit) {
    if (menit < 1) return '< 1 mnt';
    const jam = Math.floor(menit / 60);
    const sisa = menit % 60;
    if (jam === 0) return `${sisa} mnt`;
    return sisa === 0 ? `${jam} jam` : `${jam} jam ${sisa} mnt`;
}

/** Memilih pesan validasi backend atau teks fallback untuk modal. */
function errorMessage(err, fallback) {
    const data = err?.response?.data;
    if (data?.message) {
        if (data.jarak_m != null) return `${data.message} (jarak Anda ± ${data.jarak_m} m)`;
        return data.message;
    }
    if (data?.errors) {
        const first = Object.values(data.errors)[0];
        if (Array.isArray(first)) return first[0];
    }
    return fallback;
}

const STEP_NUMBER = { port: 1, plug: 2, battery: 3, amount: 4, estimate: 5, pin: 6, ready: 6 };

// initialPortId: port yang sudah dipilih dari daftar station -> langsung ke langkah colok kabel.
// onTopUp: dipanggil saat saldo tidak cukup (membuka modal Top Up di dashboard).
/** Wizard driver untuk memilih port, mengestimasi biaya, dan memulai sesi charging. */
export default function StartCharging({ station, vehicle, position, initialPortId = null, onClose, onStarted, onTopUp }) {
    const [step, setStep] = useState(initialPortId != null ? 'plug' : 'port');
    const [detail, setDetail] = useState(null);
    const [loadStatus, setLoadStatus] = useState('loading');
    const [selectedPortId, setSelectedPortId] = useState(initialPortId);
    const [prep, setPrep] = useState(null);
    const [targetKwh, setTargetKwh] = useState('');
    const [estimate, setEstimate] = useState(null);
    const [pin, setPin] = useState('');
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState('');
    const [session, setSession] = useState(null);

    useEffect(() => {
        let cancelled = false;
        getStationDetail(station.id_location)
            .then((d) => {
                if (cancelled) return;
                setDetail(d);
                setLoadStatus('ok');
            })
            .catch(() => {
                if (!cancelled) setLoadStatus('error');
            });
        return () => {
            cancelled = true;
        };
    }, [station.id_location]);

    /** Menutup wizard dan melepas efek antarmuka yang sedang aktif. */
    const handleClose = () => {
        if (busy) return;
        if (session) onStarted(session);
        else onClose();
    };

    useEffect(() => {
        /** Menutup wizard saat tombol Escape ditekan. */
        const onKey = (e) => e.key === 'Escape' && handleClose();
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [busy, session]);

    const connector = vehicle?.tipe_konektor ?? null;

    // Kumpulkan semua port dari seluruh charger di lokasi ini yang sesuai dengan tipe konektor mobil & statusnya Available
    const availablePorts = [];
    if (detail?.chargers) {
        detail.chargers.forEach((charger) => {
            if (charger.ports) {
                charger.ports.forEach((port) => {
                    // Cek kecocokan konektor (case-insensitive) dan status port 'Available' / 'Tersedia'
                    const matchConnector = connector ? sameConnector(port.tipe_konektor, connector) : true;
                    const isAvailable = port.status_port === 'Available' || port.status_port === 'Tersedia';
                    const machineOk = !charger.status_mesin || charger.status_mesin === 'Active';
                    
                    if (matchConnector && isAvailable && machineOk) {
                        availablePorts.push({
                            ...port,
                            kode_perangkat: charger.kode_perangkat,
                            merek_model: charger.merek_model,
                        });
                    }
                });
            }
        });
    }

    const chosenPort = availablePorts.find((p) => p.id_port === selectedPortId) ?? null;

    // Kalau hanya ada satu port yang cocok, langsung pilih otomatis
    useEffect(() => {
        if (availablePorts.length === 1 && selectedPortId == null) {
            setSelectedPortId(availablePorts[0].id_port);
        }
    }, [detail, availablePorts, selectedPortId]);

    const minKwh = prep?.min_target_kwh ?? 0.5;
    const maxKwh = prep?.max_target_kwh ?? 100;
    const kwhNum = Number(targetKwh);
    const kwhValid = targetKwh !== '' && Number.isFinite(kwhNum) && kwhNum >= minKwh && kwhNum <= maxKwh;
    const sliderValue = Number.isFinite(kwhNum) && targetKwh !== '' ? Math.min(maxKwh, Math.max(minKwh, kwhNum)) : minKwh;

    /** Menjaga target kWh tetap di dalam kapasitas baterai yang tersedia. */
    const clampTarget = () => {
        if (targetKwh === '' || !Number.isFinite(kwhNum)) return;
        if (kwhNum > maxKwh) setTargetKwh(String(maxKwh));
        else if (kwhNum < minKwh) setTargetKwh(String(minKwh));
    };
    const pinValid = /^\d{6}$/.test(pin);

    /** Berpindah tahap wizard sambil memperbarui state layar. */
    const goTo = (next) => {
        setError('');
        setStep(next);
    };

    // Langkah 2 -> 3: Kirim id_port ke backend untuk validasi & ambil SOC awal
    /** Memastikan port/kendaraan valid sebelum menghitung estimasi. */
    const handlePlugged = async () => {
        if (!vehicle || selectedPortId == null || busy) return;
        setBusy(true);
        setError('');
        try {
            const result = await prepareCharging({
                id_port: selectedPortId, // Menggunakan id_port
                id_vehicle: vehicle.id_vehicle,
                latitude: position.lat,
                longitude: position.lng,
            });
            setPrep(result);
            setTargetKwh(String(kwhToReach(result.soc_awal >= 80 ? 100 : 80, result)));
            setStep('battery');
        } catch (err) {
            setError(errorMessage(err, 'Gagal memeriksa port. Periksa koneksi lalu coba lagi.'));
            if (['port_dipakai', 'konektor_tidak_cocok'].includes(err?.response?.data?.kode)) backToPortStep();
        } finally {
            setBusy(false);
        }
    };

    // Langkah 4 -> 5: Hitung estimasi biaya
    /** Mengirim target energi ke backend dan menampilkan biaya serta saldo. */
    const handleCalculate = async () => {
        if (!kwhValid || busy) return;
        setBusy(true);
        setError('');
        try {
            const result = await estimateCharging({
                id_port: selectedPortId,
                id_vehicle: vehicle.id_vehicle,
                soc_awal: prep.soc_awal,
                target_kwh: kwhNum,
            });
            setEstimate(result);
            setStep('estimate');
        } catch (err) {
            setError(errorMessage(err, 'Gagal menghitung estimasi. Coba lagi.'));
        } finally {
            setBusy(false);
        }
    };

    // Langkah 6: Otorisasi PIN & Mulai Sesi
    /** Memverifikasi PIN lalu meminta backend membuat sesi charging. */
    const handleStart = async () => {
        if (!pinValid || busy) return;
        setBusy(true);
        setError('');
        try {
            const started = await startCharging({
                id_port: selectedPortId,
                id_vehicle: vehicle.id_vehicle,
                soc_awal: prep.soc_awal,
                target_kwh: estimate.target_kwh,
                pin,
                latitude: position.lat,
                longitude: position.lng,
            });
            setSession(started);
            setStep('ready');
        } catch (err) {
            const kode = err?.response?.data?.kode;
            setError(errorMessage(err, 'Gagal memulai sesi charging. Periksa koneksi lalu coba lagi.'));
            setPin('');
            if (kode === 'port_dipakai' || kode === 'konektor_tidak_cocok') {
                backToPortStep();
            } else if (kode === 'saldo_tidak_cukup') {
                estimateCharging({
                    id_port: selectedPortId,
                    id_vehicle: vehicle.id_vehicle,
                    soc_awal: prep.soc_awal,
                    target_kwh: estimate.target_kwh,
                })
                    .then(setEstimate)
                    .catch(() => {});
                setStep('estimate');
            }
        } finally {
            setBusy(false);
        }
    };

    /** Kembali ke pemilihan port dan membersihkan estimasi sebelumnya. */
    const backToPortStep = () => {
        setSelectedPortId(null);
        setPrep(null);
        setStep('port');
        getStationDetail(station.id_location).then(setDetail).catch(() => {});
    };

    const stepNo = STEP_NUMBER[step];
    const titles = {
        port: 'Pilih Port',
        plug: 'Hubungkan Kabel',
        battery: 'Baterai Terdeteksi',
        amount: 'Jumlah Pengisian',
        estimate: 'Estimasi Biaya',
        pin: 'Konfirmasi PIN',
        ready: 'Sesi Dimulai',
    };

    return (
        <div className="sd-backdrop" onClick={handleClose}>
            <section
                className="sd-sheet"
                role="dialog"
                aria-modal="true"
                aria-label={`Mulai charging di ${station.nama_lokasi}`}
                onClick={(e) => e.stopPropagation()}
            >
                <header className="sd-head">
                    <div className="sd-head-text">
                        <span className="sd-badge ok">
                            {step === 'ready' ? 'Charging berjalan' : `Langkah ${stepNo} dari 6`}
                        </span>
                        <h2 className="sd-title">{titles[step]}</h2>
                        <p className="sd-address">{station.kode_station} · {station.nama_lokasi}</p>
                    </div>
                    <button className="sd-close" onClick={handleClose} disabled={busy} aria-label="Tutup">
                        ✕
                    </button>
                </header>

                <div className="sd-body">
                    {/* 1 — Pilih Port */}
                    {step === 'port' && (
                        <>
                            {!vehicle && (
                                <p className="sd-error" role="alert">
                                    Pilih kendaraan aktif dulu di dashboard sebelum mulai charging.
                                </p>
                            )}
                            {vehicle && (
                                <p className="sc-vehicle">
                                    🚗 {vehicle.model} · {vehicle.nomor_polisi} · {konektorLabel(connector)}
                                </p>
                            )}

                            {loadStatus === 'loading' && <p className="sd-muted" aria-live="polite">Memuat daftar port…</p>}
                            {loadStatus === 'error' && (
                                <p className="sd-error" role="alert">Daftar port tidak dapat dimuat. Tutup lalu coba lagi.</p>
                            )}
                            {loadStatus === 'ok' && vehicle && availablePorts.length === 0 && (
                                <p className="sd-fit none">
                                    Tidak ada port {konektorLabel(connector)} yang tersedia saat ini.
                                </p>
                            )}
                            {loadStatus === 'ok' && availablePorts.length > 0 && (
                                <ul className="sd-ports" role="radiogroup" aria-label="Port charger">
                                    {availablePorts.map((p) => (
                                        <li key={p.id_port}>
                                            <button
                                                type="button"
                                                role="radio"
                                                aria-checked={selectedPortId === p.id_port}
                                                className={`sd-port sc-port ${selectedPortId === p.id_port ? 'selected' : ''}`}
                                                onClick={() => setSelectedPortId(p.id_port)}
                                            >
                                                <span className="sd-port-main">
                                                    <span className="sd-port-code">{p.kode_perangkat} — {p.nomor_port}</span>
                                                    <span className="sd-port-meta">
                                                        {konektorLabel(p.tipe_konektor)} · {p.tipe_charging} · {p.daya_maks_kw} kW
                                                    </span>
                                                </span>
                                                <span className="sc-radio" aria-hidden="true" />
                                            </button>
                                        </li>
                                    ))}
                                </ul>
                            )}
                            {error && <p className="sd-error" role="alert">{error}</p>}
                        </>
                    )}

                    {/* 2 — Colok Kabel */}
                    {step === 'plug' && (
                        <div className="sc-plug">
                            <div className="sc-plug-icon" aria-hidden="true">🔌</div>
                            <h3 className="sc-plug-title">Colokkan kabel pengisian ke mobil Anda</h3>
                            <p className="sd-muted">
                                Sambungkan kabel dari port <strong>{chosenPort?.kode_perangkat} ({chosenPort?.nomor_port})</strong> ({konektorLabel(chosenPort?.tipe_konektor)})
                                ke lubang charging di mobil. Pastikan terpasang kuat, lalu tekan tombol di bawah.
                            </p>
                            {error && <p className="sd-error" role="alert">{error}</p>}
                        </div>
                    )}

                    {/* 3 — Baterai Terdeteksi */}
                    {step === 'battery' && prep && (
                        <div className="sc-plug">
                            <div className="sc-plug-icon" aria-hidden="true">🔋</div>
                            <p className="sc-soc-big">{prep.soc_awal}%</p>
                            <p className="sd-muted">
                                Baterai mobil terdeteksi · port {prep.kode_charger} ({prep.daya_kw} kW)
                            </p>
                        </div>
                    )}

                    {/* 4 — Jumlah Pengisian */}
                    {step === 'amount' && prep && (
                        <>
                            <p className="sd-muted">
                                Geser atau ketik jumlah energi yang ingin diisi. Maksimal {maxKwh} kWh agar baterai
                                tidak melebihi 100%.
                            </p>

                            <div className="sc-soc-line" aria-live="polite">
                                <span>{prep.soc_awal}%</span>
                                <span aria-hidden="true">→</span>
                                <strong>{kwhValid ? socAfter(kwhNum, prep) : '–'}%</strong>
                            </div>
                            <div className="sc-soc-bar" aria-hidden="true">
                                <div className="sc-soc-bar-from" style={{ width: `${prep.soc_awal}%` }} />
                                <div
                                    className="sc-soc-bar-add"
                                    style={{
                                        width: `${kwhValid ? Math.max(0, socAfter(kwhNum, prep) - prep.soc_awal) : 0}%`,
                                    }}
                                />
                            </div>

                            <input
                                className="sc-slider"
                                type="range"
                                min={minKwh}
                                max={maxKwh}
                                step="0.5"
                                value={sliderValue}
                                onChange={(e) => setTargetKwh(e.target.value)}
                                aria-label="Jumlah energi (kWh)"
                            />
                            <div className="sc-slider-scale" aria-hidden="true">
                                <span>{minKwh} kWh</span>
                                <span>{maxKwh} kWh</span>
                            </div>

                            <div className="sc-amounts" aria-label="Pilihan cepat">
                                {TARGET_PERCENT_SHORTCUTS.filter((pct) => pct > prep.soc_awal).map((pct) => {
                                    const kwh = kwhToReach(pct, prep);
                                    return (
                                        <button
                                            key={pct}
                                            type="button"
                                            className={`sc-amount ${kwhNum === kwh ? 'selected' : ''}`}
                                            onClick={() => setTargetKwh(String(kwh))}
                                        >
                                            {pct === 100 ? 'Penuh' : `Sampai ${pct}%`}
                                            <small>{kwh} kWh</small>
                                        </button>
                                    );
                                })}
                            </div>

                            <h3 className="sd-section">Atau ketik sendiri</h3>
                            <label className="sc-soc">
                                <input
                                    type="number"
                                    inputMode="decimal"
                                    min={minKwh}
                                    max={maxKwh}
                                    step="0.5"
                                    value={targetKwh}
                                    onChange={(e) => setTargetKwh(e.target.value)}
                                    onBlur={clampTarget}
                                    placeholder="mis. 25"
                                    aria-label="Jumlah energi dalam kWh"
                                />
                                <span>kWh</span>
                            </label>
                            {targetKwh !== '' && !kwhValid && (
                                <p className="sd-error" role="alert">
                                    Isi angka antara {minKwh} dan {maxKwh} kWh.
                                </p>
                            )}
                            {prep.kapasitas_default && (
                                <p className="sd-muted sc-tarif">
                                    Kapasitas baterai diasumsikan {prep.kapasitas_baterai_kwh} kWh (belum diisi di data kendaraan).
                                </p>
                            )}
                            {error && <p className="sd-error" role="alert">{error}</p>}
                        </>
                    )}

                    {/* 5 — Estimasi Biaya */}
                    {step === 'estimate' && estimate && (
                        <>
                            <dl className="sc-breakdown">
                                <div>
                                    <dt>Energi dipilih</dt>
                                    <dd>{estimate.target_kwh} kWh</dd>
                                </div>
                                <div>
                                    <dt>Baterai setelah charging</dt>
                                    <dd>{prep.soc_awal}% → ± {estimate.soc_estimasi}%</dd>
                                </div>
                                <div>
                                    <dt>Estimasi durasi</dt>
                                    <dd>± {durasiLabel(estimate.durasi_menit)}</dd>
                                </div>
                                <div>
                                    <dt>
                                        Biaya charging
                                        <small>
                                            {estimate.target_kwh} kWh × {rupiah(estimate.harga_per_kwh)}
                                            {estimate.biaya_charging === estimate.biaya_minimum && estimate.biaya_minimum > 0
                                                ? ' (biaya minimum)'
                                                : ''}
                                        </small>
                                    </dt>
                                    <dd>{rupiah(estimate.biaya_charging)}</dd>
                                </div>
                                <div>
                                    <dt>
                                        Biaya parkir
                                        <small>
                                            Biaya flat {rupiah(estimate.biaya_parkir_flat)}
                                        </small>
                                    </dt>
                                    <dd>{rupiah(estimate.biaya_parkir)}</dd>
                                </div>
                                <div className="sc-total">
                                    <dt>Total estimasi</dt>
                                    <dd>{rupiah(estimate.total)}</dd>
                                </div>
                            </dl>

                            <p className={`sd-fit ${estimate.saldo_cukup ? 'ok' : 'none'}`}>
                                {estimate.saldo_cukup
                                    ? `Saldo dompet mencukupi (tersedia ${rupiah(estimate.saldo_tersedia)}). Dana senilai total estimasi akan ditahan (hold) selama sesi.`
                                    : `Saldo dompet tidak cukup — tersedia ${rupiah(estimate.saldo_tersedia)}, kurang ${rupiah(estimate.kekurangan)}. Lakukan Top Up atau kurangi jumlah energi.`}
                            </p>
                            <p className="sd-muted">
                                Estimasi durasi dihitung dari daya port; durasi sebenarnya tergantung kemampuan mobil Anda.
                            </p>
                            {!estimate.saldo_cukup && onTopUp && (
                                <button type="button" className="sd-primary sc-submit" onClick={onTopUp}>
                                    + Top Up Dompet
                                </button>
                            )}
                            {error && <p className="sd-error" role="alert">{error}</p>}
                        </>
                    )}

                    {/* 6 — PIN */}
                    {step === 'pin' && estimate && (
                        <div className="sc-plug">
                            <div className="sc-plug-icon" aria-hidden="true">🔐</div>
                            <h3 className="sc-plug-title">Masukkan PIN dompet</h3>
                            <p className="sd-muted">
                                Otorisasi untuk menahan {rupiah(estimate.total)} dari dompet dan memulai sesi charging.
                            </p>
                            <input
                                className="sc-pin"
                                type="password"
                                inputMode="numeric"
                                autoComplete="off"
                                maxLength={6}
                                value={pin}
                                onChange={(e) => setPin(e.target.value.replace(/\D/g, '').slice(0, 6))}
                                placeholder="••••••"
                                aria-label="PIN dompet 6 digit"
                                autoFocus
                            />
                            {error && <p className="sd-error" role="alert">{error}</p>}
                        </div>
                    )}

                    {/* Ready */}
                    {step === 'ready' && session && (
                        <div className="sc-plug">
                            <div className="sc-plug-icon" aria-hidden="true"><FiZap /></div>
                            <h3 className="sc-plug-title">Sesi charging dimulai</h3>
                            <p className="sc-soc-big">{session.soc_awal ?? '-'}%</p>
                            <p className="sd-muted">
                                Baterai awal · target {session.target_kwh} kWh · dana ditahan {rupiah(session.saldo_hold)}
                            </p>
                        </div>
                    )}
                </div>

                <footer className="sd-actions">
                    {step === 'port' && (
                        <button
                            className="sd-primary sc-submit"
                            onClick={() => goTo('plug')}
                            disabled={!vehicle || selectedPortId == null}
                        >
                            Lanjut
                        </button>
                    )}
                    {step === 'plug' && (
                        <>
                            <button className="sd-secondary" onClick={() => goTo('port')} disabled={busy}>
                                Kembali
                            </button>
                            <button className="sd-primary sc-submit" onClick={handlePlugged} disabled={busy}>
                                {busy ? 'Memeriksa…' : <><FiCheck aria-hidden="true" /> Kabel sudah terpasang</>}
                            </button>
                        </>
                    )}
                    {step === 'battery' && (
                        <button className="sd-primary sc-submit" onClick={() => goTo('amount')}>
                            Lanjut
                        </button>
                    )}
                    {step === 'amount' && (
                        <>
                            <button className="sd-secondary" onClick={() => goTo('battery')} disabled={busy}>
                                Kembali
                            </button>
                            <button className="sd-primary sc-submit" onClick={handleCalculate} disabled={!kwhValid || busy}>
                                {busy ? 'Menghitung…' : <><FiBarChart2 aria-hidden="true" /> Hitung Estimasi</>}
                            </button>
                        </>
                    )}
                    {step === 'estimate' && (
                        <>
                            <button className="sd-secondary" onClick={() => goTo('amount')}>
                                Ubah jumlah
                            </button>
                            <button
                                className="sd-primary sc-submit"
                                onClick={() => goTo('pin')}
                                disabled={!estimate?.saldo_cukup}
                            >
                                Konfirmasi
                            </button>
                        </>
                    )}
                    {step === 'pin' && (
                        <>
                            <button className="sd-secondary" onClick={() => goTo('estimate')} disabled={busy}>
                                Kembali
                            </button>
                            <button className="sd-primary sc-submit" onClick={handleStart} disabled={!pinValid || busy}>
                                {busy ? 'Memulai…' : <><FiZap aria-hidden="true" /> Mulai Charging</>}
                            </button>
                        </>
                    )}
                    {step === 'ready' && (
                        <button className="sd-primary sc-submit" onClick={() => onStarted(session)}>
                            Lanjutkan
                        </button>
                    )}
                </footer>
            </section>
        </div>
    );
}
