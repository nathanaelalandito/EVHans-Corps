import React, { useState, useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import './driverDashboard.css';
import { getWallet, createPin, changePin as changePinApi, disablePin as disablePinApi, topUpWallet } from './api/wallet';
import { getProfile, updateProfile } from './api/profile';
import { getVehicles } from './api/vehicle';
import { getStations } from './api/stations';
import { finishChargingSession, getActiveChargingSession, interruptChargingSession, startChargingSession, validateCharger } from './api/chargingSessions';
import { getPaymentDetail, getPaymentHistory } from './api/payments';
import { getDrivingRoute, googleMapsDirectionsUrl, formatJarak, formatDurasi } from './api/routing';

// Ambil pesan error yang enak dibaca dari response axios (baik yang
// bentuknya {message} maupun {errors: {field: [..]}} ala Laravel).
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

// ------------------------------------------------------------------
// DUMMY DATA — ganti dengan hasil fetch API (axios) ke backend nanti.
// Struktur field mengikuti entitas pada dokumen studi kasus:
// User, Vehicle, Location, Charger, Charging Session, Tarif, Payment
// ------------------------------------------------------------------
const DUMMY_USER = {
    nama: 'Stefanus Adrian',
    saldo_dompet: 185000,
};

// Label tampilan tipe konektor dari backend (enum) — sama dengan KelolaKendaraan.
const KONEKTOR_LABEL = { type_2: 'Type 2', ccs2: 'CCS2', chademo: 'CHAdeMO', gbt: 'GB/T' };
const konektorLabel = (v) => KONEKTOR_LABEL[v] ?? v;
const ACTIVE_VEHICLE_KEY = 'ev_active_vehicle';

// Ringkasan aktivitas bulan berjalan — di production diambil dari
// agregat tabel Charging Session & Payment milik user yang login.
const DUMMY_STATS = {
    sesi_bulan_ini: 8,
    energi_kwh_bulan_ini: 142.5,
    pengeluaran_bulan_ini: 356000,
};

// Posisi jatuh (fallback) dipakai HANYA jika browser menolak/tidak
// mendukung akses lokasi. Posisi asli diambil live lewat
// navigator.geolocation di bawah.
const FALLBACK_DRIVER_POSITION = { lat: -7.8014, lng: 110.3644 };

// sesi charging aktif — set ke objek (lihat bentuk di bawah) untuk
// melihat tampilan sesi berjalan, atau null untuk tampilan kosong.
const DUMMY_ACTIVE_SESSION = null;
// Contoh bentuk objek sesi aktif (untuk referensi backend):
// {
//   id_location: 1, nama_lokasi: 'EVCharge Hub - Malioboro Mall',
//   kode_charger: 'CHG-03', status: 'Charging', energi_kwh: 18.4,
//   target_kwh: 40, tarif_per_kwh: 2500, biaya_parkir: 5000,
//   waktu_mulai: Date.now() - 1000 * 60 * 22,
// }

const DUMMY_STATIONS = [
    {
        id_location: 1,
        nama_lokasi: 'EVCharge Hub - Malioboro Mall',
        alamat: 'Jl. Malioboro No. 52, Yogyakarta',
        lat: -7.7930,
        lng: 110.3655,
        jarak_km: 1.2,
        rating: 4.8,
        status: 'Aktif',
        charger_tersedia: 3,
        charger_total: 6,
        tipe_konektor: ['CCS2', 'Type 2'],
        daya_kw_max: 50,
        tarif_per_kwh: 2500,
        biaya_parkir: 5000,
        chargers: [
            { id_charger: 101, kode_perangkat: 'CHG-01', tipe_konektor: 'CCS2', daya_kw: 50, status: 'tersedia' },
            { id_charger: 102, kode_perangkat: 'CHG-02', tipe_konektor: 'Type 2', daya_kw: 22, status: 'sedang digunakan' },
            { id_charger: 103, kode_perangkat: 'CHG-03', tipe_konektor: 'CCS2', daya_kw: 50, status: 'tersedia' },
            { id_charger: 104, kode_perangkat: 'CHG-04', tipe_konektor: 'Type 2', daya_kw: 22, status: 'maintenance' },
        ],
    },
    {
        id_location: 2,
        nama_lokasi: 'EVCharge Hub - Ambarrukmo Plaza',
        alamat: 'Jl. Laksda Adisucipto, Yogyakarta',
        lat: -7.7825,
        lng: 110.3945,
        jarak_km: 3.5,
        rating: 4.6,
        status: 'Aktif',
        charger_tersedia: 0,
        charger_total: 4,
        tipe_konektor: ['CCS2'],
        daya_kw_max: 22,
        tarif_per_kwh: 2200,
        biaya_parkir: 4000,
        chargers: [
            { id_charger: 201, kode_perangkat: 'CHG-01', tipe_konektor: 'CCS2', daya_kw: 22, status: 'sedang digunakan' },
            { id_charger: 202, kode_perangkat: 'CHG-02', tipe_konektor: 'CCS2', daya_kw: 22, status: 'sedang digunakan' },
        ],
    },
    {
        id_location: 3,
        nama_lokasi: 'EVCharge Hub - UGM Boulevard',
        alamat: 'Jl. Boulevard UGM, Yogyakarta',
        lat: -7.7686,
        lng: 110.3746,
        jarak_km: 5.8,
        rating: 4.9,
        status: 'Dalam Perawatan',
        charger_tersedia: 2,
        charger_total: 5,
        tipe_konektor: ['Type 2', 'CHAdeMO'],
        daya_kw_max: 60,
        tarif_per_kwh: 2700,
        biaya_parkir: 6000,
        chargers: [
            { id_charger: 301, kode_perangkat: 'CHG-01', tipe_konektor: 'Type 2', daya_kw: 22, status: 'maintenance' },
            { id_charger: 302, kode_perangkat: 'CHG-02', tipe_konektor: 'CHAdeMO', daya_kw: 60, status: 'rusak' },
        ],
    },
];

const CONNECTOR_FILTERS = ['Semua', 'CCS2', 'Type 2', 'CHAdeMO'];
const TOP_UP_METHODS = ['Mandiri', 'OVO', 'BCA', 'BRI', 'BNI'];

function formatRupiah(value) {
    return 'Rp' + value.toLocaleString('id-ID');
}

function formatDuration(ms) {
    const totalMinutes = Math.floor(ms / 60000);
    const h = Math.floor(totalMinutes / 60);
    const m = totalMinutes % 60;
    return h > 0 ? `${h} jam ${m} menit` : `${m} menit`;
}

function getGreeting() {
    const h = new Date().getHours();
    if (h >= 4 && h < 10) return 'Selamat pagi';
    if (h >= 10 && h < 15) return 'Selamat siang';
    if (h >= 15 && h < 18) return 'Selamat sore';
    return 'Selamat malam';
}

function stationStatusLabel(status, tersedia) {
    if (status === 'Dalam Perawatan') return { text: 'Perawatan', tone: 'warn' };
    if (tersedia === 0) return { text: 'Penuh', tone: 'danger' };
    return { text: 'Tersedia', tone: 'ok' };
}

function chargerStatusLabel(status) {
    if (status === 'tersedia') return { text: 'Tersedia', tone: 'ok' };
    if (status === 'sedang digunakan') return { text: 'Charging', tone: 'warn' };
    if (status === 'maintenance') return { text: 'Maintenance', tone: 'warn' };
    return { text: capitalize(status), tone: 'danger' };
}

function estimateChargingCost(kwh, station) {
    const energiKwh = Number(kwh) || 0;
    return Math.round(energiKwh * station.tarif_per_kwh + station.biaya_parkir);
}

// Marker custom (divIcon) — menghindari masalah klasik path ikon default
// Leaflet yang patah saat dibundel Vite/Webpack.
function buildStationIcon(tone) {
    const color = tone === 'ok' ? '#2e7d32' : tone === 'warn' ? '#a5730c' : '#c23a3a';
    return L.divIcon({
        className: 'map-marker-wrapper',
        html: `<div class="map-marker" style="background:${color}">⚡</div><div class="map-marker-arrow" style="border-top-color:${color}"></div>`,
        iconSize: [34, 42],
        iconAnchor: [17, 42],
        popupAnchor: [0, -40],
    });
}

const DRIVER_ICON = L.divIcon({
    className: 'map-marker-wrapper',
    html: `<div class="map-marker-driver"></div><div class="map-marker-driver-pulse"></div>`,
    iconSize: [22, 22],
    iconAnchor: [11, 11],
});

const BULAN_ID = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];

// "2000-05-12" -> "12 Mei 2000" (di-parse manual supaya tidak geser hari karena timezone).
function formatTanggalLahir(value) {
    if (!value) return '-';
    const [y, m, d] = String(value).slice(0, 10).split('-').map(Number);
    if (!y || !m || !d) return String(value);
    return `${d} ${BULAN_ID[m - 1]} ${y}`;
}

function getInitial(name) {
    return (name || '?').trim().charAt(0).toUpperCase() || '?';
}

function capitalize(str) {
    const s = String(str ?? '');
    return s.charAt(0).toUpperCase() + s.slice(1);
}

