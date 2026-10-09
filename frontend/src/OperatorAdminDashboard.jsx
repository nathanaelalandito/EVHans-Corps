import React, { useEffect, useMemo, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import './operatorAdminDashboard.css';
import { createOperator, createStation, createTarif, getOperationsDashboard, updateCharger, updateStation } from './api/operations';

const STATION_STATUS = ['aktif', 'nonaktif', 'maintenance'];
const CHARGER_STATUS = ['tersedia', 'sedang digunakan', 'maintenance', 'rusak', 'offline'];
const DEFAULT_MAP_POINT = { latitude: -7.8014, longitude: 110.3644 };

function rupiah(value) {
    return 'Rp' + Number(value || 0).toLocaleString('id-ID');
}

function readableStatus(value) {
    return String(value || '-').replaceAll('_', ' ');
}

function errorMessage(error, fallback) {
    const data = error?.response?.data;
    if (data?.message) return data.message;
    if (data?.errors) {
        const first = Object.values(data.errors)[0];
        return Array.isArray(first) ? first[0] : fallback;
    }
    return fallback;
}

function StationMapPicker({ value, onChange }) {
    const nodeRef = useRef(null);
    const mapRef = useRef(null);
    const markerRef = useRef(null);
    const point = value?.latitude && value?.longitude ? value : DEFAULT_MAP_POINT;

    useEffect(() => {
        if (!nodeRef.current || mapRef.current) return;

        const map = L.map(nodeRef.current, { zoomControl: false }).setView([point.latitude, point.longitude], 14);
        L.control.zoom({ position: 'bottomright' }).addTo(map);
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            maxZoom: 19,
            attribution: '&copy; OpenStreetMap',
        }).addTo(map);

        markerRef.current = L.circleMarker([point.latitude, point.longitude], {
            radius: 8,
            color: '#ffffff',
            weight: 3,
            fillColor: '#237534',
            fillOpacity: 1,
        }).addTo(map);
        map.on('click', (event) => {
            onChange({
                latitude: Number(event.latlng.lat.toFixed(7)),
                longitude: Number(event.latlng.lng.toFixed(7)),
            });
        });
        mapRef.current = map;

        setTimeout(() => map.invalidateSize(), 80);
        return () => {
            map.remove();
            mapRef.current = null;
            markerRef.current = null;
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    useEffect(() => {
        if (!mapRef.current || !markerRef.current) return;
        markerRef.current.setLatLng([point.latitude, point.longitude]);
        mapRef.current.setView([point.latitude, point.longitude], mapRef.current.getZoom());
    }, [point.latitude, point.longitude]);

    return (
        <div className="ops-map-picker-wrap">
            <div ref={nodeRef} className="ops-map-picker" />
            <p>Klik titik lokasi station pada peta. Koordinat: {point.latitude}, {point.longitude}</p>
        </div>
    );
}

export default function OperatorAdminDashboard({ user, onLogout }) {
    const role = user?.peran;
    const isAdmin = role === 'admin';
    const displayName = user?.profile?.nama_lengkap || user?.email || 'Operator';
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [selectedStationId, setSelectedStationId] = useState(null);
    const [stationForm, setStationForm] = useState({
        nama_lokasi: '',
        alamat: '',
        latitude: DEFAULT_MAP_POINT.latitude,
        longitude: DEFAULT_MAP_POINT.longitude,
        jam_buka: '06:00',
        jam_tutup: '22:00',
        status: 'aktif',
    });
    const [editStationForm, setEditStationForm] = useState(null);
    const [tarifForm, setTarifForm] = useState({ harga_per_kwh: '', biaya_minimum: '', biaya_parkir_pjam: '' });
    const [operatorForm, setOperatorForm] = useState({ nama_lengkap: '', email: '', password: '', nomor_telepon: '' });
    const [feedback, setFeedback] = useState('');

    const fetchDashboard = async () => {
        setLoading(true);
        setError('');
        try {
            const dashboard = await getOperationsDashboard();
            setData(dashboard);
            setSelectedStationId((prev) => prev ?? dashboard.stations?.[0]?.id_location ?? null);
        } catch (err) {
            setError(errorMessage(err, 'Gagal memuat dashboard operasional.'));
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchDashboard();
    }, []);

    const selectedStation = useMemo(
        () => data?.stations?.find((station) => station.id_location === selectedStationId) ?? data?.stations?.[0],
        [data, selectedStationId]
    );

    useEffect(() => {
        if (!selectedStation) return;
        setEditStationForm({
            nama_lokasi: selectedStation.nama_lokasi,
            alamat: selectedStation.alamat,
            latitude: selectedStation.latitude,
            longitude: selectedStation.longitude,
            jam_buka: selectedStation.jam_buka,
            jam_tutup: selectedStation.jam_tutup,
            status: selectedStation.status_loc,
        });
    }, [selectedStation]);

    const saveStationStatus = async (station, status) => {
        setFeedback('');
        try {
            await updateStation(station.id_location, { status });
            await fetchDashboard();
            setFeedback('Status station berhasil diperbarui.');
        } catch (err) {
            setFeedback(errorMessage(err, 'Gagal memperbarui status station.'));
        }
    };

    const submitStation = async (e) => {
        e.preventDefault();
        setFeedback('');
        try {
            const station = await createStation({
                ...stationForm,
                latitude: Number(stationForm.latitude),
                longitude: Number(stationForm.longitude),
            });
            setStationForm({
                nama_lokasi: '',
                alamat: '',
                latitude: DEFAULT_MAP_POINT.latitude,
                longitude: DEFAULT_MAP_POINT.longitude,
                jam_buka: '06:00',
                jam_tutup: '22:00',
                status: 'aktif',
            });
            await fetchDashboard();
            setSelectedStationId(station.id_location);
            setFeedback('Station baru berhasil ditambahkan.');
        } catch (err) {
            setFeedback(errorMessage(err, 'Gagal menambahkan station.'));
        }
    };

    const submitEditStation = async (e) => {
        e.preventDefault();
        if (!selectedStation || !editStationForm) return;
        setFeedback('');
        try {
            await updateStation(selectedStation.id_location, {
                ...editStationForm,
                latitude: Number(editStationForm.latitude),
                longitude: Number(editStationForm.longitude),
            });
            await fetchDashboard();
            setSelectedStationId(selectedStation.id_location);
            setFeedback('Data station berhasil diperbarui.');
        } catch (err) {
            setFeedback(errorMessage(err, 'Gagal memperbarui station.'));
        }
    };

    const saveChargerStatus = async (charger, status_mesin) => {
        setFeedback('');
        try {
            await updateCharger(charger.id_charger, { status_mesin });
            await fetchDashboard();
            setFeedback('Status charger berhasil diperbarui.');
        } catch (err) {
            setFeedback(errorMessage(err, 'Gagal memperbarui status charger.'));
        }
    };

    const submitTarif = async (e) => {
        e.preventDefault();
        if (!selectedStation) return;
        setFeedback('');
        try {
            await createTarif(selectedStation.id_location, {
                harga_per_kwh: Number(tarifForm.harga_per_kwh),
                biaya_minimum: Number(tarifForm.biaya_minimum),
                biaya_parkir_pjam: Number(tarifForm.biaya_parkir_pjam),
            });
            setTarifForm({ harga_per_kwh: '', biaya_minimum: '', biaya_parkir_pjam: '' });
            await fetchDashboard();
            setFeedback('Tarif baru berhasil disimpan.');
        } catch (err) {
            setFeedback(errorMessage(err, 'Gagal menyimpan tarif.'));
        }
    };

    const submitOperator = async (e) => {
        e.preventDefault();
        setFeedback('');
        try {
            await createOperator(operatorForm);
            setOperatorForm({ nama_lengkap: '', email: '', password: '', nomor_telepon: '' });
            await fetchDashboard();
            setFeedback('Akun operator berhasil dibuat.');
        } catch (err) {
            setFeedback(errorMessage(err, 'Gagal membuat operator.'));
        }
    };

    if (loading) {
        return <div className="ops-shell"><p className="ops-state">Memuat dashboard operasional...</p></div>;
    }

    if (error) {
        return (
            <div className="ops-shell">
                <p className="ops-state">{error}</p>
                <button className="ops-primary" onClick={fetchDashboard}>Coba lagi</button>
            </div>
        );
    }

    return (
        <div className="ops-shell">
            <header className="ops-header">
                <div>
                    <span className="ops-role">{isAdmin ? 'Admin Sistem' : 'Operator Station'}</span>
                    <h1>{displayName}</h1>
                    <p>{isAdmin ? 'Kontrol operator, station, charger, tarif, dan audit operasional.' : 'Monitoring station, charger, tarif, dan laporan penggunaan.'}</p>
                </div>
                <button className="ops-logout" onClick={onLogout}>Keluar</button>
            </header>

            {feedback && <div className="ops-feedback">{feedback}</div>}

            <section className="ops-stats">
                <div><span>Station</span><strong>{data.summary.total_station}</strong></div>
                <div><span>Charger</span><strong>{data.summary.total_charger}</strong></div>
                <div><span>Tersedia</span><strong>{data.summary.charger_tersedia}</strong></div>
                <div><span>Gangguan</span><strong>{data.summary.charger_gangguan}</strong></div>
                <div><span>Sesi Aktif</span><strong>{data.summary.sesi_berjalan}</strong></div>
                <div><span>Pendapatan Bulan Ini</span><strong>{rupiah(data.summary.pendapatan_bulan_ini)}</strong></div>
            </section>

            <main className="ops-layout">
                <section className="ops-panel">
                    <div className="ops-panel-head">
                        <h2>Station</h2>
                        <span>{data.stations.length} lokasi</span>
                    </div>
                    {isAdmin && (
                        <form className="ops-form ops-station-form" onSubmit={submitStation}>
                            <div className="ops-form-title">
                                <strong>Tambah Station</strong>
                                <span>Tentukan titik station langsung pada peta.</span>
                            </div>
                            <label>
                                Nama Station
                                <input placeholder="EVCharge Hub - ..." value={stationForm.nama_lokasi} onChange={(e) => setStationForm((p) => ({ ...p, nama_lokasi: e.target.value }))} />
                            </label>
                            <label>
                                Alamat
                                <input placeholder="Alamat lengkap station" value={stationForm.alamat} onChange={(e) => setStationForm((p) => ({ ...p, alamat: e.target.value }))} />
                            </label>
                            <StationMapPicker value={stationForm} onChange={(coords) => setStationForm((p) => ({ ...p, ...coords }))} />
                            <div className="ops-inline-fields">
                                <label>
                                    Buka
                                    <input type="time" value={stationForm.jam_buka} onChange={(e) => setStationForm((p) => ({ ...p, jam_buka: e.target.value }))} />
                                </label>
                                <label>
                                    Tutup
                                    <input type="time" value={stationForm.jam_tutup} onChange={(e) => setStationForm((p) => ({ ...p, jam_tutup: e.target.value }))} />
                                </label>
                                <label>
                                    Status
                                    <select value={stationForm.status} onChange={(e) => setStationForm((p) => ({ ...p, status: e.target.value }))}>
                                        {STATION_STATUS.map((status) => <option key={status} value={status}>{readableStatus(status)}</option>)}
                                    </select>
                                </label>
                            </div>
                            <button type="submit">Tambah Station</button>
                        </form>
                    )}
                    <div className="ops-station-list">
                        {data.stations.map((station) => (
                            <button
                                key={station.id_location}
                                className={`ops-station-item ${selectedStation?.id_location === station.id_location ? 'active' : ''}`}
                                onClick={() => setSelectedStationId(station.id_location)}
                            >
                                <strong>{station.nama_lokasi}</strong>
                                <span>{station.charger_tersedia}/{station.charger_total} charger tersedia</span>
                            </button>
                        ))}
                    </div>
                </section>

                <section className="ops-panel ops-detail">
                    {selectedStation && (
                        <>
                            <div className="ops-panel-head">
                                <div>
                                    <h2>{selectedStation.nama_lokasi}</h2>
                                    <p>{selectedStation.alamat}</p>
                                </div>
                                <select value={selectedStation.status} onChange={(e) => saveStationStatus(selectedStation, e.target.value)}>
                                    {STATION_STATUS.map((status) => <option key={status} value={status}>{readableStatus(status)}</option>)}
                                </select>
                            </div>

                            {isAdmin && editStationForm && (
                                <form className="ops-form ops-edit-station-form" onSubmit={submitEditStation}>
                                    <div className="ops-form-title">
                                        <strong>Edit Station</strong>
                                        <span>Perbarui informasi lokasi dan titik peta station.</span>
                                    </div>
                                    <div className="ops-edit-grid">
                                        <label>
                                            Nama Station
                                            <input value={editStationForm.nama_lokasi} onChange={(e) => setEditStationForm((p) => ({ ...p, nama_lokasi: e.target.value }))} />
                                        </label>
                                        <label>
                                            Alamat
                                            <input value={editStationForm.alamat} onChange={(e) => setEditStationForm((p) => ({ ...p, alamat: e.target.value }))} />
                                        </label>
                                    </div>
                                    <StationMapPicker value={editStationForm} onChange={(coords) => setEditStationForm((p) => ({ ...p, ...coords }))} />
                                    <div className="ops-inline-fields">
                                        <label>
                                            Buka
                                            <input type="time" value={editStationForm.jam_buka} onChange={(e) => setEditStationForm((p) => ({ ...p, jam_buka: e.target.value }))} />
                                        </label>
                                        <label>
                                            Tutup
                                            <input type="time" value={editStationForm.jam_tutup} onChange={(e) => setEditStationForm((p) => ({ ...p, jam_tutup: e.target.value }))} />
                                        </label>
                                        <label>
                                            Status
                                            <select value={editStationForm.status} onChange={(e) => setEditStationForm((p) => ({ ...p, status: e.target.value }))}>
                                                {STATION_STATUS.map((status) => <option key={status} value={status}>{readableStatus(status)}</option>)}
                                            </select>
                                        </label>
                                    </div>
                                    <button type="submit">Simpan Perubahan Station</button>
                                </form>
                            )}

                            <div className="ops-tarif-row">
                                <div><span>Tarif/kWh</span><strong>{rupiah(selectedStation.tarif?.harga_per_kwh)}</strong></div>
                                <div><span>Minimum</span><strong>{rupiah(selectedStation.tarif?.biaya_minimum)}</strong></div>
                                <div><span>Parkir</span><strong>{rupiah(selectedStation.tarif?.biaya_parkir_pjam)}</strong></div>
                            </div>

                            <form className="ops-form ops-tarif-form" onSubmit={submitTarif}>
                                <input placeholder="Tarif/kWh" type="number" value={tarifForm.harga_per_kwh} onChange={(e) => setTarifForm((p) => ({ ...p, harga_per_kwh: e.target.value }))} />
                                <input placeholder="Minimum" type="number" value={tarifForm.biaya_minimum} onChange={(e) => setTarifForm((p) => ({ ...p, biaya_minimum: e.target.value }))} />
                                <input placeholder="Parkir" type="number" value={tarifForm.biaya_parkir_pjam} onChange={(e) => setTarifForm((p) => ({ ...p, biaya_parkir_pjam: e.target.value }))} />
                                <button type="submit">Simpan Tarif</button>
                            </form>

                            <div className="ops-charger-grid">
                                {selectedStation.chargers.map((charger) => (
                                    <div className="ops-charger-card" key={charger.id_charger}>
                                        <div>
                                            <strong>{charger.kode_perangkat}</strong>
                                            <span>{charger.tipe_konektor} · {charger.daya_kw} kW · {charger.tipe_charging}</span>
                                        </div>
                                        <select value={charger.status} onChange={(e) => saveChargerStatus(charger, e.target.value)}>
                                            {CHARGER_STATUS.map((status) => <option key={status} value={status}>{readableStatus(status)}</option>)}
                                        </select>
                                    </div>
                                ))}
                            </div>
                        </>
                    )}
                </section>
            </main>

            <section className="ops-panel">
                <div className="ops-panel-head">
                    <h2>Laporan</h2>
                    <span>Ringkasan operasional</span>
                </div>
                <div className="ops-report-grid">
                    <div><span>Pendapatan Hari Ini</span><strong>{rupiah(data.reports.pendapatan_hari_ini)}</strong></div>
                    <div><span>Sesi Selesai</span><strong>{data.reports.sesi_selesai}</strong></div>
                    <div><span>Sesi Gagal/Batal</span><strong>{data.reports.sesi_gagal}</strong></div>
                    <div><span>Energi Terjual</span><strong>{data.reports.energi_terjual_kwh} kWh</strong></div>
                </div>
            </section>

            {isAdmin && (
                <section className="ops-panel">
                    <div className="ops-panel-head">
                        <h2>Kelola Operator</h2>
                        <span>{data.operators.length} akun</span>
                    </div>
                    <form className="ops-form ops-operator-form" onSubmit={submitOperator}>
                        <input placeholder="Nama lengkap" value={operatorForm.nama_lengkap} onChange={(e) => setOperatorForm((p) => ({ ...p, nama_lengkap: e.target.value }))} />
                        <input placeholder="Email operator" type="email" value={operatorForm.email} onChange={(e) => setOperatorForm((p) => ({ ...p, email: e.target.value }))} />
                        <input placeholder="Password awal" type="password" value={operatorForm.password} onChange={(e) => setOperatorForm((p) => ({ ...p, password: e.target.value }))} />
                        <input placeholder="Nomor telepon" value={operatorForm.nomor_telepon} onChange={(e) => setOperatorForm((p) => ({ ...p, nomor_telepon: e.target.value }))} />
                        <button type="submit">Buat Operator</button>
                    </form>
                    <div className="ops-operator-list">
                        {data.operators.map((operator) => (
                            <div key={operator.id_user}>
                                <strong>{operator.nama_lengkap}</strong>
                                <span>{operator.email} · {operator.status_akun}</span>
                            </div>
                        ))}
                    </div>
                </section>
            )}
        </div>
    );
}
