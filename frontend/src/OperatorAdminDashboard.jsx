import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import './operatorAdminDashboard.css';
import { FaMapMarkerAlt, FaChartBar, FaUsers, FaCog, FaShieldAlt, FaBolt, FaTags, FaExclamationTriangle, FaHome, FaTimes, FaEdit, FaPlus, FaSearch } from 'react-icons/fa';
import { 
    assignOperatorStation, 
    createOperator, 
    createStation, 
    createTarif, 
    getOperationsDashboard, 
    getOperationsReport,
    searchStationLocations,
    updateCharger, 
    updatePort,
    updateStation,
    updateOperatorStatus,
    getAuditLogs,
    createCharger,
    createPort,
    assignStationOperators,
    getSystemConfig,
    updateSystemConfig,
    updateScheduledTarif,
    cancelScheduledTarif
} from './api/operations';

const STATION_STATUS = ['Aktif', 'Nonaktif', 'Maintenance'];
const CHARGER_STATUS = ['Active', 'Maintenance', 'Offline'];
const DEFAULT_MAP_POINT = { latitude: -7.8014, longitude: 110.3644 };

/** Memformat nominal rupiah untuk tampilan panel admin. */
function rupiah(value) {
    return 'Rp' + Number(value || 0).toLocaleString('id-ID');
}

/** Mengubah kode status teknis menjadi label yang mudah dibaca. */
function readableStatus(value) {
    return String(value || '-').replaceAll('_', ' ');
}

/** Menjaga input nomor telepon Operator hanya berisi maksimal 13 digit. */
function normalizeOperatorPhone(value) {
    return String(value ?? '').replace(/\D/g, '').slice(0, 13);
}

/** Mengambil pesan validasi backend atau memakai pesan cadangan. */
function errorMessage(error, fallback) {
    const data = error?.response?.data;
    if (data?.message) return data.message;
    if (data?.errors) {
        const first = Object.values(data.errors)[0];
        return Array.isArray(first) ? first[0] : fallback;
    }
    return fallback;
}

/** Membuat filter laporan awal untuk 30 hari terakhir dalam zona waktu lokal browser. */
function createDefaultReportFilters() {
    const toDate = new Date();
    const fromDate = new Date(toDate);
    fromDate.setDate(fromDate.getDate() - 29);
    const formatDate = (date) => new Intl.DateTimeFormat('en-CA').format(date);
    return { from: formatDate(fromDate), to: formatDate(toDate), id_location: '', id_charger: '' };
}

