import React, { useEffect, useState } from 'react';
import './startCharging.css';
import { getStationDetail, konektorLabel } from './api/station';
import { prepareCharging, estimateCharging, startCharging } from './api/charging';

// Persen baterai tujuan untuk tombol cepat.
const TARGET_PERCENT_SHORTCUTS = [80, 100];

const roundDownHalf = (x) => Math.floor(x * 2) / 2;

// kWh yang dibutuhkan agar baterai mencapai `percent`, dibatasi min/max dari backend.
function kwhToReach(percent, p) {
    const need = (p.kapasitas_baterai_kwh * (percent - p.soc_awal)) / 100;
    return Math.min(p.max_target_kwh, Math.max(p.min_target_kwh, roundDownHalf(need)));
}

// Perkiraan persen baterai setelah menambah `kwh` (maks. 100).
const socAfter = (kwh, p) => Math.min(100, Math.round(p.soc_awal + (kwh / p.kapasitas_baterai_kwh) * 100));

const rupiah = (v) => (v == null ? '-' : 'Rp' + Number(v).toLocaleString('id-ID'));

function durasiLabel(menit) {
    if (menit < 1) return '< 1 mnt';
    const jam = Math.floor(menit / 60);
    const sisa = menit % 60;
    if (jam === 0) return `${sisa} mnt`;
    return sisa === 0 ? `${jam} jam` : `${jam} jam ${sisa} mnt`;
}

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

