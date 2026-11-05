import React, { useState, useEffect, useRef, useMemo } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { FiArrowLeft, FiArrowRight, FiBattery, FiBell, FiCalendar, FiChevronRight, FiCreditCard, FiCrosshair, FiEdit2, FiEye, FiEyeOff, FiFileText, FiHelpCircle, FiLock, FiLogOut, FiMap, FiMapPin, FiNavigation, FiPhone, FiSettings, FiTruck, FiUser, FiX, FiZap } from 'react-icons/fi';
import './driverDashboard.css';
import './driverDashboardEV.css';
import { getWallet, createPin, changePin as changePinApi, disablePin as disablePinApi, topUpWallet } from './api/wallet';
import { getProfile, updateProfile } from './api/profile';
import { getVehicles } from './api/vehicle';
import { getDrivingRoute, googleMapsDirectionsUrl, formatJarak, formatDurasi } from './api/routing';
import { getStations, distanceKm, distanceMeters, ARRIVAL_RADIUS_M, konektorLabel, sameConnector } from './api/station';
import { getActiveSession } from './api/charging';
import { finishChargingSession, interruptChargingSession } from './api/chargingSessions';
import { getPaymentDetail, getPaymentHistory } from './api/payments';
import StationDetail from './StationDetail';
import StartCharging from './StartCharging';

/** Memilih pesan error API yang bisa langsung ditampilkan kepada pengemudi. */
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

const DUMMY_USER = {
    nama: 'Stefanus Adrian',
    saldo_dompet: 185000,
};

const ACTIVE_VEHICLE_KEY = 'ev_active_vehicle';

const FALLBACK_DRIVER_POSITION = { lat: -7.8014, lng: 110.3644 };
const DUMMY_ACTIVE_SESSION = null;
const CONNECTOR_FILTERS = ['Semua', 'CCS2', 'Type 2', 'CHAdeMO'];
const TOP_UP_METHODS = ['Mandiri', 'OVO', 'BCA', 'BRI', 'BNI'];

/** Menampilkan nominal sebagai rupiah dengan pemisah angka lokal. */
function formatRupiah(value) {
    if (value == null) return '-';
    return 'Rp' + value.toLocaleString('id-ID');
}

/** Mengubah durasi milidetik menjadi teks jam/menit untuk sesi aktif. */
function formatDuration(ms) {
    const totalMinutes = Math.floor(ms / 60000);
    const h = Math.floor(totalMinutes / 60);
    const m = totalMinutes % 60;
    return h > 0 ? `${h} jam ${m} menit` : `${m} menit`;
}

/** Memilih sapaan dashboard pengemudi berdasarkan jam lokal. */
function getGreeting() {
    const h = new Date().getHours();
    if (h >= 4 && h < 10) return 'Selamat pagi';
    if (h >= 10 && h < 15) return 'Selamat siang';
    if (h >= 15 && h < 18) return 'Selamat sore';
    return 'Selamat malam';
}

/** Membentuk label ketersediaan station dari status dan jumlah port bebas. */
function stationStatusLabel(status, tersedia) {
    if (status === 'Dalam Perawatan') return { text: 'Perawatan', tone: 'warn' };
    if (status === 'Nonaktif') return { text: 'Nonaktif', tone: 'danger' };
    if (tersedia === 0) return { text: 'Penuh', tone: 'danger' };
    return { text: 'Tersedia', tone: 'ok' };
}

/** Membuat ikon peta station dengan warna sesuai keadaan ketersediaannya. */
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

/** Memformat tanggal lahir akun menjadi format tanggal Indonesia. */
function formatTanggalLahir(value) {
    if (!value) return '-';
    const [y, m, d] = String(value).slice(0, 10).split('-').map(Number);
    if (!y || !m || !d) return String(value);
    return `${d} ${BULAN_ID[m - 1]} ${y}`;
}

/** Mengambil inisial nama untuk avatar tanpa foto. */
function getInitial(name) {
    return (name || '?').trim().charAt(0).toUpperCase() || '?';
}

/** Membesarkan huruf pertama label yang ditampilkan. */
function capitalize(str) {
    const s = String(str ?? '');
    return s.charAt(0).toUpperCase() + s.slice(1);
}