/** Pemilih koordinat station berbasis peta yang mengirim posisi terpilih ke form. */
function StationMapPicker({ value, onChange }) {
    const nodeRef = useRef(null);
    const mapRef = useRef(null);
    const markerRef = useRef(null);
    const [locationQuery, setLocationQuery] = useState('');
    const [locationResults, setLocationResults] = useState([]);
    const [locationSearchBusy, setLocationSearchBusy] = useState(false);
    const [locationSearchError, setLocationSearchError] = useState('');
    const point = value?.latitude && value?.longitude ? value : DEFAULT_MAP_POINT;

    useEffect(() => {
        if (!nodeRef.current || mapRef.current) return;

        const map = L.map(nodeRef.current, { zoomControl: false }).setView([point.latitude, point.longitude], 14);
        L.control.zoom({ position: 'bottomright' }).addTo(map);
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            maxZoom: 19,
            attribution: '&copy; OpenStreetMap contributors',
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

    /** Menjalankan pencarian alamat hanya setelah Admin menekan tombol cari. */
    const searchLocation = async (event) => {
        event?.preventDefault?.();
        if (locationQuery.trim().length < 3) {
            setLocationSearchError('Masukkan minimal 3 karakter nama tempat atau alamat.');
            return;
        }

        setLocationSearchBusy(true);
        setLocationSearchError('');
        try {
            const results = await searchStationLocations(locationQuery.trim());
            setLocationResults(results);
            if (results.length === 0) setLocationSearchError('Lokasi tidak ditemukan. Coba nama jalan, gedung, atau wilayah yang lebih lengkap.');
        } catch (error) {
            setLocationSearchError(error?.response?.data?.message || 'Pencarian gagal. Kamu tetap bisa memilih titik langsung pada peta.');
        } finally {
            setLocationSearchBusy(false);
        }
    };

    return (
        <div className="ops-map-picker-wrap">
            <div className="ops-map-search">
                <label htmlFor="ops-map-location-search">Cari alamat atau nama tempat</label>
                <div><input id="ops-map-location-search" value={locationQuery} onChange={(event) => setLocationQuery(event.target.value)} onKeyDown={(event) => { if (event.key === 'Enter') searchLocation(event); }} placeholder="Contoh: Jalan Laksda Adisucipto, Yogyakarta" /><button type="button" className="ops-button-primary" onClick={() => searchLocation()} disabled={locationSearchBusy}>{locationSearchBusy ? 'Mencari…' : 'Cari lokasi'}</button></div>
                <small>Pencarian dilakukan setelah menekan tombol. Pilih hasil untuk memindahkan pin.</small>
            </div>
            {locationSearchError && <p className="ops-map-search-message" role="status">{locationSearchError}</p>}
            {locationResults.length > 0 && <ul className="ops-map-search-results" aria-label="Hasil pencarian lokasi">
                {locationResults.map((result, index) => <li key={`${result.latitude}-${result.longitude}-${index}`}><button type="button" onClick={() => { onChange({ latitude: result.latitude, longitude: result.longitude }); setLocationQuery(result.label); setLocationResults([]); setLocationSearchError(''); }}><strong>{result.label}</strong><span>{result.latitude}, {result.longitude}</span></button></li>)}
            </ul>}
            <div ref={nodeRef} className="ops-map-picker" />
            <p>© OpenStreetMap contributors. Pilih hasil pencarian, geser peta, atau klik titik yang tepat. Koordinat: {point.latitude}, {point.longitude}</p>
        </div>
    );
}

/** Panel admin untuk station, charger, tarif, operator, audit, dan konfigurasi. */
export default function OperatorAdminDashboard({ user, onLogout }) {
    const role = user?.peran;
    const isAdmin = role === 'admin';
    const displayName = user?.profile?.nama_lengkap || user?.email || 'Operator';
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [selectedStationId, setSelectedStationId] = useState(null);
    const [stationSearch, setStationSearch] = useState('');
    const [stationStatusFilter, setStationStatusFilter] = useState('all');
    const [stationDetailTab, setStationDetailTab] = useState('overview');
    const [stationCreationOpen, setStationCreationOpen] = useState(false);
    const [stationCreationStep, setStationCreationStep] = useState(1);
    const [stationCreationOperatorIds, setStationCreationOperatorIds] = useState([]);
    const [stationCreationNewOperatorOpen, setStationCreationNewOperatorOpen] = useState(false);
    const [stationCreationNewOperator, setStationCreationNewOperator] = useState({ nama_lengkap: '', email: '', password: '', nomor_telepon: '' });
    const [stationCreationTariff, setStationCreationTariff] = useState({ harga_per_kwh: '', biaya_minimum: '0', biaya_parkir_flat: '' });
    const [stationCreationReason, setStationCreationReason] = useState('');
    const [stationCreationFeedback, setStationCreationFeedback] = useState('');
    const [stationCreationBusy, setStationCreationBusy] = useState(false);
    const [stationCreationRecordId, setStationCreationRecordId] = useState(null);
    const [stationCreationOperatorDone, setStationCreationOperatorDone] = useState(false);
    const [stationCreationTariffDone, setStationCreationTariffDone] = useState(false);
    const [stationForm, setStationForm] = useState({
        nama_lokasi: '',
        alamat: '',
        latitude: DEFAULT_MAP_POINT.latitude,
        longitude: DEFAULT_MAP_POINT.longitude,
        jam_buka: '06:00',
        jam_tutup: '22:00',
    });
    const [editStationForm, setEditStationForm] = useState(null);
    const [editingStation, setEditingStation] = useState(false);
    const [editingChargerId, setEditingChargerId] = useState(null);
    const [editingPortId, setEditingPortId] = useState(null);
    const [addingCharger, setAddingCharger] = useState(false);
    const [addingPortFor, setAddingPortFor] = useState(null);
    const [reasonAction, setReasonAction] = useState(null);
    const [reasonText, setReasonText] = useState('');
    const [stationOperatorDraft, setStationOperatorDraft] = useState([]);
    const [stationOperatorSearch, setStationOperatorSearch] = useState('');
    const [savingStationOperators, setSavingStationOperators] = useState(false);
    const [tarifForm, setTarifForm] = useState({ harga_per_kwh: '', biaya_minimum: '', biaya_parkir_flat: '', mode: 'immediate', effective_at: '' });
    const [editingScheduledTarifId, setEditingScheduledTarifId] = useState(null);
    const [operatorForm, setOperatorForm] = useState({ nama_lengkap: '', email: '', password: '', nomor_telepon: '', id_locations: [] });
    const [operatorSearch, setOperatorSearch] = useState('');
    const [operatorStatusFilter, setOperatorStatusFilter] = useState('all');
    const [operatorStationFilter, setOperatorStationFilter] = useState('all');
    const [operatorNotice, setOperatorNotice] = useState(null);
    const [operatorSubmitting, setOperatorSubmitting] = useState(false);
    const [feedback, setFeedback] = useState('');

    // Tab navigasi panel Admin & Operator
    const [activeTab, setActiveTab] = useState(user?.peran === 'admin' ? 'overview' : 'stations'); // 'overview' | 'stations' | 'reports' | 'operators' | 'config' | 'audit'

    // State filter laporan operasional agar permintaan API mengikuti pilihan Admin.
    const [reportFilters, setReportFilters] = useState(createDefaultReportFilters);
    const [reportData, setReportData] = useState(null);
    const [reportLoading, setReportLoading] = useState(false);
    const [reportError, setReportError] = useState('');

    // State Konfigurasi Sistem (FR48)
    const [configData, setConfigData] = useState({
        arrival_radius_m: 200,
        require_arrival: true,
        default_battery_kwh: 50,
        simulation_speed: 60,
    });
    const [configLoading, setConfigLoading] = useState(false);

    // State Audit Operasional (FR49)
    const [auditLogs, setAuditLogs] = useState({ transaksi: [], tarif: [], gangguan: [], perubahan: [] });
    const [auditSubCategory, setAuditSubCategory] = useState('transaksi'); // 'transaksi' | 'tarif' | 'gangguan'
    const [auditLoading, setAuditLoading] = useState(false);
    const [auditSearch, setAuditSearch] = useState('');

    /** Memuat konfigurasi sistem untuk tab pengaturan admin. */
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

    /** Memuat catatan audit transaksi, sesi charging, dan gangguan. */
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

    /** Memuat laporan untuk periode dan cakupan station yang dipilih. */
    const fetchReport = useCallback(async () => {
        setReportLoading(true);
        setReportError('');
        try {
            const filters = Object.fromEntries(Object.entries(reportFilters).filter(([, value]) => value !== ''));
            setReportData(await getOperationsReport(filters));
        } catch (err) {
            setReportError(errorMessage(err, 'Gagal memuat laporan operasional.'));
        } finally {
            setReportLoading(false);
        }
    }, [reportFilters]);

    /** Menyimpan nilai konfigurasi yang diubah pada panel admin. */
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

    /** Mengaktifkan atau menonaktifkan akun operator terpilih. */
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

    /** Memuat station, charger, dan operator untuk area administrasi. */
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

    /** Menyaring daftar station berdasarkan nama/alamat dan status operasional. */
    const filteredStations = useMemo(() => {
        const query = stationSearch.trim().toLocaleLowerCase('id-ID');
        return (data?.stations ?? []).filter((station) => {
            const matchesQuery = !query || `${station.kode_station ?? ''} ${station.nama_lokasi} ${station.alamat}`.toLocaleLowerCase('id-ID').includes(query);
            const matchesStatus = stationStatusFilter === 'all' || station.status === stationStatusFilter;
            return matchesQuery && matchesStatus;
        });
    }, [data, stationSearch, stationStatusFilter]);

    /** Mencari dan memfilter direktori Operator berdasarkan identitas, status, dan station tugas. */
    const filteredOperators = useMemo(() => {
        const query = operatorSearch.trim().toLocaleLowerCase('id-ID');
        return (data?.operators ?? []).filter((operator) => {
            const stationNames = (operator.nama_lokasi ?? []).join(' ');
            const searchable = `${operator.nama_lengkap ?? ''} ${operator.email ?? ''} ${operator.nomor_telepon ?? ''} ${stationNames}`.toLocaleLowerCase('id-ID');
            const hasStation = (operator.id_locations ?? []).length > 0;
            const matchesStatus = operatorStatusFilter === 'all' || operator.status_akun === operatorStatusFilter;
            const matchesStation = operatorStationFilter === 'all'
                || (operatorStationFilter === 'unassigned' ? !hasStation : (operator.id_locations ?? []).map(String).includes(operatorStationFilter));
            return searchable.includes(query) && matchesStatus && matchesStation;
        });
    }, [data, operatorSearch, operatorStatusFilter, operatorStationFilter]);

    /** Menjaga panel detail mengikuti daftar hasil filter dan station yang dipilih. */
    const selectedStation = useMemo(
        () => filteredStations.find((station) => station.id_location === selectedStationId) ?? filteredStations[0] ?? null,
        [filteredStations, selectedStationId]
    );

    /** Mendapatkan ID Operator aktif yang saat ini ditugaskan pada station terpilih. */
    const selectedStationOperatorIds = useMemo(
        () => (data?.operators ?? []).filter((operator) => (operator.id_locations ?? []).map(Number).includes(Number(selectedStation?.id_location))).map((operator) => String(operator.id_user)),
        [data, selectedStation]
    );

    /** Menyediakan nama Operator yang akan ditambah atau dilepas untuk pratinjau simpan. */
    const stationOperatorChanges = useMemo(() => {
        const namesById = new Map((data?.operators ?? []).map((operator) => [String(operator.id_user), operator.nama_lengkap]));
        const added = stationOperatorDraft.filter((id) => !selectedStationOperatorIds.includes(id));
        const removed = selectedStationOperatorIds.filter((id) => !stationOperatorDraft.includes(id));
        return { added, removed, addedNames: added.map((id) => namesById.get(id) ?? id), removedNames: removed.map((id) => namesById.get(id) ?? id) };
    }, [data, selectedStationOperatorIds, stationOperatorDraft]);

    /** Menghitung port tersedia hanya dari unit operasional untuk membedakannya dari status unit. */
    const getStationPortSummary = (station) => {
        const chargers = station?.chargers ?? [];
        const ports = chargers.flatMap((charger) => charger.ports ?? []);
        const available = chargers
            .filter((charger) => charger.status === 'Active')
            .flatMap((charger) => charger.ports ?? [])
            .filter((port) => port.status_port === 'Available').length;
        return { available, total: ports.length };
    };

    /** Menghitung operator yang ditugaskan pada station untuk menandai kesiapan aktivasi di tampilan Admin. */
    const getAssignedOperatorCount = (stationId) => (data?.operators ?? [])
        .filter((operator) => operator.status_akun === 'Aktif' && (operator.id_locations ?? []).map(Number).includes(Number(stationId))).length;

    /** Memformat tanggal efektif tarif agar waktu berlaku terbaca sebelum pengguna menyimpan perubahan. */
    const formatTariffDate = (value) => {
        if (!value) return 'Saat perubahan disimpan';
        return new Date(value).toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short' });
    };

    /** Memilih station yang perlu perhatian Admin untuk ringkasan dashboard. */
    const stationsNeedingAttention = useMemo(() => {
        if (!data || !isAdmin) return [];
        const assignedStationIds = new Set((data.operators ?? []).flatMap((operator) => operator.id_locations ?? []).map(Number));
        return data.stations.filter((station) => station.status !== 'Aktif'
            || !assignedStationIds.has(Number(station.id_location))
            || station.chargers.some((charger) => charger.status !== 'Active'));
    }, [data, isAdmin]);

    /** Memfilter kategori audit yang sedang dibuka berdasarkan kata pencarian. */
    const filteredAuditEntries = useMemo(() => (auditLogs[auditSubCategory] ?? []).filter((item) => {
        const query = auditSearch.trim().toLowerCase();
        if (!query) return true;
        return [item.id, item.kategori, item.aktor, item.stasiun, item.detail, item.status, item.timestamp]
            .some((value) => String(value ?? '').toLowerCase().includes(query));
    }), [auditLogs, auditSubCategory, auditSearch]);

    /** Membuka formulir edit dengan nilai station yang sedang dipilih. */
    const beginEditStation = () => {
        if (!selectedStation) return;
        setEditStationForm({
            nama_lokasi: selectedStation.nama_lokasi,
            alamat: selectedStation.alamat,
            latitude: selectedStation.latitude,
            longitude: selectedStation.longitude,
            jam_buka: selectedStation.jam_buka,
            jam_tutup: selectedStation.jam_tutup,
            status: selectedStation.status,
            alasan: '',
        });
        setEditingStation(true);
    };

    /** Mengubah status operasional lokasi station. */
    const saveStationStatus = async (station, status, alasan) => {
        setFeedback('');
        try {
            await updateStation(station.id_location, { status_loc: status, alasan });
            await fetchDashboard();
            setFeedback('Status station berhasil diperbarui.');
            return true;
        } catch (err) {
            setFeedback(errorMessage(err, 'Gagal memperbarui status station.'));
            return false;
        }
    };

    /** Membuka halaman wizard dan menyiapkan draft station yang bersih. */
    const startStationCreation = () => {
        resetStationCreation();
        setStationCreationOpen(true);
    };

    /** Mengosongkan draft wizard ketika Admin menutup alur penambahan station. */
    const resetStationCreation = () => {
        setStationCreationOpen(false);
        setStationCreationStep(1);
        setStationCreationOperatorIds([]);
        setStationCreationNewOperatorOpen(false);
        setStationCreationNewOperator({ nama_lengkap: '', email: '', password: '', nomor_telepon: '' });
        setStationCreationTariff({ harga_per_kwh: '', biaya_minimum: '0', biaya_parkir_flat: '' });
        setStationCreationReason('');
        setStationCreationFeedback('');
        setStationCreationRecordId(null);
        setStationCreationOperatorDone(false);
        setStationCreationTariffDone(false);
        setStationForm({ nama_lokasi: '', alamat: '', latitude: DEFAULT_MAP_POINT.latitude, longitude: DEFAULT_MAP_POINT.longitude, jam_buka: '06:00', jam_tutup: '22:00' });
    };

    /** Menutup wizard dan menyegarkan daftar agar draft yang sudah tercipta tetap terlihat. */
    const exitStationCreation = async () => {
        resetStationCreation();
        await fetchDashboard();
    };

    /** Menyimpan station, penugasan, tarif awal, dan aktivasi sesuai pilihan Admin secara berurutan. */
    const submitStation = async (e, activate = false) => {
        e?.preventDefault?.();
        const hasNewOperator = stationCreationNewOperatorOpen;
        const hasSelectedOperator = stationCreationOperatorIds.length > 0;
        const newOperatorComplete = Boolean(
            stationCreationNewOperator.nama_lengkap.trim()
            && /^[a-zA-Z0-9]+(?:[._-][a-zA-Z0-9]+)*$/.test(stationCreationNewOperator.email.trim())
            && stationCreationNewOperator.password.length >= 6
            && stationCreationNewOperator.nomor_telepon.trim()
        );
        const hasAnyTariff = Boolean(stationCreationTariff.harga_per_kwh.trim() || stationCreationTariff.biaya_parkir_flat.trim());
        const hasCompleteTariff = Boolean(stationCreationTariff.harga_per_kwh.trim() && stationCreationTariff.biaya_parkir_flat.trim());

        if (hasNewOperator && !newOperatorComplete) {
            setStationCreationFeedback('Lengkapi nama, email yang valid, password minimal 6 karakter, dan nomor telepon Operator.');
            setStationCreationStep(2);
            return;
        }

        if (activate && !hasSelectedOperator && !hasNewOperator) {
            setStationCreationFeedback('Wajib memilih atau menambahkan Operator sebelum station dapat diaktifkan.');
            setStationCreationStep(2);
            return;
        }
        if (!activate && hasAnyTariff && !hasCompleteTariff) {
            setStationCreationFeedback('Lengkapi semua nilai tarif atau kosongkan seluruh kolom untuk menyimpan draft.');
            setStationCreationStep(3);
            return;
        }
        if (activate && stationCreationReason.trim().length < 5) {
            setStationCreationFeedback('Alasan aktivasi wajib diisi minimal 5 karakter.');
            setStationCreationStep(4);
            return;
        }

        setStationCreationBusy(true);
        setStationCreationFeedback('');
        let stationId = stationCreationRecordId;
        try {
            if (!stationId) {
                const created = await createStation({
                    ...stationForm,
                    status_loc: 'Nonaktif',
                    latitude: Number(stationForm.latitude),
                    longitude: Number(stationForm.longitude),
                });
                stationId = created.id_location;
                setStationCreationRecordId(stationId);
            }

            if (!stationCreationOperatorDone && (hasNewOperator || hasSelectedOperator)) {
                for (const selectedOperatorId of stationCreationOperatorIds) {
                    const selectedOperator = (data?.operators ?? []).find((operator) => String(operator.id_user) === String(selectedOperatorId));
                    const assignments = (selectedOperator?.id_locations ?? []).map(Number);
                    if (!assignments.includes(Number(stationId))) assignments.push(Number(stationId));
                    await assignOperatorStation(selectedOperatorId, assignments);
                }
                if (hasNewOperator) {
                    await createOperator({ ...stationCreationNewOperator, email: `${stationCreationNewOperator.email.trim()}@ops.ac.id`, id_locations: [Number(stationId)] });
                }
                setStationCreationOperatorDone(true);
            }

            if (!stationCreationTariffDone && hasCompleteTariff) {
                await createTarif(stationId, {
                    ...Object.fromEntries(Object.entries(stationCreationTariff).map(([key, value]) => [key, Number(value)])),
                    mode: 'immediate',
                });
                setStationCreationTariffDone(true);
            }

            if (activate) {
                await updateStation(stationId, { status_loc: 'Aktif', alasan: stationCreationReason.trim() });
            }

            await fetchDashboard();
            setSelectedStationId(stationId);
            setStationDetailTab('overview');
            resetStationCreation();
            const newOperatorFeedback = hasNewOperator
                ? ` Akun Operator ${stationCreationNewOperator.nama_lengkap.trim()} juga berhasil dibuat.`
                : '';
            setFeedback(`${activate ? 'Station berhasil dibuat dan diaktifkan.' : 'Station berhasil disimpan dengan status Nonaktif.'}${newOperatorFeedback}`);
        } catch (err) {
            const message = errorMessage(err, 'Gagal menyimpan station.');
            setStationCreationFeedback(stationId
                ? `${message} Station berstatus Nonaktif sudah dibuat; perbaiki data lalu simpan kembali untuk melanjutkan.`
                : message);
        } finally {
            setStationCreationBusy(false);
        }
    };

    /** Menyimpan perubahan informasi station yang sedang diedit. */
    const submitEditStation = async (e) => {
        e.preventDefault();
        if (!selectedStation || !editStationForm) return;
        setFeedback('');
        try {
            const { status: editStatusLoc, ...editFields } = editStationForm;
            await updateStation(selectedStation.id_location, {
                ...editFields,
                status_loc: editStatusLoc,
                alasan: editStationForm.alasan,
                latitude: Number(editStationForm.latitude),
                longitude: Number(editStationForm.longitude),
            });
            await fetchDashboard();
            setSelectedStationId(selectedStation.id_location);
            setEditingStation(false);
            setFeedback('Data station berhasil diperbarui.');
        } catch (err) {
            setFeedback(errorMessage(err, 'Gagal memperbarui station.'));
        }
    };

    /** Memperbarui status unit charger setelah tindakan admin. */
    const saveChargerStatus = async (charger, status_mesin, alasan) => {
        setFeedback('');
        try {
            await updateCharger(charger.id_charger, { status_mesin, alasan });
            await fetchDashboard();
            setFeedback('Status charger berhasil diperbarui.');
            return true;
        } catch (err) {
            setFeedback(errorMessage(err, 'Gagal memperbarui status charger.'));
            return false;
        }
    };

    /** Menyimpan perubahan informasi teknis unit charger dengan alasan audit. */
    const submitChargerDetails = async (e, charger) => {
        e.preventDefault();
        const formData = new FormData(e.currentTarget);
        setFeedback('');
        try {
            await updateCharger(charger.id_charger, {
                kode_perangkat: formData.get('kode_perangkat'),
                merek_model: formData.get('merek_model'),
                kap_tot_kw: Number(formData.get('kap_tot_kw')),
                alasan: formData.get('alasan'),
            });
            setEditingChargerId(null);
            await fetchDashboard();
            setFeedback('Data teknis charger berhasil diperbarui.');
        } catch (err) {
            setFeedback(errorMessage(err, 'Gagal memperbarui data charger.'));
        }
    };

    /** Menyimpan perubahan tipe, mode, dan daya port beserta alasan wajib. */
    const submitPortDetails = async (e, port) => {
        e.preventDefault();
        const formData = new FormData(e.currentTarget);
        setFeedback('');
        try {
            await updatePort(port.id_port, {
                nomor_port: formData.get('nomor_port'),
                tipe_konektor: formData.get('tipe_konektor'),
                tipe_charging: formData.get('tipe_charging'),
                daya_maks_kw: Number(formData.get('daya_maks_kw')),
                alasan: formData.get('alasan'),
            });
            setEditingPortId(null);
            await fetchDashboard();
            setFeedback('Data teknis port berhasil diperbarui.');
        } catch (err) {
            setFeedback(errorMessage(err, 'Gagal memperbarui data port.'));
        }
    };

    /** Membuat charger baru pada station terpilih dan mencatat alasan ke audit. */
    const submitNewCharger = async (e) => {
        e.preventDefault();
        if (!selectedStation) return;
        const values = new FormData(e.currentTarget);
        try {
            await createCharger(selectedStation.id_location, { kode_perangkat: values.get('kode_perangkat'), merek_model: values.get('merek_model'), kap_tot_kw: Number(values.get('kap_tot_kw')), alasan: values.get('alasan') });
            setAddingCharger(false);
            await fetchDashboard();
            setFeedback('Charger berhasil ditambahkan.');
        } catch (err) { setFeedback(errorMessage(err, 'Charger tidak dapat ditambahkan.')); }
    };

    /** Membuat port baru pada charger terpilih dengan alasan audit wajib. */
    const submitNewPort = async (e, charger) => {
        e.preventDefault();
        const values = new FormData(e.currentTarget);
        try {
            await createPort(charger.id_charger, { nomor_port: values.get('nomor_port'), tipe_konektor: values.get('tipe_konektor'), tipe_charging: values.get('tipe_charging'), daya_maks_kw: Number(values.get('daya_maks_kw')), alasan: values.get('alasan') });
            setAddingPortFor(null);
            await fetchDashboard();
            setFeedback('Port berhasil ditambahkan.');
        } catch (err) { setFeedback(errorMessage(err, 'Port tidak dapat ditambahkan.')); }
    };

    /** Menyimpan perubahan status port setelah pengguna mengisi alasan. */
    const savePortStatus = async (port, status_port, alasan) => {
        try {
            await updatePort(port.id_port, { status_port, alasan });
            await fetchDashboard();
            setFeedback('Status port berhasil diperbarui.');
            return true;
        } catch (err) { setFeedback(errorMessage(err, 'Status port tidak dapat diperbarui.')); return false; }
    };

    /** Mengonfirmasi perubahan status dengan alasan sebelum perubahan disimpan. */
    const submitReasonAction = async (e) => {
        e.preventDefault();
        if (!reasonAction || reasonText.trim().length < 5) return;
        let saved = false;
        if (reasonAction.kind === 'station') {
            saved = await saveStationStatus(reasonAction.item, reasonAction.value, reasonText.trim());
        } else if (reasonAction.kind === 'port') {
            saved = await savePortStatus(reasonAction.item, reasonAction.value, reasonText.trim());
        } else {
            saved = await saveChargerStatus(reasonAction.item, reasonAction.value, reasonText.trim());
        }
        if (!saved) return;
        setReasonAction(null);
        setReasonText('');
    };

    /** Membuat periode tarif baru pada station yang dipilih. */
    const submitTarif = async (e) => {
        e.preventDefault();
        if (!selectedStation) return;
        setFeedback('');
        try {
            const tariffPayload = {
                harga_per_kwh: Number(tarifForm.harga_per_kwh),
                biaya_minimum: Number(tarifForm.biaya_minimum),
                biaya_parkir_flat: Number(tarifForm.biaya_parkir_flat),
                mode: tarifForm.mode,
                ...(tarifForm.mode === 'scheduled' ? { effective_at: tarifForm.effective_at } : {}),
            };
            if (editingScheduledTarifId) {
                await updateScheduledTarif(editingScheduledTarifId, tariffPayload);
                setEditingScheduledTarifId(null);
            } else {
                await createTarif(selectedStation.id_location, tariffPayload);
            }
            setTarifForm({ harga_per_kwh: '', biaya_minimum: '', biaya_parkir_flat: '', mode: 'immediate', effective_at: '' });
            await fetchDashboard();
            setFeedback('Tarif berhasil disimpan.');
        } catch (err) {
            setFeedback(errorMessage(err, 'Gagal menyimpan tarif.'));
        }
    };

    /** Menyimpan seluruh perubahan petugas untuk station terpilih dalam satu permintaan. */
    const saveStationOperators = async () => {
        if (!selectedStation || savingStationOperators) return;
        const inactiveSelected = stationOperatorDraft.some((id) => (data?.operators ?? []).some((operator) => String(operator.id_user) === id && operator.status_akun !== 'Aktif'));
        const activeSelectedCount = stationOperatorDraft.filter((id) => (data?.operators ?? []).some((operator) => String(operator.id_user) === id && operator.status_akun === 'Aktif')).length;
        if (inactiveSelected || (selectedStation.status === 'Aktif' && activeSelectedCount === 0)) {
            setFeedback(inactiveSelected ? 'Lepas akun Operator nonaktif sebelum menyimpan penugasan.' : 'Station aktif harus memiliki minimal satu Operator aktif.');
            return;
        }
        const after = [...stationOperatorDraft];
        setSavingStationOperators(true);
        setFeedback('');
        try {
            await assignStationOperators(selectedStation.id_location, after);
            await fetchDashboard();
            setStationOperatorDraft(after);
            setFeedback(`Petugas tersimpan. Ditambahkan: ${stationOperatorChanges.addedNames.join(', ') || 'tidak ada'}. Dilepas: ${stationOperatorChanges.removedNames.join(', ') || 'tidak ada'}.`);
        } catch (err) {
            setFeedback(errorMessage(err, 'Perubahan petugas belum berhasil disimpan.'));
        } finally {
            setSavingStationOperators(false);
        }
    };

    /** Membuka tab Petugas untuk station pilihan, termasuk saat berpindah dari direktori Operator. */
    const openStationPetugas = (stationId) => {
        const targetId = Number(stationId);
        const assignedIds = (data?.operators ?? []).filter((operator) => (operator.id_locations ?? []).map(Number).includes(targetId)).map((operator) => String(operator.id_user));
        setSelectedStationId(targetId);
        setStationSearch('');
        setStationStatusFilter('all');
        setStationOperatorDraft(assignedIds);
        setStationOperatorSearch('');
        setStationDetailTab('operators');
        setActiveTab('stations');
    };

    /** Membuat akun operator dan menempatkannya pada station pilihan. */
    const submitOperator = async (e) => {
        e.preventDefault();
        setFeedback('');
        setOperatorNotice(null);
        setOperatorSubmitting(true);
        const operatorName = operatorForm.nama_lengkap.trim();
        try {
            await createOperator({ ...operatorForm, email: `${operatorForm.email.trim()}@ops.ac.id`, id_locations: operatorForm.id_locations.map(Number) });
            setOperatorForm({ nama_lengkap: '', email: '', password: '', nomor_telepon: '', id_locations: [] });
            setOperatorNotice({ type: 'success', message: `Akun Operator ${operatorName} berhasil dibuat.` });

            try {
                const dashboard = await getOperationsDashboard();
                setData(dashboard);
                setSelectedStationId((previous) => previous ?? dashboard.stations?.[0]?.id_location ?? null);
            } catch (refreshError) {
                console.error('Operator berhasil dibuat, tetapi daftar gagal diperbarui:', refreshError);
                setOperatorNotice({
                    type: 'success',
                    message: `Akun Operator ${operatorName} berhasil dibuat. Muat ulang halaman untuk memperbarui daftar Operator.`,
                });
            }
        } catch (err) {
            setOperatorNotice({ type: 'error', message: errorMessage(err, 'Gagal membuat operator.') });
        } finally {
            setOperatorSubmitting(false);
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

            <div className={isAdmin ? 'ops-dashboard-grid' : 'ops-operator-content'}>
            <nav className={`ops-tabs-nav ${isAdmin ? 'ops-admin-nav' : ''}`} aria-label={isAdmin ? 'Navigasi Admin' : 'Navigasi Operasional'}>
                {isAdmin && (
                    <button className={activeTab === 'overview' ? 'active' : ''} onClick={() => setActiveTab('overview')}>
                        <FaHome aria-hidden="true" /> Ringkasan
                    </button>
                )}
                <button className={activeTab === 'stations' ? 'active' : ''} onClick={() => setActiveTab('stations')}>
                    <FaMapMarkerAlt aria-hidden="true" /> Station & Charger
                </button>
                {isAdmin && (
                    <button className={activeTab === 'operators' ? 'active' : ''} onClick={() => setActiveTab('operators')}>
                        <FaUsers aria-hidden="true" /> Operator
                    </button>
                )}
                <button className={activeTab === 'reports' ? 'active' : ''} onClick={() => { setActiveTab('reports'); fetchReport(); }}>
                    <FaChartBar aria-hidden="true" /> Laporan & Utilisasi
                </button>
                {isAdmin && (
                    <button className={activeTab === 'audit' ? 'active' : ''} onClick={() => { setActiveTab('audit'); fetchAudit(); }}>
                        <FaShieldAlt aria-hidden="true" /> Audit Operasional
                    </button>
                )}
                {isAdmin && (
                    <button className={activeTab === 'config' ? 'active' : ''} onClick={() => { setActiveTab('config'); fetchConfig(); }}>
                        <FaCog aria-hidden="true" /> Konfigurasi Sistem
                    </button>
                )}
            </nav>

            <div className="ops-main-content">
            {feedback && <div className="ops-feedback" role="status">{feedback}</div>}

            {!isAdmin && (
                <section className="ops-stats" aria-label="Ringkasan operasional">
                    <div><span>Station</span><strong>{data.summary.total_station}</strong></div>
                    <div><span>Charger</span><strong>{data.summary.total_charger}</strong></div>
                    <div><span>Charger aktif</span><strong>{data.summary.charger_tersedia}</strong></div>
                    <div><span>Gangguan</span><strong>{data.summary.charger_gangguan}</strong></div>
                    <div><span>Sesi aktif</span><strong>{data.summary.sesi_berjalan}</strong></div>
                    <div><span>Pendapatan bulan ini</span><strong>{rupiah(data.summary.pendapatan_bulan_ini)}</strong></div>
                </section>
            )}

            {/* Ringkasan global menampilkan kondisi lintas station dan daftar yang perlu ditangani Admin. */}
            {isAdmin && activeTab === 'overview' && (
                <main className="ops-admin-overview">
                    <div className="ops-page-heading">
                        <div><span className="ops-eyebrow">PUSAT KENDALI</span><h2>Ringkasan Operasional</h2><p>Pantau kondisi seluruh station dan tindak lanjut yang diperlukan.</p></div>
                        <button className="ops-button-primary" onClick={() => { setActiveTab('stations'); startStationCreation(); }}><FaPlus aria-hidden="true" /> Tambah station</button>
                    </div>
                    <section className="ops-overview-metrics" aria-label="Statistik utama">
                        <article><span>Station aktif</span><strong>{data.stations.filter((station) => station.status === 'Aktif').length}<small> / {data.stations.length}</small></strong></article>
                        <article><span>Unit charger aktif</span><strong>{data.summary.charger_tersedia}</strong></article>
                        <article><span>Sesi berjalan</span><strong>{data.summary.sesi_berjalan}</strong></article>
                        <article><span>Pendapatan bulan ini</span><strong>{rupiah(data.summary.pendapatan_bulan_ini)}</strong></article>
                    </section>
                    <div className="ops-overview-columns">
                        <section className="ops-panel">
                            <div className="ops-panel-head"><div><h2>Perlu perhatian</h2><p>{stationsNeedingAttention.length} station perlu ditinjau</p></div><button className="ops-button-secondary" onClick={() => setActiveTab('stations')}>Kelola station</button></div>
                            {stationsNeedingAttention.length ? (
                                <ul className="ops-attention-list">
                                    {stationsNeedingAttention.slice(0, 6).map((station) => {
                                        const assigned = (data.operators ?? []).some((operator) => (operator.id_locations ?? []).map(Number).includes(Number(station.id_location)));
                                        const issues = [station.status !== 'Aktif' ? `Station ${station.status}` : '', !assigned ? 'Belum ada Operator' : '', station.chargers.some((charger) => charger.status !== 'Active') ? 'Ada charger perlu ditinjau' : ''].filter(Boolean);
                                        return <li key={station.id_location}><div><strong>{station.nama_lokasi}</strong><span>{issues.join(' · ')}</span></div><button aria-label={`Buka ${station.nama_lokasi}`} onClick={() => { setSelectedStationId(station.id_location); setActiveTab('stations'); }}>Lihat</button></li>;
                                    })}
                                </ul>
                            ) : <div className="ops-empty-state">Semua station aktif dan memiliki Operator.</div>}
                        </section>
                        <section className="ops-panel ops-overview-shortcuts">
                            <h2>Akses cepat</h2>
                            <button onClick={() => setActiveTab('operators')}><FaUsers aria-hidden="true" /><span><strong>Kelola Operator</strong><small>Akun dan penugasan station</small></span></button>
                            <button onClick={() => { setActiveTab('reports'); fetchReport(); }}><FaChartBar aria-hidden="true" /><span><strong>Lihat laporan</strong><small>Pendapatan dan aktivitas</small></span></button>
                            <button onClick={() => { setActiveTab('audit'); fetchAudit(); }}><FaShieldAlt aria-hidden="true" /><span><strong>Audit operasional</strong><small>Telusuri perubahan sistem</small></span></button>
                        </section>
                    </div>
                </main>
            )}

            {/* TAB 1: STASIUN & UNIT CHARGER (FR14-FR18, FR26) */}
            {activeTab === 'stations' && (
                stationCreationOpen ? (
                    <main className="ops-station-create-page">
                        <section className="ops-panel ops-station-wizard">
                            <div className="ops-page-heading">
                                <div><span className="ops-eyebrow">ADMINISTRASI STATION</span><h2>Tambah Station</h2><p>Lengkapi informasi station, penugasan, dan tarif sebelum menyimpan.</p></div>
                                <button className="ops-button-secondary" type="button" onClick={exitStationCreation}>Kembali ke Station</button>
                            </div>
                            <ol className="ops-station-steps" aria-label="Tahapan penambahan station">
                                {['Informasi', 'Operator', 'Tarif awal', 'Tinjau & simpan'].map((label, index) => <li key={label} className={stationCreationStep === index + 1 ? 'active' : stationCreationStep > index + 1 ? 'complete' : ''}><span>{index + 1}</span>{label}</li>)}
                            </ol>
                            {stationCreationFeedback && <div className="ops-inline-error" role="alert">{stationCreationFeedback}</div>}
                            <form className="ops-station-wizard-form" onSubmit={(event) => { event.preventDefault(); setStationCreationFeedback(''); setStationCreationStep((step) => Math.min(4, step + 1)); }}>
                                {stationCreationStep === 1 && <section className="ops-station-step-content">
                                    <div className="ops-form-title"><strong>Informasi lokasi</strong><span>Station baru akan berstatus Nonaktif sampai Admin siap mengaktifkannya.</span></div>
                                    <div className="ops-edit-grid">
                                        <label>Nama lokasi<input required maxLength="255" placeholder="Contoh: De Britto" value={stationForm.nama_lokasi} onChange={(event) => setStationForm((form) => ({ ...form, nama_lokasi: event.target.value }))} /></label>
                                        <label>Alamat<input required placeholder="Alamat lengkap station" value={stationForm.alamat} onChange={(event) => setStationForm((form) => ({ ...form, alamat: event.target.value }))} /></label>
                                        <label>Buka<input required type="time" value={stationForm.jam_buka} onChange={(event) => setStationForm((form) => ({ ...form, jam_buka: event.target.value }))} /></label>
                                        <label>Tutup<input required type="time" value={stationForm.jam_tutup} onChange={(event) => setStationForm((form) => ({ ...form, jam_tutup: event.target.value }))} /></label>
                                    </div>
                                    <StationMapPicker value={stationForm} onChange={(coords) => setStationForm((form) => ({ ...form, ...coords }))} />
                                </section>}

                                {stationCreationStep === 2 && <section className="ops-station-step-content">
                                    <div className="ops-form-title"><strong>Penugasan Operator</strong><span>Station boleh disimpan sebagai Nonaktif tanpa Operator. Operator wajib dipilih untuk aktivasi.</span></div>
                                    {(data.operators ?? []).filter((operator) => operator.status_akun === 'Aktif').length > 0 && <fieldset className="ops-assignment-field"><legend>Pilih satu atau beberapa Operator aktif</legend><div className="ops-checkbox-grid">
                                        {(data.operators ?? []).filter((operator) => operator.status_akun === 'Aktif').map((operator) => <label key={operator.id_user}><input type="checkbox" checked={stationCreationOperatorIds.includes(String(operator.id_user))} onChange={(event) => setStationCreationOperatorIds((ids) => event.target.checked ? [...ids, String(operator.id_user)] : ids.filter((id) => id !== String(operator.id_user)))} />{operator.nama_lengkap} · {operator.email}</label>)}
                                    </div></fieldset>}
                                    {stationCreationOperatorIds.length === 0 && !stationCreationNewOperatorOpen && <div className="ops-station-warning"><strong>Operator wajib dipilih untuk aktivasi.</strong><span>{(data.operators ?? []).some((operator) => operator.status_akun === 'Aktif') ? 'Pilih satu atau beberapa Operator, atau tambahkan Operator baru. Draft tetap dapat disimpan sebagai Nonaktif tanpa penugasan.' : 'Belum ada Operator aktif untuk dipilih. Tambahkan Operator baru atau simpan draft sebagai Nonaktif.'}</span></div>}
                                    <button className="ops-button-secondary" type="button" onClick={() => { setStationCreationNewOperatorOpen((open) => !open); setStationCreationFeedback(''); }}><FaPlus aria-hidden="true" /> {stationCreationNewOperatorOpen ? 'Tutup form Operator baru' : 'Tambah Operator'}</button>
                                    {stationCreationNewOperatorOpen && <div className="ops-new-operator-card">
                                        <div className="ops-form-title"><strong>Akun Operator baru</strong><span>Akun dan penugasannya akan dibuat bersamaan saat station disimpan.</span></div>
                                        <div className="ops-edit-grid">
                                            <label>Nama lengkap<input required value={stationCreationNewOperator.nama_lengkap} onChange={(event) => setStationCreationNewOperator((form) => ({ ...form, nama_lengkap: event.target.value }))} /></label>
                                            <label>Nama email Operator<div className="ops-email-field"><input required type="text" name="operator-local-part-station" autoComplete="new-password" autoCapitalize="none" spellCheck={false} pattern="[A-Za-z0-9]+([._-][A-Za-z0-9]+)*" title="Gunakan huruf/angka; titik, garis bawah, dan tanda hubung hanya di antara teks." placeholder="nama.operator" value={stationCreationNewOperator.email} onChange={(event) => setStationCreationNewOperator((form) => ({ ...form, email: event.target.value }))} /><span>@ops.ac.id</span></div></label>
                                            <label>Password awal<input required type="password" minLength="6" value={stationCreationNewOperator.password} onChange={(event) => setStationCreationNewOperator((form) => ({ ...form, password: event.target.value }))} /></label>
                                            <label>Nomor telepon (maks. 13 digit)<input required type="tel" inputMode="numeric" pattern="[0-9]{1,13}" maxLength={13} placeholder="08xxxxxxxxxx" value={stationCreationNewOperator.nomor_telepon} onChange={(event) => setStationCreationNewOperator((form) => ({ ...form, nomor_telepon: normalizeOperatorPhone(event.target.value) }))} /></label>
                                        </div>
                                    </div>}
                                </section>}

                                {stationCreationStep === 3 && <section className="ops-station-step-content">
                                    <div className="ops-form-title"><strong>Tarif awal</strong><span>Tarif awal boleh diatur di sini atau ditambahkan setelah station dibuat. Jika mulai mengisi, lengkapi semua nilai.</span></div>
                                    <div className="ops-edit-grid">
                                        <label>Tarif per kWh<input type="number" min="100" step="1" placeholder="Contoh: 2500" value={stationCreationTariff.harga_per_kwh} onChange={(event) => setStationCreationTariff((form) => ({ ...form, harga_per_kwh: event.target.value }))} /></label>
                                        <label>Biaya minimum <span>(opsional, default Rp0)</span><input type="number" min="0" step="1" value={stationCreationTariff.biaya_minimum} onChange={(event) => setStationCreationTariff((form) => ({ ...form, biaya_minimum: event.target.value }))} /></label>
                                        <label>Biaya parkir flat per sesi<input type="number" min="0" step="1" placeholder="Contoh: 2000" value={stationCreationTariff.biaya_parkir_flat} onChange={(event) => setStationCreationTariff((form) => ({ ...form, biaya_parkir_flat: event.target.value }))} /></label>
                                    </div>
                                </section>}

                                {stationCreationStep === 4 && <section className="ops-station-step-content">
                                    <div className="ops-form-title"><strong>Tinjau sebelum disimpan</strong><span>Periksa kembali data station dan pilihan status awal.</span></div>
                                    <dl className="ops-station-review">
                                        <div><dt>Kode station</dt><dd>Dibuat otomatis saat disimpan<small>Kode pencarian terpisah dari ID database.</small></dd></div>
                                        <div><dt>Station</dt><dd>{stationForm.nama_lokasi || '—'}<small>{stationForm.alamat || 'Alamat belum diisi'}</small></dd></div>
                                        <div><dt>Koordinat</dt><dd>{stationForm.latitude}, {stationForm.longitude}</dd></div>
                                        <div><dt>Jam operasional</dt><dd>{stationForm.jam_buka}–{stationForm.jam_tutup}</dd></div>
                                        <div><dt>Operator</dt><dd>{[
                                            ...(data.operators ?? []).filter((operator) => stationCreationOperatorIds.includes(String(operator.id_user))).map((operator) => operator.nama_lengkap),
                                            ...(stationCreationNewOperatorOpen ? [`${stationCreationNewOperator.nama_lengkap || 'Operator baru'} (akun baru)`] : []),
                                        ].join(', ') || 'Belum ditugaskan'}</dd></div>
                                        <div><dt>Tarif awal</dt><dd>{stationCreationTariff.harga_per_kwh ? `${rupiah(stationCreationTariff.harga_per_kwh)}/kWh · minimum ${rupiah(stationCreationTariff.biaya_minimum)} · parkir flat ${rupiah(stationCreationTariff.biaya_parkir_flat)}` : 'Belum diatur; dapat ditambahkan dari tab Tarif setelah station dibuat.'}</dd></div>
                                    </dl>
                                    <label>Alasan aktivasi <span>(wajib jika memilih Simpan & Aktifkan)</span><textarea minLength="5" rows="3" value={stationCreationReason} onChange={(event) => setStationCreationReason(event.target.value)} placeholder="Jelaskan alasan station siap dioperasikan" /></label>
                                </section>}

                                <div className="ops-station-wizard-actions">
                                    <button className="ops-button-secondary" type="button" disabled={stationCreationStep === 1 || stationCreationBusy} onClick={() => { setStationCreationFeedback(''); setStationCreationStep((step) => Math.max(1, step - 1)); }}>Kembali</button>
                                    {stationCreationStep < 4 ? <button className="ops-button-primary" type="submit">Lanjut</button> : <>
                                        <button className="ops-button-secondary" type="button" disabled={stationCreationBusy} onClick={() => submitStation(null, false)}>{stationCreationBusy ? 'Menyimpan…' : 'Simpan sebagai Nonaktif'}</button>
                                        <button className="ops-button-primary" type="button" disabled={stationCreationBusy} onClick={() => submitStation(null, true)}>{stationCreationBusy ? 'Memproses…' : 'Simpan & Aktifkan'}</button>
                                    </>}
                                </div>
                            </form>
                        </section>
                    </main>
                ) : <main className="ops-layout">
                    <section className="ops-panel">
                        <div className="ops-panel-head">
                            <h2>Station SPKLU</h2>
                            <div className="ops-head-actions"><span>{filteredStations.length} dari {data.stations.length} lokasi</span>{isAdmin && <button className="ops-button-primary ops-compact-button" onClick={startStationCreation}><FaPlus aria-hidden="true" /> Tambah</button>}</div>
                        </div>
                        <div className="ops-station-filters">
                            <label className="ops-station-search">Cari station
                                <input type="search" value={stationSearch} onChange={(event) => setStationSearch(event.target.value)} placeholder="Nama atau alamat station" />
                            </label>
                            <label>Status station
                                <select value={stationStatusFilter} onChange={(event) => setStationStatusFilter(event.target.value)}>
                                    <option value="all">Semua status</option>
                                    {STATION_STATUS.map((status) => <option key={status} value={status}>{readableStatus(status)}</option>)}
                                </select>
                            </label>
                        </div>
                        <div className="ops-station-list">
                            {filteredStations.map((station) => (
                                <button
                                    key={station.id_location}
                                    className={`ops-station-item ${selectedStation?.id_location === station.id_location ? 'active' : ''}`}
                                    onClick={() => { setSelectedStationId(station.id_location); setStationDetailTab('overview'); }}
                                >
                                    <small className="ops-station-code">{station.kode_station}</small>
                                    <strong>{station.nama_lokasi}</strong>
                                    <span>{station.charger_tersedia}/{station.charger_total} unit operasional · {getStationPortSummary(station).available}/{getStationPortSummary(station).total} port tersedia</span>
                                    <em className={`ops-status-pill ops-status-${String(station.status).toLowerCase()}`}>{station.status}</em>
                                </button>
                            ))}
                            {filteredStations.length === 0 && <p className="ops-empty-state">Tidak ada station yang cocok dengan pencarian atau filter ini.</p>}
                        </div>
                    </section>

                    <section className="ops-panel ops-detail">
                        {!selectedStation && <p className="ops-empty-state">Tidak ada station yang cocok. Ubah kata pencarian atau filter status untuk melihat detail station.</p>}
                        {selectedStation && (
                            <>
                                <div className="ops-panel-head">
                                    <div>
                                        <span className="ops-station-code">{selectedStation.kode_station}</span>
                                        <h2>{selectedStation.nama_lokasi}</h2>
                                        <p>{selectedStation.alamat}</p>
                                    </div>
                                    <select aria-label="Ubah status station" value={selectedStation.status} onChange={(e) => { setReasonText(''); setReasonAction({ kind: 'station', item: selectedStation, value: e.target.value }); }}>
                                        {STATION_STATUS.map((status) => <option key={status} value={status}>{readableStatus(status)}</option>)}
                                    </select>
                                </div>

                                <div className="ops-station-summary">
                                    <span className={`ops-status-pill ops-status-${String(selectedStation.status).toLowerCase()}`}>{selectedStation.status}</span>
                                    <span>{selectedStation.chargers.length} unit · {getStationPortSummary(selectedStation).available}/{getStationPortSummary(selectedStation).total} port tersedia</span>
                                    {isAdmin && <button className="ops-button-secondary" type="button" onClick={() => editingStation ? setEditingStation(false) : beginEditStation()}><FaEdit aria-hidden="true" /> {editingStation ? 'Tutup edit' : 'Edit informasi'}</button>}
                                </div>

                                <nav className="ops-station-detail-tabs" aria-label="Bagian detail station">
                                    {[['overview', 'Ringkasan'], ...(isAdmin ? [['operators', 'Petugas']] : []), ['chargers', 'Charger & Port'], ['tariffs', 'Tarif']].map(([tab, label]) => (
                                        <button key={tab} type="button" className={stationDetailTab === tab ? 'active' : ''} aria-current={stationDetailTab === tab ? 'page' : undefined} onClick={() => { if (tab === 'operators' && stationDetailTab !== 'operators') { setStationOperatorDraft([...selectedStationOperatorIds]); setStationOperatorSearch(''); } setStationDetailTab(tab); }}>{label}</button>
                                    ))}
                                </nav>

                                {stationDetailTab === 'overview' && (
                                    <section className="ops-station-overview" aria-label="Ringkasan kondisi station">
                                        <div className="ops-station-metrics">
                                            <article><span>Status lokasi</span><strong>{readableStatus(selectedStation.status)}</strong></article>
                                            <article><span>Unit operasional</span><strong>{selectedStation.charger_tersedia}/{selectedStation.charger_total}</strong></article>
                                            <article><span>Port tersedia</span><strong>{getStationPortSummary(selectedStation).available}/{getStationPortSummary(selectedStation).total}</strong></article>
                                            <article><span>Jam operasional</span><strong>{selectedStation.jam_buka}–{selectedStation.jam_tutup}</strong></article>
                                        </div>
                                        {isAdmin && <p className={`ops-assignment-note ${getAssignedOperatorCount(selectedStation.id_location) === 0 ? 'needs-action' : ''}`}>
                                            {getAssignedOperatorCount(selectedStation.id_location) > 0
                                                ? `${getAssignedOperatorCount(selectedStation.id_location)} operator ditugaskan ke station ini.`
                                                : 'Belum ada Operator aktif ditugaskan. Station harus tetap Nonaktif sampai petugas aktif ditetapkan.'}
                                        </p>}
                                        <p className="ops-data-note">Status unit diatur manual. Ketersediaan port dihitung dari port berstatus Available pada unit operasional; port yang sedang mengisi mengikuti sesi aktif.</p>
                                    </section>
                                )}

                                {stationDetailTab === 'overview' && isAdmin && editingStation && editStationForm && (
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
                                        </div>
                                        <label>Alasan perubahan<input required minLength="5" value={editStationForm.alasan} onChange={(e) => setEditStationForm((p) => ({ ...p, alasan: e.target.value }))} placeholder="Jelaskan alasan perubahan data" /></label>
                                        <div className="ops-form-actions"><button type="submit" className="ops-button-primary">Simpan perubahan</button><button type="button" className="ops-button-secondary" onClick={() => setEditingStation(false)}>Batal</button></div>
                                    </form>
                                )}

                                {stationDetailTab === 'operators' && isAdmin && <section className="ops-station-operators" aria-label="Kelola petugas station">
                                    <div className="ops-panel-head"><div><h3>Petugas station ini</h3><p>Pilih Operator aktif yang bertugas di {selectedStation.nama_lokasi}. Penugasan mereka di station lain tetap dipertahankan.</p></div><span>{stationOperatorDraft.length} dipilih</span></div>
                                    <label className="ops-station-search">Cari Operator<input type="search" value={stationOperatorSearch} onChange={(event) => setStationOperatorSearch(event.target.value)} placeholder="Nama, email, atau nomor telepon" /></label>
                                    <div className="ops-checkbox-grid ops-station-operator-list">
                                        {(data.operators ?? []).filter((operator) => operator.status_akun === 'Aktif' || stationOperatorDraft.includes(String(operator.id_user))).filter((operator) => `${operator.nama_lengkap} ${operator.email} ${operator.nomor_telepon ?? ''}`.toLocaleLowerCase('id-ID').includes(stationOperatorSearch.trim().toLocaleLowerCase('id-ID'))).map((operator) => {
                                            const selected = stationOperatorDraft.includes(String(operator.id_user));
                                            const assignedHere = selectedStationOperatorIds.includes(String(operator.id_user));
                                            return <label key={operator.id_user} className="ops-station-operator-option"><input type="checkbox" checked={selected} disabled={!selected && operator.status_akun !== 'Aktif'} onChange={(event) => setStationOperatorDraft((ids) => event.target.checked ? [...ids, String(operator.id_user)] : ids.filter((id) => id !== String(operator.id_user)))} /><span><strong>{operator.nama_lengkap}</strong><small>{operator.email} · {operator.nomor_telepon || 'Nomor telepon belum tersedia'}</small></span><em>{assignedHere ? `Ditugaskan · ${operator.status_akun}` : operator.status_akun}</em></label>;
                                        })}
                                        {(data.operators ?? []).filter((operator) => operator.status_akun === 'Aktif' || stationOperatorDraft.includes(String(operator.id_user))).filter((operator) => `${operator.nama_lengkap} ${operator.email} ${operator.nomor_telepon ?? ''}`.toLocaleLowerCase('id-ID').includes(stationOperatorSearch.trim().toLocaleLowerCase('id-ID'))).length === 0 && <p className="ops-empty-state">Tidak ada Operator yang cocok dengan pencarian.</p>}
                                    </div>
                                    {stationOperatorDraft.some((id) => (data.operators ?? []).some((operator) => String(operator.id_user) === id && operator.status_akun !== 'Aktif')) && <div className="ops-station-warning"><strong>Ada akun Operator nonaktif dalam pilihan.</strong><span>Lepas akun nonaktif dari station sebelum menyimpan. Penugasan lain milik akun tersebut tidak berubah.</span></div>}
                                    {selectedStation.status === 'Aktif' && stationOperatorDraft.filter((id) => (data.operators ?? []).some((operator) => String(operator.id_user) === id && operator.status_akun === 'Aktif')).length === 0 && <div className="ops-station-warning"><strong>Station aktif harus memiliki minimal satu Operator aktif.</strong><span>Tambahkan petugas pengganti atau ubah status station menjadi Nonaktif melalui pilihan status di atas sebelum menyimpan.</span></div>}
                                    <div className="ops-assignment-preview"><strong>Perubahan yang akan disimpan</strong><span>{stationOperatorChanges.added.length} Operator ditambahkan · {stationOperatorChanges.removed.length} Operator dilepas</span>{stationOperatorChanges.added.length > 0 && <small>Ditambahkan: {stationOperatorChanges.addedNames.join(', ')}</small>}{stationOperatorChanges.removed.length > 0 && <small>Dilepas: {stationOperatorChanges.removedNames.join(', ')}</small>}</div>
                                    <div className="ops-form-actions"><button type="button" className="ops-button-primary" disabled={savingStationOperators || stationOperatorDraft.some((id) => (data.operators ?? []).some((operator) => String(operator.id_user) === id && operator.status_akun !== 'Aktif')) || (selectedStation.status === 'Aktif' && stationOperatorDraft.filter((id) => (data.operators ?? []).some((operator) => String(operator.id_user) === id && operator.status_akun === 'Aktif')).length === 0) || (stationOperatorDraft.length === selectedStationOperatorIds.length && stationOperatorDraft.every((id) => selectedStationOperatorIds.includes(id)))} onClick={saveStationOperators}>{savingStationOperators ? 'Menyimpan…' : 'Simpan perubahan petugas'}</button><button type="button" className="ops-button-secondary" disabled={savingStationOperators} onClick={() => setStationOperatorDraft([...selectedStationOperatorIds])}>Batalkan perubahan</button></div>
                                </section>}

                                {stationDetailTab === 'tariffs' && <>
                                <div className="ops-tarif-row">
                                    <div><span>Tarif/kWh saat ini</span><strong>{selectedStation.tarif ? rupiah(selectedStation.tarif.harga_per_kwh) : 'Belum diatur'}</strong></div>
                                    <div><span>Biaya minimum (opsional)</span><strong>{selectedStation.tarif ? rupiah(selectedStation.tarif.biaya_minimum) : 'Belum diatur'}</strong></div>
                                    <div><span>Parkir flat per sesi</span><strong>{selectedStation.tarif ? rupiah(selectedStation.tarif.biaya_parkir_flat) : 'Belum diatur'}</strong></div>
                                </div>

                                <form className="ops-form ops-tarif-form" onSubmit={submitTarif}>
                                    <label>Tarif/kWh<input min="100" required placeholder="Tarif/kWh" type="number" value={tarifForm.harga_per_kwh} onChange={(e) => setTarifForm((p) => ({ ...p, harga_per_kwh: e.target.value }))} /></label>
                                    <label>Biaya minimum <span>(opsional, default Rp0)</span><input min="0" type="number" value={tarifForm.biaya_minimum} onChange={(e) => setTarifForm((p) => ({ ...p, biaya_minimum: e.target.value }))} /></label>
                                    <label>Parkir flat per sesi<input min="0" required placeholder="Parkir" type="number" value={tarifForm.biaya_parkir_flat} onChange={(e) => setTarifForm((p) => ({ ...p, biaya_parkir_flat: e.target.value }))} /></label>
                                    <label>Waktu berlaku<select value={tarifForm.mode} onChange={(e) => setTarifForm((p) => ({ ...p, mode: e.target.value }))}><option value="immediate">Langsung</option><option value="scheduled">Terjadwal</option></select></label>
                                    {tarifForm.mode === 'scheduled' && <label>Mulai berlaku<input type="datetime-local" required value={tarifForm.effective_at} onChange={(e) => setTarifForm((p) => ({ ...p, effective_at: e.target.value }))} /></label>}
                                    <button type="submit" className="ops-button-primary">{editingScheduledTarifId ? 'Simpan Jadwal' : tarifForm.mode === 'scheduled' ? 'Jadwalkan Tarif' : 'Terapkan Tarif'}</button>
                                    {editingScheduledTarifId && <button type="button" className="ops-button-secondary" onClick={() => { setEditingScheduledTarifId(null); setTarifForm({ harga_per_kwh: '', biaya_minimum: '', biaya_parkir_flat: '', mode: 'immediate', effective_at: '' }); }}>Batal edit</button>}
                                </form>
                                <div className="ops-tariff-preview" aria-live="polite">
                                    <strong>Ringkasan perubahan tarif</strong>
                                    <span>Tarif sekarang: {selectedStation.tarif ? `${rupiah(selectedStation.tarif.harga_per_kwh)}/kWh · minimum ${rupiah(selectedStation.tarif.biaya_minimum)} · parkir flat ${rupiah(selectedStation.tarif.biaya_parkir_flat)}` : 'Belum ada tarif berjalan.'}</span>
                                    <span>Tarif baru: {tarifForm.harga_per_kwh ? rupiah(tarifForm.harga_per_kwh) : '—'}/kWh · minimum {tarifForm.biaya_minimum ? rupiah(tarifForm.biaya_minimum) : '—'} · parkir flat {tarifForm.biaya_parkir_flat ? rupiah(tarifForm.biaya_parkir_flat) : '—'}</span>
                                    <span>Mulai berlaku: {tarifForm.mode === 'scheduled' ? formatTariffDate(tarifForm.effective_at) : 'Setelah perubahan disimpan'}. Sesi yang sudah berjalan tetap memakai tarif saat sesi dimulai.</span>
                                </div>
                                {selectedStation.tarif_terjadwal?.length > 0 && <section className="ops-scheduled-tariffs"><h3>Jadwal tarif</h3>{selectedStation.tarif_terjadwal.map((tarif) => <article key={tarif.id_tarif}><div><strong>{new Date(tarif.periode_mulai).toLocaleString('id-ID')}</strong><span>{rupiah(tarif.harga_per_kwh)}/kWh · minimum {rupiah(tarif.biaya_minimum)} · parkir flat {rupiah(tarif.biaya_parkir_flat)}</span></div><div><button type="button" onClick={() => { const date = new Date(tarif.periode_mulai); date.setMinutes(date.getMinutes() - date.getTimezoneOffset()); setEditingScheduledTarifId(tarif.id_tarif); setTarifForm({ harga_per_kwh: String(tarif.harga_per_kwh), biaya_minimum: String(tarif.biaya_minimum), biaya_parkir_flat: String(tarif.biaya_parkir_flat), mode: 'scheduled', effective_at: date.toISOString().slice(0, 16) }); }}>Ubah</button><button type="button" onClick={async () => { try { await cancelScheduledTarif(tarif.id_tarif); await fetchDashboard(); setFeedback('Jadwal tarif dibatalkan.'); } catch (err) { setFeedback(errorMessage(err, 'Jadwal tarif tidak dapat dibatalkan.')); } }}>Batalkan</button></div></article>)}</section>}
                                </>}

                                {stationDetailTab === 'chargers' && <>
                                    <div className="ops-form-actions"><button className="ops-button-primary" type="button" onClick={() => setAddingCharger((open) => !open)}><FaPlus aria-hidden="true" /> Tambah Charger</button></div>
                                    {addingCharger && <form className="ops-technical-form" onSubmit={submitNewCharger}><strong>Charger baru · {selectedStation.nama_lokasi}</strong><label>Kode unit<input name="kode_perangkat" required maxLength={12} /></label><label>Merek / model<input name="merek_model" required /></label><label>Daya total (kW)<input name="kap_tot_kw" type="number" min="1" required /></label><label>Alasan penambahan<input name="alasan" minLength={5} maxLength={500} required placeholder="Alasan pencatatan unit baru" /></label><div className="ops-form-actions"><button className="ops-button-primary" type="submit">Simpan Charger</button><button className="ops-button-secondary" type="button" onClick={() => setAddingCharger(false)}>Batal</button></div></form>}
                                    <div className="ops-charger-grid">
                                    {selectedStation.chargers.map((charger) => (
                                        <div className="ops-charger-card" key={charger.id_charger}>
                                            <div className="ops-charger-heading">
                                                <div><strong>{charger.kode_perangkat}</strong><span>{charger.merek_model} · {charger.kap_tot_kw} kW total</span></div>
                                                <div className="ops-charger-actions">
                                                    <select aria-label={`Status ${charger.kode_perangkat}`} value={charger.status} onChange={(e) => { setReasonText(''); setReasonAction({ kind: 'charger', item: charger, value: e.target.value }); }}>
                                                        {CHARGER_STATUS.map((status) => <option key={status} value={status}>{readableStatus(status)}</option>)}
                                                    </select>
                                                    <button className="ops-button-secondary" type="button" onClick={() => setEditingChargerId(editingChargerId === charger.id_charger ? null : charger.id_charger)}><FaEdit aria-hidden="true" /> Data unit</button>
                                                </div>
                                            </div>
                                            {editingChargerId === charger.id_charger && (
                                                <form className="ops-technical-form" onSubmit={(e) => submitChargerDetails(e, charger)}>
                                                    <label>Kode unit<input name="kode_perangkat" required defaultValue={charger.kode_perangkat} /></label>
                                                    <label>Merek / model<input name="merek_model" required defaultValue={charger.merek_model} /></label>
                                                    <label>Daya total (kW)<input name="kap_tot_kw" type="number" min="1" required defaultValue={charger.kap_tot_kw} /></label>
                                                    <label>Alasan perubahan<input name="alasan" minLength="5" required placeholder="Jelaskan alasan perubahan data" /></label>
                                                    <div className="ops-form-actions"><button className="ops-button-primary" type="submit">Simpan data unit</button><button className="ops-button-secondary" type="button" onClick={() => setEditingChargerId(null)}>Batal</button></div>
                                                </form>
                                            )}
                                            <div className="ops-port-list">
                                                <div className="ops-port-list-title"><strong>Port dan konektor</strong><span>{charger.ports?.length ?? 0} port</span><button className="ops-button-secondary" type="button" onClick={() => setAddingPortFor(addingPortFor === charger.id_charger ? null : charger.id_charger)}><FaPlus aria-hidden="true" /> Tambah Port</button></div>
                                                {addingPortFor === charger.id_charger && <form className="ops-technical-form" onSubmit={(e) => submitNewPort(e, charger)}><label>Nomor port<input name="nomor_port" required /></label><label>Tipe konektor<select name="tipe_konektor"><option value="ccs2">CCS2</option><option value="type_2">Type 2</option><option value="chademo">CHAdeMO</option><option value="gbt">GB/T</option></select></label><label>Mode<select name="tipe_charging"><option value="DC">DC</option><option value="AC">AC</option></select></label><label>Daya maksimum (kW)<input name="daya_maks_kw" type="number" min="1" step="0.1" required /></label><label>Alasan penambahan<input name="alasan" minLength={5} maxLength={500} required placeholder="Alasan pencatatan port baru" /></label><div className="ops-form-actions"><button className="ops-button-primary" type="submit">Simpan Port</button><button className="ops-button-secondary" type="button" onClick={() => setAddingPortFor(null)}>Batal</button></div></form>}
                                                {(charger.ports ?? []).map((port) => (
                                                    <article className="ops-port-row" key={port.id_port}>
                                                        <div><strong>{port.nomor_port} · {readableStatus(port.status_port)}</strong><span>{port.tipe_konektor} · {port.tipe_charging} · {port.daya_maks_kw} kW</span></div>
                                                        {['Charging', 'Reserved'].includes(port.status_port) ? <span className="ops-status-pill">{readableStatus(port.status_port)} · dikelola sistem</span> : <select aria-label={`Status port ${port.nomor_port}`} value={port.status_port} onChange={(e) => { setReasonText(''); setReasonAction({ kind: 'port', item: port, value: e.target.value }); }}><option value="Available">Tersedia</option><option value="Out of Order">Gangguan</option><option value="Maintenance">Perawatan</option></select>}
                                                        <button className="ops-button-secondary" type="button" onClick={() => setEditingPortId(editingPortId === port.id_port ? null : port.id_port)}>Edit</button>
                                                        {editingPortId === port.id_port && (
                                                            <form className="ops-technical-form ops-port-edit-form" onSubmit={(e) => submitPortDetails(e, port)}>
                                                                <label>Nomor port<input name="nomor_port" required defaultValue={port.nomor_port} /></label>
                                                                <label>Tipe konektor<select name="tipe_konektor" defaultValue={port.tipe_konektor}><option value="ccs2">CCS2</option><option value="type_2">Type 2</option><option value="chademo">CHAdeMO</option><option value="gbt">GB/T</option></select></label>
                                                                <label>Mode<select name="tipe_charging" defaultValue={port.tipe_charging}><option value="AC">AC</option><option value="DC">DC</option></select></label>
                                                                <label>Daya port (kW)<input name="daya_maks_kw" type="number" step="0.1" min="1" required defaultValue={port.daya_maks_kw} /></label>
                                                                <label>Alasan perubahan<input name="alasan" minLength="5" required placeholder="Jelaskan alasan perubahan data" /></label>
                                                                <div className="ops-form-actions"><button className="ops-button-primary" type="submit">Simpan data port</button><button className="ops-button-secondary" type="button" onClick={() => setEditingPortId(null)}>Batal</button></div>
                                                            </form>
                                                        )}
                                                    </article>
                                                ))}
                                            </div>
                                        </div>
                                    ))}
                                    </div>
                                </>}
                            </>
                        )}
                    </section>
                </main>
            )}

            {/* TAB 2: LAPORAN & UTILISASI (FR39, FR40, FR41) */}
            {activeTab === 'reports' && (
                <section className="ops-panel">
                    <div className="ops-page-heading"><div><span className="ops-eyebrow">ANALISIS OPERASIONAL</span><h2>Laporan</h2><p>Bandingkan pendapatan, sesi, dan energi berdasarkan station dan periode.</p></div></div>
                    <form className="ops-report-filters" onSubmit={(e) => { e.preventDefault(); fetchReport(); }}>
                        <label>Dari tanggal<input type="date" value={reportFilters.from} max={reportFilters.to} onChange={(e) => setReportFilters((filters) => ({ ...filters, from: e.target.value }))} /></label>
                        <label>Sampai tanggal<input type="date" value={reportFilters.to} min={reportFilters.from} onChange={(e) => setReportFilters((filters) => ({ ...filters, to: e.target.value }))} /></label>
                        <label>Station<select value={reportFilters.id_location} onChange={(e) => setReportFilters((filters) => ({ ...filters, id_location: e.target.value, id_charger: '' }))}><option value="">Semua station</option>{data.stations.map((station) => <option key={station.id_location} value={station.id_location}>{station.nama_lokasi}</option>)}</select></label>
                        <label>Charger<select value={reportFilters.id_charger} onChange={(e) => setReportFilters((filters) => ({ ...filters, id_charger: e.target.value }))}><option value="">Semua charger</option>{data.stations.filter((station) => !reportFilters.id_location || String(station.id_location) === reportFilters.id_location).flatMap((station) => station.chargers.map((charger) => <option key={charger.id_charger} value={charger.id_charger}>{station.nama_lokasi} · {charger.kode_perangkat}</option>))}</select></label>
                        <button className="ops-button-primary" type="submit">Perbarui laporan</button>
                    </form>
                    {reportError && <div className="ops-inline-error" role="alert">{reportError}</div>}
                    {reportLoading ? <div className="ops-empty-state">Memuat laporan…</div> : reportData && <>
                        <div className="ops-report-grid">
                            <article><span>Pendapatan charging</span><strong>{rupiah(reportData.summary.pendapatan)}</strong></article>
                            <article><span>Sesi selesai</span><strong>{reportData.summary.sesi_selesai}</strong></article>
                            <article><span>Sesi terhenti</span><strong>{reportData.summary.sesi_terhenti}</strong></article>
                            <article><span>Energi terjual</span><strong>{reportData.summary.energi_kwh} kWh</strong></article>
                        </div>
                        <div className="ops-report-table-section"><div className="ops-panel-head"><div><h3>Ringkasan per station</h3><p>Volume sesi dan energi pada periode terpilih</p></div></div>
                            <div className="ops-table-wrap"><table className="ops-table"><thead><tr><th>Station</th><th>Status</th><th>Unit</th><th>Port tersedia</th><th>Sesi selesai</th><th>Energi</th><th>Pendapatan</th></tr></thead><tbody>
                                {reportData.stations.length ? reportData.stations.map((station) => <tr key={station.id_location}><td><strong>{station.nama_lokasi}</strong></td><td><span className={`ops-status-pill ops-status-${String(station.status).toLowerCase()}`}>{station.status}</span></td><td>{station.jumlah_charger}</td><td>{station.port_tersedia}</td><td>{station.sesi_selesai}</td><td>{station.energi_kwh} kWh</td><td>{rupiah(station.pendapatan)}</td></tr>) : <tr><td colSpan="7" className="ops-table-empty">Tidak ada data pada filter ini.</td></tr>}
                            </tbody></table></div>
                        </div>
                    </>}
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
                        <div className="ops-form-title"><strong>Buat akun Operator</strong><span>Setelah akun dibuat, tetapkan petugas dari Detail Station → Petugas.</span></div>
                        {operatorNotice && <div className={`ops-operator-notice is-${operatorNotice.type}`} role={operatorNotice.type === 'error' ? 'alert' : 'status'}>{operatorNotice.message}</div>}
                        <div className="ops-operator-fields">
                            <label>Nama lengkap<input placeholder="Nama Operator" value={operatorForm.nama_lengkap} onChange={(e) => setOperatorForm((p) => ({ ...p, nama_lengkap: e.target.value }))} required /></label>
                            <label>Nama email Operator<div className="ops-email-field"><input required type="text" name="operator-local-part-admin" autoComplete="new-password" autoCapitalize="none" spellCheck={false} pattern="[A-Za-z0-9]+([._-][A-Za-z0-9]+)*" title="Gunakan huruf/angka; titik, garis bawah, dan tanda hubung hanya di antara teks." placeholder="nama.operator" value={operatorForm.email} onChange={(e) => setOperatorForm((p) => ({ ...p, email: e.target.value }))} /><span>@ops.ac.id</span></div></label>
                            <label>Password awal<input placeholder="Minimal 6 karakter" type="password" value={operatorForm.password} onChange={(e) => setOperatorForm((p) => ({ ...p, password: e.target.value }))} required /></label>
                            <label>Nomor telepon (maks. 13 digit)<input type="tel" inputMode="numeric" pattern="[0-9]{1,13}" maxLength={13} placeholder="08xxxxxxxxxx" value={operatorForm.nomor_telepon} onChange={(e) => setOperatorForm((p) => ({ ...p, nomor_telepon: normalizeOperatorPhone(e.target.value) }))} required /></label>
                        </div>
                        <button type="submit" className="ops-button-primary" disabled={operatorSubmitting}>{operatorSubmitting ? 'Membuat akun...' : 'Buat akun Operator'}</button>
                    </form>

                    <section className="ops-operator-directory"><div className="ops-panel-head"><div><h3>Operator terdaftar</h3><p>Cari akun berdasarkan nama, kontak, status, atau station tugas.</p></div><span>{filteredOperators.length} dari {data.operators.length} Operator</span></div>
                        <div className="ops-operator-directory-tools">
                            <label className="ops-operator-search"><span>Cari Operator</span><div><FaSearch aria-hidden="true" /><input type="search" value={operatorSearch} onChange={(event) => setOperatorSearch(event.target.value)} placeholder="Nama, email, atau nomor telepon" aria-label="Cari Operator" /></div></label>
                            <label>Status akun<select value={operatorStatusFilter} onChange={(event) => setOperatorStatusFilter(event.target.value)}><option value="all">Semua status</option><option value="Aktif">Aktif</option><option value="Nonaktif">Nonaktif</option><option value="Suspend">Suspend</option><option value="Banned">Banned</option></select></label>
                            <label>Station tugas<select value={operatorStationFilter} onChange={(event) => setOperatorStationFilter(event.target.value)}><option value="all">Semua station</option><option value="unassigned">Belum ditugaskan</option>{data.stations.map((station) => <option key={station.id_location} value={String(station.id_location)}>{station.kode_station} · {station.nama_lokasi}</option>)}</select></label>
                        </div>
                        <div className="ops-operator-list">
                            {filteredOperators.map((operator) => {
                                return <article key={operator.id_user} className="ops-operator-row">
                                    <div className="ops-operator-identity"><strong>{operator.nama_lengkap}</strong><span>{operator.email} · {operator.nomor_telepon || 'Nomor belum tersedia'}</span><p>{operator.nama_lokasi?.join(', ') || 'Belum ditugaskan'}</p></div>
                                    <span className={`ops-status-pill ops-status-${String(operator.status_akun).toLowerCase()}`}>{operator.status_akun}</span>
                                    <div className="ops-operator-actions"><button type="button" className="ops-button-secondary" disabled={!data.stations.length} onClick={() => openStationPetugas(operator.id_locations?.[0] ?? data.stations[0]?.id_location)}>Kelola lewat Station</button><button type="button" className="ops-button-secondary" onClick={() => toggleOperatorStatus(operator)}>{operator.status_akun === 'Aktif' ? 'Nonaktifkan' : 'Aktifkan'}</button></div>
                                </article>;
                            })}
                            {filteredOperators.length === 0 && <div className="ops-empty-state"><FaUsers aria-hidden="true" /><strong>Operator tidak ditemukan</strong><p>Ubah kata pencarian atau filter untuk melihat akun Operator lain.</p></div>}
                        </div>
                    </section>
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
                                <h3 className="ops-config-group-title">Pengaturan operasional</h3>
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

                                <h3 className="ops-config-group-title">Parameter simulasi</h3>
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
                                <button type="submit" className="ops-button-primary">
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

                    <div className="ops-audit-categories">
                        <button 
                            type="button"
                            className={`ops-primary ${auditSubCategory === 'transaksi' ? 'active' : ''}`}
                            onClick={() => setAuditSubCategory('transaksi')}
                        >
                            <FaBolt aria-hidden="true" /> Log Transaksi Pengisian ({auditLogs.transaksi?.length || 0})
                        </button>
                        <button 
                            type="button"
                            className={`ops-primary ${auditSubCategory === 'tarif' ? 'active' : ''}`}
                            onClick={() => setAuditSubCategory('tarif')}
                        >
                            <FaTags aria-hidden="true" /> Log Perubahan Tarif ({auditLogs.tarif?.length || 0})
                        </button>
                        <button 
                            type="button"
                            className={`ops-primary ${auditSubCategory === 'gangguan' ? 'active' : ''}`}
                            onClick={() => setAuditSubCategory('gangguan')}
                        >
                            <FaExclamationTriangle aria-hidden="true" /> Log Gangguan Perangkat ({auditLogs.gangguan?.length || 0})
                        </button>
                        <button
                            type="button"
                            className={`ops-primary ${auditSubCategory === 'perubahan' ? 'active' : ''}`}
                            onClick={() => setAuditSubCategory('perubahan')}
                        >
                            <FaShieldAlt aria-hidden="true" /> Perubahan oleh staf ({auditLogs.perubahan?.length || 0})
                        </button>
                    </div>

                    <label className="ops-audit-search">Cari aktivitas<input type="search" value={auditSearch} onChange={(e) => setAuditSearch(e.target.value)} placeholder="Aktor, station, kategori, atau detail" /></label>
                    <p className="ops-data-note">Pencarian mencakup catatan terbaru yang dimuat pada kategori terpilih.</p>

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
                                    {filteredAuditEntries.length > 0 ? (
                                        filteredAuditEntries.map((item) => (
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
                                                {auditSearch ? 'Tidak ada catatan yang cocok dengan pencarian.' : 'Belum ada catatan aktivitas pada kategori ini.'}
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
            </div>
            {reasonAction && (
                <div className="ops-modal-backdrop" role="presentation" onMouseDown={(e) => { if (e.target === e.currentTarget) setReasonAction(null); }}>
                    <form className="ops-reason-modal" role="dialog" aria-modal="true" aria-labelledby="ops-reason-title" onSubmit={submitReasonAction}>
                        <button type="button" className="ops-modal-close" aria-label="Tutup" onClick={() => setReasonAction(null)}><FaTimes aria-hidden="true" /></button>
                        <span className="ops-eyebrow">KONFIRMASI PERUBAHAN</span>
                        <h2 id="ops-reason-title">Ubah status {reasonAction.kind === 'station' ? 'station' : reasonAction.kind}?</h2>
                        <p>Status akan diubah menjadi <strong>{readableStatus(reasonAction.value)}</strong>. Perubahan ini dicatat dalam audit. Perangkat yang sedang dipakai tidak dapat diubah sebelum sesi selesai.</p>
                        <label>Alasan perubahan<textarea minLength="5" required value={reasonText} onChange={(e) => setReasonText(e.target.value)} placeholder="Jelaskan alasan perubahan status" rows="3" /></label>
                        <div className="ops-form-actions"><button type="button" className="ops-button-secondary" onClick={() => setReasonAction(null)}>Batal</button><button type="submit" className="ops-button-primary">Simpan status</button></div>
                    </form>
                </div>
            )}
        </div>
    );
}