// Lembar "Mulai Charging" — dibuka setelah driver sampai di station.
// Mengikuti alur proses utama (bagian C–E):
//   1. 'port'     pilih port yang cocok & kosong
//   2. 'plug'     colokkan kabel pengisian ke mobil
//   3. 'battery'  baterai awal terdeteksi (diacak backend untuk sementara)
//   4. 'amount'   driver memilih jumlah kWh yang ingin diisi
//   5. 'estimate' sistem menghitung estimasi biaya + cek saldo; driver konfirmasi
//   6. 'pin'      otorisasi PIN -> saldo di-hold -> sesi charging dimulai
//   +  'ready'    sesi sudah dimulai
export default function StartCharging({ station, vehicle, position, onClose, onStarted }) {
    const [step, setStep] = useState('port');
    const [detail, setDetail] = useState(null);
    const [loadStatus, setLoadStatus] = useState('loading'); // 'loading' | 'ok' | 'error'
    const [chargerId, setChargerId] = useState(null);
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

    // Sesi sudah berjalan di server begitu langkah 'ready' tampil, jadi
    // menutup lembar di langkah itu tetap harus memberi tahu dashboard.
    const handleClose = () => {
        if (busy) return;
        if (session) onStarted(session);
        else onClose();
    };

    useEffect(() => {
        const onKey = (e) => e.key === 'Escape' && handleClose();
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [busy, session]);

    const connector = vehicle?.tipe_konektor ?? null;
    const ports = (detail?.chargers ?? []).filter(
        (c) => c.tipe_konektor === connector && c.status === 'tersedia'
    );
    const chosen = (detail?.chargers ?? []).find((c) => c.id_charger === chargerId) ?? null;

    // Kalau hanya ada satu port yang cocok, langsung pilih.
    useEffect(() => {
        if (ports.length === 1 && chargerId == null) setChargerId(ports[0].id_charger);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [detail]);

    const minKwh = prep?.min_target_kwh ?? 0.5;
    const maxKwh = prep?.max_target_kwh ?? 100;
    const kwhNum = Number(targetKwh);
    const kwhValid = targetKwh !== '' && Number.isFinite(kwhNum) && kwhNum >= minKwh && kwhNum <= maxKwh;
    const sliderValue = Number.isFinite(kwhNum) && targetKwh !== '' ? Math.min(maxKwh, Math.max(minKwh, kwhNum)) : minKwh;

    // Rapikan isian ketik: kalau melewati batas, tarik ke batas terdekat.
    const clampTarget = () => {
        if (targetKwh === '' || !Number.isFinite(kwhNum)) return;
        if (kwhNum > maxKwh) setTargetKwh(String(maxKwh));
        else if (kwhNum < minKwh) setTargetKwh(String(minKwh));
    };
    const pinValid = /^\d{6}$/.test(pin);

    const goTo = (next) => {
        setError('');
        setStep(next);
    };

    // 2 -> 3: kabel terpasang; validasi port + kedatangan, ambil baterai awal.
    const handlePlugged = async () => {
        if (!vehicle || chargerId == null || busy) return;
        setBusy(true);
        setError('');
        try {
            const result = await prepareCharging({
                id_charger: chargerId,
                id_vehicle: vehicle.id_vehicle,
                latitude: position.lat,
                longitude: position.lng,
            });
            setPrep(result);
            // Isian awal: cukup untuk mencapai 80% (atau penuh kalau sudah di atas 80%).
            setTargetKwh(String(kwhToReach(result.soc_awal >= 80 ? 100 : 80, result)));
            setStep('battery');
        } catch (err) {
            setError(errorMessage(err, 'Gagal memeriksa port. Periksa koneksi lalu coba lagi.'));
            if (err?.response?.data?.kode === 'port_dipakai') backToPortStep();
        } finally {
            setBusy(false);
        }
    };

    // 4 -> 5: hitung estimasi biaya untuk jumlah kWh yang dipilih.
    const handleCalculate = async () => {
        if (!kwhValid || busy) return;
        setBusy(true);
        setError('');
        try {
            const result = await estimateCharging({
                id_charger: chargerId,
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

    // 6: otorisasi PIN -> hold saldo -> mulai sesi.
    const handleStart = async () => {
        if (!pinValid || busy) return;
        setBusy(true);
        setError('');
        try {
            const started = await startCharging({
                id_charger: chargerId,
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
            if (kode === 'port_dipakai') {
                backToPortStep();
            } else if (kode === 'saldo_tidak_cukup') {
                // Saldo berubah sejak estimasi — hitung ulang supaya info saldo terbaru.
                estimateCharging({
                    id_charger: chargerId,
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

    // Port baru diambil orang lain — kembali pilih port & muat ulang daftar.
    const backToPortStep = () => {
        setChargerId(null);
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
                        <p className="sd-address">{station.nama_lokasi}</p>
                    </div>
                    <button className="sd-close" onClick={handleClose} disabled={busy} aria-label="Tutup">
                        ✕
                    </button>
                </header>

                <div className="sd-body">
                    {/* 1 — pilih port */}
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
                            {loadStatus === 'ok' && vehicle && ports.length === 0 && (
                                <p className="sd-fit none">
                                    Tidak ada port {konektorLabel(connector)} yang tersedia saat ini.
                                </p>
                            )}
                            {loadStatus === 'ok' && ports.length > 0 && (
                                <ul className="sd-ports" role="radiogroup" aria-label="Port charger">
                                    {ports.map((c) => (
                                        <li key={c.id_charger}>
                                            <button
                                                type="button"
                                                role="radio"
                                                aria-checked={chargerId === c.id_charger}
                                                className={`sd-port sc-port ${chargerId === c.id_charger ? 'selected' : ''}`}
                                                onClick={() => setChargerId(c.id_charger)}
                                            >
                                                <span className="sd-port-main">
                                                    <span className="sd-port-code">{c.kode_perangkat}</span>
                                                    <span className="sd-port-meta">
                                                        {konektorLabel(c.tipe_konektor)} · {c.tipe_charging} · {c.daya_kw} kW
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

                    {/* 2 — colok kabel */}
                    {step === 'plug' && (
                        <div className="sc-plug">
                            <div className="sc-plug-icon" aria-hidden="true">🔌</div>
                            <h3 className="sc-plug-title">Colokkan kabel pengisian ke mobil Anda</h3>
                            <p className="sd-muted">
                                Sambungkan kabel dari port <strong>{chosen?.kode_perangkat}</strong> ({konektorLabel(chosen?.tipe_konektor)})
                                ke lubang charging di mobil. Pastikan terpasang kuat, lalu tekan tombol di bawah.
                            </p>
                            {error && <p className="sd-error" role="alert">{error}</p>}
                        </div>
                    )}

                    {/* 3 — baterai terdeteksi */}
                    {step === 'battery' && prep && (
                        <div className="sc-plug">
                            <div className="sc-plug-icon" aria-hidden="true">🔋</div>
                            <p className="sc-soc-big">{prep.soc_awal}%</p>
                            <p className="sd-muted">
                                Baterai mobil terdeteksi · port {prep.kode_charger} ({prep.daya_kw} kW)
                            </p>
                        </div>
                    )}

                    {/* 4 — pilih jumlah kWh (maks. sampai baterai 100%) */}
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

                    {/* 5 — estimasi biaya + cek saldo */}
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
                                            {estimate.jam_parkir} jam × {rupiah(estimate.biaya_parkir_per_jam)}
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

                    {/* ready */}
                    {step === 'ready' && session && (
                        <div className="sc-plug">
                            <div className="sc-plug-icon" aria-hidden="true">⚡</div>
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
                            disabled={!vehicle || chargerId == null}
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
                                {busy ? 'Memeriksa…' : '✅ Kabel sudah terpasang'}
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
                                {busy ? 'Menghitung…' : '🧮 Hitung Estimasi'}
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
                                {busy ? 'Memulai…' : '⚡ Mulai Charging'}
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
