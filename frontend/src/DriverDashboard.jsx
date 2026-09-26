import React, { useState, useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import './driverDashboard.css';
import { getWallet, createPin, changePin as changePinApi, disablePin as disablePinApi } from './api/wallet';
import { getProfile, updateProfile } from './api/profile';

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

const DUMMY_VEHICLES = [
    { id_vehicle: 1, merek: 'Hyundai', model: 'Ioniq 5', nomor_polisi: 'B 1234 EV', tipe_konektor: 'CCS2' },
    { id_vehicle: 2, merek: 'Wuling', model: 'Air EV', nomor_polisi: 'B 5678 EV', tipe_konektor: 'Type 2' },
];

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
    },
];

const CONNECTOR_FILTERS = ['Semua', 'CCS2', 'Type 2', 'CHAdeMO'];

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

export default function DriverDashboard({ user: authUser, onLogout }) {
    // Data profil dari login (nama dsb). Saldo TIDAK diambil dari sini —
    // saldo selalu ditarik live dari GET /api/wallet (lihat effect di bawah)
    // supaya selalu sinkron dengan database.
    const user = {
        nama: authUser?.profile?.nama_lengkap || authUser?.email || DUMMY_USER.nama,
    };
    const [vehicles] = useState(DUMMY_VEHICLES);
    const [activeVehicleId, setActiveVehicleId] = useState(vehicles[0].id_vehicle);
    const [stations] = useState(DUMMY_STATIONS);
    const [connectorFilter, setConnectorFilter] = useState('Semua');
    const [activeSession, setActiveSession] = useState(DUMMY_ACTIVE_SESSION);
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

    const activeVehicle = vehicles.find((v) => v.id_vehicle === activeVehicleId);

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

    const handleStopSession = () => {
        // TODO: panggil endpoint "Menghentikan Sesi Charging" (FR23),
        // lalu tampilkan hasil penyelesaian transaksi (FR34 / FR37).
        setActiveSession(null);
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

    const cycleVehicle = () => {
        const idx = vehicles.findIndex((v) => v.id_vehicle === activeVehicleId);
        const next = vehicles[(idx + 1) % vehicles.length];
        setActiveVehicleId(next.id_vehicle);
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

    const goToActiveSessionOnMap = () => {
        if (!activeSession) return;
        const station = stations.find((s) => s.id_location === activeSession.id_location);
        goToMap(station);
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
                        <span />
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

                    <div className="home-greeting-block">
                        <p className="home-greeting-text">{getGreeting()}, {firstName} 👋</p>
                        <button
                            className="home-vehicle-pill"
                            onClick={cycleVehicle}
                            title={vehicles.length > 1 ? 'Ketuk untuk ganti kendaraan' : undefined}
                        >
                            <span className="home-vehicle-pill-icon">🚗</span>
                            <span className="home-vehicle-pill-text">{activeVehicle.model} · {activeVehicle.nomor_polisi}</span>
                            {vehicles.length > 1 && <span className="home-vehicle-pill-swap">⇄</span>}
                        </button>
                    </div>
                </header>

                <div className="home-wallet-card">
                    <div>
                        <p className="home-wallet-label">Saldo Dompet</p>
                        <p className="home-wallet-value">
                            {walletLoading ? '...' : formatRupiah(wallet?.saldo ?? 0)}
                        </p>
                    </div>
                    <button className="home-wallet-topup">+ Top Up</button>
                </div>

                <main className="home-content">
                    {showNotif && activeSession && (
                        <div className="mapdash-notif home-notif">
                            <span>⚡ Sesi charging Anda di <strong>{activeSession.nama_lokasi}</strong> sedang berjalan.</span>
                            <button className="mapdash-notif-close" onClick={() => setShowNotif(false)}>✕</button>
                        </div>
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
                                <button className="dash-btn-navigate home-session-map-btn" onClick={goToActiveSessionOnMap}>
                                    🗺️ Lihat di Peta
                                </button>
                                <button className="dash-btn-stop" onClick={handleStopSession}>
                                    Hentikan Sesi
                                </button>
                            </div>
                        </section>
                    )}

                    <button className="home-cta-map" onClick={() => goToMap()}>
                        <span className="home-cta-icon">🗺️</span>
                        <span className="home-cta-text">
                            <span className="home-cta-title">Cari Charging Station</span>
                            <span className="home-cta-sub">{filteredStations.length} station di sekitar Anda</span>
                        </span>
                        <span className="home-cta-arrow">→</span>
                    </button>

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
                        <div className="home-section-title-row">
                            <h3 className="home-section-title">Station Terdekat</h3>
                            <button className="dash-link-btn" onClick={() => goToMap()}>Lihat di Peta →</button>
                        </div>

                        <div className="home-filters-inline">
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
                            <h3 className="home-section-title">Kendaraan Saya</h3>
                        </div>
                        <div className="home-vehicle-list">
                            {vehicles.map((v) => (
                                <button
                                    key={v.id_vehicle}
                                    className={`home-vehicle-item ${v.id_vehicle === activeVehicleId ? 'active' : ''}`}
                                    onClick={() => setActiveVehicleId(v.id_vehicle)}
                                >
                                    <span className="home-vehicle-item-avatar">🚗</span>
                                    <span className="home-vehicle-item-info">
                                        <span className="home-vehicle-item-name">{v.merek} {v.model}</span>
                                        <span className="home-vehicle-item-plate">{v.nomor_polisi} · {v.tipe_konektor}</span>
                                    </span>
                                    {v.id_vehicle === activeVehicleId && <span className="home-vehicle-item-check">✓</span>}
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
                            <button className="dash-btn-stop" onClick={handleStopSession}>
                                Hentikan Sesi Charging
                            </button>
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
                                                    <button className="dash-btn-navigate" disabled={badge.tone !== 'ok'}>
                                                        Pilih
                                                    </button>
                                                </div>
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

                        {/* ============================================================
                LAYAR 3 — PROFIL DRIVER (halaman penuh)
               ============================================================ */}
            <div className={`profile-screen ${view === 'profile' ? 'is-active' : 'is-hidden'}`}>
                <header className="profile-header">
                    <button className="mapdash-round-btn" onClick={() => { setView('home'); setIsEditingProfile(false); }} aria-label="Kembali">
                        ←
                    </button>
                    <span className="profile-header-title">Profil Saya</span>
                    <span style={{ width: 40 }} />
                </header>

                <main className="profile-content">
                    {profileLoading && <p className="dash-empty">Memuat profil...</p>}

                    {!profileLoading && profileError && (
                        <p className="settings-pin-error">{profileError}</p>
                    )}

                    {!profileLoading && !profileError && profile && !isEditingProfile && (
                        <>
                            <div className="profile-avatar-block">
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
                                    <span className="settings-profile-detail-value">{profile.nomor_telepon ?? '-'}</span>
                                </div>
                                <div className="settings-profile-detail-item">
                                    <span className="settings-menu-label">Tanggal Lahir</span>
                                    <span className="settings-profile-detail-value">{profile.tanggal_lahir ?? '-'}</span>
                                </div>
                                <div className="settings-profile-detail-item">
                                    <span className="settings-menu-label">Umur</span>
                                    <span className="settings-profile-detail-value">
                                        {profile.umur != null ? `${profile.umur} tahun` : '-'}
                                    </span>
                                </div>
                                <div className="settings-profile-detail-item">
                                    <span className="settings-menu-label">Alamat</span>
                                    <span className="settings-profile-detail-value">{profile.alamat ?? '-'}</span>
                                </div>
                            </div>

                            <button className="settings-pin-submit" onClick={startEditProfile}>
                                Edit Profil
                            </button>
                        </>
                    )}

                    {!profileLoading && !profileError && profile && isEditingProfile && (
                        <form className="settings-pin-form" onSubmit={handleSubmitEditProfile}>
                            <label className="settings-pin-label" htmlFor="edit-nama">Nama Lengkap</label>
                            <input
                                id="edit-nama"
                                className="settings-pin-input profile-text-input"
                                type="text"
                                value={editForm.nama_lengkap}
                                onChange={handleEditFieldChange('nama_lengkap')}
                            />
                            <p className="settings-pin-desc" style={{ fontSize: 12, color: '#a5730c' }}>
                                ⚠️ Mengubah email akan membuat status verifikasi email direset.
                            </p>
                            <label className="settings-pin-label" htmlFor="edit-email">Email</label>
                            <input
                                id="edit-email"
                                className="settings-pin-input profile-text-input"
                                type="email"
                                value={editForm.email}
                                onChange={handleEditFieldChange('email')}
                            />

                            <label className="settings-pin-label" htmlFor="edit-telepon">Nomor Telepon</label>
                            <input
                                id="edit-telepon"
                                className="settings-pin-input profile-text-input"
                                type="text"
                                inputMode="numeric"
                                value={editForm.nomor_telepon}
                                onChange={handleEditFieldChange('nomor_telepon')}
                            />

                            <label className="settings-pin-label" htmlFor="edit-lahir">Tanggal Lahir</label>
                            <input
                                id="edit-lahir"
                                className="settings-pin-input profile-text-input"
                                type="date"
                                value={editForm.tanggal_lahir}
                                onChange={handleEditFieldChange('tanggal_lahir')}
                            />

                            <label className="settings-pin-label" htmlFor="edit-alamat">Alamat</label>
                            <textarea
                                id="edit-alamat"
                                className="settings-pin-input profile-textarea"
                                rows={3}
                                value={editForm.alamat}
                                onChange={handleEditFieldChange('alamat')}
                            />

                            {editError && <p className="settings-pin-error">{editError}</p>}

                            <div className="settings-pin-form-actions">
                                <button type="button" className="settings-pin-cancel" onClick={cancelEditProfile}>
                                    Batal
                                </button>
                                <button type="submit" className="settings-pin-submit" disabled={editSubmitting}>
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
                                    <button className="settings-menu-item">
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
                                        <span className="settings-menu-icon">🧾</span>
                                        <span className="settings-menu-label">Riwayat Transaksi</span>
                                        <span className="settings-menu-arrow">›</span>
                                    </button>
                                    <button className="settings-menu-item">
                                        <span className="settings-menu-icon">🔔</span>
                                        <span className="settings-menu-label">Notifikasi</span>
                                        <span className="settings-menu-arrow">›</span>
                                    </button>
                                    <button className="settings-menu-item">
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