export default function DriverDashboard({ user: authUser, onLogout, onNavigateToVehicles, onNavigateToHelp }) {
    // Data profil dari login (nama dsb). Saldo TIDAK diambil dari sini —
    // saldo selalu ditarik live dari GET /api/wallet (lihat effect di bawah)
    // supaya selalu sinkron dengan database.
    const user = {
        nama: authUser?.profile?.nama_lengkap || authUser?.email || DUMMY_USER.nama,
    };
    // --- Kendaraan (data asli dari backend, GET /api/vehicles) ---------
    const [vehicles, setVehicles] = useState([]);
    const [vehiclesLoading, setVehiclesLoading] = useState(true);
    const [vehiclesError, setVehiclesError] = useState('');
    const [activeVehicleId, setActiveVehicleId] = useState(() => {
        const saved = Number(localStorage.getItem(ACTIVE_VEHICLE_KEY));
        return saved || null;
    });
    const [stations, setStations] = useState(DUMMY_STATIONS);
    const [stationsLoading, setStationsLoading] = useState(false);
    const [stationsError, setStationsError] = useState('');
    const [connectorFilter, setConnectorFilter] = useState('Semua');
    const [activeSession, setActiveSession] = useState(DUMMY_ACTIVE_SESSION);
    const [activeSessionLoading, setActiveSessionLoading] = useState(false);
    const [elapsed, setElapsed] = useState(0);
    const [sheetExpanded, setSheetExpanded] = useState(false);
    const [selectedStationId, setSelectedStationId] = useState(null);
    const [showNotif, setShowNotif] = useState(!!DUMMY_ACTIVE_SESSION);
    const [showSettings, setShowSettings] = useState(false);

    // --- Dompet & PIN Dompet (data asli dari backend) -----------------
    // wallet = { saldo, status_dompet, pin_sudah_diset, terkunci, terkunci_sampai }
    const [wallet, setWallet] = useState(null);
    const [walletLoading, setWalletLoading] = useState(true);

    const fetchWallet = async () => {
        try {
            const data = await getWallet();
            setWallet(data);
        } catch (err) {
            console.error('Gagal memuat data dompet:', err);
        } finally {
            setWalletLoading(false);
        }
    };

    // Tarik data dompet sekali saat dashboard dibuka.
    useEffect(() => {
        fetchWallet();
    }, []);

    const fetchActiveSession = async () => {
        setActiveSessionLoading(true);
        try {
            const session = await getActiveChargingSession();
            setActiveSession(session);
            setShowNotif(!!session);
        } catch (err) {
            console.error('Gagal memuat sesi charging aktif:', err);
        } finally {
            setActiveSessionLoading(false);
        }
    };

    useEffect(() => {
        fetchActiveSession();
    }, []);

      // --- Profil Driver (data asli dari backend, mengikuti ProfileDriverResource) ---
    const [profile, setProfile] = useState(null);
    const [profileLoading, setProfileLoading] = useState(true);
    const [profileError, setProfileError] = useState('');

    const fetchProfile = async () => {
        setProfileLoading(true);
        setProfileError('');
        try {
            const data = await getProfile();
            setProfile(data);
        } catch (err) {
            console.error('Gagal memuat profil:', err);
            setProfileError(extractErrorMessage(err, 'Gagal memuat profil.'));
        } finally {
            setProfileLoading(false);
        }
    };

    useEffect(() => {
        fetchProfile();
    }, []);
        // --- Edit Profil ---
    const [isEditingProfile, setIsEditingProfile] = useState(false);
    const [editForm, setEditForm] = useState({ nama_lengkap: '', nomor_telepon: '', tanggal_lahir: '', alamat: '', email: '' });
    const [editError, setEditError] = useState('');
    const [editSubmitting, setEditSubmitting] = useState(false);

    const startEditProfile = () => {
    setEditForm({
        nama_lengkap: profile?.nama_lengkap ?? '',
        nomor_telepon: profile?.nomor_telepon ?? '',
        tanggal_lahir: profile?.tanggal_lahir ?? '',
        alamat: profile?.alamat ?? '',
        email: profile?.email ?? '',
    });
    setEditError('');
    setIsEditingProfile(true);
    };

    const cancelEditProfile = () => {
        setIsEditingProfile(false);
        setEditError('');
    };

    const handleEditFieldChange = (field) => (e) => {
        setEditForm((prev) => ({ ...prev, [field]: e.target.value }));
    };

    const handleSubmitEditProfile = async (e) => {
        e.preventDefault();
        setEditError('');
        setEditSubmitting(true);
        try {
            const updated = await updateProfile(editForm);
            setProfile(updated);
            setIsEditingProfile(false);
        } catch (err) {
            setEditError(extractErrorMessage(err, 'Gagal menyimpan profil.'));
        } finally {
            setEditSubmitting(false);
        }
    };
           const openProfileScreen = () => {
        setShowSettings(false);       // tutup panel pengaturan
        setSettingsScreen('menu');
        setIsEditingProfile(false);
        setView('profile');           // pindah ke halaman penuh
    };

    const closeProfileScreen = () => {
        setSettingsScreen('menu');
    };

    // 'menu' -> daftar menu pengaturan, 'pin' -> layar kelola PIN dompet.
    const [settingsScreen, setSettingsScreen] = useState('menu');
    const hasPin = !!wallet?.pin_sudah_diset;
    // null | 'create' | 'change' | 'disable' — form mana yang sedang tampil.
    const [pinFormMode, setPinFormMode] = useState(null);
    const [pinOldInput, setPinOldInput] = useState('');
    const [pinNewInput, setPinNewInput] = useState('');
    const [pinConfirmInput, setPinConfirmInput] = useState('');
    const [pinError, setPinError] = useState('');
    const [pinSuccess, setPinSuccess] = useState('');
    const [pinSubmitting, setPinSubmitting] = useState(false);
    const [driverPosition, setDriverPosition] = useState(FALLBACK_DRIVER_POSITION);
    const [locationStatus, setLocationStatus] = useState('locating'); // 'locating' | 'live' | 'denied' | 'unsupported'

    // 'home'  -> dashboard ringkasan (tampilan awal)
    // 'map'   -> peta pencarian station (dibuka atas permintaan driver)
    const [view, setView] = useState('home');

    // Tarik daftar kendaraan dari backend. `silent` = tanpa spinner (dipakai
    // saat sinkron ulang di latar belakang).
    const fetchVehicles = async (silent = false) => {
        if (!silent) setVehiclesLoading(true);
        setVehiclesError('');
        try {
            const data = await getVehicles();
            setVehicles(Array.isArray(data) ? data : []);
        } catch (err) {
            console.error('Gagal memuat kendaraan:', err);
            setVehiclesError(extractErrorMessage(err, 'Gagal memuat kendaraan.'));
        } finally {
            setVehiclesLoading(false);
        }
    };

    // Sinkron saat dashboard dibuka (termasuk kembali dari Kelola Kendaraan)
    // dan setiap tab/aplikasi kembali difokuskan.
    useEffect(() => {
        fetchVehicles();
        const onFocus = () => fetchVehicles(true);
        window.addEventListener('focus', onFocus);
        return () => window.removeEventListener('focus', onFocus);
    }, []);

    const fetchStations = async (silent = false) => {
        if (!silent) setStationsLoading(true);
        setStationsError('');
        try {
            const data = await getStations({
                lat: driverPosition.lat,
                lng: driverPosition.lng,
            });
            setStations(Array.isArray(data) && data.length > 0 ? data : DUMMY_STATIONS);
        } catch (err) {
            console.error('Gagal memuat station:', err);
            setStations(DUMMY_STATIONS);
            setStationsError(extractErrorMessage(err, 'Gagal memuat charging station dari server.'));
        } finally {
            setStationsLoading(false);
        }
    };

    useEffect(() => {
        fetchStations();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // Jaga kendaraan aktif tetap valid: kalau yang tersimpan sudah dihapus
    // (atau belum ada pilihan), pakai kendaraan pertama; kosong -> null.
    useEffect(() => {
        if (vehiclesLoading) return;
        const stillExists = vehicles.some((v) => v.id_vehicle === activeVehicleId);
        if (!stillExists) {
            setActiveVehicleId(vehicles[0]?.id_vehicle ?? null);
        }
    }, [vehicles, vehiclesLoading, activeVehicleId]);

    // Ingat pilihan kendaraan aktif antar sesi.
    useEffect(() => {
        if (activeVehicleId) localStorage.setItem(ACTIVE_VEHICLE_KEY, String(activeVehicleId));
    }, [activeVehicleId]);

    const activeVehicle = vehicles.find((v) => v.id_vehicle === activeVehicleId) ?? null;
    const selectedStation = stations.find((s) => s.id_location === selectedStationId) ?? null;
    const activeVehicleConnector = activeVehicle ? konektorLabel(activeVehicle.tipe_konektor) : null;
    const suggestedStations = activeVehicleConnector
        ? stations.filter((s) => s.tipe_konektor.includes(activeVehicleConnector))
        : stations;
    const [chargingDraft, setChargingDraft] = useState(null);
    const [targetKwh, setTargetKwh] = useState(20);
    const [holdPinInput, setHoldPinInput] = useState('');
    const [holdError, setHoldError] = useState('');
    const [holdSubmitting, setHoldSubmitting] = useState(false);
    const [invoice, setInvoice] = useState(null);
    const [showTopUp, setShowTopUp] = useState(false);
    const [topUpAmount, setTopUpAmount] = useState(100000);
    const [topUpMethod, setTopUpMethod] = useState('Mandiri');
    const [topUpPin, setTopUpPin] = useState('');
    const [topUpError, setTopUpError] = useState('');
    const [topUpSubmitting, setTopUpSubmitting] = useState(false);
    const [transactionHistory, setTransactionHistory] = useState([]);
    const [historyLoading, setHistoryLoading] = useState(false);
    const [historyError, setHistoryError] = useState('');
    const [selectedInvoice, setSelectedInvoice] = useState(null);
    const [invoiceLoading, setInvoiceLoading] = useState(false);

    const fetchTransactionHistory = async () => {
        setHistoryLoading(true);
        setHistoryError('');
        try {
            const data = await getPaymentHistory();
            setTransactionHistory(Array.isArray(data) ? data : []);
        } catch (err) {
            console.error('Gagal memuat riwayat transaksi:', err);
            setHistoryError(extractErrorMessage(err, 'Gagal memuat riwayat transaksi.'));
        } finally {
            setHistoryLoading(false);
        }
    };

    useEffect(() => {
        fetchTransactionHistory();
    }, []);

    // Rute ke station terpilih. route = { stationId, coords, distanceM, durationS }.
    const [route, setRoute] = useState(null);
    const [routeStatus, setRouteStatus] = useState('idle'); // 'idle' | 'loading' | 'error'
    const [routeError, setRouteError] = useState('');
    const routeLayerRef = useRef(null);
    const routeAbortRef = useRef(null);

    const mapNodeRef = useRef(null);
    const mapRef = useRef(null);
    const markersRef = useRef({});
    const driverMarkerRef = useRef(null);
    const hasCenteredOnRealPosRef = useRef(false);
    const pendingFocusStationRef = useRef(null);

    const filteredStations = stations.filter((s) => {
        if (connectorFilter === 'Semua') return true;
        return s.tipe_konektor.includes(connectorFilter);
    });

    const openChargingDraft = async (station, charger) => {
        setHoldError('');

        if (!activeVehicle) {
            setChargingDraft({ station, charger });
            setHoldError('Pilih kendaraan aktif terlebih dahulu.');
            return;
        }

        const chargerBadge = chargerStatusLabel(charger.status);
        if (chargerBadge.tone !== 'ok') {
            setHoldError('Charger sudah digunakan atau belum siap. Pilih charger lain yang tersedia.');
            return;
        }

        setChargingDraft({ station, charger });
        setTargetKwh(20);
        setHoldPinInput('');

        try {
            await validateCharger({
                id_charger: charger.id_charger,
                id_vehicle: activeVehicle.id_vehicle,
                target_kwh: 20,
            });
        } catch (err) {
            setHoldError(extractErrorMessage(err, 'Charger tidak valid untuk kendaraan aktif.'));
            return;
        }
    };

    const closeChargingDraft = () => {
        setChargingDraft(null);
        setHoldPinInput('');
        setHoldError('');
    };

    const handleConfirmHold = async (e) => {
        e.preventDefault();
        if (!chargingDraft || !activeVehicle) return;

        const holdAmount = estimateChargingCost(targetKwh, chargingDraft.station);
        const availableBalance = wallet?.saldo_tersedia ?? wallet?.saldo ?? 0;
        if (availableBalance < holdAmount) {
            setHoldError('Saldo Dompet Digital belum mencukupi untuk estimasi transaksi. Silakan top up terlebih dahulu.');
            return;
        }

        if (!hasPin) {
            setHoldError('PIN Dompet belum aktif. Atur PIN Dompet sebelum memulai sesi charging.');
            return;
        }

        if (holdPinInput.length !== 6) {
            setHoldError('Masukkan PIN Dompet 6 digit untuk konfirmasi hold saldo.');
            return;
        }

        setHoldSubmitting(true);
        setHoldError('');

        try {
            const session = await startChargingSession({
                id_charger: chargingDraft.charger.id_charger,
                id_vehicle: activeVehicle.id_vehicle,
                target_kwh: Number(targetKwh),
                pin: holdPinInput,
            });

            setActiveSession(session);
            await fetchWallet();
            await fetchStations(true);
            setShowNotif(true);
            setInvoice(null);
            closeChargingDraft();
            setView('home');
        } catch (err) {
            setHoldError(extractErrorMessage(err, 'Gagal memulai sesi charging.'));
        } finally {
            setHoldSubmitting(false);
        }
    };

    // ---------------------------------------------------------------
    // Inisialisasi peta sekali saat komponen mount. Peta tetap di-mount
    // di background sejak awal (bukan cuma saat view === 'map') supaya
    // tile & posisi GPS tidak perlu dimuat ulang tiap driver bolak-balik
    // antara dashboard dan peta — kita cukup sembunyikan lewat CSS.
    // ---------------------------------------------------------------
    useEffect(() => {
        if (mapRef.current || !mapNodeRef.current) return;

        const map = L.map(mapNodeRef.current, {
            center: [driverPosition.lat, driverPosition.lng],
            zoom: 14,
            zoomControl: false,
        });

        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '&copy; OpenStreetMap contributors',
            maxZoom: 19,
        }).addTo(map);

        driverMarkerRef.current = L.marker([driverPosition.lat, driverPosition.lng], { icon: DRIVER_ICON })
            .addTo(map)
            .bindPopup('Lokasi Anda saat ini');

        mapRef.current = map;

        return () => {
            map.remove();
            mapRef.current = null;
            driverMarkerRef.current = null;
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // ---------------------------------------------------------------
    // Live location tracking — mengikuti posisi pengemudi secara terus
    // menerus selama halaman terbuka (mirip GPS driver ojol), terlepas
    // dari layar mana yang sedang aktif.
    // ---------------------------------------------------------------
    useEffect(() => {
        if (!('geolocation' in navigator)) {
            setLocationStatus('unsupported');
            return;
        }

        const watchId = navigator.geolocation.watchPosition(
            (pos) => {
                const next = { lat: pos.coords.latitude, lng: pos.coords.longitude };
                setDriverPosition(next);
                setLocationStatus('live');

                if (driverMarkerRef.current) {
                    driverMarkerRef.current.setLatLng([next.lat, next.lng]);
                }
                // Pusatkan peta ke posisi asli sekali saja saat fix pertama
                // didapat, supaya tidak mengganggu jika pengemudi sedang
                // menggeser-geser peta secara manual.
                if (!hasCenteredOnRealPosRef.current && mapRef.current) {
                    mapRef.current.setView([next.lat, next.lng], 15);
                    hasCenteredOnRealPosRef.current = true;
                }
            },
            (err) => {
                console.warn('Gagal mengambil lokasi:', err.message);
                setLocationStatus('denied');
            },
            { enableHighAccuracy: true, maximumAge: 5000, timeout: 15000 }
        );

        return () => navigator.geolocation.clearWatch(watchId);
    }, []);

    // ---------------------------------------------------------------
    // Render ulang marker station setiap kali filter berubah.
    // ---------------------------------------------------------------
    useEffect(() => {
        const map = mapRef.current;
        if (!map) return;

        // Bersihkan marker lama
        Object.values(markersRef.current).forEach((m) => map.removeLayer(m));
        markersRef.current = {};

        filteredStations.forEach((s) => {
            const badge = stationStatusLabel(s.status, s.charger_tersedia);
            const marker = L.marker([s.lat, s.lng], { icon: buildStationIcon(badge.tone) })
                .addTo(map)
                .bindPopup(
                    `<strong>${s.nama_lokasi}</strong><br/>${s.charger_tersedia}/${s.charger_total} charger &middot; ${formatRupiah(s.tarif_per_kwh)}/kWh`
                )
                .on('click', () => {
                    setSelectedStationId(s.id_location);
                    setSheetExpanded(true);
                });
            markersRef.current[s.id_location] = marker;
        });
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [connectorFilter, stations]);

    // Ganti station terpilih -> rute lama tidak relevan lagi, hapus.
    useEffect(() => {
        if (routeLayerRef.current || routeAbortRef.current || routeStatus !== 'idle') {
            clearRoute();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [selectedStationId]);

    // Batalkan request rute yang masih berjalan saat komponen dilepas.
    useEffect(() => () => routeAbortRef.current?.abort(), []);

    // Timer sesi charging berjalan — di production, energi_kwh & waktu
    // sebaiknya di-refresh dari data yang dikirim Perangkat Charger (FR19).
    useEffect(() => {
        if (!activeSession) return;
        const tick = () => setElapsed(Date.now() - activeSession.waktu_mulai);
        tick();
        const interval = setInterval(tick, 1000 * 30);
        return () => clearInterval(interval);
    }, [activeSession]);

    // ---------------------------------------------------------------
    // Peta disembunyikan lewat CSS (display:none) saat view === 'home',
    // jadi ukurannya perlu dihitung ulang setiap kali dimunculkan lagi.
    // Jika ada station yang "menunggu" untuk difokuskan (driver menekan
    // kartu station dari dashboard), fokuskan setelah ukuran benar.
    // ---------------------------------------------------------------
    useEffect(() => {
        if (view !== 'map' || !mapRef.current) return;
        const id = setTimeout(() => {
            mapRef.current.invalidateSize();
            if (pendingFocusStationRef.current) {
                handleFocusStation(pendingFocusStationRef.current);
                pendingFocusStationRef.current = null;
            }
        }, 80);
        return () => clearTimeout(id);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [view]);

    const sessionProgressPct = activeSession
        ? Math.min(100, Math.round((activeSession.energi_kwh / activeSession.target_kwh) * 100))
        : 0;

    const sessionEstimatedCost = activeSession
        ? Math.round(activeSession.energi_kwh * activeSession.tarif_per_kwh + activeSession.biaya_parkir)
        : 0;

    const handleStopSession = async () => {
        if (!activeSession) return;

        if (activeSession.id_session) {
            try {
                const finishedInvoice = await finishChargingSession(activeSession.id_session);
                setInvoice(finishedInvoice);
                await fetchWallet();
                await fetchStations(true);
                await fetchTransactionHistory();
                setActiveSession(null);
                return;
            } catch (err) {
                setInvoice({
                    nama_lokasi: activeSession.nama_lokasi,
                    kode_charger: activeSession.kode_charger,
                    energi_kwh: 0,
                    biaya_aktual: 0,
                    jumlah_hold: activeSession.jumlah_hold,
                    status: extractErrorMessage(err, 'Gagal menyelesaikan sesi'),
                });
                return;
            }
        }

        const energiAktual = Math.max(1, Number(activeSession.energi_kwh) || Math.round(activeSession.target_kwh * 0.72));
        const biayaAktual = Math.round(energiAktual * activeSession.tarif_per_kwh + activeSession.biaya_parkir);
        setInvoice({
            nama_lokasi: activeSession.nama_lokasi,
            kode_charger: activeSession.kode_charger,
            energi_kwh: energiAktual,
            biaya_aktual: biayaAktual,
            jumlah_hold: activeSession.jumlah_hold,
            status: 'Selesai',
        });
        setActiveSession(null);
    };

    const handleInterruptSession = async () => {
        if (!activeSession?.id_session) return;

        try {
            const interruptedInvoice = await interruptChargingSession(activeSession.id_session, {
                status: 'gagal',
                alasan: 'Gangguan charger dilaporkan oleh driver.',
            });
            setInvoice(interruptedInvoice);
            await fetchWallet();
            await fetchStations(true);
            await fetchTransactionHistory();
            setActiveSession(null);
        } catch (err) {
            setInvoice({
                nama_lokasi: activeSession.nama_lokasi,
                kode_charger: activeSession.kode_charger,
                energi_kwh: 0,
                biaya_aktual: 0,
                jumlah_hold: activeSession.jumlah_hold,
                status: extractErrorMessage(err, 'Gagal memproses gangguan sesi charging'),
            });
        }
    };

    const handleOpenInvoice = async (idPayment) => {
        setSelectedInvoice(null);
        setInvoiceLoading(true);
        try {
            const data = await getPaymentDetail(idPayment);
            setSelectedInvoice(data);
        } catch (err) {
            setSelectedInvoice({
                status: extractErrorMessage(err, 'Gagal memuat detail invoice.'),
                nama_lokasi: '-',
                kode_charger: '-',
                energi_kwh: 0,
                biaya_aktual: 0,
                jumlah_hold: 0,
                selisih_dikembalikan: 0,
            });
        } finally {
            setInvoiceLoading(false);
        }
    };

    const openTopUpModal = () => {
        setTopUpAmount(100000);
        setTopUpMethod('Mandiri');
        setTopUpPin('');
        setTopUpError('');
        setShowTopUp(true);
    };

    const handleTopUpSubmit = async (e) => {
        e.preventDefault();
        setTopUpError('');

        if (hasPin && topUpPin.length !== 6) {
            setTopUpError('Masukkan PIN Dompet 6 digit untuk top up.');
            return;
        }

        setTopUpSubmitting(true);
        try {
            await topUpWallet(Number(topUpAmount), topUpMethod, topUpPin);
            await fetchWallet();
            setShowTopUp(false);
        } catch (err) {
            setTopUpError(extractErrorMessage(err, 'Top up gagal. Coba lagi.'));
        } finally {
            setTopUpSubmitting(false);
        }
    };

    // ---------------------------------------------------------------
    // Kelola PIN Dompet — buat, ubah, dan nonaktifkan PIN transaksi.
    // Validasi di sini hanya untuk UX; validasi & penyimpanan PIN yang
    // sebenarnya (hashing dsb.) WAJIB dilakukan di backend (FR terkait
    // Payment / keamanan transaksi dompet).
    // ---------------------------------------------------------------
    const resetPinInputs = () => {
        setPinOldInput('');
        setPinNewInput('');
        setPinConfirmInput('');
        setPinError('');
    };

    const openPinManager = () => {
        resetPinInputs();
        setPinSuccess('');
        setPinFormMode(hasPin ? null : 'create');
        setSettingsScreen('pin');
    };

    const closePinManager = () => {
        resetPinInputs();
        setPinSuccess('');
        setPinFormMode(null);
        setSettingsScreen('menu');
    };

    

    const handlePinDigitsChange = (setter) => (e) => {
        const digitsOnly = e.target.value.replace(/\D/g, '').slice(0, 6);
        setter(digitsOnly);
    };

    const handleCreatePin = async (e) => {
        e.preventDefault();
        setPinError('');

        if (pinNewInput.length !== 6) {
            setPinError('PIN harus terdiri dari 6 digit angka.');
            return;
        }
        if (pinNewInput !== pinConfirmInput) {
            setPinError('Konfirmasi PIN tidak sama dengan PIN baru.');
            return;
        }

        setPinSubmitting(true);
        try {
            await createPin(pinNewInput, pinConfirmInput);
            await fetchWallet(); // sinkronkan status pin_sudah_diset dari DB
            setPinSuccess('PIN dompet berhasil dibuat.');
            setPinFormMode(null);
            resetPinInputs();
        } catch (err) {
            setPinError(extractErrorMessage(err, 'Gagal membuat PIN. Coba lagi.'));
        } finally {
            setPinSubmitting(false);
        }
    };

    const handleChangePin = async (e) => {
        e.preventDefault();
        setPinError('');

        if (pinOldInput.length !== 6) {
            setPinError('PIN lama harus 6 digit angka.');
            return;
        }
        if (pinNewInput.length !== 6) {
            setPinError('PIN baru harus terdiri dari 6 digit angka.');
            return;
        }
        if (pinNewInput === pinOldInput) {
            setPinError('PIN baru tidak boleh sama dengan PIN lama.');
            return;
        }
        if (pinNewInput !== pinConfirmInput) {
            setPinError('Konfirmasi PIN baru tidak sama.');
            return;
        }

        setPinSubmitting(true);
        try {
            // Backend yang memverifikasi PIN lama benar/salah (hashed di DB).
            await changePinApi(pinOldInput, pinNewInput, pinConfirmInput);
            await fetchWallet();
            setPinSuccess('PIN dompet berhasil diubah.');
            setPinFormMode(null);
            resetPinInputs();
        } catch (err) {
            setPinError(extractErrorMessage(err, 'Gagal mengubah PIN. Coba lagi.'));
        } finally {
            setPinSubmitting(false);
        }
    };

    const handleDisablePin = async (e) => {
        e.preventDefault();
        setPinError('');

        if (pinOldInput.length !== 6) {
            setPinError('Masukkan PIN saat ini (6 digit) untuk konfirmasi.');
            return;
        }

        setPinSubmitting(true);
        try {
            await disablePinApi(pinOldInput);
            await fetchWallet();
            setPinFormMode('create');
            setPinSuccess('PIN dompet dinonaktifkan.');
            resetPinInputs();
        } catch (err) {
            setPinError(extractErrorMessage(err, 'Gagal menonaktifkan PIN. Coba lagi.'));
        } finally {
            setPinSubmitting(false);
        }
    };

    const handleLocateMe = () => {
        const map = mapRef.current;
        if (map) map.flyTo([driverPosition.lat, driverPosition.lng], 15);
    };

    const handleFocusStation = (s) => {
        const map = mapRef.current;
        if (map) map.flyTo([s.lat, s.lng], 16);
        setSelectedStationId(s.id_location);
        markersRef.current[s.id_location]?.openPopup();
    };

    const clearRoute = () => {
        routeAbortRef.current?.abort();
        routeAbortRef.current = null;
        if (routeLayerRef.current && mapRef.current) {
            mapRef.current.removeLayer(routeLayerRef.current);
        }
        routeLayerRef.current = null;
        setRoute(null);
        setRouteStatus('idle');
        setRouteError('');
    };

    // Hitung & gambar rute dari posisi driver saat ini ke station.
    // Dipakai juga untuk "Perbarui rute" (posisi driver terus bergerak).
    const handleShowRoute = async (station) => {
        const map = mapRef.current;
        if (!map || !station) return;

        // Tanpa GPS asli, posisi driver hanyalah lokasi default — rute dari
        // titik palsu justru menyesatkan, jadi jangan dihitung.
        if (locationStatus !== 'live') {
            setRouteStatus('error');
            setRouteError('Lokasi Anda belum terdeteksi. Aktifkan izin lokasi, lalu coba lagi.');
            return;
        }

        routeAbortRef.current?.abort();
        const controller = new AbortController();
        routeAbortRef.current = controller;
        setRouteStatus('loading');
        setRouteError('');

        try {
            const result = await getDrivingRoute(driverPosition, station, controller.signal);
            if (controller.signal.aborted) return;

            if (routeLayerRef.current) map.removeLayer(routeLayerRef.current);
            const lineStyle = { lineCap: 'round', lineJoin: 'round' };
            routeLayerRef.current = L.layerGroup([
                L.polyline(result.coords, { ...lineStyle, color: '#ffffff', weight: 10, opacity: 0.9 }), // garis tepi
                L.polyline(result.coords, { ...lineStyle, color: '#2e7d32', weight: 6, opacity: 1 }),
            ]).addTo(map);

            // Sisakan ruang untuk elemen yang menutupi peta: panel kiri di
            // desktop; filter (atas) & bottom sheet (bawah) di ponsel/tablet.
            const isDesktop = window.innerWidth >= 1024;
            map.fitBounds(L.latLngBounds(result.coords), {
                paddingTopLeft: isDesktop ? [440, 150] : [32, 190],
                paddingBottomRight: isDesktop ? [40, 40] : [32, 200],
                maxZoom: 17,
            });

            setRoute({ stationId: station.id_location, ...result });
            setRouteStatus('idle');
        } catch (err) {
            if (err.name === 'AbortError') return;
            setRouteStatus('error');
            setRouteError(
                err.code === 'NO_ROUTE'
                    ? 'Rute mobil ke station ini tidak ditemukan.'
                    : 'Gagal memuat rute. Periksa koneksi internet, lalu coba lagi.'
            );
        }
    };

    // Membuka layar peta dari dashboard. Jika sebuah station diberikan,
    // peta akan otomatis fly-to & membuka popup station tersebut begitu
    // ukurannya selesai dihitung ulang (lihat effect di atas).
    const goToMap = (station) => {
        pendingFocusStationRef.current = station || null;
        setView('map');
        setSheetExpanded(!!station);
        if (station) setSelectedStationId(station.id_location);
    };

    const firstName = user.nama.split(' ')[0];
    return (
        <div className="app-shell">
            {/* ============================================================
                LAYAR 1 — DASHBOARD HOME (tampilan awal, bukan peta)
               ============================================================ */}
            <div className={`home-screen ${view === 'home' ? 'is-active' : 'is-hidden'}`}>
                <header className="home-header">
                    <div className="home-header-top">
                        <div className="home-greeting-block">
                            <p className="home-greeting-text">{getGreeting()}, {firstName} 👋</p>
                            <p className="home-greeting-sub">Siap cari charger terdekat hari ini.</p>
                        </div>
                        <div className="home-header-actions">
                            <button
                                className="home-icon-btn"
                                aria-label="Notifikasi"
                                onClick={() => setShowNotif((v) => !v)}
                            >
                                🔔
                                {activeSession && <span className="mapdash-badge-dot" />}
                            </button>
                            <button
                                className="home-icon-btn"
                                aria-label="Pengaturan"
                                onClick={() => setShowSettings(true)}
                            >
                                ⚙️
                            </button>
                        </div>
                    </div>

                    <div className="home-header-summary">
                        <div className="home-balance-panel">
                            <div>
                                <p className="home-wallet-label">Saldo Dompet</p>
                                <p className="home-wallet-value">
                                    {walletLoading ? '...' : formatRupiah(wallet?.saldo ?? 0)}
                                </p>
                            </div>
                            <button className="home-wallet-topup" onClick={openTopUpModal}>+ Top Up</button>
                        </div>

                        <div className="home-vehicle-panel">
                            <div className="home-vehicle-panel-head">
                                <span className="home-vehicle-pill-icon">🚗</span>
                                <span>Kendaraan Aktif</span>
                            </div>
                            {vehicles.length > 0 ? (
                                <select
                                    className="home-vehicle-select"
                                    value={activeVehicleId ?? ''}
                                    onChange={(e) => setActiveVehicleId(Number(e.target.value))}
                                    disabled={vehiclesLoading}
                                >
                                    {vehicles.map((v) => (
                                        <option key={v.id_vehicle} value={v.id_vehicle}>
                                            {v.model} · {v.nomor_polisi}
                                        </option>
                                    ))}
                                </select>
                            ) : (
                                <button className="home-vehicle-add-btn" onClick={onNavigateToVehicles}>
                                    {vehiclesLoading ? 'Memuat kendaraan...' : '+ Tambah kendaraan'}
                                </button>
                            )}
                        </div>
                    </div>
                </header>

                <main className="home-content">
                    {showNotif && activeSession && (
                        <div className="mapdash-notif home-notif">
                            <span>⚡ Sesi charging Anda di <strong>{activeSession.nama_lokasi}</strong> sedang berjalan.</span>
                            <button className="mapdash-notif-close" onClick={() => setShowNotif(false)}>✕</button>
                        </div>
                    )}

                    {activeSessionLoading && !activeSession && (
                        <section className="home-session-card">
                            <div className="mapdash-sheet-title-row">
                                <span className="mapdash-sheet-title home-session-title">Mengecek Sesi Charging</span>
                                <span className="dash-status-badge warn">Memuat</span>
                            </div>
                            <p className="mapdash-session-location">Sistem sedang mencari sesi charging yang masih berjalan.</p>
                        </section>
                    )}

                    {activeSession && (
                        <section className="home-session-card">
                            <div className="mapdash-sheet-title-row">
                                <span className="mapdash-sheet-title home-session-title">Sesi Charging Berlangsung</span>
                                <span className="dash-status-badge ok">● {activeSession.status}</span>
                            </div>
                            <p className="mapdash-session-location">📍 {activeSession.nama_lokasi} · {activeSession.kode_charger}</p>

                            <div className="dash-progress-track">
                                <div className="dash-progress-fill" style={{ width: `${sessionProgressPct}%` }} />
                            </div>
                            <div className="dash-session-stats">
                                <div>
                                    <p className="stat-value">{activeSession.energi_kwh} kWh</p>
                                    <p className="stat-label">Energi Terisi</p>
                                </div>
                                <div>
                                    <p className="stat-value">{formatDuration(elapsed)}</p>
                                    <p className="stat-label">Durasi</p>
                                </div>
                                <div>
                                    <p className="stat-value">{formatRupiah(sessionEstimatedCost)}</p>
                                    <p className="stat-label">Estimasi Biaya</p>
                                </div>
                            </div>
                            <div className="home-session-actions">
                                <button className="dash-btn-stop" onClick={handleStopSession}>
                                    Hentikan Sesi
                                </button>
                                <button className="dash-btn-issue" onClick={handleInterruptSession}>
                                    Laporkan Gangguan
                                </button>
                            </div>
                        </section>
                    )}

                    <section className="home-search-card">
                        <button className="home-cta-map" onClick={() => goToMap()}>
                            <span className="home-cta-icon">🗺️</span>
                            <span className="home-cta-text">
                                <span className="home-cta-title">Cari Charging Station</span>
                                <span className="home-cta-sub">
                                    {activeVehicleConnector
                                        ? `${suggestedStations.length} station cocok untuk ${activeVehicleConnector}`
                                        : `${filteredStations.length} station di sekitar Anda`}
                                </span>
                            </span>
                            <span className="home-cta-arrow">→</span>
                        </button>

                        <div className="home-search-filters" aria-label="Filter konektor charging station">
                            {CONNECTOR_FILTERS.map((f) => (
                                <button
                                    key={f}
                                    type="button"
                                    className={`mapdash-filter-chip ${connectorFilter === f ? 'active' : ''}`}
                                    onClick={() => setConnectorFilter(f)}
                                >
                                    {f}
                                </button>
                            ))}
                        </div>
                    </section>

                    {invoice && (
                        <section className="home-invoice-card">
                            <div className="mapdash-sheet-title-row">
                                <span className="mapdash-sheet-title">Invoice Digital Terakhir</span>
                                <span className="dash-status-badge ok">{invoice.status}</span>
                            </div>
                            <p className="mapdash-session-location">📍 {invoice.nama_lokasi} · {invoice.kode_charger}</p>
                            <div className="invoice-grid">
                                <div>
                                    <span className="invoice-label">Energi Aktual</span>
                                    <strong>{invoice.energi_kwh} kWh</strong>
                                </div>
                                <div>
                                    <span className="invoice-label">Biaya Aktual</span>
                                    <strong>{formatRupiah(invoice.biaya_aktual)}</strong>
                                </div>
                                <div>
                                    <span className="invoice-label">Dana Hold</span>
                                    <strong>{formatRupiah(invoice.jumlah_hold)}</strong>
                                </div>
                                <div>
                                    <span className="invoice-label">Selisih Dikembalikan</span>
                                    <strong>{formatRupiah(Math.max(0, invoice.jumlah_hold - invoice.biaya_aktual))}</strong>
                                </div>
                            </div>
                        </section>
                    )}

                    <section className="home-stats-row">
                        <div className="home-stat-card">
                            <p className="home-stat-value">{DUMMY_STATS.sesi_bulan_ini}</p>
                            <p className="home-stat-label">Sesi Bulan Ini</p>
                        </div>
                        <div className="home-stat-card">
                            <p className="home-stat-value">{DUMMY_STATS.energi_kwh_bulan_ini} kWh</p>
                            <p className="home-stat-label">Energi Terisi</p>
                        </div>
                        <div className="home-stat-card">
                            <p className="home-stat-value home-stat-value-sm">{formatRupiah(DUMMY_STATS.pengeluaran_bulan_ini)}</p>
                            <p className="home-stat-label">Pengeluaran</p>
                        </div>
                    </section>

                    <section className="home-section">
                        <div className="home-station-summary">
                            <span>{stationsLoading ? 'Memuat station...' : `${filteredStations.length} station terdekat`}</span>
                            {stationsError && (
                                <button className="dash-link-btn" onClick={() => fetchStations()}>
                                    Coba lagi
                                </button>
                            )}
                        </div>
                        {stationsError && <p className="dash-empty">{stationsError} Menampilkan data contoh.</p>}

                        <div className="mapdash-station-scroll home-station-scroll">
                            {filteredStations.map((s) => {
                                const badge = stationStatusLabel(s.status, s.charger_tersedia);
                                return (
                                    <button
                                        key={s.id_location}
                                        className="mapdash-station-mini"
                                        onClick={() => goToMap(s)}
                                    >
                                        <div className="mapdash-station-mini-top">
                                            <span className={`dash-status-badge ${badge.tone}`}>{badge.text}</span>
                                            <span className="mapdash-station-mini-dist">{s.jarak_km} km</span>
                                        </div>
                                        <p className="mapdash-station-mini-name">{s.nama_lokasi}</p>
                                        <p className="mapdash-station-mini-meta">
                                            {s.tipe_konektor.join(' / ')} · {formatRupiah(s.tarif_per_kwh)}/kWh
                                        </p>
                                    </button>
                                );
                            })}
                            {filteredStations.length === 0 && (
                                <p className="dash-empty">Tidak ada station dengan konektor ini di sekitar Anda.</p>
                            )}
                        </div>
                    </section>

                    <section className="home-section">
                        <div className="home-section-title-row">
                            <h3 className="home-section-title">Riwayat Transaksi</h3>
                            <span className="home-section-caption">
                                {historyLoading ? 'Memuat...' : `${transactionHistory.length} transaksi terakhir`}
                            </span>
                        </div>

                        {historyError && (
                            <p className="dash-empty">
                                {historyError}{' '}
                                <button className="dash-link-btn" onClick={fetchTransactionHistory}>Coba lagi</button>
                            </p>
                        )}

                        <div className="transaction-list">
                            {!historyLoading && !historyError && transactionHistory.length === 0 && (
                                <p className="dash-empty">Belum ada transaksi.</p>
                            )}
                            {transactionHistory.map((trx) => (
                                <button
                                    className="transaction-item"
                                    key={trx.id_payment}
                                    onClick={() => handleOpenInvoice(trx.id_payment)}
                                >
                                    <div className="transaction-main">
                                        <span className="transaction-icon">🧾</span>
                                        <div>
                                            <p className="transaction-location">{trx.nama_lokasi}</p>
                                            <p className="transaction-meta">
                                                {trx.tanggal}
                                                {trx.energi_kwh !== null ? ` · ${trx.energi_kwh} kWh` : ` · ${trx.metode_pembayaran}`}
                                            </p>
                                        </div>
                                    </div>
                                    <div className="transaction-side">
                                        <strong>{formatRupiah(trx.total)}</strong>
                                        <span className="dash-status-badge ok">{trx.status}</span>
                                    </div>
                                </button>
                            ))}
                        </div>
                    </section>

                </main>
            </div>

            {/* ============================================================
                LAYAR 2 — PETA (dibuka saat driver menekan "Cari Charging
                Station" atau salah satu kartu station dari dashboard)
               ============================================================ */}
            <div className={`mapdash-container ${view === 'map' ? 'is-active' : 'is-hidden'}`}>
                <div ref={mapNodeRef} className="mapdash-map" />

                {/* Top bar mengambang di atas peta */}
                <div className="mapdash-topbar">
                    <div className="mapdash-topbar-left">
                        <button className="mapdash-round-btn" onClick={() => setView('home')} aria-label="Kembali ke dashboard">
                            ←
                        </button>
                        <span className="mapdash-map-title">Cari Charging Station</span>
                    </div>
                    <div className="mapdash-topbar-right">
                        <button className="mapdash-round-btn" aria-label="Notifikasi" onClick={() => setShowNotif((v) => !v)}>
                            🔔
                            {activeSession && <span className="mapdash-badge-dot" />}
                        </button>
                    </div>
                </div>

                {showNotif && activeSession && (
                    <div className="mapdash-notif">
                        <span>⚡ Sesi charging Anda di <strong>{activeSession.nama_lokasi}</strong> sedang berjalan.</span>
                        <button className="mapdash-notif-close" onClick={() => setShowNotif(false)}>✕</button>
                    </div>
                )}

                {/* Filter konektor mengambang di atas peta */}
                {!activeSession && (
                    <div className="mapdash-filters">
                        {CONNECTOR_FILTERS.map((f) => (
                            <button
                                key={f}
                                className={`mapdash-filter-chip ${connectorFilter === f ? 'active' : ''}`}
                                onClick={() => setConnectorFilter(f)}
                            >
                                {f}
                            </button>
                        ))}
                    </div>
                )}

                {/* Kartu rute ke station terpilih */}
                {!activeSession && selectedStation && (
                    <div className="route-card" role="region" aria-label="Rute ke station">
                        <div className="route-card-head">
                            <div className="route-card-titles">
                                <span className="route-card-eyebrow">Tujuan</span>
                                <span className="route-card-name">{selectedStation.nama_lokasi}</span>
                            </div>
                            <button
                                className="route-card-close"
                                onClick={() => {
                                    clearRoute();
                                    setSelectedStationId(null);
                                }}
                                aria-label="Tutup kartu rute"
                            >
                                ✕
                            </button>
                        </div>

                        {route && route.stationId === selectedStation.id_location && (
                            <div className="route-card-summary">
                                <span className="route-card-dist">{formatJarak(route.distanceM)}</span>
                                <span className="route-card-dot">·</span>
                                <span className="route-card-eta">{formatDurasi(route.durationS)}</span>
                                <span className="route-card-note">estimasi tanpa lalu lintas</span>
                            </div>
                        )}

                        {routeStatus === 'loading' && (
                            <p className="route-card-status" aria-live="polite">
                                <span className="route-card-spinner" aria-hidden="true" /> Menghitung rute…
                            </p>
                        )}
                        {routeStatus === 'error' && (
                            <p className="route-card-error" role="alert">{routeError}</p>
                        )}

                        <div className="route-card-actions">
                            <button
                                className="route-card-primary"
                                onClick={() => handleShowRoute(selectedStation)}
                                disabled={routeStatus === 'loading'}
                            >
                                {route
                                    ? '↻ Perbarui rute'
                                    : routeStatus === 'error'
                                    ? '↻ Coba lagi'
                                    : '🧭 Tampilkan Rute'}
                            </button>
                            <a
                                className="route-card-secondary"
                                href={googleMapsDirectionsUrl(selectedStation)}
                                target="_blank"
                                rel="noopener noreferrer"
                            >
                                Google Maps ↗
                            </a>
                            {route && (
                                <button className="route-card-secondary" onClick={clearRoute}>
                                    Hapus rute
                                </button>
                            )}
                        </div>
                    </div>
                )}

                {/* Tombol locate me */}
                <button
                    className={`mapdash-locate-btn ${locationStatus === 'denied' || locationStatus === 'unsupported' ? 'no-location' : ''}`}
                    onClick={handleLocateMe}
                    aria-label="Lokasi saya"
                    title={
                        locationStatus === 'denied'
                            ? 'Izin lokasi ditolak — menampilkan lokasi default'
                            : locationStatus === 'unsupported'
                            ? 'Browser tidak mendukung lokasi — menampilkan lokasi default'
                            : locationStatus === 'locating'
                            ? 'Mencari lokasi Anda...'
                            : 'Lokasi Anda (live)'
                    }
                >
                    🎯
                    {locationStatus === 'live' && <span className="mapdash-locate-live-dot" />}
                </button>

                {/* Bottom sheet */}
                <div className={`mapdash-sheet ${sheetExpanded ? 'expanded' : ''}`}>
                    <button
                        className="mapdash-sheet-handle"
                        onClick={() => setSheetExpanded((v) => !v)}
                        aria-label="Buka/tutup daftar station"
                    />

                    {activeSession ? (
                        <div className="mapdash-session">
                            <div className="mapdash-sheet-title-row">
                                <span className="mapdash-sheet-title">Sesi Charging Berlangsung</span>
                                <span className="dash-status-badge ok">● {activeSession.status}</span>
                            </div>
                            <p className="mapdash-session-location">📍 {activeSession.nama_lokasi} · {activeSession.kode_charger}</p>

                            <div className="dash-progress-track">
                                <div className="dash-progress-fill" style={{ width: `${sessionProgressPct}%` }} />
                            </div>
                            <div className="dash-session-stats">
                                <div>
                                    <p className="stat-value">{activeSession.energi_kwh} kWh</p>
                                    <p className="stat-label">Energi Terisi</p>
                                </div>
                                <div>
                                    <p className="stat-value">{formatDuration(elapsed)}</p>
                                    <p className="stat-label">Durasi</p>
                                </div>
                                <div>
                                    <p className="stat-value">{formatRupiah(sessionEstimatedCost)}</p>
                                    <p className="stat-label">Estimasi Biaya</p>
                                </div>
                            </div>
                            <div className="home-session-actions">
                                <button className="dash-btn-stop" onClick={handleStopSession}>
                                    Hentikan Sesi
                                </button>
                                <button className="dash-btn-issue" onClick={handleInterruptSession}>
                                    Gangguan
                                </button>
                            </div>
                        </div>
                    ) : (
                        <>
                            <div className="mapdash-sheet-title-row">
                                <span className="mapdash-sheet-title">{filteredStations.length} Charging Station Terdekat</span>
                                <button className="dash-link-btn" onClick={() => setSheetExpanded((v) => !v)}>
                                    {sheetExpanded ? 'Tutup' : 'Lihat Semua'}
                                </button>
                            </div>

                            {!sheetExpanded && (
                                <div className="mapdash-station-scroll">
                                    {filteredStations.map((s) => {
                                        const badge = stationStatusLabel(s.status, s.charger_tersedia);
                                        return (
                                            <button
                                                key={s.id_location}
                                                className={`mapdash-station-mini ${selectedStationId === s.id_location ? 'selected' : ''}`}
                                                onClick={() => handleFocusStation(s)}
                                            >
                                                <div className="mapdash-station-mini-top">
                                                    <span className={`dash-status-badge ${badge.tone}`}>{badge.text}</span>
                                                    <span className="mapdash-station-mini-dist">{s.jarak_km} km</span>
                                                </div>
                                                <p className="mapdash-station-mini-name">{s.nama_lokasi}</p>
                                                <p className="mapdash-station-mini-meta">
                                                    {s.tipe_konektor.join(' / ')} · {formatRupiah(s.tarif_per_kwh)}/kWh
                                                </p>
                                            </button>
                                        );
                                    })}
                                </div>
                            )}

                            {sheetExpanded && (
                                <div className="dash-station-list mapdash-station-list-full">
                                    {filteredStations.map((s) => {
                                        const badge = stationStatusLabel(s.status, s.charger_tersedia);
                                        return (
                                            <div
                                                key={s.id_location}
                                                className={`dash-station-item ${selectedStationId === s.id_location ? 'selected' : ''}`}
                                                onClick={() => handleFocusStation(s)}
                                            >
                                                <div className="dash-station-main">
                                                    <p className="dash-station-name">{s.nama_lokasi}</p>
                                                    <p className="dash-station-address">{s.alamat}</p>
                                                    <div className="dash-station-meta">
                                                        <span>📍 {s.jarak_km} km</span>
                                                        <span>⚡ {s.tipe_konektor.join(' / ')}</span>
                                                        <span>💰 {formatRupiah(s.tarif_per_kwh)}/kWh</span>
                                                        <span>⭐ {s.rating}</span>
                                                    </div>
                                                </div>
                                                <div className="dash-station-side">
                                                    <span className={`dash-status-badge ${badge.tone}`}>{badge.text}</span>
                                                    <span className="dash-station-count">
                                                        {s.charger_tersedia}/{s.charger_total} charger
                                                    </span>
                                                    <button
                                                        className="dash-btn-navigate"
                                                        disabled={badge.tone !== 'ok'}
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            setSelectedStationId(s.id_location);
                                                        }}
                                                    >
                                                        Detail
                                                    </button>
                                                </div>
                                                {selectedStationId === s.id_location && (
                                                    <div className="charger-picker">
                                                        <div className="charger-picker-head">
                                                            <span>Unit Charger</span>
                                                            <small>{formatRupiah(s.tarif_per_kwh)}/kWh · parkir {formatRupiah(s.biaya_parkir)}</small>
                                                        </div>
                                                        {s.chargers.map((charger) => {
                                                            const chargerBadge = chargerStatusLabel(charger.status);
                                                            return (
                                                                <button
                                                                    key={charger.id_charger}
                                                                    className="charger-option"
                                                                    disabled={chargerBadge.tone !== 'ok'}
                                                                    onClick={(e) => {
                                                                        e.stopPropagation();
                                                                        openChargingDraft(s, charger);
                                                                    }}
                                                                >
                                                                    <span className="charger-option-main">
                                                                        <strong>{charger.kode_perangkat}</strong>
                                                                        <span>{charger.tipe_konektor} · {charger.daya_kw} kW</span>
                                                                    </span>
                                                                    <span className={`dash-status-badge ${chargerBadge.tone}`}>{chargerBadge.text}</span>
                                                                </button>
                                                            );
                                                        })}
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    })}
                                    {filteredStations.length === 0 && (
                                        <p className="dash-empty">Tidak ada station dengan konektor ini di sekitar Anda.</p>
                                    )}
                                </div>
                            )}
                        </>
                    )}
                </div>
            </div>

            {chargingDraft && (
                <div className="charge-flow-overlay" onClick={closeChargingDraft}>
                    <form className="charge-flow-panel" onSubmit={handleConfirmHold} onClick={(e) => e.stopPropagation()}>
                        <div className="settings-panel-header">
                            <span className="settings-panel-title">Estimasi & Hold Saldo</span>
                            <button type="button" className="mapdash-notif-close" onClick={closeChargingDraft} aria-label="Tutup estimasi">
                                ✕
                            </button>
                        </div>

                        <div className="charge-flow-station">
                            <span className="charge-flow-icon">⚡</span>
                            <div>
                                <strong>{chargingDraft.station.nama_lokasi}</strong>
                                <p>{chargingDraft.charger.kode_perangkat} · {chargingDraft.charger.tipe_konektor} · {chargingDraft.charger.daya_kw} kW</p>
                            </div>
                        </div>

                        <label className="settings-pin-label" htmlFor="target-kwh">Kebutuhan daya charging</label>
                        <div className="charge-kwh-control">
                            <button type="button" onClick={() => setTargetKwh((v) => Math.max(5, Number(v) - 5))}>−</button>
                            <input
                                id="target-kwh"
                                type="number"
                                min="5"
                                max="100"
                                step="5"
                                value={targetKwh}
                                onChange={(e) => setTargetKwh(e.target.value)}
                            />
                            <button type="button" onClick={() => setTargetKwh((v) => Math.min(100, Number(v) + 5))}>+</button>
                        </div>

                        <div className="charge-estimate-box">
                            <div>
                                <span>Tarif charging</span>
                                <strong>{formatRupiah(chargingDraft.station.tarif_per_kwh)}/kWh</strong>
                            </div>
                            <div>
                                <span>Biaya parkir flat</span>
                                <strong>{formatRupiah(chargingDraft.station.biaya_parkir)}</strong>
                            </div>
                            <div>
                                <span>Total estimasi hold</span>
                                <strong>{formatRupiah(estimateChargingCost(targetKwh, chargingDraft.station))}</strong>
                            </div>
                            <div>
                                <span>Saldo tersedia</span>
                                <strong>{walletLoading ? '...' : formatRupiah(wallet?.saldo ?? 0)}</strong>
                            </div>
                        </div>

                        {hasPin ? (
                            <>
                                <label className="settings-pin-label" htmlFor="hold-pin">PIN Dompet</label>
                                <input
                                    id="hold-pin"
                                    className="settings-pin-input"
                                    type="password"
                                    inputMode="numeric"
                                    autoComplete="off"
                                    maxLength={6}
                                    placeholder="••••••"
                                    value={holdPinInput}
                                    onChange={handlePinDigitsChange(setHoldPinInput)}
                                />
                            </>
                        ) : (
                            <p className="charge-flow-note">
                                PIN Dompet belum aktif. Atur PIN Dompet terlebih dahulu melalui Pengaturan sebelum memulai charging.
                            </p>
                        )}

                        {holdError && <p className="settings-pin-error">{holdError}</p>}

                        <button type="submit" className="settings-pin-submit" disabled={holdSubmitting}>
                            {holdSubmitting ? 'Memvalidasi...' : 'Konfirmasi Hold Saldo & Mulai Charging'}
                        </button>
                    </form>
                </div>
            )}

            {showTopUp && (
                <div className="charge-flow-overlay" onClick={() => setShowTopUp(false)}>
                    <form className="charge-flow-panel" onSubmit={handleTopUpSubmit} onClick={(e) => e.stopPropagation()}>
                        <div className="settings-panel-header">
                            <span className="settings-panel-title">Top Up Dompet Digital</span>
                            <button type="button" className="mapdash-notif-close" onClick={() => setShowTopUp(false)} aria-label="Tutup top up">
                                ✕
                            </button>
                        </div>

                        <p className="charge-flow-note">
                            Top up instant untuk prototype. Integrasi payment gateway bisa disambungkan pada tahap berikutnya.
                        </p>

                        <label className="settings-pin-label" htmlFor="topup-amount">Nominal Top Up</label>
                        <input
                            id="topup-amount"
                            className="topup-amount-input"
                            type="number"
                            min="10000"
                            step="10000"
                            value={topUpAmount}
                            onChange={(e) => setTopUpAmount(e.target.value)}
                        />

                        <div className="topup-quick-row">
                            {[50000, 100000, 200000].map((amount) => (
                                <button
                                    key={amount}
                                    type="button"
                                    className={`topup-quick-btn ${Number(topUpAmount) === amount ? 'active' : ''}`}
                                    onClick={() => setTopUpAmount(amount)}
                                >
                                    {formatRupiah(amount)}
                                </button>
                            ))}
                        </div>

                        <label className="settings-pin-label">Metode Pembayaran</label>
                        <div className="topup-method-grid">
                            {TOP_UP_METHODS.map((method) => (
                                <button
                                    key={method}
                                    type="button"
                                    className={`topup-method-btn ${topUpMethod === method ? 'active' : ''}`}
                                    onClick={() => setTopUpMethod(method)}
                                >
                                    {method}
                                </button>
                            ))}
                        </div>

                        {hasPin && (
                            <>
                                <label className="settings-pin-label" htmlFor="topup-pin">PIN Dompet</label>
                                <input
                                    id="topup-pin"
                                    className="settings-pin-input"
                                    type="password"
                                    inputMode="numeric"
                                    autoComplete="off"
                                    maxLength={6}
                                    placeholder="••••••"
                                    value={topUpPin}
                                    onChange={handlePinDigitsChange(setTopUpPin)}
                                />
                            </>
                        )}

                        {topUpError && <p className="settings-pin-error">{topUpError}</p>}

                        <button type="submit" className="settings-pin-submit" disabled={topUpSubmitting}>
                            {topUpSubmitting ? 'Memproses...' : 'Top Up Sekarang'}
                        </button>
                    </form>
                </div>
            )}

            {(selectedInvoice || invoiceLoading) && (
                <div className="charge-flow-overlay" onClick={() => setSelectedInvoice(null)}>
                    <div className="charge-flow-panel invoice-detail-panel" onClick={(e) => e.stopPropagation()}>
                        <div className="settings-panel-header">
                            <span className="settings-panel-title">Detail Invoice</span>
                            <button
                                type="button"
                                className="mapdash-notif-close"
                                onClick={() => setSelectedInvoice(null)}
                                aria-label="Tutup invoice"
                            >
                                ✕
                            </button>
                        </div>

                        {invoiceLoading && !selectedInvoice ? (
                            <p className="dash-empty">Memuat detail invoice...</p>
                        ) : (
                            <>
                                <div className="charge-flow-station">
                                    <span className="charge-flow-icon">🧾</span>
                                    <div>
                                        <strong>{selectedInvoice.nama_lokasi}</strong>
                                        <p>{selectedInvoice.alamat || selectedInvoice.kode_charger}</p>
                                    </div>
                                </div>

                                {selectedInvoice.jenis_pembayaran === 'topup' ? (
                                    <div className="charge-estimate-box invoice-total-box">
                                        <div>
                                            <span>Metode pembayaran</span>
                                            <strong>{selectedInvoice.metode_pembayaran}</strong>
                                        </div>
                                        <div>
                                            <span>Status</span>
                                            <strong>{selectedInvoice.status}</strong>
                                        </div>
                                        <div>
                                            <span>Referensi</span>
                                            <strong>{selectedInvoice.referensi_gateway}</strong>
                                        </div>
                                        <div className="invoice-total-row">
                                            <span>Total top up</span>
                                            <strong>{formatRupiah(selectedInvoice.biaya_aktual ?? 0)}</strong>
                                        </div>
                                    </div>
                                ) : (
                                    <>
                                        <div className="invoice-grid invoice-detail-grid">
                                            <div>
                                                <span className="invoice-label">Charger</span>
                                                <strong>{selectedInvoice.kode_charger}</strong>
                                            </div>
                                            <div>
                                                <span className="invoice-label">Status</span>
                                                <strong>{selectedInvoice.status}</strong>
                                            </div>
                                            <div>
                                                <span className="invoice-label">Kendaraan</span>
                                                <strong>{selectedInvoice.kendaraan?.nama ?? '-'}</strong>
                                            </div>
                                            <div>
                                                <span className="invoice-label">Nomor Polisi</span>
                                                <strong>{selectedInvoice.kendaraan?.nomor_polisi ?? '-'}</strong>
                                            </div>
                                            <div>
                                                <span className="invoice-label">Energi Terisi</span>
                                                <strong>{selectedInvoice.energi_kwh} kWh</strong>
                                            </div>
                                            <div>
                                                <span className="invoice-label">Tarif</span>
                                                <strong>{formatRupiah(selectedInvoice.tarif_per_kwh ?? 0)}/kWh</strong>
                                            </div>
                                        </div>

                                        <div className="charge-estimate-box invoice-total-box">
                                            <div>
                                                <span>Metode pembayaran</span>
                                                <strong>{selectedInvoice.metode_pembayaran ?? '-'}</strong>
                                            </div>
                                            <div>
                                                <span>Biaya charging</span>
                                                <strong>{formatRupiah(selectedInvoice.biaya_charging ?? 0)}</strong>
                                            </div>
                                            <div>
                                                <span>Biaya parkir</span>
                                                <strong>{formatRupiah(selectedInvoice.biaya_parkir ?? 0)}</strong>
                                            </div>
                                            <div>
                                                <span>Dana hold</span>
                                                <strong>{formatRupiah(selectedInvoice.jumlah_hold ?? 0)}</strong>
                                            </div>
                                            <div>
                                                <span>Dikembalikan</span>
                                                <strong>{formatRupiah(selectedInvoice.selisih_dikembalikan ?? 0)}</strong>
                                            </div>
                                            <div className="invoice-total-row">
                                                <span>Total dibayar</span>
                                                <strong>{formatRupiah(selectedInvoice.biaya_aktual ?? 0)}</strong>
                                            </div>
                                        </div>
                                    </>
                                )}
                            </>
                        )}
                    </div>
                </div>
            )}

                        {/* ============================================================
                LAYAR 3 — PROFIL DRIVER (halaman penuh)
               ============================================================ */}
            <div className={`profile-screen ${view === 'profile' ? 'is-active' : 'is-hidden'}`}>
                <header className="profile-header">
                    <div className="profile-header-top">
                        <button
                            className="profile-back-btn"
                            onClick={() => { setView('home'); setIsEditingProfile(false); }}
                            aria-label="Kembali"
                        >
                            ←
                        </button>
                        <h1 className="profile-header-title">
                            {isEditingProfile ? 'Edit Profil' : 'Profil Saya'}
                        </h1>
                        <span className="profile-header-spacer" />
                    </div>
                </header>

                <main className="profile-content">
                    {profileLoading && (
                        <>
                            <div className="profile-hero profile-skeleton-hero">
                                <span className="profile-skeleton profile-skeleton-avatar" />
                                <span className="profile-skeleton profile-skeleton-line" style={{ width: '55%' }} />
                                <span className="profile-skeleton profile-skeleton-line" style={{ width: '35%' }} />
                            </div>
                            <div className="profile-card">
                                <span className="profile-skeleton profile-skeleton-row" />
                                <span className="profile-skeleton profile-skeleton-row" />
                                <span className="profile-skeleton profile-skeleton-row" />
                            </div>
                        </>
                    )}

                    {!profileLoading && profileError && (
                        <div className="profile-state">
                            <span className="profile-state-icon">⚠️</span>
                            <p>{profileError}</p>
                            <button className="profile-retry-btn" onClick={fetchProfile}>Coba lagi</button>
                        </div>
                    )}

                    {!profileLoading && !profileError && profile && !isEditingProfile && (
                        <>
                            <section className="profile-hero">
                                <span className="profile-avatar">{getInitial(profile.nama_lengkap)}</span>
                                <h2 className="profile-name">{profile.nama_lengkap}</h2>
                                <p className="profile-email-sub">{profile.email}</p>
                                <div className="profile-hero-chips">
                                    <span className={`dash-status-badge ${profile.status_akun === 'aktif' ? 'ok' : 'danger'}`}>
                                        {capitalize(profile.status_akun)}
                                    </span>
                                    {profile.peran && (
                                        <span className="profile-chip">{capitalize(profile.peran)}</span>
                                    )}
                                    {profile.umur != null && (
                                        <span className="profile-chip">{profile.umur} tahun</span>
                                    )}
                                </div>
                            </section>

                            <h3 className="profile-section-title">Informasi Akun</h3>
                            <div className="profile-card">
                                <div className="profile-row">
                                    <span className="profile-row-icon">✉️</span>
                                    <div className="profile-row-body">
                                        <span className="profile-row-label">Email</span>
                                        <span className="profile-row-value">{profile.email}</span>
                                    </div>
                                    <span className={`dash-status-badge ${profile.email_verified ? 'ok' : 'warn'}`}>
                                        {profile.email_verified ? 'Terverifikasi' : 'Belum verifikasi'}
                                    </span>
                                </div>
                                <div className="profile-row">
                                    <span className="profile-row-icon">📞</span>
                                    <div className="profile-row-body">
                                        <span className="profile-row-label">Nomor Telepon</span>
                                        <span className="profile-row-value">{profile.nomor_telepon || '-'}</span>
                                    </div>
                                </div>
                                <div className="profile-row">
                                    <span className="profile-row-icon">🎂</span>
                                    <div className="profile-row-body">
                                        <span className="profile-row-label">Tanggal Lahir</span>
                                        <span className="profile-row-value">{formatTanggalLahir(profile.tanggal_lahir)}</span>
                                    </div>
                                </div>
                                <div className="profile-row">
                                    <span className="profile-row-icon">📍</span>
                                    <div className="profile-row-body">
                                        <span className="profile-row-label">Alamat</span>
                                        <span className="profile-row-value">{profile.alamat || '-'}</span>
                                    </div>
                                </div>
                            </div>

                            <button className="profile-primary-btn" onClick={startEditProfile}>
                                ✏️ Edit Profil
                            </button>
                        </>
                    )}

                    {!profileLoading && !profileError && profile && isEditingProfile && (
                        <form className="profile-card profile-form" onSubmit={handleSubmitEditProfile}>
                            <div className="profile-field">
                                <label htmlFor="edit-nama">Nama Lengkap</label>
                                <input
                                    id="edit-nama"
                                    type="text"
                                    value={editForm.nama_lengkap}
                                    onChange={handleEditFieldChange('nama_lengkap')}
                                    autoComplete="name"
                                />
                            </div>

                            <div className="profile-field">
                                <label htmlFor="edit-email">Email</label>
                                <input
                                    id="edit-email"
                                    type="email"
                                    value={editForm.email}
                                    onChange={handleEditFieldChange('email')}
                                    autoComplete="email"
                                />
                                <p className="profile-notice">
                                    Mengubah email akan mereset status verifikasi email.
                                </p>
                            </div>

                            <div className="profile-field">
                                <label htmlFor="edit-telepon">Nomor Telepon</label>
                                <input
                                    id="edit-telepon"
                                    type="tel"
                                    inputMode="numeric"
                                    value={editForm.nomor_telepon}
                                    onChange={handleEditFieldChange('nomor_telepon')}
                                    autoComplete="tel"
                                />
                            </div>

                            <div className="profile-field">
                                <label htmlFor="edit-lahir">Tanggal Lahir</label>
                                <input
                                    id="edit-lahir"
                                    type="date"
                                    value={editForm.tanggal_lahir}
                                    onChange={handleEditFieldChange('tanggal_lahir')}
                                />
                            </div>

                            <div className="profile-field">
                                <label htmlFor="edit-alamat">Alamat</label>
                                <textarea
                                    id="edit-alamat"
                                    rows={3}
                                    value={editForm.alamat}
                                    onChange={handleEditFieldChange('alamat')}
                                />
                            </div>

                            {editError && <p className="settings-pin-error profile-form-error">{editError}</p>}

                            <div className="profile-form-actions">
                                <button type="button" className="profile-secondary-btn" onClick={cancelEditProfile} disabled={editSubmitting}>
                                    Batal
                                </button>
                                <button type="submit" className="profile-primary-btn" disabled={editSubmitting}>
                                    {editSubmitting ? 'Menyimpan...' : 'Simpan'}
                                </button>
                            </div>
                        </form>
                    )}
                </main>
            </div>

            {/* ============================================================
                PANEL PENGATURAN — dibuka lewat tombol ⚙️ di header dashboard.
                Berisi profil singkat & menu akun (profil, kendaraan,
                pembayaran, riwayat, bantuan, keluar). Item menu masih
                placeholder — sambungkan ke halaman/endpoint masing-masing
                nanti di backend.
               ============================================================ */}
            {showSettings && (
                <div
                    className="settings-overlay"
                    onClick={() => {
                        setShowSettings(false);
                        setSettingsScreen('menu');
                    }}
                >
                    <div className="settings-panel" onClick={(e) => e.stopPropagation()}>
                        <div className="settings-panel-handle" />

                        {settingsScreen === 'menu' && (
                            <>
                                <div className="settings-panel-header">
                                    <span className="settings-panel-title">Pengaturan</span>
                                    <button
                                        className="mapdash-notif-close"
                                        onClick={() => setShowSettings(false)}
                                        aria-label="Tutup pengaturan"
                                    >
                                        ✕
                                    </button>
                                </div>

                                <button className="settings-profile" onClick={openProfileScreen}>
                                        <span className="settings-profile-avatar">👤</span>
                                        <div className="settings-profile-info">
                                            <p className="settings-profile-name">
                                                {profile?.nama_lengkap ?? user.nama}
                                            </p>
                                            <p className="settings-profile-sub">Lihat & edit profil</p>
                                        </div>
                                        <span className="settings-menu-arrow">›</span>
                                    </button>

                                <div className="settings-menu">
                                    <button className="settings-menu-item" onClick={onNavigateToVehicles}>
                                        <span className="settings-menu-icon">🚗</span>
                                        <span className="settings-menu-label">Kendaraan Saya</span>
                                        <span className="settings-menu-arrow">›</span>
                                    </button>
                                    <button className="settings-menu-item">
                                        <span className="settings-menu-icon">💳</span>
                                        <span className="settings-menu-label">Metode Pembayaran</span>
                                        <span className="settings-menu-arrow">›</span>
                                    </button>
                                    <button className="settings-menu-item" onClick={openPinManager}>
                                        <span className="settings-menu-icon">🔒</span>
                                        <span className="settings-menu-label">
                                            Kelola PIN Dompet
                                            <span className="settings-menu-sublabel">
                                                {hasPin ? 'PIN aktif' : 'Belum diatur'}
                                            </span>
                                        </span>
                                        <span className="settings-menu-arrow">›</span>
                                    </button>
                                    <button className="settings-menu-item">
                                        <span className="settings-menu-icon">🔔</span>
                                        <span className="settings-menu-label">Notifikasi</span>
                                        <span className="settings-menu-arrow">›</span>
                                    </button>
                                    <button className="settings-menu-item" onClick={onNavigateToHelp}>
                                        <span className="settings-menu-icon">❓</span>
                                        <span className="settings-menu-label">Bantuan</span>
                                        <span className="settings-menu-arrow">›</span>
                                    </button>
                                </div>

                                {onLogout && (
                                    <button className="settings-logout-btn" onClick={onLogout}>
                                        🚪 Keluar
                                    </button>
                                )}
                            </>
                        )}

                        {/* ------------------------------------------------
                            LAYAR KELOLA PIN DOMPET
                           ------------------------------------------------ */}
                        {settingsScreen === 'pin' && (
                            <div className="settings-subscreen">
                                <div className="settings-panel-header">
                                    <button
                                        className="settings-back-btn"
                                        onClick={closePinManager}
                                        aria-label="Kembali ke pengaturan"
                                    >
                                        ←
                                    </button>
                                    <span className="settings-panel-title">Kelola PIN Dompet</span>
                                    <button
                                        className="mapdash-notif-close"
                                        onClick={() => {
                                            setShowSettings(false);
                                            setSettingsScreen('menu');
                                        }}
                                        aria-label="Tutup pengaturan"
                                    >
                                        ✕
                                    </button>
                                </div>

                                {pinSuccess && <p className="settings-pin-success">✓ {pinSuccess}</p>}

                                {/* Belum punya PIN, atau baru dinonaktifkan -> form buat PIN */}
                                {(!hasPin || pinFormMode === 'create') && (
                                    <form className="settings-pin-form" onSubmit={handleCreatePin}>
                                        <p className="settings-pin-desc">
                                            Buat PIN 6 digit untuk konfirmasi top up dan pembayaran dari
                                            saldo dompet Anda.
                                        </p>

                                        <label className="settings-pin-label" htmlFor="pin-new">PIN Baru</label>
                                        <input
                                            id="pin-new"
                                            className="settings-pin-input"
                                            type="password"
                                            inputMode="numeric"
                                            autoComplete="off"
                                            maxLength={6}
                                            placeholder="••••••"
                                            value={pinNewInput}
                                            onChange={handlePinDigitsChange(setPinNewInput)}
                                        />

                                        <label className="settings-pin-label" htmlFor="pin-confirm">Konfirmasi PIN Baru</label>
                                        <input
                                            id="pin-confirm"
                                            className="settings-pin-input"
                                            type="password"
                                            inputMode="numeric"
                                            autoComplete="off"
                                            maxLength={6}
                                            placeholder="••••••"
                                            value={pinConfirmInput}
                                            onChange={handlePinDigitsChange(setPinConfirmInput)}
                                        />

                                        {pinError && <p className="settings-pin-error">{pinError}</p>}

                                        <button type="submit" className="settings-pin-submit" disabled={pinSubmitting}>
                                            {pinSubmitting ? 'Menyimpan...' : 'Simpan PIN'}
                                        </button>
                                    </form>
                                )}

                                {/* Sudah punya PIN & tidak sedang membuat baru -> status + aksi */}
                                {hasPin && pinFormMode === null && (
                                    <div className="settings-pin-status">
                                        <div className="settings-pin-status-row">
                                            <span className="settings-pin-status-icon">🔒</span>
                                            <div>
                                                <p className="settings-pin-status-title">PIN Dompet Aktif</p>
                                                <p className="settings-pin-status-sub">•• •• ••</p>
                                            </div>
                                        </div>

                                        <button
                                            className="settings-menu-item"
                                            onClick={() => {
                                                resetPinInputs();
                                                setPinSuccess('');
                                                setPinFormMode('change');
                                            }}
                                        >
                                            <span className="settings-menu-icon">✏️</span>
                                            <span className="settings-menu-label">Ubah PIN</span>
                                            <span className="settings-menu-arrow">›</span>
                                        </button>

                                        <button
                                            className="settings-pin-disable-btn"
                                            onClick={() => {
                                                resetPinInputs();
                                                setPinSuccess('');
                                                setPinFormMode('disable');
                                            }}
                                        >
                                            Nonaktifkan PIN
                                        </button>
                                    </div>
                                )}

                                {/* Konfirmasi PIN saat ini sebelum menonaktifkan */}
                                {hasPin && pinFormMode === 'disable' && (
                                    <form className="settings-pin-form" onSubmit={handleDisablePin}>
                                        <p className="settings-pin-desc">
                                            Masukkan PIN kamu saat ini untuk mengonfirmasi penonaktifan.
                                        </p>

                                        <label className="settings-pin-label" htmlFor="pin-disable">PIN Saat Ini</label>
                                        <input
                                            id="pin-disable"
                                            className="settings-pin-input"
                                            type="password"
                                            inputMode="numeric"
                                            autoComplete="off"
                                            maxLength={6}
                                            placeholder="••••••"
                                            value={pinOldInput}
                                            onChange={handlePinDigitsChange(setPinOldInput)}
                                        />

                                        {pinError && <p className="settings-pin-error">{pinError}</p>}

                                        <div className="settings-pin-form-actions">
                                            <button
                                                type="button"
                                                className="settings-pin-cancel"
                                                onClick={() => {
                                                    setPinFormMode(null);
                                                    resetPinInputs();
                                                }}
                                            >
                                                Batal
                                            </button>
                                            <button type="submit" className="settings-pin-submit" disabled={pinSubmitting}>
                                                {pinSubmitting ? 'Memproses...' : 'Nonaktifkan'}
                                            </button>
                                        </div>
                                    </form>
                                )}

                                {/* Sedang mengubah PIN yang sudah ada */}
                                {hasPin && pinFormMode === 'change' && (
                                    <form className="settings-pin-form" onSubmit={handleChangePin}>
                                        <label className="settings-pin-label" htmlFor="pin-old">PIN Lama</label>
                                        <input
                                            id="pin-old"
                                            className="settings-pin-input"
                                            type="password"
                                            inputMode="numeric"
                                            autoComplete="off"
                                            maxLength={6}
                                            placeholder="••••••"
                                            value={pinOldInput}
                                            onChange={handlePinDigitsChange(setPinOldInput)}
                                        />

                                        <label className="settings-pin-label" htmlFor="pin-new-2">PIN Baru</label>
                                        <input
                                            id="pin-new-2"
                                            className="settings-pin-input"
                                            type="password"
                                            inputMode="numeric"
                                            autoComplete="off"
                                            maxLength={6}
                                            placeholder="••••••"
                                            value={pinNewInput}
                                            onChange={handlePinDigitsChange(setPinNewInput)}
                                        />

                                        <label className="settings-pin-label" htmlFor="pin-confirm-2">Konfirmasi PIN Baru</label>
                                        <input
                                            id="pin-confirm-2"
                                            className="settings-pin-input"
                                            type="password"
                                            inputMode="numeric"
                                            autoComplete="off"
                                            maxLength={6}
                                            placeholder="••••••"
                                            value={pinConfirmInput}
                                            onChange={handlePinDigitsChange(setPinConfirmInput)}
                                        />

                                        {pinError && <p className="settings-pin-error">{pinError}</p>}

                                        <div className="settings-pin-form-actions">
                                            <button
                                                type="button"
                                                className="settings-pin-cancel"
                                                onClick={() => {
                                                    setPinFormMode(null);
                                                    resetPinInputs();
                                                }}
                                            >
                                                Batal
                                            </button>
                                            <button type="submit" className="settings-pin-submit" disabled={pinSubmitting}>
                                                {pinSubmitting ? 'Menyimpan...' : 'Simpan'}
                                            </button>
                                        </div>
                                    </form>
                                )}
                            </div>
                        )}
                                                {/* ------------------------------------------------
                            LAYAR PROFIL DRIVER
                           ------------------------------------------------ */}
                        {settingsScreen === 'profile' && (
                            <div className="settings-subscreen">
                                <div className="settings-panel-header">
                                    <button
                                        className="settings-back-btn"
                                        onClick={closeProfileScreen}
                                        aria-label="Kembali ke pengaturan"
                                    >
                                        ←
                                    </button>
                                    <span className="settings-panel-title">Profil Saya</span>
                                    <button
                                        className="mapdash-notif-close"
                                        onClick={() => {
                                            setShowSettings(false);
                                            setSettingsScreen('menu');
                                        }}
                                        aria-label="Tutup pengaturan"
                                    >
                                        ✕
                                    </button>
                                </div>

                                {profileLoading && <p className="dash-empty">Memuat profil...</p>}

                                {!profileLoading && profileError && (
                                    <p className="settings-pin-error">{profileError}</p>
                                )}

                                {!profileLoading && !profileError && profile && (
                                    <div className="settings-profile-detail">
                                        <div className="settings-profile-detail-avatar-row">
                                            <span className="settings-profile-avatar settings-profile-avatar-lg">👤</span>
                                            <p className="settings-profile-detail-name">{profile.nama_lengkap}</p>
                                            <span className={`dash-status-badge ${profile.status_akun === 'aktif' ? 'ok' : 'danger'}`}>
                                                {profile.status_akun}
                                            </span>
                                        </div>

                                        <div className="settings-profile-detail-list">
                                            <div className="settings-profile-detail-item">
                                                <span className="settings-menu-label">Peran</span>
                                                <span className="settings-profile-detail-value">{profile.peran}</span>
                                            </div>
                                            <div className="settings-profile-detail-item">
                                                <span className="settings-menu-label">Email</span>
                                                <span className="settings-profile-detail-value">
                                                    {profile.email}{' '}
                                                    {profile.email_verified ? '✓' : '(belum diverifikasi)'}
                                                </span>
                                            </div>
                                            <div className="settings-profile-detail-item">
                                                <span className="settings-menu-label">Nomor Telepon</span>
                                                <span className="settings-profile-detail-value">
                                                    {profile.nomor_telepon ?? '-'}
                                                </span>
                                            </div>
                                            <div className="settings-profile-detail-item">
                                                <span className="settings-menu-label">Tanggal Lahir</span>
                                                <span className="settings-profile-detail-value">
                                                    {profile.tanggal_lahir ?? '-'}
                                                </span>
                                            </div>
                                            <div className="settings-profile-detail-item">
                                                <span className="settings-menu-label">Umur</span>
                                                <span className="settings-profile-detail-value">
                                                    {profile.umur != null ? `${profile.umur} tahun` : '-'}
                                                </span>
                                            </div>
                                            <div className="settings-profile-detail-item">
                                                <span className="settings-menu-label">Alamat</span>
                                                <span className="settings-profile-detail-value">
                                                    {profile.alamat ?? '-'}
                                                </span>
                                            </div>
                                        </div>

                                        <button className="settings-pin-submit">
                                            Edit Profil
                                        </button>
                                    </div>
                                )}
                            </div>
                        )}

                    </div>
                </div>
            )}
        </div>
    );
}