/** Mengelola peta station, dompet, profil, transaksi, dan sesi aktif pengemudi. */
export default function DriverDashboard({ user: authUser, onLogout, onNavigateToVehicles, onNavigateToHelp, onNavigateToWallet }) {
    const user = {
        nama: authUser?.profile?.nama_lengkap || authUser?.email || DUMMY_USER.nama,
    };

    const [vehicles, setVehicles] = useState([]);
    const [vehiclesLoading, setVehiclesLoading] = useState(true);
    const [vehiclesError, setVehiclesError] = useState('');
    const [activeVehicleId, setActiveVehicleId] = useState(() => {
        const saved = Number(localStorage.getItem(ACTIVE_VEHICLE_KEY));
        return saved || null;
    });

    const [rawStations, setRawStations] = useState([]);
    const [stationsError, setStationsError] = useState('');
    const [stationsLoading, setStationsLoading] = useState(true);
    const [detailStationId, setDetailStationId] = useState(null);
    const [showStartCharging, setShowStartCharging] = useState(false);
    const [sessionError, setSessionError] = useState('');
    const [stoppingSession, setStoppingSession] = useState(false);
    const [startPortId, setStartPortId] = useState(null); // port yang dipilih dari daftar station
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
    const [connectorFilter, setConnectorFilter] = useState('Semua');
    const [activeSession, setActiveSession] = useState(DUMMY_ACTIVE_SESSION);
    const [elapsed, setElapsed] = useState(0);
    const [sheetExpanded, setSheetExpanded] = useState(false);
    const [selectedStationId, setSelectedStationId] = useState(null);
    const [showNotif, setShowNotif] = useState(!!DUMMY_ACTIVE_SESSION);
    const [showSettings, setShowSettings] = useState(false);

    const [wallet, setWallet] = useState(null);
    const [walletLoading, setWalletLoading] = useState(true);
    const [hideWalletBalance, setHideWalletBalance] = useState(() => localStorage.getItem('ev_hide_saldo') === '1');
    /** Menyamakan preferensi tampil/sembunyi saldo dengan halaman Dompet Digital. */
    const toggleWalletBalance = () => setHideWalletBalance((hidden) => {
        const nextHidden = !hidden;
        localStorage.setItem('ev_hide_saldo', nextHidden ? '1' : '0');
        return nextHidden;
    });
    /** Memuat saldo dompet dan status perlindungan PIN. */
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

    useEffect(() => {
        fetchWallet();
    }, []);

    const [profile, setProfile] = useState(null);
    const [profileLoading, setProfileLoading] = useState(true);
    const [profileError, setProfileError] = useState('');
    /** Memuat profil akun yang dipakai dashboard dan formulir edit. */
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

    const [isEditingProfile, setIsEditingProfile] = useState(false);
    const [editForm, setEditForm] = useState({ nama_lengkap: '', nomor_telepon: '', tanggal_lahir: '', alamat: '', email: '' });
    const [editError, setEditError] = useState('');
    const [editSubmitting, setEditSubmitting] = useState(false);

    /** Menyalin data profil saat ini ke mode formulir edit. */
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

    /** Menutup mode edit dan membuang perubahan yang belum disimpan. */
    const cancelEditProfile = () => {
        setIsEditingProfile(false);
        setEditError('');
    };

    /** Membuat handler input untuk memperbarui satu field profil. */
    const handleEditFieldChange = (field) => (e) => {
        setEditForm((prev) => ({ ...prev, [field]: e.target.value }));
    };

    /** Mengirim perubahan profil lalu memperbarui data dashboard. */
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

    /** Membuka detail profil dari panel pengaturan. */
    const openProfileScreen = () => {
        setSettingsScreen('profile');
        setIsEditingProfile(false);
    };

    /** Menutup tampilan profil dan kembali ke dashboard peta. */
    const closeProfileScreen = () => {
        setSettingsScreen('menu');
    };

    /** Membuka panel pengaturan selalu dari menu utama. */
    const openSettings = () => {
        setSettingsScreen('menu');
        setShowSettings(true);
    };

    /** Membuka formulir edit profil dari panel pengaturan. */
    const openProfileEditor = () => {
        startEditProfile();
        setShowSettings(false);
        setSettingsScreen('menu');
        setView('profile');
    };

    const [settingsScreen, setSettingsScreen] = useState('menu');
    const hasPin = !!wallet?.pin_sudah_diset;
    const [pinFormMode, setPinFormMode] = useState(null);
    const [pinOldInput, setPinOldInput] = useState('');
    const [pinNewInput, setPinNewInput] = useState('');
    const [pinConfirmInput, setPinConfirmInput] = useState('');
    const [pinError, setPinError] = useState('');
    const [pinSuccess, setPinSuccess] = useState('');
    const [pinSubmitting, setPinSubmitting] = useState(false);
    const [driverPosition, setDriverPosition] = useState(FALLBACK_DRIVER_POSITION);
    const [locationStatus, setLocationStatus] = useState('locating');
    const [view, setView] = useState('home');

    /** Memuat kendaraan pengemudi dan memilih kendaraan aktif bila perlu. */
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

    useEffect(() => {
        fetchVehicles();
        /** Menyegarkan daftar kendaraan saat tab aplikasi kembali aktif. */
        const onFocus = () => fetchVehicles(true);
        window.addEventListener('focus', onFocus);
        return () => window.removeEventListener('focus', onFocus);
    }, []);

    useEffect(() => {
        if (vehiclesLoading) return;
        const stillExists = vehicles.some((v) => v.id_vehicle === activeVehicleId);
        if (!stillExists) {
            setActiveVehicleId(vehicles[0]?.id_vehicle ?? null);
        }
    }, [vehicles, vehiclesLoading, activeVehicleId]);

    useEffect(() => {
        if (activeVehicleId) localStorage.setItem(ACTIVE_VEHICLE_KEY, String(activeVehicleId));
    }, [activeVehicleId]);

    const activeVehicle = vehicles.find((v) => v.id_vehicle === activeVehicleId) ?? null;
    const posKey = `${driverPosition.lat.toFixed(2)},${driverPosition.lng.toFixed(2)}`;

    // Normalisasi stasiun untuk menghitung port dan ringkasan konektor yang kompatibel
    const stations = useMemo(
        () =>
            rawStations.map((s) => {
                const allPorts = [];
                if (s.chargers) {
                    s.chargers.forEach((c) => {
                        if (c.ports) {
                            c.ports.forEach((p) => allPorts.push(p));
                        }
                    });
                }
                const tersediaCount = allPorts.filter((p) => {
                    const st = String(p.status_port || '').toLowerCase().trim();
                    return st === 'available' || st === 'tersedia';
                }).length;
                const uniqueConnectors = [...new Set(allPorts.map((p) => p.tipe_konektor))];

                return {
                    ...s,
                    jarak_km: distanceKm(driverPosition, s),
                    charger_tersedia: tersediaCount,
                    charger_total: allPorts.length,
                    tipe_konektor_list: uniqueConnectors,
                };
            }),
        [rawStations, posKey]
    );

    useEffect(() => {
        let cancelled = false;
        getStations()
            .then((list) => {
                if (!cancelled) setRawStations(list);
            })
            .catch((err) => {
                if (!cancelled) setStationsError(extractErrorMessage(err, 'Daftar station tidak dapat dimuat.'));
            })
            .finally(() => {
                if (!cancelled) setStationsLoading(false);
            });
        return () => {
            cancelled = true;
        };
    }, []);

    /** Memuat ulang daftar station berdasarkan posisi dan kendaraan terpilih. */
    const reloadStations = async () => {
        setStationsLoading(true);
        setStationsError('');
        try {
            const list = await getStations();
            setRawStations(list);
        } catch (err) {
            setStationsError(extractErrorMessage(err, 'Daftar station tidak dapat dimuat.'));
        } finally {
            setStationsLoading(false);
        }
    };

    useEffect(() => {
        let cancelled = false;
        getActiveSession()
            .then((session) => {
                if (cancelled || !session) return;
                setActiveSession(session);
                setShowNotif(true);
            })
            .catch((err) => console.warn('Gagal memuat sesi aktif:', err));
        return () => {
            cancelled = true;
        };
    }, []);

    const selectedStation = stations.find((s) => s.id_location === selectedStationId) ?? null;
    const detailStation = stations.find((s) => s.id_location === detailStationId) ?? null;
    const distToSelectedM =
        selectedStation && locationStatus === 'live' ? distanceMeters(driverPosition, selectedStation) : null;
    const hasArrived = distToSelectedM != null && distToSelectedM <= ARRIVAL_RADIUS_M;

    const [route, setRoute] = useState(null);
    const [routeStatus, setRouteStatus] = useState('idle');
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
        return s.tipe_konektor_list?.some((t) => t.toLowerCase() === connectorFilter.toLowerCase());
    });

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
    }, []);

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

    useEffect(() => {
        const map = mapRef.current;
        if (!map) return;
        
        // Bersihkan marker lama
        Object.values(markersRef.current).forEach((m) => map.removeLayer(m));
        markersRef.current = {};
    
        // Iterasi filteredStations dengan pengaman koordinat
        filteredStations.forEach((s) => {
            // Pastikan lat dan lng valid sebelum dilempar ke Leaflet
            if (s.lat == null || s.lng == null || isNaN(s.lat) || isNaN(s.lng)) return;
    
            const badge = stationStatusLabel(s.status, s.charger_tersedia);
            const marker = L.marker([Number(s.lat), Number(s.lng)], { icon: buildStationIcon(badge.tone) })
                .addTo(map)
                .bindPopup(
                    `<strong>${s.nama_lokasi}</strong><br/>${s.charger_tersedia}/${s.charger_total} port &middot; ${formatRupiah(s.tarif_per_kwh)}/kWh`
                )
                .on('click', () => {
                    setSelectedStationId(s.id_location);
                    setSheetExpanded(true);
                });
                
            markersRef.current[s.id_location] = marker;
        });
    }, [connectorFilter, filteredStations]); // Ubah dependency dari stations ke filteredStations

    useEffect(() => {
        if (routeLayerRef.current || routeAbortRef.current || routeStatus !== 'idle') {
            clearRoute();
        }
    }, [selectedStationId]);

    useEffect(() => () => routeAbortRef.current?.abort(), []);

    useEffect(() => {
        if (!activeSession) return;
        /** Memperbarui penghitung durasi sesi aktif setiap interval. */
        const tick = () => setElapsed(Date.now() - activeSession.waktu_mulai);
        tick();
        const interval = setInterval(tick, 1000 * 30);
        return () => clearInterval(interval);
    }, [activeSession]);

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
    }, [view]);

    const activeSessionId = activeSession?.id_session;
    const activeSessionFull = activeSession?.sudah_penuh;
    useEffect(() => {
        if (!activeSessionId || activeSessionFull) return;
        let cancelled = false;
        /** Memeriksa progres sesi dari backend secara berkala. */
        const poll = () => {
            getActiveSession()
                .then((session) => {
                    if (cancelled || !session || session.id_session !== activeSessionId) return;
                    setActiveSession(session);
                })
                .catch(() => {});
        };
        const interval = setInterval(poll, 3000);
        return () => {
            cancelled = true;
            clearInterval(interval);
        };
    }, [activeSessionId, activeSessionFull]);

    const sessionProgressPct =
        activeSession && activeSession.target_kwh > 0
            ? Math.min(100, Math.round((activeSession.energi_kwh / activeSession.target_kwh) * 100))
            : 0;
    const sessionDurationMs =
        activeSession?.durasi_detik != null ? activeSession.durasi_detik * 1000 : elapsed;
    const sessionEstimatedCost = activeSession
        ? activeSession.biaya_berjalan ??
          activeSession.estimasi_biaya ??
          Math.round(activeSession.energi_kwh * activeSession.tarif_per_kwh + activeSession.biaya_parkir)
        : 0;

    /** Mengambil riwayat transaksi untuk daftar dan panel invoice. */
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

    // Sesi selesai / dibatalkan: tampilkan invoice, segarkan saldo, port, dan riwayat.
    /** Memperbarui saldo, histori, dan tampilan setelah sesi selesai. */
    const afterSessionSettled = async (settledInvoice) => {
        setInvoice(settledInvoice);
        setActiveSession(null);
        setShowNotif(false);
        reloadStations();
        await fetchWallet();
        await fetchTransactionHistory();
    };

    /** Meminta penghentian sesi normal dan memproses ringkasan transaksinya. */
    const handleStopSession = async () => {
        if (!activeSession || stoppingSession) return;
        setStoppingSession(true);
        setSessionError('');
        try {
            const finishedInvoice = await finishChargingSession(activeSession.id_session);
            await afterSessionSettled(finishedInvoice);
        } catch (err) {
            setSessionError(extractErrorMessage(err, 'Gagal menghentikan sesi charging. Coba lagi.'));
        } finally {
            setStoppingSession(false);
        }
    };

    /** Melaporkan sesi terhenti/gagal lalu menyegarkan status sesi dan dompet. */
    const handleInterruptSession = async () => {
        if (!activeSession || stoppingSession) return;
        setStoppingSession(true);
        setSessionError('');
        try {
            const interruptedInvoice = await interruptChargingSession(activeSession.id_session, {
                status: 'gagal',
                alasan: 'Gangguan charger dilaporkan oleh driver.',
            });
            await afterSessionSettled(interruptedInvoice);
        } catch (err) {
            setSessionError(extractErrorMessage(err, 'Gagal memproses gangguan sesi charging.'));
        } finally {
            setStoppingSession(false);
        }
    };

    /** Menyimpan sesi baru ke state dan membuka pemantauan progresnya. */
    const handleSessionStarted = (session) => {
        setShowStartCharging(false);
        setStartPortId(null);
        clearRoute();
        setSelectedStationId(null);
        setActiveSession(session);
        setShowNotif(true);
        setInvoice(null);
        setView('home');
        reloadStations();
        fetchWallet(); // saldo tersedia berkurang karena hold
    };

    // Mulai charging langsung dari port yang dipilih di daftar station.
    /** Membuka alur persiapan charging untuk station dan port terpilih. */
    const openStartCharging = (station, port) => {
        setSelectedStationId(station.id_location);
        setStartPortId(port?.id_port ?? null);
        setShowStartCharging(true);
    };

    /** Mengambil rincian pembayaran dan membuka invoice transaksi. */
    const handleOpenInvoice = async (idPayment) => {
        setSelectedInvoice(null);
        setInvoiceLoading(true);
        try {
            setSelectedInvoice(await getPaymentDetail(idPayment));
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

    /** Membuka formulir penambahan saldo dompet. */
    const openTopUpModal = () => {
        setTopUpAmount(100000);
        setTopUpMethod('Mandiri');
        setTopUpPin('');
        setTopUpError('');
        setShowTopUp(true);
    };

    /** Mengirim top up dari dashboard lalu memperbarui saldo. */
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
            await fetchTransactionHistory();
            setShowTopUp(false);
        } catch (err) {
            setTopUpError(extractErrorMessage(err, 'Top up gagal. Coba lagi.'));
        } finally {
            setTopUpSubmitting(false);
        }
    };

    /** Mengosongkan field PIN dan pesan validasi pada pengelola PIN. */
    const resetPinInputs = () => {
        setPinOldInput('');
        setPinNewInput('');
        setPinConfirmInput('');
        setPinError('');
    };

    /** Membuka pengaturan PIN dompet digital. */
    const openPinManager = () => {
        resetPinInputs();
        setPinSuccess('');
        setPinFormMode(hasPin ? null : 'create');
        setSettingsScreen('pin');
    };

    /** Menutup pengaturan PIN dan membersihkan state formulirnya. */
    const closePinManager = () => {
        resetPinInputs();
        setPinSuccess('');
        setPinFormMode(null);
        setSettingsScreen('menu');
    };

    /** Membatasi input kode PIN menjadi angka dengan panjang yang diizinkan. */
    const handlePinDigitsChange = (setter) => (e) => {
        const digitsOnly = e.target.value.replace(/\D/g, '').slice(0, 6);
        setter(digitsOnly);
    };

    /** Membuat PIN transaksi baru dan memperbarui status keamanan dompet. */
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
            await fetchWallet();
            setPinSuccess('PIN dompet berhasil dibuat.');
            setPinFormMode(null);
            resetPinInputs();
        } catch (err) {
            setPinError(extractErrorMessage(err, 'Gagal membuat PIN. Coba lagi.'));
        } finally {
            setPinSubmitting(false);
        }
    };

    /** Mengganti PIN dompet setelah memasukkan PIN lama dan PIN baru. */
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

    /** Menonaktifkan PIN setelah pengguna mengonfirmasi kredensialnya. */
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

    /** Meminta lokasi perangkat lalu memusatkan peta ke posisi pengemudi. */
    const handleLocateMe = () => {
        const map = mapRef.current;
        if (map) map.flyTo([driverPosition.lat, driverPosition.lng], 15);
    };

    /** Memusatkan peta dan membuka detail station yang dipilih. */
    const handleFocusStation = (s) => {
        const map = mapRef.current;
        if (map) map.flyTo([s.lat, s.lng], 16);
        setSelectedStationId(s.id_location);
        markersRef.current[s.id_location]?.openPopup();
    };

    /** Menutup detail station dan meminta tampilan rute menuju station. */
    const handleRouteFromDetail = (station) => {
        setDetailStationId(null);
        handleShowRoute(station);
    };

    /** Menghapus rute aktif dan menutup panel navigasi peta. */
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

    /** Mengambil rute berkendara dan menampilkannya pada peta dashboard. */
    const handleShowRoute = async (station) => {
        const map = mapRef.current;
        if (!map || !station) return;
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
                L.polyline(result.coords, { ...lineStyle, color: '#ffffff', weight: 10, opacity: 0.9 }),
                L.polyline(result.coords, { ...lineStyle, color: '#2e7d32', weight: 6, opacity: 1 }),
            ]).addTo(map);
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

    /** Berpindah ke kendaraan berikutnya untuk menyesuaikan hasil station. */
    const cycleVehicle = () => {
        if (vehicles.length === 0) {
            onNavigateToVehicles();
            return;
        }
        const idx = vehicles.findIndex((v) => v.id_vehicle === activeVehicleId);
        const next = vehicles[(idx + 1) % vehicles.length];
        setActiveVehicleId(next.id_vehicle);
    };

    /** Memilih station sebagai fokus peta dan kembali ke area peta. */
    const goToMap = (station) => {
        pendingFocusStationRef.current = station || null;
        setView('map');
        setSheetExpanded(!!station);
        if (station) setSelectedStationId(station.id_location);
    };

    /** Memusatkan peta ke lokasi station tempat sesi aktif berjalan. */
    const goToActiveSessionOnMap = () => {
        if (!activeSession) return;
        const station = stations.find((s) => s.id_location === activeSession.id_location);
        goToMap(station);
    };

    const activeVehicleConnector = activeVehicle ? konektorLabel(activeVehicle.tipe_konektor) : null;
    const suggestedStations = activeVehicleConnector
        ? stations.filter(s => s.tipe_konektor_list?.some(t => sameConnector(t, activeVehicle.tipe_konektor)))
        : stations;
    /** Meratakan port semua charger station agar dapat ditampilkan sebagai pilihan. */
    const stationPorts = (station) => (station.chargers ?? []).flatMap(charger =>
        (charger.ports ?? []).map(port => ({ ...port, kode_perangkat: charger.kode_perangkat,
            daya_kw: port.daya_kw ?? charger.daya_kw,
            status: port.status_port === 'available' || port.status_port === 'tersedia' ? 'tersedia' : port.status_port }))
    );
    /** Mengubah status teknis charger menjadi keterangan untuk pengemudi. */
    const chargerStatusLabel = (status) => {
        const s = String(status ?? '').toLowerCase();
        if (s === 'tersedia' || s === 'available') return { text: 'Tersedia', tone: 'ok' };
        if (s === 'maintenance') return { text: 'Maintenance', tone: 'warn' };
        return { text: capitalize(status || 'Tidak tersedia'), tone: 'danger' };
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
                            <p className="home-greeting-text">{getGreeting()}, {firstName}</p>
                            <p className="home-greeting-sub">Siap cari charger terdekat hari ini.</p>
                        </div>
                        <div className="home-header-actions">
                            <button
                                className="home-icon-btn"
                                aria-label="Notifikasi"
                                onClick={() => setShowNotif((v) => !v)}
                            >
                                <FiBell aria-hidden="true" />
                                {activeSession && <span className="mapdash-badge-dot" />}
                            </button>
                            <button
                                type="button"
                                className="home-icon-btn"
                                aria-label="Pengaturan"
                                onClick={openSettings}
                            >
                                <FiSettings aria-hidden="true" />
                            </button>
                        </div>
                    </div>

                    <div className="home-header-summary">
                        <div className="home-balance-panel">
                            <div>
                                <div className="home-wallet-label-row">
                                    <p className="home-wallet-label">Saldo Dompet</p>
                                    <button
                                        type="button"
                                        className="home-wallet-visibility"
                                        onClick={toggleWalletBalance}
                                        aria-label={hideWalletBalance ? 'Tampilkan saldo' : 'Sembunyikan saldo'}
                                        title={hideWalletBalance ? 'Tampilkan saldo' : 'Sembunyikan saldo'}
                                    >
                                        {hideWalletBalance ? <FiEye aria-hidden="true" /> : <FiEyeOff aria-hidden="true" />}
                                    </button>
                                </div>
                                <p className="home-wallet-value">
                                    {hideWalletBalance ? 'Rp ••••••' : walletLoading ? '...' : formatRupiah(wallet?.saldo ?? 0)}
                                </p>
                            </div>
                            <div className="home-wallet-actions">
                                <button className="home-wallet-topup" onClick={openTopUpModal}>+ Top Up</button>
                                <button className="home-wallet-open" onClick={onNavigateToWallet}>Buka Dompet</button>
                            </div>
                        </div>

                        <div className="home-vehicle-panel">
                            <div className="home-vehicle-panel-head">
                                <span className="home-vehicle-pill-icon"><FiZap aria-hidden="true" /></span>
                                <span>Kendaraan Aktif</span>
                            </div>
                            {vehicles.length > 0 ? (
                                <>
                                    <select
                                        className="home-vehicle-select"
                                        value={activeVehicleId ?? ''}
                                        onChange={(e) => setActiveVehicleId(Number(e.target.value))}
                                        disabled={vehiclesLoading}
                                    >
                                        {vehicles.map((v) => (
                                            <option key={v.id_vehicle} value={v.id_vehicle}>
                                                {v.merek} {v.model} · {v.nomor_polisi}
                                            </option>
                                        ))}
                                    </select>
                                    <span className="home-vehicle-connector">
                                        {activeVehicleConnector ? `Konektor ${activeVehicleConnector}` : 'Pilih kendaraan untuk mencocokkan konektor'}
                                    </span>
                                </>
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
                            <span><FiZap aria-hidden="true" /> Sesi charging Anda di <strong>{activeSession.nama_lokasi}</strong> sedang berjalan.</span>
                            <button className="mapdash-notif-close" onClick={() => setShowNotif(false)} aria-label="Tutup notifikasi"><FiX aria-hidden="true" /></button>
                        </div>
                    )}

                    {activeSession && (
                        <section className="home-session-card">
                            <div className="mapdash-sheet-title-row">
                                <span className="mapdash-sheet-title home-session-title">Sesi Charging Berlangsung</span>
                                <span className="dash-status-badge ok">● {activeSession.sudah_penuh ? 'Baterai Penuh' : activeSession.status}</span>
                            </div>
                            <p className="mapdash-session-location"><FiMapPin aria-hidden="true" /> {activeSession.nama_lokasi} · {activeSession.kode_charger}{activeSession.soc_sekarang != null ? <><span> · </span><FiBattery aria-hidden="true" /> {activeSession.soc_sekarang}%</> : ''}</p>

                            <div className="dash-progress-track">
                                <div className="dash-progress-fill" style={{ width: `${sessionProgressPct}%` }} />
                            </div>
                            <div className="dash-session-stats">
                                <div>
                                    <p className="stat-value">{activeSession.energi_kwh} kWh</p>
                                    <p className="stat-label">Energi Terisi</p>
                                </div>
                                <div>
                                    <p className="stat-value">{formatDuration(sessionDurationMs)}</p>
                                    <p className="stat-label">Durasi</p>
                                </div>
                                <div>
                                    <p className="stat-value">{formatRupiah(sessionEstimatedCost)}</p>
                                    <p className="stat-label">Estimasi Biaya</p>
                                </div>
                            </div>
                            <div className="home-session-actions">
                                <button className="dash-btn-stop" onClick={handleStopSession}>
                                    {activeSession.sudah_penuh ? 'Selesai' : 'Hentikan Sesi'}
                                </button>
                                <button className="dash-btn-issue" onClick={handleInterruptSession}>
                                    Laporkan Gangguan
                                </button>
                            </div>
                        </section>
                    )}

                    <section className="home-search-card">
                        <button className="home-cta-map" onClick={() => goToMap()}>
                            <span className="home-cta-icon"><FiMap aria-hidden="true" /></span>
                            <span className="home-cta-text">
                                <span className="home-cta-title">Cari Charging Station</span>
                                <span className="home-cta-sub">
                                    {activeVehicleConnector
                                        ? `${suggestedStations.length} station cocok untuk ${activeVehicleConnector}`
                                        : `${filteredStations.length} station di sekitar Anda`}
                                </span>
                            </span>
                            <span className="home-cta-arrow"><FiArrowRight aria-hidden="true" /></span>
                        </button>

                    </section>

                    {invoice && (
                        <section className="home-invoice-card">
                            <div className="mapdash-sheet-title-row">
                                <span className="mapdash-sheet-title">Invoice Digital Terakhir</span>
                                <span className="dash-status-badge ok">{invoice.status}</span>
                            </div>
                            <p className="mapdash-session-location"><FiMapPin aria-hidden="true" /> {invoice.nama_lokasi} · {invoice.kode_charger}</p>
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

                    <section className="home-section home-stations-section">
                        <div className="home-section-title-row">
                            <div>
                                <h2 className="home-section-title">Station sekitar</h2>
                                <p className="home-section-caption">
                                    {stationsLoading ? 'Mencari lokasi terdekat...' : `${filteredStations.length} station ditemukan`}
                                </p>
                            </div>
                            <button className="home-map-link" onClick={() => goToMap()}>
                                Lihat peta <FiArrowRight aria-hidden="true" />
                            </button>
                        </div>
                        {stationsError && (
                            <div className="home-inline-error" role="alert">
                                <span>{stationsError}</span>
                                <button className="dash-link-btn" onClick={reloadStations}>Coba lagi</button>
                            </div>
                        )}
                        {!stationsLoading && !stationsError && filteredStations.length === 0 && (
                            <p className="dash-empty">Belum ada station yang cocok dengan konektor pilihan.</p>
                        )}

                        <div className="mapdash-station-scroll home-station-scroll">
                            {filteredStations.slice(0, 3).map((s) => {
                                const badge = stationStatusLabel(s.status, s.charger_tersedia);
                                return (
                                    <button
                                        key={s.id_location}
                                        className="mapdash-station-mini"
                                        onClick={() => goToMap(s)}
                                    >
                                        <div className="mapdash-station-mini-top">
                                            <span className={`dash-status-badge ${badge.tone}`}>{badge.text}</span>
                                            <span className="mapdash-station-mini-dist"><FiMapPin aria-hidden="true" /> {s.jarak_km} km</span>
                                        </div>
                                        <p className="mapdash-station-mini-name">{s.nama_lokasi}</p>
                                        <p className="mapdash-station-mini-meta">
                                            {(s.tipe_konektor_list ?? []).map(konektorLabel).join(' / ')} · {formatRupiah(s.tarif_per_kwh)}/kWh
                                        </p>
                                    </button>
                                );
                            })}
                        </div>
                    </section>

                    <section className="home-section home-history-section">
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
                                        <span className="transaction-icon"><FiFileText aria-hidden="true" /></span>
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
                            <FiArrowLeft aria-hidden="true" />
                        </button>
                        <span className="mapdash-map-title">Cari Charging Station</span>
                    </div>
                    <div className="mapdash-topbar-right">
                        <button className="mapdash-round-btn" aria-label="Notifikasi" onClick={() => setShowNotif((v) => !v)}>
                            <FiBell aria-hidden="true" />
                            {activeSession && <span className="mapdash-badge-dot" />}
                        </button>
                        <button type="button" className="mapdash-round-btn" aria-label="Pengaturan driver" onClick={openSettings}>
                            <FiSettings aria-hidden="true" />
                        </button>
                    </div>
                </div>

                {showNotif && activeSession && (
                    <div className="mapdash-notif">
                    <span><FiZap aria-hidden="true" /> Sesi charging Anda di <strong>{activeSession.nama_lokasi}</strong> sedang berjalan.</span>
                        <button className="mapdash-notif-close" onClick={() => setShowNotif(false)} aria-label="Tutup notifikasi"><FiX aria-hidden="true" /></button>
                    </div>
                )}

                {/* Filter port charger berlaku untuk seluruh station pada peta. */}
                {!activeSession && (
                    <section
                        className={`mapdash-filter-panel ${sheetExpanded ? 'is-sheet-expanded' : ''}`}
                        aria-label="Filter port charger"
                    >
                        <p className="mapdash-filter-label">Filter port charger</p>
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
                    </section>
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
                                <FiX aria-hidden="true" />
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

                        <div className="route-card-start-block">
                            {hasArrived ? (
                                <p className="route-card-arrived">✅ Anda sudah sampai di station.</p>
                            ) : (
                                <p className="route-card-hint">
                                    {distToSelectedM != null
                                        ? `Mulai charging aktif setelah Anda sampai (± ${formatJarak(distToSelectedM)} lagi).`
                                        : 'Aktifkan izin lokasi agar kami tahu kapan Anda sampai di station.'}
                                </p>
                            )}
                            <button
                                className="route-card-start"
                                onClick={() => openStartCharging(selectedStation, null)}
                                disabled={!hasArrived}
                            >
                                <FiZap aria-hidden="true" /> Mulai Charging
                            </button>
                        </div>

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
                                    : <><FiNavigation aria-hidden="true" /> Tampilkan Rute</>}
                            </button>
                            <button
                                className="route-card-secondary"
                                onClick={() => setDetailStationId(selectedStation.id_location)}
                            >
                                Detail
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
                    <FiCrosshair aria-hidden="true" />
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
                                <span className="dash-status-badge ok">● {activeSession.sudah_penuh ? 'Baterai Penuh' : activeSession.status}</span>
                            </div>
                            <p className="mapdash-session-location"><FiMapPin aria-hidden="true" /> {activeSession.nama_lokasi} · {activeSession.kode_charger}{activeSession.soc_sekarang != null ? <><span> · </span><FiBattery aria-hidden="true" /> {activeSession.soc_sekarang}%</> : ''}</p>

                            <div className="dash-progress-track">
                                <div className="dash-progress-fill" style={{ width: `${sessionProgressPct}%` }} />
                            </div>
                            <div className="dash-session-stats">
                                <div>
                                    <p className="stat-value">{activeSession.energi_kwh} kWh</p>
                                    <p className="stat-label">Energi Terisi</p>
                                </div>
                                <div>
                                    <p className="stat-value">{formatDuration(sessionDurationMs)}</p>
                                    <p className="stat-label">Durasi</p>
                                </div>
                                <div>
                                    <p className="stat-value">{formatRupiah(sessionEstimatedCost)}</p>
                                    <p className="stat-label">Estimasi Biaya</p>
                                </div>
                            </div>
                            <div className="home-session-actions">
                                <button className="dash-btn-stop" onClick={handleStopSession}>
                                    {activeSession.sudah_penuh ? 'Selesai' : 'Hentikan Sesi'}
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
                                                    {(s.tipe_konektor_list ?? []).map(konektorLabel).join(' / ')} · {formatRupiah(s.tarif_per_kwh)}/kWh
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
                                                        <span><FiMapPin aria-hidden="true" /> {s.jarak_km} km</span>
                                                        <span><FiZap aria-hidden="true" /> {(s.tipe_konektor_list ?? []).map(konektorLabel).join(' / ')}</span>
                                                        <span>{formatRupiah(s.tarif_per_kwh)}/kWh</span>
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
                                                        {stationPorts(s).map((charger) => {
                                                            const chargerBadge = chargerStatusLabel(charger.status);
                                                            return (
                                                                <button
                                                                    key={charger.id_port}
                                                                    className="charger-option"
                                                                    disabled={chargerBadge.tone !== 'ok'}
                                                                    onClick={(e) => {
                                                                        e.stopPropagation();
                                                                        openStartCharging(s, charger);
                                                                    }}
                                                                >
                                                                    <span className="charger-option-main">
                                                                        <strong>{charger.kode_perangkat || `Port ${charger.id_port}`}</strong>
                                                                        <span>{konektorLabel(charger.tipe_konektor)} · {charger.daya_kw ?? charger.daya_kw_max ?? 0} kW</span>
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

            {showTopUp && (
                <div className="charge-flow-overlay" onClick={() => setShowTopUp(false)}>
                    <form className="charge-flow-panel" onSubmit={handleTopUpSubmit} onClick={(e) => e.stopPropagation()}>
                        <div className="settings-panel-header">
                            <span className="settings-panel-title">Top Up Dompet Digital</span>
                            <button type="button" className="mapdash-notif-close" onClick={() => setShowTopUp(false)} aria-label="Tutup top up">
                                <FiX aria-hidden="true" />
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
                                <FiX aria-hidden="true" />
                            </button>
                        </div>

                        {invoiceLoading && !selectedInvoice ? (
                            <p className="dash-empty">Memuat detail invoice...</p>
                        ) : (
                            <>
                                <div className="charge-flow-station">
                                    <span className="charge-flow-icon"><FiFileText aria-hidden="true" /></span>
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
                                    <span className="profile-row-icon"><FiPhone aria-hidden="true" /></span>
                                    <div className="profile-row-body">
                                        <span className="profile-row-label">Nomor Telepon</span>
                                        <span className="profile-row-value">{profile.nomor_telepon || '-'}</span>
                                    </div>
                                </div>
                                <div className="profile-row">
                                    <span className="profile-row-icon"><FiCalendar aria-hidden="true" /></span>
                                    <div className="profile-row-body">
                                        <span className="profile-row-label">Tanggal Lahir</span>
                                        <span className="profile-row-value">{formatTanggalLahir(profile.tanggal_lahir)}</span>
                                    </div>
                                </div>
                                <div className="profile-row">
                                    <span className="profile-row-icon"><FiMapPin aria-hidden="true" /></span>
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
                                        <FiX aria-hidden="true" />
                                    </button>
                                </div>

                                <button className="settings-profile" onClick={openProfileScreen}>
                                        <span className="settings-profile-avatar"><FiUser aria-hidden="true" /></span>
                                        <div className="settings-profile-info">
                                            <p className="settings-profile-name">
                                                {profile?.nama_lengkap ?? user.nama}
                                            </p>
                                            <p className="settings-profile-sub">Lihat & edit profil</p>
                                        </div>
                                        <span className="settings-menu-arrow"><FiChevronRight aria-hidden="true" /></span>
                                    </button>

                                <div className="settings-menu">
                                    <button className="settings-menu-item" onClick={onNavigateToVehicles}>
                                        <span className="settings-menu-icon"><FiTruck aria-hidden="true" /></span>
                                        <span className="settings-menu-label">Kendaraan Saya</span>
                                        <span className="settings-menu-arrow"><FiChevronRight aria-hidden="true" /></span>
                                    </button>
                                    <button className="settings-menu-item">
                                        <span className="settings-menu-icon"><FiCreditCard aria-hidden="true" /></span>
                                        <span className="settings-menu-label">Metode Pembayaran</span>
                                        <span className="settings-menu-arrow"><FiChevronRight aria-hidden="true" /></span>
                                    </button>
                                    <button className="settings-menu-item" onClick={openPinManager}>
                                        <span className="settings-menu-icon"><FiLock aria-hidden="true" /></span>
                                        <span className="settings-menu-label">
                                            Kelola PIN Dompet
                                            <span className="settings-menu-sublabel">
                                                {hasPin ? 'PIN aktif' : 'Belum diatur'}
                                            </span>
                                        </span>
                                        <span className="settings-menu-arrow"><FiChevronRight aria-hidden="true" /></span>
                                    </button>
                                    <button className="settings-menu-item">
                                        <span className="settings-menu-icon"><FiBell aria-hidden="true" /></span>
                                        <span className="settings-menu-label">Notifikasi</span>
                                        <span className="settings-menu-arrow"><FiChevronRight aria-hidden="true" /></span>
                                    </button>
                                    <button className="settings-menu-item" onClick={onNavigateToHelp}>
                                        <span className="settings-menu-icon"><FiHelpCircle aria-hidden="true" /></span>
                                        <span className="settings-menu-label">Bantuan</span>
                                        <span className="settings-menu-arrow"><FiChevronRight aria-hidden="true" /></span>
                                    </button>
                                </div>

                                {onLogout && (
                                    <button className="settings-logout-btn" onClick={onLogout}>
                                        <FiLogOut aria-hidden="true" /> Keluar
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
                                        <FiArrowLeft aria-hidden="true" />
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
                                        <FiX aria-hidden="true" />
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
                                            <span className="settings-pin-status-icon"><FiLock aria-hidden="true" /></span>
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
                                            <span className="settings-menu-icon"><FiEdit2 aria-hidden="true" /></span>
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
                                        <FiArrowLeft aria-hidden="true" />
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
                                        <FiX aria-hidden="true" />
                                    </button>
                                </div>

                                {profileLoading && <p className="dash-empty">Memuat profil...</p>}

                                {!profileLoading && profileError && (
                                    <p className="settings-pin-error">{profileError}</p>
                                )}

                                {!profileLoading && !profileError && profile && (
                                    <div className="settings-profile-detail">
                                        <div className="settings-profile-detail-avatar-row">
                                            <span className="settings-profile-avatar settings-profile-avatar-lg"><FiUser aria-hidden="true" /></span>
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

                                        <button type="button" className="settings-pin-submit" onClick={openProfileEditor}>
                                            Edit Profil
                                        </button>
                                    </div>
                                )}
                            </div>
                        )}

                    </div>
                </div>
            )}

            {showStartCharging && selectedStation && (
                <StartCharging
                    key={selectedStation.id_location}
                    station={selectedStation}
                    vehicle={activeVehicle}
                    position={driverPosition}
                    initialPortId={startPortId}
                    onClose={() => { setShowStartCharging(false); setStartPortId(null); }}
                    onStarted={handleSessionStarted}
                    onTopUp={() => {
                        setShowStartCharging(false);
                        openTopUpModal();
                    }}
                />
            )}

            {detailStation && (
                <StationDetail
                    key={detailStation.id_location}
                    station={detailStation}
                    activeVehicle={activeVehicle}
                    onClose={() => setDetailStationId(null)}
                    onShowRoute={handleRouteFromDetail}
                />
            )}
        </div>
    );
}
