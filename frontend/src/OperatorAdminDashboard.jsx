import React, { useEffect, useMemo, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import './operatorAdminDashboard.css';
import { 
    assignOperatorStation, 
    createOperator, 
    createStation, 
    createTarif, 
    getOperationsDashboard, 
    updateCharger, 
    updateStation,
    updateOperatorStatus,
    getAuditLogs,
    getSystemConfig,
    updateSystemConfig
} from './api/operations';

const STATION_STATUS = ['Aktif', 'Nonaktif', 'Maintenance'];
const CHARGER_STATUS = ['Active', 'Maintenance', 'Offline'];
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
        status: 'Aktif',
    });
    const [editStationForm, setEditStationForm] = useState(null);
    const [tarifForm, setTarifForm] = useState({ harga_per_kwh: '', biaya_minimum: '', biaya_parkir_pjam: '' });
    const [operatorForm, setOperatorForm] = useState({ nama_lengkap: '', email: '', password: '', nomor_telepon: '', id_location: '' });
    const [feedback, setFeedback] = useState('');

    // Tab navigasi panel Admin & Operator
    const [activeTab, setActiveTab] = useState('stations'); // 'stations' | 'reports' | 'operators' | 'config' | 'audit'

    // State Konfigurasi Sistem (FR48)
    const [configData, setConfigData] = useState({
        arrival_radius_m: 200,
        require_arrival: true,
        default_battery_kwh: 50,
        simulation_speed: 60,
    });
    const [configLoading, setConfigLoading] = useState(false);

    // State Audit Operasional (FR49)
    const [auditLogs, setAuditLogs] = useState({ transaksi: [], tarif: [], gangguan: [] });
    const [auditSubCategory, setAuditSubCategory] = useState('transaksi'); // 'transaksi' | 'tarif' | 'gangguan'
    const [auditLoading, setAuditLoading] = useState(false);

    const fetchConfig = async () => {
        setConfigLoading(true);
        try {
            const res = await getSystemConfig();
            if (res) {
                setConfigData({
                    arrival_radius_m: res.arrival_radius_m ?? 200,
                    require_arrival: res.require_arrival ?? true,
                    default_battery_kwh: res.default_battery_kwh ?? 50,
                    simulation_speed: res.simulation_speed ?? 60,
                });
            }
        } catch (err) {
            console.error('Gagal memuat konfigurasi:', err);
        } finally {
            setConfigLoading(false);
        }
    };

    const fetchAudit = async () => {
        setAuditLoading(true);
        try {
            const res = await getAuditLogs();
            if (res) setAuditLogs(res);
        } catch (err) {
            console.error('Gagal memuat log audit:', err);
        } finally {
            setAuditLoading(false);
        }
    };

    useEffect(() => {
        if (activeTab === 'config') fetchConfig();
        if (activeTab === 'audit') fetchAudit();
    }, [activeTab]);

    const handleSaveConfig = async (e) => {
        e.preventDefault();
        setFeedback('');
        try {
            await updateSystemConfig(configData);
            setFeedback('Konfigurasi sistem berhasil disimpan dan diterapkan.');
        } catch (err) {
            setFeedback(errorMessage(err, 'Gagal menyimpan konfigurasi sistem.'));
        }
    };

    const toggleOperatorStatus = async (operator) => {
        const nextStatus = operator.status_akun === 'Aktif' ? 'Nonaktif' : 'Aktif';
        setFeedback('');
        try {
            await updateOperatorStatus(operator.id_user, nextStatus);
            await fetchDashboard();
            setFeedback(`Status akun operator ${operator.nama_lengkap} berhasil diubah menjadi ${nextStatus}.`);
        } catch (err) {
            setFeedback(errorMessage(err, 'Gagal mengubah status akun operator.'));
        }
    };

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
            status: selectedStation.status,
        });
    }, [selectedStation]);

    const saveStationStatus = async (station, status) => {
        setFeedback('');
        try {
            await updateStation(station.id_location, { status_loc: status });
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
            const { status: statusLoc, ...stationFields } = stationForm;
            const station = await createStation({
                ...stationFields,
                status_loc: statusLoc,
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
                status: 'Aktif',
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
            const { status: editStatusLoc, ...editFields } = editStationForm;
            await updateStation(selectedStation.id_location, {
                ...editFields,
                status_loc: editStatusLoc,
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

    const assignOperator = async (operator, idLocation) => {
        setFeedback('');
        try {
            await assignOperatorStation(operator.id_user, idLocation ? Number(idLocation) : null);
            await fetchDashboard();
            setFeedback(idLocation ? 'Operator berhasil ditugaskan ke station.' : 'Penugasan operator berhasil dicabut.');
        } catch (err) {
            setFeedback(errorMessage(err, 'Gagal menugaskan operator.'));
        }
    };

    const submitOperator = async (e) => {
        e.preventDefault();
        setFeedback('');
        try {
            await createOperator({ ...operatorForm, id_location: operatorForm.id_location ? Number(operatorForm.id_location) : null });
            setOperatorForm({ nama_lengkap: '', email: '', password: '', nomor_telepon: '', id_location: '' });
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

            {/* TAB NAVIGASI PANEL ADMIN (FR14-FR18, FR26, FR39-FR41, FR45-FR49) */}
            <nav className="ops-tabs-nav">
                <button className={activeTab === 'stations' ? 'active' : ''} onClick={() => setActiveTab('stations')}>
                    📍 Stasiun & Unit Charger
                </button>
                <button className={activeTab === 'reports' ? 'active' : ''} onClick={() => setActiveTab('reports')}>
                    📊 Laporan & Utilisasi
                </button>
                {isAdmin && (
                    <button className={activeTab === 'operators' ? 'active' : ''} onClick={() => setActiveTab('operators')}>
                        👥 Kelola Operator & Hak Akses
                    </button>
                )}
                {isAdmin && (
                    <button className={activeTab === 'config' ? 'active' : ''} onClick={() => setActiveTab('config')}>
                        ⚙️ Konfigurasi Sistem
                    </button>
                )}
                {isAdmin && (
                    <button className={activeTab === 'audit' ? 'active' : ''} onClick={() => setActiveTab('audit')}>
                        🛡️ Audit Operasional
                    </button>
                )}
            </nav>

            {/* TAB 1: STASIUN & UNIT CHARGER (FR14-FR18, FR26) */}
            {activeTab === 'stations' && (
                <main className="ops-layout">
                    <section className="ops-panel">
                        <div className="ops-panel-head">
                            <h2>Station SPKLU</h2>
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
            )}

            {/* TAB 2: LAPORAN & UTILISASI (FR39, FR40, FR41) */}
            {activeTab === 'reports' && (
                <section className="ops-panel">
                    <div className="ops-panel-head">
                        <h2>Laporan Pendapatan & Utilisasi Charger</h2>
                        <span>Data agregat real-time operasional</span>
                    </div>
                    <div className="ops-report-grid">
                        <div><span>Pendapatan Hari Ini</span><strong>{rupiah(data.reports.pendapatan_hari_ini)}</strong></div>
                        <div><span>Pendapatan Bulan Ini</span><strong>{rupiah(data.summary.pendapatan_bulan_ini)}</strong></div>
                        <div><span>Sesi Berhasil Selesai</span><strong>{data.reports.sesi_selesai}</strong></div>
                        <div><span>Sesi Terhenti / Gagal</span><strong>{data.reports.sesi_gagal}</strong></div>
                        <div><span>Total Energi Terjual</span><strong>{data.reports.energi_terjual_kwh} kWh</strong></div>
                        <div><span>Total Station Aktif</span><strong>{data.summary.total_station}</strong></div>
                    </div>

                    <div style={{ marginTop: '20px' }}>
                        <h3 style={{ fontSize: '15px', color: '#14552f', marginBottom: '8px' }}>Rasio Utilisasi & Kesiapan Per Stasiun SPKLU</h3>
                        <div className="ops-table-wrap">
                            <table className="ops-table">
                                <thead>
                                    <tr>
                                        <th>Nama Stasiun</th>
                                        <th>Alamat</th>
                                        <th>Jam Buka</th>
                                        <th>Total Charger</th>
                                        <th>Tersedia</th>
                                        <th>Status Stasiun</th>
                                        <th>Tarif Listrik</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {data.stations.map((st) => (
                                        <tr key={st.id_location}>
                                            <td><strong>{st.nama_lokasi}</strong></td>
                                            <td>{st.alamat}</td>
                                            <td>{st.jam_buka} - {st.jam_tutup}</td>
                                            <td>{st.charger_total} Unit</td>
                                            <td><span className="ops-badge-status ops-badge-sukses">{st.charger_tersedia} Ready</span></td>
                                            <td><span className={`ops-badge-status ops-badge-${(st.status || 'aktif').toLowerCase()}`}>{st.status}</span></td>
                                            <td>{st.tarif ? rupiah(st.tarif.harga_per_kwh) + '/kWh' : '-'}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </section>
            )}

            {/* TAB 3: KELOLA OPERATOR & HAK AKSES (FR45, FR46, FR47) */}
            {activeTab === 'operators' && isAdmin && (
                <section className="ops-panel">
                    <div className="ops-panel-head">
                        <h2>Kelola Akun & Hak Akses Operator</h2>
                        <span>{data.operators.length} akun terdaftar</span>
                    </div>
                    <form className="ops-form ops-operator-form" onSubmit={submitOperator}>
                        <input placeholder="Nama lengkap" value={operatorForm.nama_lengkap} onChange={(e) => setOperatorForm((p) => ({ ...p, nama_lengkap: e.target.value }))} required />
                        <input placeholder="Email operator" type="email" value={operatorForm.email} onChange={(e) => setOperatorForm((p) => ({ ...p, email: e.target.value }))} required />
                        <input placeholder="Password awal" type="password" value={operatorForm.password} onChange={(e) => setOperatorForm((p) => ({ ...p, password: e.target.value }))} required />
                        <input placeholder="Nomor telepon" value={operatorForm.nomor_telepon} onChange={(e) => setOperatorForm((p) => ({ ...p, nomor_telepon: e.target.value }))} required />
                        <select value={operatorForm.id_location} onChange={(e) => setOperatorForm((p) => ({ ...p, id_location: e.target.value }))}>
                            <option value="">Belum ditugaskan</option>
                            {data.stations.map((station) => <option key={station.id_location} value={station.id_location}>{station.nama_lokasi}</option>)}
                        </select>
                        <button type="submit">Buat Akun Operator</button>
                    </form>

                    <div style={{ marginTop: '16px' }}>
                        <h3 style={{ fontSize: '14px', color: '#14552f', marginBottom: '8px' }}>Daftar Akun Operator & Penugasan Cabang</h3>
                        <div className="ops-operator-list">
                            {data.operators.map((operator) => (
                                <div key={operator.id_user} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px' }}>
                                    <div>
                                        <strong>{operator.nama_lengkap}</strong>
                                        <span style={{ display: 'block', fontSize: '12px', color: '#666' }}>
                                            {operator.email} · Telp: {operator.nomor_telepon || '-'}
                                        </span>
                                    </div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                        <span className={`ops-badge-status ops-badge-${(operator.status_akun || 'aktif').toLowerCase()}`}>
                                            {operator.status_akun}
                                        </span>
                                        <select 
                                            value={operator.id_location ?? ''} 
                                            onChange={(e) => assignOperator(operator, e.target.value)}
                                            style={{ padding: '6px 10px', borderRadius: '8px', border: '1px solid #dce8d5', fontSize: '12px' }}
                                        >
                                            <option value="">Belum ditugaskan</option>
                                            {data.stations.map((station) => <option key={station.id_location} value={station.id_location}>{station.nama_lokasi}</option>)}
                                        </select>
                                        <button 
                                            type="button"
                                            className="ops-primary" 
                                            style={{ fontSize: '11px', padding: '6px 10px', background: operator.status_akun === 'Aktif' ? '#ffe3e3' : '#dff7d6', color: operator.status_akun === 'Aktif' ? '#9c1c1c' : '#14552f' }}
                                            onClick={() => toggleOperatorStatus(operator)}
                                        >
                                            {operator.status_akun === 'Aktif' ? 'Nonaktifkan' : 'Aktifkan'}
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </section>
            )}

            {/* TAB 4: KONFIGURASI SISTEM (FR48) */}
            {activeTab === 'config' && isAdmin && (
                <section className="ops-panel">
                    <div className="ops-panel-head">
                        <h2>Konfigurasi Sistem EVChargeHub</h2>
                        <span>Parameter operasional platform SPKLU</span>
                    </div>
                    {configLoading ? (
                        <p style={{ padding: '16px' }}>Memuat konfigurasi...</p>
                    ) : (
                        <form onSubmit={handleSaveConfig} style={{ marginTop: '12px' }}>
                            <div className="ops-config-grid">
                                <div className="ops-config-item">
                                    <label>Radius Kedatangan Pengemudi (Meter)</label>
                                    <span>Jarak batas maksimum GPS pengemudi dari stasiun sebelum diizinkan memulai pengisian.</span>
                                    <input 
                                        type="number" 
                                        value={configData.arrival_radius_m} 
                                        onChange={(e) => setConfigData({ ...configData, arrival_radius_m: parseInt(e.target.value) || 200 })}
                                        min="10"
                                        max="5000"
                                        required 
                                    />
                                </div>

                                <div className="ops-config-item">
                                    <label>Verifikasi Kedatangan Fisik (Arrival Check)</label>
                                    <span>Aktifkan jika driver wajib berada di titik lokasi stasiun sebelum kabel dapat dialiri daya.</span>
                                    <select 
                                        value={configData.require_arrival ? '1' : '0'} 
                                        onChange={(e) => setConfigData({ ...configData, require_arrival: e.target.value === '1' })}
                                    >
                                        <option value="1">Aktif (Wajib di Radius SPKLU)</option>
                                        <option value="0">Nonaktif (Mode Uji Coba Jarak Jauh)</option>
                                    </select>
                                </div>

                                <div className="ops-config-item">
                                    <label>Kapasitas Default Baterai Kendaraan (kWh)</label>
                                    <span>Kapasitas acuan jika data kendaraan belum memiliki nilai kapasitas baterai spesifik.</span>
                                    <input 
                                        type="number" 
                                        step="0.5"
                                        value={configData.default_battery_kwh} 
                                        onChange={(e) => setConfigData({ ...configData, default_battery_kwh: parseFloat(e.target.value) || 50 })}
                                        min="10"
                                        max="200"
                                        required 
                                    />
                                </div>

                                <div className="ops-config-item">
                                    <label>Kecepatan Simulasi Pengisian Daya</label>
                                    <span>Faktor pengali pengisian (60 = 1 menit nyata setara 1 jam charging; 1 = waktu nyata).</span>
                                    <input 
                                        type="number" 
                                        step="1"
                                        value={configData.simulation_speed} 
                                        onChange={(e) => setConfigData({ ...configData, simulation_speed: parseFloat(e.target.value) || 60 })}
                                        min="1"
                                        max="3600"
                                        required 
                                    />
                                </div>
                            </div>
                            <div style={{ marginTop: '16px', display: 'flex', justifyContent: 'flex-end' }}>
                                <button type="submit" className="ops-primary" style={{ background: '#1b4d2e', color: '#fff', padding: '12px 24px' }}>
                                    Simpan Perubahan Konfigurasi
                                </button>
                            </div>
                        </form>
                    )}
                </section>
            )}

            {/* TAB 5: AUDIT OPERASIONAL (FR49) */}
            {activeTab === 'audit' && isAdmin && (
                <section className="ops-panel">
                    <div className="ops-panel-head">
                        <h2>Audit Operasional & Riwayat Aktivitas</h2>
                        <span>Pencatatan transaksi, perubahan tarif, dan status perangkat</span>
                    </div>

                    <div style={{ display: 'flex', gap: '8px', marginTop: '12px' }}>
                        <button 
                            type="button"
                            className={`ops-primary ${auditSubCategory === 'transaksi' ? 'active' : ''}`}
                            style={{ background: auditSubCategory === 'transaksi' ? '#1b4d2e' : '#fff', color: auditSubCategory === 'transaksi' ? '#fff' : '#14552f', border: '1px solid #dce8d5' }}
                            onClick={() => setAuditSubCategory('transaksi')}
                        >
                            ⚡ Log Transaksi Pengisian ({auditLogs.transaksi?.length || 0})
                        </button>
                        <button 
                            type="button"
                            className={`ops-primary ${auditSubCategory === 'tarif' ? 'active' : ''}`}
                            style={{ background: auditSubCategory === 'tarif' ? '#1b4d2e' : '#fff', color: auditSubCategory === 'tarif' ? '#fff' : '#14552f', border: '1px solid #dce8d5' }}
                            onClick={() => setAuditSubCategory('tarif')}
                        >
                            🏷️ Log Perubahan Tarif ({auditLogs.tarif?.length || 0})
                        </button>
                        <button 
                            type="button"
                            className={`ops-primary ${auditSubCategory === 'gangguan' ? 'active' : ''}`}
                            style={{ background: auditSubCategory === 'gangguan' ? '#1b4d2e' : '#fff', color: auditSubCategory === 'gangguan' ? '#fff' : '#14552f', border: '1px solid #dce8d5' }}
                            onClick={() => setAuditSubCategory('gangguan')}
                        >
                            ⚠️ Log Gangguan Perangkat ({auditLogs.gangguan?.length || 0})
                        </button>
                    </div>

                    {auditLoading ? (
                        <p style={{ padding: '16px' }}>Memuat catatan audit...</p>
                    ) : (
                        <div className="ops-table-wrap">
                            <table className="ops-table">
                                <thead>
                                    <tr>
                                        <th>ID Audit</th>
                                        <th>Kategori</th>
                                        <th>Aktor / Pelapor</th>
                                        <th>Lokasi Stasiun</th>
                                        <th>Detail Aktivitas</th>
                                        <th>Status / Nilai</th>
                                        <th>Waktu Transaksi</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {((auditLogs[auditSubCategory] || [])).length > 0 ? (
                                        auditLogs[auditSubCategory].map((item) => (
                                            <tr key={item.id}>
                                                <td><code>{item.id}</code></td>
                                                <td>{item.kategori}</td>
                                                <td><strong>{item.aktor}</strong></td>
                                                <td>{item.stasiun}</td>
                                                <td>{item.detail}</td>
                                                <td>
                                                    <span className={`ops-badge-status ops-badge-${(item.status || 'sukses').toLowerCase()}`}>
                                                        {item.status}
                                                    </span>
                                                </td>
                                                <td>{item.timestamp}</td>
                                            </tr>
                                        ))
                                    ) : (
                                        <tr>
                                            <td colSpan="7" style={{ textAlign: 'center', padding: '20px', color: '#888' }}>
                                                Belum ada catatan aktivitas pada kategori ini.
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    )}
                </section>
            )}
        </div>
    );
}