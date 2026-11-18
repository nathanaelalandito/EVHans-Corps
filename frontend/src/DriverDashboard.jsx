import { useState, useEffect, useRef, useMemo } from "react";
import { createPortal } from "react-dom";
import { sessionStatusTone } from "./utils/sessionStatus";
import { API_BASE_URL } from "./api/client";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import {
  FiAlertTriangle,
  FiArrowDown,
  FiArrowLeft,
  FiArrowRight,
  FiArrowUp,
  FiBattery,
  FiCalendar,
  FiChevronRight,
  FiCheck,
  FiCopy,
  FiCrosshair,
  FiEye,
  FiEyeOff,
  FiFilter,
  FiHelpCircle,
  FiLock,
  FiLogOut,
  FiMap,
  FiMapPin,
  FiNavigation,
  FiPhone,
  FiPrinter,
  FiSearch,
  FiShare2,
  FiSettings,
  FiTruck,
  FiUser,
  FiX,
  FiZap,
} from "react-icons/fi";
import "./driverDashboard.css";
import "./driverDashboardEV.css";
import { getWallet } from "./api/wallet";
import { getProfile, updateProfile } from "./api/profile";
import { getVehicles } from "./api/vehicle";
import {
  getDrivingRoute,
  googleMapsDirectionsUrl,
  formatJarak,
  formatDurasi,
} from "./api/routing";
import {
  getStations,
  distanceKm,
  distanceMeters,
  ARRIVAL_RADIUS_M,
  konektorLabel,
  sameConnector,
  stationAvailabilityLabel,
  portStatusLabel,
  chargerStatusLabel,
} from "./api/station";
import { getActiveSession, getChargingSettings } from "./api/charging";
import {
  finishChargingSession,
  getActiveChargingSession,
  interruptChargingSession,
  pauseChargingSession,
  resumeChargingSession,
} from "./api/chargingSessions";
import { getPaymentDetail, getPaymentHistory } from "./api/payments";
import { createInvoicePdf, invoicePdfName } from "./utils/invoicePdf";
import { PHONE_MAX_DIGITS, PHONE_PATTERN, PHONE_VALIDATION_MESSAGE, normalizePhone } from "./utils/phone";
import StationDetail from "./StationDetail";
import StartCharging from "./StartCharging";
import PinSecuritySettings from "./PinSecuritySettings";
import NotificationsBell from "./NotificationsBell";

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
  nama: "Stefanus Adrian",
  saldo_dompet: 185000,
};

const ACTIVE_VEHICLE_KEY = "ev_active_vehicle";

const INITIAL_MAP_POSITION = { lat: -7.8014, lng: 110.3644 };
const CONNECTOR_FILTERS = ["Semua", "CCS2", "Type 2", "CHAdeMO", "GB/T"];
const DUMMY_ACTIVE_SESSION = null;
/** Membatasi lima baris pada setiap daftar transaksi berdampingan. */
const TRANSACTIONS_PER_TABLE = 5;
/** Satu halaman memuat dua daftar dengan batas lima transaksi per daftar. */
const TRANSACTION_PAGE_SIZE = TRANSACTIONS_PER_TABLE * 2;

/** Menampilkan nominal sebagai rupiah dengan pemisah angka lokal. */
function formatRupiah(value) {
  if (value == null) return "-";
  return "Rp" + value.toLocaleString("id-ID");
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
  if (h >= 4 && h < 10) return "Selamat pagi";
  if (h >= 10 && h < 15) return "Selamat siang";
  if (h >= 15 && h < 18) return "Selamat sore";
  return "Selamat malam";
}

/** Station tutup (di luar jam operasional atau Tutup Sementara) tidak boleh memulai charging. */
function isStationClosed(station) {
  return station?.is_open === false || station?.status === "Tutup Sementara";
}

/** Membentuk label ketersediaan station dari status dan jumlah port bebas. */
function stationStatusLabel(station) {
  const text = stationAvailabilityLabel(station);
  const tone = station?.can_start
    ? "ok"
    : ["Dalam Perawatan", "Gangguan"].includes(text)
      ? "warn"
      : "danger";
  return { text, tone };
}

/** Membuat ikon peta station dengan warna sesuai keadaan ketersediaannya. */
function buildStationIcon(tone) {
  const color =
    tone === "ok" ? "#2e7d32" : tone === "warn" ? "#a5730c" : "#c23a3a";
  return L.divIcon({
    className: "map-marker-wrapper",
    html: `<div class="map-marker" style="background:${color}"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M13.2 2 5 13h5l-.7 9L19 10h-5.2L13.2 2Z" fill="currentColor"/></svg></div><div class="map-marker-arrow" style="border-top-color:${color}"></div>`,
    iconSize: [34, 42],
    iconAnchor: [17, 42],
    popupAnchor: [0, -40],
  });
}

const DRIVER_ICON = L.divIcon({
  className: "map-marker-wrapper",
  html: `<div class="map-marker-driver"></div><div class="map-marker-driver-pulse"></div>`,
  iconSize: [22, 22],
  iconAnchor: [11, 11],
});

const BULAN_ID = [
  "Januari",
  "Februari",
  "Maret",
  "April",
  "Mei",
  "Juni",
  "Juli",
  "Agustus",
  "September",
  "Oktober",
  "November",
  "Desember",
];

/** Memformat tanggal lahir akun menjadi format tanggal Indonesia. */
function formatTanggalLahir(value) {
  if (!value) return "-";
  const [y, m, d] = String(value).slice(0, 10).split("-").map(Number);
  if (!y || !m || !d) return String(value);
  return `${d} ${BULAN_ID[m - 1]} ${y}`;
}

/** Mengambil inisial nama untuk avatar tanpa foto. */
function getInitial(name) {
  return (name || "?").trim().charAt(0).toUpperCase() || "?";
}

/** Membesarkan huruf pertama label yang ditampilkan. */
function capitalize(str) {
  const s = String(str ?? "");
  return s.charAt(0).toUpperCase() + s.slice(1);
}

/** Mengelola peta station, dompet, profil, transaksi, dan sesi aktif pengemudi. */
export default function DriverDashboard({
  user: authUser,
  onLogout,
  onNavigateToVehicles,
  onNavigateToHelp,
  onNavigateToWalletTopup,
  resumeChargingContext,
  onResumeChargingHandled,
}) {
  const user = {
    nama: authUser?.profile?.nama_lengkap || authUser?.email || DUMMY_USER.nama,
  };

  const [vehicles, setVehicles] = useState([]);
  const [vehiclesLoading, setVehiclesLoading] = useState(true);
  const [activeVehicleId, setActiveVehicleId] = useState(() => {
    const saved = Number(localStorage.getItem(ACTIVE_VEHICLE_KEY));
    return saved || null;
  });

  const [rawStations, setRawStations] = useState([]);
  const [stationsError, setStationsError] = useState("");
  const [stationsLoading, setStationsLoading] = useState(true);
  const [detailStationId, setDetailStationId] = useState(null);
  const [showStartCharging, setShowStartCharging] = useState(false);
  const [sessionError, setSessionError] = useState("");
  const [stoppingSession, setStoppingSession] = useState(false);
  const [pausingSession, setPausingSession] = useState(false);
  const [showInterruptModal, setShowInterruptModal] = useState(false);
  const [interruptReason, setInterruptReason] = useState("");
  const [pauseCountdown, setPauseCountdown] = useState(0);
  const interruptPanelRef = useRef(null);
  const interruptTriggerRef = useRef(null);
  const [startPortId, setStartPortId] = useState(null); // port yang dipilih dari daftar station
  const [invoice, setInvoice] = useState(null);
  const [transactionHistory, setTransactionHistory] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyError, setHistoryError] = useState("");
  const [historyPeriod, setHistoryPeriod] = useState("all");
  const [historyKeyword, setHistoryKeyword] = useState("");
  const [historyFrom, setHistoryFrom] = useState("");
  const [historyTo, setHistoryTo] = useState("");
  const [historyPage, setHistoryPage] = useState(0);
  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const [invoiceLoading, setInvoiceLoading] = useState(false);
  const [invoiceActionMessage, setInvoiceActionMessage] = useState("");
  const [invoiceCopyStatus, setInvoiceCopyStatus] = useState("idle");
  const invoiceCopyTimerRef = useRef(null);

  useEffect(() => {
    return () => {
      if (invoiceCopyTimerRef.current) window.clearTimeout(invoiceCopyTimerRef.current);
    };
  }, []);

  useEffect(() => {
    const resetTimer = window.setTimeout(() => setInvoiceCopyStatus("idle"), 0);
    if (invoiceCopyTimerRef.current) {
      window.clearTimeout(invoiceCopyTimerRef.current);
      invoiceCopyTimerRef.current = null;
    }
    return () => window.clearTimeout(resetTimer);
  }, [selectedInvoice]);

  useEffect(() => {
    if (!selectedInvoice && !invoiceLoading) return undefined;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const handleKeyDown = (event) => {
      if (event.key === "Escape") {
        setSelectedInvoice(null);
        setInvoiceLoading(false);
      }
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [selectedInvoice, invoiceLoading]);

  const [connectorFilter, setConnectorFilter] = useState("Semua");
  const [stationKeyword, setStationKeyword] = useState("");
  const [availabilityFilter, setAvailabilityFilter] = useState("all");
  const [minimumPowerFilter, setMinimumPowerFilter] = useState("all");
  const [maximumPriceFilter, setMaximumPriceFilter] = useState("all");
  const [showStationFilters, setShowStationFilters] = useState(false);
  const [activeSession, setActiveSession] = useState(DUMMY_ACTIVE_SESSION);

  const openInterruptModal = async () => {
    if (!activeSession || pausingSession) return;
    setPausingSession(true);
    setSessionError("");
    try {
      const paused = await pauseChargingSession(activeSession.id_session);
      setActiveSession((prev) =>
        prev
          ? {
              ...prev,
              dijeda: true,
              jeda_berakhir_pada: paused?.jeda_berakhir_pada ?? prev.jeda_berakhir_pada,
              sisa_jeda_detik: paused?.sisa_jeda_detik ?? prev.sisa_jeda_detik,
              status: "Dijeda",
            }
          : prev,
      );
      setPauseCountdown(paused?.sisa_jeda_detik ?? 0);
      setShowInterruptModal(true);
    } catch (err) {
      setSessionError(
        extractErrorMessage(err, "Sesi belum dapat dijeda. Modal tetap dapat dibuka."),
      );
      setPauseCountdown(0);
      setShowInterruptModal(true);
    } finally {
      setPausingSession(false);
    }
  };

  useEffect(() => {
    if (!showInterruptModal) return undefined;
    const token = localStorage.getItem("ev_token");
    const handler = () => {
      if (!activeSession?.id_session || !token) return;
      try {
        fetch(`${API_BASE_URL}/charging-sessions/${activeSession.id_session}/resume`, {
          method: "POST",
          headers: { Authorization: `Bearer ${token}`, Accept: "application/json" },
          keepalive: true,
        });
      } catch {
        // best effort
      }
    };
    window.addEventListener("pagehide", handler);
    return () => window.removeEventListener("pagehide", handler);
  }, [showInterruptModal, activeSession]);

  useEffect(() => {
    if (!showInterruptModal || pauseCountdown <= 0) return undefined;
    const timer = setInterval(() => {
      setPauseCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          (async () => {
            try {
              if (activeSession?.id_session) {
                await resumeChargingSession(activeSession.id_session);
              }
            } catch {
              // ignore
            }
            setShowInterruptModal(false);
            setInterruptReason("");
            setSessionNotice("Sesi dilanjutkan otomatis karena batas waktu jeda habis.");
            if (activeSession?.id_session) {
              try {
                const refreshed = await getActiveChargingSession();
                if (refreshed) setActiveSession(refreshed);
              } catch {
                // ignore
              }
            }
          })();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [showInterruptModal, pauseCountdown, activeSession]);

  useEffect(() => {
    if (!showInterruptModal) return undefined;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const focusTimer = setTimeout(() => {
      const textarea = interruptPanelRef.current?.querySelector("textarea");
      textarea?.focus();
    }, 0);
    const handleKeyDown = (event) => {
      if (event.key === "Escape" && !stoppingSession) {
        (async () => {
          if (activeSession?.id_session) {
            try {
              await resumeChargingSession(activeSession.id_session);
            } catch {
              // ignore
            }
          }
          setShowInterruptModal(false);
          setInterruptReason("");
          if (activeSession?.id_session) {
            try {
              const refreshed = await getActiveChargingSession();
              if (refreshed) setActiveSession(refreshed);
            } catch {
              // ignore
            }
          }
        })();
      }
      if (event.key !== "Tab") return;
      const focusable = interruptPanelRef.current?.querySelectorAll(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
      );
      if (!focusable || focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      clearTimeout(focusTimer);
      document.removeEventListener("keydown", handleKeyDown);
      interruptTriggerRef.current?.focus();
    };
  }, [showInterruptModal, stoppingSession]);
  const [sessionSyncError, setSessionSyncError] = useState("");
  const [sessionNotice, setSessionNotice] = useState("");
  const [elapsed, setElapsed] = useState(0);
  const [selectedStationId, setSelectedStationId] = useState(null);
  const [showSessionStatus, setShowSessionStatus] = useState(!!DUMMY_ACTIVE_SESSION);
  const [showSettings, setShowSettings] = useState(false);

  const [wallet, setWallet] = useState(null);
  const [walletLoading, setWalletLoading] = useState(true);
  const [hideWalletBalance, setHideWalletBalance] = useState(
    () => localStorage.getItem("ev_hide_saldo") === "1",
  );
  /** Menyamakan preferensi tampil/sembunyi saldo dengan halaman Dompet Digital. */
  const toggleWalletBalance = () =>
    setHideWalletBalance((hidden) => {
      const nextHidden = !hidden;
      localStorage.setItem("ev_hide_saldo", nextHidden ? "1" : "0");
      return nextHidden;
    });
  /** Memuat saldo dompet dan status perlindungan PIN. */
  const fetchWallet = async () => {
    try {
      const data = await getWallet();
      setWallet(data);
    } catch (err) {
      console.error("Gagal memuat data dompet:", err);
    } finally {
      setWalletLoading(false);
    }
  };

  useEffect(() => {
    fetchWallet();
  }, []);

  const [profile, setProfile] = useState(null);
  const [profileLoading, setProfileLoading] = useState(true);
  const [profileError, setProfileError] = useState("");
  /** Memuat profil akun yang dipakai dashboard dan formulir edit. */
  const fetchProfile = async () => {
    setProfileLoading(true);
    setProfileError("");
    try {
      const data = await getProfile();
      setProfile(data);
    } catch (err) {
      console.error("Gagal memuat profil:", err);
      setProfileError(extractErrorMessage(err, "Gagal memuat profil."));
    } finally {
      setProfileLoading(false);
    }
  };

  useEffect(() => {
    fetchProfile();
  }, []);

  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [editForm, setEditForm] = useState({
    nama_lengkap: "",
    nomor_telepon: "",
    tanggal_lahir: "",
    alamat: "",
    email: "",
  });
  const [editError, setEditError] = useState("");
  const [editSubmitting, setEditSubmitting] = useState(false);

  /** Menyalin data profil saat ini ke mode formulir edit. */
  const startEditProfile = () => {
    setEditForm({
      nama_lengkap: profile?.nama_lengkap ?? "",
      nomor_telepon: profile?.nomor_telepon ?? "",
      tanggal_lahir: profile?.tanggal_lahir ?? "",
      alamat: profile?.alamat ?? "",
      email: profile?.email ?? "",
    });
    setEditError("");
    setIsEditingProfile(true);
  };

  /** Menutup mode edit dan membuang perubahan yang belum disimpan. */
  const cancelEditProfile = () => {
    setIsEditingProfile(false);
    setEditError("");
  };

  /** Membuat handler input untuk memperbarui satu field profil. */
  const handleEditFieldChange = (field) => (e) => {
    const value =
      field === "nomor_telepon" ? normalizePhone(e.target.value) : e.target.value;
    setEditForm((prev) => ({ ...prev, [field]: value }));
  };

  /** Mengirim perubahan profil lalu memperbarui data dashboard. */
  const handleSubmitEditProfile = async (e) => {
    e.preventDefault();
    setEditError("");
    setEditSubmitting(true);
    try {
      const updated = await updateProfile(editForm);
      setProfile(updated);
      setIsEditingProfile(false);
    } catch (err) {
      setEditError(extractErrorMessage(err, "Gagal menyimpan profil."));
    } finally {
      setEditSubmitting(false);
    }
  };

  /** Membuka detail profil dari panel pengaturan. */
  const openProfileScreen = () => {
    setSettingsScreen("profile");
    setIsEditingProfile(false);
  };

  /** Menutup tampilan profil dan kembali ke dashboard peta. */
  const closeProfileScreen = () => {
    setSettingsScreen("menu");
  };

  /** Membuka layar PIN Keamanan dengan status PIN terbaru dari server. */
  const openPinScreen = () => {
    setSettingsScreen("pin");
    fetchWallet();
  };

  /** Membuka panel pengaturan selalu dari menu utama. */
  const openSettings = () => {
    setSettingsScreen("menu");
    setShowSettings(true);
  };

  /** Membuka formulir edit profil dari panel pengaturan. */
  const openProfileEditor = () => {
    startEditProfile();
    setShowSettings(false);
    setSettingsScreen("menu");
    setView("profile");
  };

  const [settingsScreen, setSettingsScreen] = useState("menu");
  const [driverPosition, setDriverPosition] = useState(null);
  const [locationStatus, setLocationStatus] = useState("locating");
  const [chargingSettings, setChargingSettings] = useState({
    require_arrival: true,
    arrival_radius_m: ARRIVAL_RADIUS_M,
  });
  const [view, setView] = useState("home");

  /** Memuat kendaraan pengemudi dan memilih kendaraan aktif bila perlu. */
  const fetchVehicles = async (silent = false) => {
    if (!silent) setVehiclesLoading(true);
    try {
      const data = await getVehicles();
      setVehicles(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("Gagal memuat kendaraan:", err);
    } finally {
      setVehiclesLoading(false);
    }
  };

  useEffect(() => {
    fetchVehicles();
    /** Menyegarkan daftar kendaraan saat tab aplikasi kembali aktif. */
    const onFocus = () => fetchVehicles(true);
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, []);

  useEffect(() => {
    if (vehiclesLoading) return;
    const stillExists = vehicles.some((v) => v.id_vehicle === activeVehicleId);
    if (!stillExists) {
      setActiveVehicleId(vehicles[0]?.id_vehicle ?? null);
    }
  }, [vehicles, vehiclesLoading, activeVehicleId]);

  useEffect(() => {
    if (activeVehicleId)
      localStorage.setItem(ACTIVE_VEHICLE_KEY, String(activeVehicleId));
  }, [activeVehicleId]);

  const activeVehicle =
    vehicles.find((v) => v.id_vehicle === activeVehicleId) ?? null;
  const posKey = driverPosition
    ? `${driverPosition.lat.toFixed(2)},${driverPosition.lng.toFixed(2)}`
    : "unknown";

  // Normalisasi stasiun untuk menghitung port dan ringkasan konektor yang kompatibel
  const stations = useMemo(
    () =>
      rawStations.map((s) => {
        const allPorts = [];
        if (s.chargers) {
          s.chargers.forEach((charger) => {
            if (charger.ports)
              charger.ports.forEach((port) =>
                allPorts.push({
                  ...port,
                  charger_status: charger.status_mesin,
                }),
              );
          });
        }
        const tersediaCount = allPorts.filter((p) => {
          const st = String(p.status_port || "")
            .toLowerCase()
            .trim();
          return (
            (st === "available" || st === "tersedia") &&
            (!p.charger_status || p.charger_status === "Active")
          );
        }).length;
        const uniqueConnectors = [
          ...new Set(allPorts.map((p) => p.tipe_konektor)),
        ];

        return {
          ...s,
          jarak_km:
            driverPosition && locationStatus === "live"
              ? distanceKm(driverPosition, s)
              : null,
          port_tersedia: s.can_start ? tersediaCount : 0,
          jumlah_port: allPorts.length,
          tipe_konektor_list: uniqueConnectors,
        };
      }),
    [rawStations, posKey, locationStatus],
  );

  useEffect(() => {
    let cancelled = false;
    /** Memuat ulang status station saat halaman dibuka atau kembali aktif. */
    const loadStationList = (showLoading = false) => {
      if (showLoading) setStationsLoading(true);
      getStations()
        .then((list) => {
          if (!cancelled) {
            setRawStations(list);
            setStationsError("");
          }
        })
        .catch((err) => {
          if (!cancelled)
            setStationsError(
              extractErrorMessage(err, "Daftar station tidak dapat dimuat."),
            );
        })
        .finally(() => {
          if (!cancelled) setStationsLoading(false);
        });
    };
    const refreshWhenVisible = () => {
      if (document.visibilityState === "visible") loadStationList();
    };
    loadStationList(true);
    window.addEventListener("focus", refreshWhenVisible);
    document.addEventListener("visibilitychange", refreshWhenVisible);
    return () => {
      cancelled = true;
      window.removeEventListener("focus", refreshWhenVisible);
      document.removeEventListener("visibilitychange", refreshWhenVisible);
    };
  }, []);

  /** Memuat ulang daftar station berdasarkan posisi GPS yang sudah terverifikasi. */
  const reloadStations = async () => {
    setStationsLoading(true);
    setStationsError("");
    try {
      const list = await getStations();
      setRawStations(list);
    } catch (err) {
      setStationsError(
        extractErrorMessage(err, "Daftar station tidak dapat dimuat."),
      );
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
        setShowSessionStatus(true);
      })
      .catch((err) => {
        console.warn("Gagal memuat sesi aktif:", err);
        if (!cancelled)
          setSessionSyncError(
            "Status sesi belum dapat dimuat. Periksa koneksi internet Anda.",
          );
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const selectedStation =
    stations.find((s) => s.id_location === selectedStationId) ?? null;
  const detailStation =
    stations.find((s) => s.id_location === detailStationId) ?? null;
  /** Membuka kembali station dan port yang tertunda setelah Driver menyelesaikan Top Up. */
  useEffect(() => {
    if (
      !resumeChargingContext?.stationId ||
      stationsLoading ||
      locationStatus !== "live"
    )
      return;
    const station = stations.find(
      (item) =>
        String(item.id_location) === String(resumeChargingContext.stationId),
    );
    if (station && !isStationClosed(station)) {
      setSelectedStationId(station.id_location);
      setStartPortId(resumeChargingContext.portId ?? null);
      setShowStartCharging(true);
    }
    onResumeChargingHandled?.();
  }, [
    resumeChargingContext,
    stations,
    stationsLoading,
    locationStatus,
    onResumeChargingHandled,
  ]);
  const distToSelectedM =
    selectedStation && locationStatus === "live" && driverPosition
      ? distanceMeters(driverPosition, selectedStation)
      : null;
  const hasArrived =
    !chargingSettings.require_arrival ||
    (distToSelectedM != null &&
      distToSelectedM <= chargingSettings.arrival_radius_m);

  /** Memuat kebijakan kedatangan yang sama dengan aturan validasi server. */
  useEffect(() => {
    let cancelled = false;
    getChargingSettings()
      .then((settings) => {
        if (!cancelled) {
          setChargingSettings({
            require_arrival: settings.require_arrival ?? true,
            arrival_radius_m: settings.arrival_radius_m ?? ARRIVAL_RADIUS_M,
          });
        }
      })
      .catch((error) => {
        console.error("Gagal memuat konfigurasi kedatangan:", error);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const [route, setRoute] = useState(null);
  const [routeStatus, setRouteStatus] = useState("idle");
  const [routeError, setRouteError] = useState("");
  const routeLayerRef = useRef(null);
  const routeAbortRef = useRef(null);
  const mapNodeRef = useRef(null);
  const mapRef = useRef(null);
  const markersRef = useRef({});
  const driverMarkerRef = useRef(null);
  const hasCenteredOnRealPosRef = useRef(false);
  const pendingFocusStationRef = useRef(null);

  const filteredStations = stations
    .filter((station) => {
      const matchesConnector =
        connectorFilter === "Semua" ||
        station.tipe_konektor_list?.some((type) =>
          sameConnector(type, connectorFilter),
        );
      const searchable =
        `${station.nama_lokasi ?? ""} ${station.kode_station ?? ""} ${station.alamat ?? ""}`.toLocaleLowerCase(
          "id-ID",
        );
      const matchesKeyword = searchable.includes(
        stationKeyword.trim().toLocaleLowerCase("id-ID"),
      );
      const matchesAvailability =
        availabilityFilter === "all" ||
        (availabilityFilter === "available"
          ? station.can_start && station.port_tersedia > 0
          : station.status === "Penuh");
      const matchesPower =
        minimumPowerFilter === "all" ||
        Number(station.daya_kw_max ?? 0) >= Number(minimumPowerFilter);
      const matchesPrice =
        maximumPriceFilter === "all" ||
        (station.tarif_per_kwh != null &&
          Number(station.tarif_per_kwh) <= Number(maximumPriceFilter));
      return (
        matchesConnector &&
        matchesKeyword &&
        matchesAvailability &&
        matchesPower &&
        matchesPrice
      );
    })
    .sort((first, second) =>
      Number(Boolean(second.can_start)) - Number(Boolean(first.can_start)) ||
      (locationStatus === "live"
        ? (first.jarak_km ?? Number.POSITIVE_INFINITY) -
          (second.jarak_km ?? Number.POSITIVE_INFINITY)
        : String(first.nama_lokasi ?? "").localeCompare(
            String(second.nama_lokasi ?? ""),
            "id-ID",
          )),
    );
  const activeStationFilterCount = [
    connectorFilter !== "Semua",
    availabilityFilter !== "all",
    minimumPowerFilter !== "all",
    maximumPriceFilter !== "all",
  ].filter(Boolean).length;

  /** Menghapus pencarian dan filter station untuk mengembalikan seluruh hasil. */
  const clearStationFilters = () => {
    setStationKeyword("");
    setConnectorFilter("Semua");
    setAvailabilityFilter("all");
    setMinimumPowerFilter("all");
    setMaximumPriceFilter("all");
  };

  useEffect(() => {
    if (mapRef.current || !mapNodeRef.current) return;
    const map = L.map(mapNodeRef.current, {
      center: [INITIAL_MAP_POSITION.lat, INITIAL_MAP_POSITION.lng],
      zoom: 14,
      zoomControl: false,
    });
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: "&copy; OpenStreetMap contributors",
      maxZoom: 19,
    }).addTo(map);
    driverMarkerRef.current = null;
    mapRef.current = map;
    return () => {
      map.remove();
      mapRef.current = null;
      driverMarkerRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (locationStatus === "live" || !mapRef.current) return;
    const firstStation = rawStations.find(
      (station) => station.lat != null && station.lng != null,
    );
    if (firstStation)
      mapRef.current.setView(
        [Number(firstStation.lat), Number(firstStation.lng)],
        12,
      );
  }, [rawStations, locationStatus]);

  useEffect(() => {
    if (locationStatus === "live" || !mapRef.current) return;
    const firstStation = rawStations.find(
      (station) => station.lat != null && station.lng != null,
    );
    if (firstStation)
      mapRef.current.setView(
        [Number(firstStation.lat), Number(firstStation.lng)],
        12,
      );
  }, [rawStations, locationStatus]);

  useEffect(() => {
    if (!("geolocation" in navigator)) {
      setLocationStatus("unsupported");
      return;
    }
    const watchId = navigator.geolocation.watchPosition(
      (pos) => {
        const next = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        setDriverPosition(next);
        setLocationStatus("live");
        if (driverMarkerRef.current) {
          driverMarkerRef.current.setLatLng([next.lat, next.lng]);
        } else if (mapRef.current) {
          driverMarkerRef.current = L.marker([next.lat, next.lng], {
            icon: DRIVER_ICON,
          })
            .addTo(mapRef.current)
            .bindPopup("Lokasi Anda saat ini");
        }
        if (!hasCenteredOnRealPosRef.current && mapRef.current) {
          mapRef.current.setView([next.lat, next.lng], 15);
          hasCenteredOnRealPosRef.current = true;
        }
      },
      (err) => {
        console.warn("Gagal mengambil lokasi:", err.message);
        setDriverPosition(null);
        if (driverMarkerRef.current && mapRef.current)
          mapRef.current.removeLayer(driverMarkerRef.current);
        driverMarkerRef.current = null;
        setLocationStatus("denied");
      },
      { enableHighAccuracy: true, maximumAge: 5000, timeout: 15000 },
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
      if (s.lat == null || s.lng == null || isNaN(s.lat) || isNaN(s.lng))
        return;

      const badge = stationStatusLabel(s);
      const popup = document.createElement("div");
      const stationName = document.createElement("strong");
      stationName.textContent = s.nama_lokasi ?? "Station";
      const availability = document.createTextNode(
        `${s.port_tersedia} dari ${s.jumlah_port} port tersedia · ${formatRupiah(s.tarif_per_kwh)}/kWh`,
      );
      popup.append(stationName, document.createElement("br"), availability);
      const marker = L.marker([Number(s.lat), Number(s.lng)], {
        icon: buildStationIcon(badge.tone),
      })
        .addTo(map)
        .bindPopup(popup)
        .on("click", () => {
          setSelectedStationId(s.id_location);
        });

      markersRef.current[s.id_location] = marker;
    });
  }, [connectorFilter, filteredStations]); // Ubah dependency dari stations ke filteredStations

  useEffect(() => {
    if (
      routeLayerRef.current ||
      routeAbortRef.current ||
      routeStatus !== "idle"
    ) {
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
    if (view !== "map" || !mapRef.current) return;
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
  useEffect(() => {
    if (!activeSessionId) return;
    let cancelled = false;
    /** Memeriksa progres sesi dari backend secara berkala. */
    const poll = () => {
      getActiveSession()
        .then((session) => {
          if (cancelled) return;
          setSessionSyncError("");
          if (!session) {
            setActiveSession(null);
            setShowSessionStatus(false);
            reloadStations();
            fetchWallet();
            fetchTransactionHistory();
            setSessionNotice(
              "Sesi charging sudah berakhir. Saldo dan riwayat transaksi diperbarui.",
            );
            return;
          }
          setActiveSession(session);
          setShowSessionStatus(true);
        })
        .catch(() =>
          setSessionSyncError(
            "Status sesi belum dapat diperbarui. Periksa koneksi internet Anda.",
          ),
        );
    };
    const interval = setInterval(poll, 8000);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [activeSessionId]);

  const sessionProgressPct =
    activeSession && activeSession.target_kwh > 0
      ? Math.min(
          100,
          Math.round(
            (activeSession.energi_kwh / activeSession.target_kwh) * 100,
          ),
        )
      : 0;
  const sessionDurationMs =
    activeSession?.durasi_detik != null
      ? activeSession.durasi_detik * 1000
      : elapsed;
  const sessionEstimatedCost = activeSession
    ? (activeSession.biaya_berjalan ??
      activeSession.estimasi_biaya ??
      Math.round(
        activeSession.energi_kwh * activeSession.tarif_per_kwh +
          activeSession.biaya_parkir,
      ))
    : 0;

  /** Menyaring transaksi berdasarkan periode, rentang tanggal, dan kata kunci. */
  const filteredTransactionHistory = useMemo(() => {
    const now = new Date();
    const start = new Date(now);
    if (historyPeriod === "7") start.setDate(now.getDate() - 7);
    if (historyPeriod === "30") start.setDate(now.getDate() - 30);
    return transactionHistory.filter((trx) => {
      const date = new Date(trx.tanggal);
      if (
        historyPeriod === "7" &&
        (Number.isNaN(date.getTime()) || date < start)
      )
        return false;
      if (
        historyPeriod === "30" &&
        (Number.isNaN(date.getTime()) || date < start)
      )
        return false;
      if (historyPeriod === "custom") {
        const dateKey = Number.isNaN(date.getTime())
          ? ""
          : date.toISOString().slice(0, 10);
        if (historyFrom && (!dateKey || dateKey < historyFrom)) return false;
        if (historyTo && (!dateKey || dateKey > historyTo)) return false;
      }
      const transactionName =
        trx.energi_kwh == null ? "Top Up Dompet Digital" : trx.nama_lokasi;
      const searchable =
        `${transactionName ?? ""} ${trx.nama_lokasi ?? ""} ${trx.metode_pembayaran ?? ""} ${trx.status ?? ""} ${trx.total ?? ""} ${trx.tanggal ?? ""} ${trx.energi_kwh ?? ""}`.toLocaleLowerCase(
          "id-ID",
        );
      return searchable.includes(
        historyKeyword.trim().toLocaleLowerCase("id-ID"),
      );
    });
  }, [
    transactionHistory,
    historyPeriod,
    historyFrom,
    historyTo,
    historyKeyword,
  ]);
  /** Membagi transaksi satu halaman secara seimbang ke dua daftar. */
  const transactionTables = useMemo(() => {
    const pageRows = filteredTransactionHistory.slice(
      historyPage * TRANSACTION_PAGE_SIZE,
      historyPage * TRANSACTION_PAGE_SIZE + TRANSACTION_PAGE_SIZE,
    );
    const splitIndex = Math.ceil(pageRows.length / 2);
    return [pageRows.slice(0, splitIndex), pageRows.slice(splitIndex)];
  }, [filteredTransactionHistory, historyPage]);

  /** Mengambil riwayat transaksi untuk daftar dan panel invoice. */
  const fetchTransactionHistory = async () => {
    setHistoryLoading(true);
    setHistoryError("");
    try {
      const data = await getPaymentHistory();
      setTransactionHistory(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("Gagal memuat riwayat transaksi:", err);
      setHistoryError(
        extractErrorMessage(err, "Gagal memuat riwayat transaksi."),
      );
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
    setShowSessionStatus(false);
    reloadStations();
    await Promise.all([fetchWallet(), fetchTransactionHistory()]);
  };

  /** Meminta penghentian sesi normal dan memproses ringkasan transaksinya. */
  const handleStopSession = async () => {
    if (!activeSession || stoppingSession) return;
    setStoppingSession(true);
    setSessionError("");
    try {
      const finishedInvoice = await finishChargingSession(
        activeSession.id_session,
      );
      await afterSessionSettled(finishedInvoice);
    } catch (err) {
      setSessionError(
        extractErrorMessage(
          err,
          "Gagal menghentikan sesi charging. Coba lagi.",
        ),
      );
    } finally {
      setStoppingSession(false);
    }
  };

  /** Melaporkan sesi terhenti/gagal lalu menyegarkan status sesi dan dompet. */
  const handleInterruptSession = async (reason = "") => {
    if (!activeSession || stoppingSession) return;
    setStoppingSession(true);
    setSessionError("");
    try {
      const interruptedInvoice = await interruptChargingSession(
        activeSession.id_session,
        {
          status: "gagal",
          alasan: reason.trim() || "Gangguan charger dilaporkan oleh driver.",
        },
      );
      setShowInterruptModal(false);
      setInterruptReason("");
      setSessionNotice("Laporan gangguan terkirim.");
      afterSessionSettled(interruptedInvoice).catch(() => {});
    } catch (err) {
      setSessionError(
        extractErrorMessage(err, "Gagal memproses gangguan sesi charging."),
      );
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
    setSessionNotice("");
    setSessionSyncError("");
    setShowSessionStatus(true);
    setInvoice(null);
    setView("home");
    reloadStations();
    fetchWallet(); // saldo tersedia berkurang karena hold
  };

  // Mulai charging langsung dari port yang dipilih di daftar station.
  /** Membuka alur persiapan charging untuk station dan port terpilih. */
  const openStartCharging = (station, port) => {
    if (isStationClosed(station) || station?.can_start === false) {
      setSessionError(
        "Station sedang tidak tersedia untuk charging. Anda hanya dapat melihat rute, membuka Google Maps, atau melihat detail station.",
      );
      return;
    }
    if (
      chargingSettings.require_arrival &&
      (locationStatus !== "live" || !driverPosition)
    ) {
      setSessionError(
        "Aktifkan lokasi perangkat sebelum memulai charging agar sistem dapat memvalidasi kedatangan Anda.",
      );
      setView("map");
      return;
    }
    setSessionError("");
    setSelectedStationId(station.id_location);
    setStartPortId(port?.id_port ?? null);
    setShowStartCharging(true);
  };

  /** Mengambil rincian pembayaran dan membuka invoice transaksi. */
  const handleOpenInvoice = async (transaction) => {
    setSelectedInvoice(null);
    setInvoiceLoading(true);
    setInvoiceActionMessage("");
    try {
      setSelectedInvoice(await getPaymentDetail(transaction.id_payment));
    } catch (err) {
      setSelectedInvoice({
        status: extractErrorMessage(err, "Gagal memuat detail invoice."),
        jenis_pembayaran: transaction.jenis_pembayaran,
        nama_lokasi: "-",
        kode_charger: "-",
        energi_kwh: 0,
        biaya_aktual: 0,
        jumlah_hold: 0,
        selisih_dikembalikan: 0,
      });
    } finally {
      setInvoiceLoading(false);
    }
  };

  /** Membuka dialog cetak browser untuk mencetak nota atau menyimpannya sebagai PDF. */
  const handlePrintInvoice = () => {
    if (selectedInvoice) window.print();
  };

  const handleCopyInvoiceId = async () => {
    const invoiceId = selectedInvoice?.id_payment ?? selectedInvoice?.id_session;
    if (invoiceId == null || invoiceId === "") return;
    if (invoiceCopyTimerRef.current) {
      window.clearTimeout(invoiceCopyTimerRef.current);
      invoiceCopyTimerRef.current = null;
    }
    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(String(invoiceId));
      } else if (typeof document.execCommand === "function") {
        const textarea = document.createElement("textarea");
        textarea.value = String(invoiceId);
        textarea.setAttribute("readonly", "");
        textarea.style.position = "fixed";
        textarea.style.top = "-9999px";
        textarea.style.opacity = "0";
        document.body.appendChild(textarea);
        textarea.select();
        const copied = document.execCommand("copy");
        document.body.removeChild(textarea);
        if (!copied) throw new Error("copy failed");
      } else {
        throw new Error("clipboard unavailable");
      }
      setInvoiceCopyStatus("copied");
    } catch {
      setInvoiceCopyStatus("failed");
    }
    invoiceCopyTimerRef.current = window.setTimeout(() => {
      setInvoiceCopyStatus("idle");
      invoiceCopyTimerRef.current = null;
    }, 2000);
  };

  /** Membagikan PDF invoice melalui fitur perangkat atau mengunduhnya sebagai fallback. */
  const handleShareInvoice = async () => {
    if (!selectedInvoice) return;

    try {
      const file = new File([createInvoicePdf(selectedInvoice)], invoicePdfName(selectedInvoice), {
        type: "application/pdf",
      });

      if (navigator.share && navigator.canShare?.({ files: [file] })) {
        await navigator.share({
          files: [file],
          title: "Invoice EVCharge Hub",
          text: "Bukti transaksi EVCharge Hub",
        });
        setInvoiceActionMessage("PDF invoice siap dibagikan.");
        return;
      }

      const downloadUrl = URL.createObjectURL(file);
      const downloadLink = document.createElement("a");
      downloadLink.href = downloadUrl;
      downloadLink.download = file.name;
      document.body.appendChild(downloadLink);
      downloadLink.click();
      downloadLink.remove();
      window.setTimeout(() => URL.revokeObjectURL(downloadUrl), 60000);
      setInvoiceActionMessage("PDF diunduh karena fitur berbagi file tidak tersedia di browser ini.");
    } catch (error) {
      if (error?.name === "AbortError") return;
      setInvoiceActionMessage("PDF belum dapat dibagikan. Coba gunakan tombol Cetak.");
    }
  };

  /** Membuka verifikasi PIN lalu form Top Up dari alur charging. */
  const handleTopupFromCharging = () => {
    setShowStartCharging(false);
    onNavigateToWalletTopup?.({
      stationId: selectedStation?.id_location,
      portId: startPortId,
    });
  };

  /** Meminta pembaruan lokasi GPS dan memusatkan peta jika berhasil. */
  const handleLocateMe = () => {
    const map = mapRef.current;
    if (!navigator.geolocation) {
      setLocationStatus("unsupported");
      return;
    }
    setLocationStatus("locating");
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const next = {
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        };
        setDriverPosition(next);
        setLocationStatus("live");
        if (map) map.flyTo([next.lat, next.lng], 15);
      },
      () => {
        setDriverPosition(null);
        if (driverMarkerRef.current && map)
          map.removeLayer(driverMarkerRef.current);
        driverMarkerRef.current = null;
        setLocationStatus("denied");
      },
      { enableHighAccuracy: true, maximumAge: 5000, timeout: 15000 },
    );
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
    setRouteStatus("idle");
    setRouteError("");
  };

  /** Mengambil rute berkendara dan menampilkannya pada peta dashboard. */
  const handleShowRoute = async (station) => {
    const map = mapRef.current;
    if (!map || !station) return;
    if (locationStatus !== "live") {
      setRouteStatus("error");
      setRouteError(
        "Lokasi Anda belum terdeteksi. Aktifkan izin lokasi, lalu coba lagi.",
      );
      return;
    }
    routeAbortRef.current?.abort();
    const controller = new AbortController();
    routeAbortRef.current = controller;
    setRouteStatus("loading");
    setRouteError("");
    try {
      const result = await getDrivingRoute(
        driverPosition,
        station,
        controller.signal,
      );
      if (controller.signal.aborted) return;
      if (routeLayerRef.current) map.removeLayer(routeLayerRef.current);
      const lineStyle = { lineCap: "round", lineJoin: "round" };
      routeLayerRef.current = L.layerGroup([
        L.polyline(result.coords, {
          ...lineStyle,
          color: "#ffffff",
          weight: 10,
          opacity: 0.9,
        }),
        L.polyline(result.coords, {
          ...lineStyle,
          color: "#2e7d32",
          weight: 6,
          opacity: 1,
        }),
      ]).addTo(map);
      const isDesktop = window.innerWidth >= 1024;
      map.fitBounds(L.latLngBounds(result.coords), {
        paddingTopLeft: isDesktop ? [440, 150] : [32, 190],
        paddingBottomRight: isDesktop ? [40, 40] : [32, 200],
        maxZoom: 17,
      });
      setRoute({ stationId: station.id_location, ...result });
      setRouteStatus("idle");
    } catch (err) {
      if (err.name === "AbortError") return;
      setRouteStatus("error");
      setRouteError(
        err.code === "NO_ROUTE"
          ? "Rute mobil ke station ini tidak ditemukan."
          : "Gagal memuat rute. Periksa koneksi internet, lalu coba lagi.",
      );
    }
  };

  /** Membuka tampilan gabungan peta dan daftar station. */
  const openStationSearch = () => {
    setView("map");
  };

  /** Memilih station sebagai fokus peta dan kembali ke area peta. */
  const goToMap = (station) => {
    pendingFocusStationRef.current = station || null;
    setView("map");
    if (station) setSelectedStationId(station.id_location);
  };

  const activeVehicleConnector = activeVehicle
    ? konektorLabel(activeVehicle.tipe_konektor)
    : null;
  /** Rekomendasi beranda hanya mengikuti konektor kendaraan dan GPS, terpisah dari filter Maps. */
  const nearbyStations = activeVehicleConnector
    ? stations
        .filter((station) => station.can_start)
        .filter((station) =>
          station.tipe_konektor_list?.some((type) =>
            sameConnector(type, activeVehicle.tipe_konektor),
          ),
        )
        .sort(
          (first, second) =>
            (first.jarak_km ?? Number.POSITIVE_INFINITY) -
            (second.jarak_km ?? Number.POSITIVE_INFINITY),
        )
    : [];
  /** Meratakan port semua charger station agar dapat ditampilkan sebagai pilihan. */
  const stationPorts = (station) =>
    (station.chargers ?? []).flatMap((charger) =>
      (charger.ports ?? []).map((port) => ({
        ...port,
        kode_perangkat: charger.kode_perangkat,
        daya_kw: port.daya_kw ?? charger.daya_kw,
        status:
          charger.status_mesin !== "Active"
            ? charger.status_mesin
            : port.status_port,
        status_type: charger.status_mesin !== "Active" ? "charger" : "port",
      })),
    );
  const technicalStatusLabel = (item) =>
    item.status_type === "charger"
      ? chargerStatusLabel(item.status)
      : portStatusLabel(item.status);

  const firstName = user.nama.split(" ")[0];

  return (
    <div className="app-shell">
      {/* ============================================================
                LAYAR 1 — DASHBOARD HOME (tampilan awal, bukan peta)
               ============================================================ */}
      <div
        className={`home-screen ${view === "home" ? "is-active" : "is-hidden"}`}
      >
        <header className="home-header">
          <div className="home-header-layout">
            {/* Card pertama menggabungkan sapaan dan kendaraan yang dipakai driver. */}
            <section className="home-welcome-card">
              <div className="home-welcome-top">
                <div className="home-greeting-block">
                  <p className="home-greeting-text">
                    {getGreeting()}, {firstName}
                  </p>
                  <p className="home-greeting-sub">
                    {locationStatus === "live"
                      ? "Siap cari charger terdekat hari ini."
                      : "Cari station yang cocok dengan kendaraan Anda."}
                  </p>
                </div>
                <div className="home-header-actions">
                   <NotificationsBell />
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
              <div className="home-vehicle-panel">
                <div className="home-vehicle-heading-row">
                  <div className="home-vehicle-panel-head">
                    <span className="home-vehicle-pill-icon">
                      <FiZap aria-hidden="true" />
                    </span>
                    <span>Kendaraan aktif</span>
                  </div>
                  <button
                    type="button"
                    className="home-vehicle-add-link"
                    onClick={onNavigateToVehicles}
                  >
                    + Tambah Kendaraan
                  </button>
                </div>
                {vehicles.length > 0 ? (
                  <div className="home-vehicle-selection-row">
                    <select
                      className="home-vehicle-select"
                      value={activeVehicleId ?? ""}
                      onChange={(event) =>
                        setActiveVehicleId(Number(event.target.value))
                      }
                      disabled={vehiclesLoading}
                      aria-label="Pilih kendaraan aktif"
                    >
                      {vehicles.map((vehicle) => (
                        <option
                          key={vehicle.id_vehicle}
                          value={vehicle.id_vehicle}
                        >
                          {vehicle.merek} {vehicle.model} ·{" "}
                          {vehicle.nomor_polisi}
                        </option>
                      ))}
                    </select>
                    <span className="home-vehicle-connector">
                      {activeVehicleConnector
                        ? `Konektor ${activeVehicleConnector}`
                        : "Konektor belum tersedia"}
                    </span>
                  </div>
                ) : (
                  <div className="home-vehicle-selection-row">
                    <p className="home-vehicle-empty">
                      {vehiclesLoading
                        ? "Memuat kendaraan..."
                        : "Belum ada kendaraan terdaftar."}
                    </p>
                  </div>
                )}
              </div>
            </section>

                        {/* Urutan card kendaraan, saldo, lalu pencarian dipertahankan di semua breakpoint. */}
            <div className="home-balance-panel">
              <div>
                <p className="home-wallet-title">Dompet Digital</p>
                <div className="home-wallet-label-row">
                  <p className="home-wallet-label">Saldo Dompet</p>
                  <button
                    type="button"
                    className="home-wallet-visibility"
                    onClick={toggleWalletBalance}
                    aria-label={
                      hideWalletBalance
                        ? "Tampilkan saldo"
                        : "Sembunyikan saldo"
                    }
                    title={
                      hideWalletBalance
                        ? "Tampilkan saldo"
                        : "Sembunyikan saldo"
                    }
                  >
                    {hideWalletBalance ? (
                      <FiEye aria-hidden="true" />
                    ) : (
                      <FiEyeOff aria-hidden="true" />
                    )}
                  </button>
                </div>
                <p className="home-wallet-value">
                  {hideWalletBalance
                    ? "Rp ••••••"
                    : walletLoading
                      ? "..."
                      : formatRupiah(wallet?.saldo ?? 0)}
                </p>
                <p className="home-wallet-held">
                  <span>Saldo tertahan</span>
                  <strong>
                    {hideWalletBalance
                      ? "Rp ••••••"
                      : walletLoading
                        ? "..."
                        : formatRupiah(wallet?.saldo_hold ?? 0)}
                  </strong>
                </p>
              </div>
              {/* Top Up membuka verifikasi atau pembuatan PIN sebelum pembayaran. */}
              <div className="home-wallet-actions">
                <button
                  className="home-wallet-topup"
                  onClick={onNavigateToWalletTopup}
                >
                  + Top Up
                </button>
              </div>
            </div>
            <section className="home-search-card">
              <button className="home-cta-map" onClick={openStationSearch}>
                <span className="home-cta-icon">
                  <FiMap aria-hidden="true" />
                </span>
                <span className="home-cta-text">
                  <span className="home-cta-title">Cari Charging Station</span>
                  <span className="home-cta-sub">
                    {activeVehicleConnector
                      ? `${Math.min(nearbyStations.length, 3)} station sesuai konektor ${activeVehicleConnector}${locationStatus === "live" ? " · terdekat" : ""}`
                      : "Pilih kendaraan untuk melihat station yang cocok"}
                  </span>
                </span>
                <span className="home-cta-arrow">
                  <FiArrowRight aria-hidden="true" />
                </span>
              </button>
            </section>
          </div>
        </header>

        <main className="home-content">
          {sessionNotice && !activeSession && (
            <div className="home-inline-error home-session-notice" role="status">
              <span>{sessionNotice}</span>
              <button
                type="button"
                className="home-session-notice-close"
                onClick={() => setSessionNotice("")}
                aria-label="Tutup pemberitahuan"
              >
                <FiX aria-hidden="true" />
              </button>
            </div>
          )}
          {sessionSyncError && !activeSession && (
            <div className="home-inline-error" role="alert">
              {sessionSyncError}
            </div>
          )}
          {activeSession && (
            <section className="home-session-card">
              <div className="mapdash-sheet-title-row">
                <span className="mapdash-sheet-title home-session-title">
                  Sesi Charging Berlangsung
                </span>
                <span
                  className={`dash-status-badge ${
                    activeSession.dijeda ? "warn" : "ok"
                  }`}
                >
                  {activeSession.dijeda
                    ? "Dijeda"
                    : activeSession.sudah_penuh
                      ? "Baterai Penuh"
                      : activeSession.status}
                </span>
              </div>
              <p className="mapdash-session-location">
                <FiMapPin aria-hidden="true" /> {activeSession.nama_lokasi} ·{" "}
                {activeSession.kode_charger}
                {activeSession.nomor_port && <> · {activeSession.nomor_port} · {portStatusLabel(activeSession.status_port || "Charging").text}</>}
                {activeSession.soc_sekarang != null ? (
                  <>
                    <span> · </span>
                    <FiBattery aria-hidden="true" />{" "}
                    {activeSession.soc_sekarang}%
                  </>
                ) : (
                  ""
                )}
              </p>

              <div className="dash-progress-track">
                <div
                  className="dash-progress-fill"
                  style={{ width: `${sessionProgressPct}%` }}
                />
              </div>
              <div className="dash-session-stats">
                <div>
                  <p className="stat-value">{activeSession.energi_kwh} kWh</p>
                  <p className="stat-label">Energi Terisi</p>
                </div>
                <div>
                  <p className="stat-value">
                    {formatDuration(sessionDurationMs)}
                  </p>
                  <p className="stat-label">Durasi</p>
                </div>
                <div>
                  <p className="stat-value">
                    {formatRupiah(sessionEstimatedCost)}
                  </p>
                  <p className="stat-label">Estimasi Biaya</p>
                </div>
              </div>
              <p className="home-session-cost-note">
                Dana ditahan {formatRupiah(activeSession.saldo_hold)}. Biaya
                akhir dihitung saat sesi selesai.
              </p>
                {activeSession.dijeda && (
                  <button
                    type="button"
                    className="dash-btn-stop"
                    onClick={async () => {
                      if (!activeSession?.id_session) return;
                      try {
                        await resumeChargingSession(activeSession.id_session);
                        const refreshed = await getActiveChargingSession();
                        if (refreshed) setActiveSession(refreshed);
                      } catch (err) {
                        setSessionError(extractErrorMessage(err, "Gagal melanjutkan sesi."));
                      }
                    }}
                  >
                    Lanjutkan
                  </button>
                )}
              <div className="home-session-actions">
                <button
                  className="dash-btn-stop"
                  onClick={handleStopSession}
                  disabled={stoppingSession}
                >
                  {stoppingSession
                    ? "Memproses…"
                    : activeSession.sudah_penuh
                      ? "Selesai"
                      : "Hentikan Sesi"}
                </button>
                <button
                  ref={interruptTriggerRef}
                  className="dash-btn-issue"
                  onClick={openInterruptModal}
                  disabled={stoppingSession || pausingSession}
                >
                  {pausingSession ? "Menjeda sesi..." : "Laporkan Gangguan"}
                </button>
              </div>
              {sessionError && (
                <p className="home-session-error" role="alert">
                  {sessionError}
                </p>
              )}
              {sessionSyncError && (
                <p className="home-session-error" role="status">
                  {sessionSyncError}
                </p>
              )}
            </section>
          )}

          {showInterruptModal &&
            createPortal(
              <div
                className="interrupt-modal"
                onMouseDown={async (event) => {
                  if (event.target !== event.currentTarget || stoppingSession) return;
                  if (activeSession?.id_session) {
                    try {
                      await resumeChargingSession(activeSession.id_session);
                    } catch {
                      // ignore
                    }
                  }
                  setShowInterruptModal(false);
                  setInterruptReason("");
                  if (activeSession?.id_session) {
                    try {
                      const refreshed = await getActiveChargingSession();
                      if (refreshed) setActiveSession(refreshed);
                    } catch {
                      // ignore
                    }
                  }
                }}
              >
                <div className="interrupt-backdrop" aria-hidden="true" />
                <section
                  ref={interruptPanelRef}
                  className="interrupt-panel"
                  role="dialog"
                  aria-modal="true"
                  aria-labelledby="interrupt-title"
                  aria-describedby="interrupt-desc"
                  tabIndex={-1}
                >
                  <header className="interrupt-header">
                    <div className="interrupt-title-wrap">
                      <span className="interrupt-icon" aria-hidden="true">
                        <FiAlertTriangle />
                      </span>
                      <div>
                        <h3 id="interrupt-title">Laporkan Gangguan</h3>
                        <p id="interrupt-desc">Jelaskan gangguan yang terjadi pada sesi charging.</p>
                      </div>
                    </div>
                    <button
                      type="button"
                      className="interrupt-close"
                      onClick={async () => {
                        if (stoppingSession) return;
                        if (activeSession?.id_session) {
                          try {
                            await resumeChargingSession(activeSession.id_session);
                          } catch {
                            // ignore
                          }
                        }
                        setShowInterruptModal(false);
                        setInterruptReason("");
                        if (activeSession?.id_session) {
                          try {
                            const refreshed = await getActiveChargingSession();
                            if (refreshed) setActiveSession(refreshed);
                          } catch {
                            // ignore
                          }
                        }
                      }}
                      disabled={stoppingSession}
                      aria-label="Tutup"
                    >
                      <FiX />
                    </button>
                  </header>
                  <div className="interrupt-body">
                    {pauseCountdown > 0 && (
                      <div className="interrupt-warning">
                        Sesi charging dijeda sementara. Sisa waktu: {Math.floor(pauseCountdown / 60)}:{String(pauseCountdown % 60).padStart(2, "0")}
                      </div>
                    )}
                    {activeSession && (
                      <div className="interrupt-context">
                        <div>
                          <span>Station</span>
                          <strong>{activeSession.nama_lokasi}</strong>
                        </div>
                        <div>
                          <span>Charger / Port</span>
                          <strong>
                            {activeSession.kode_charger}
                            {activeSession.nomor_port ? ` / ${activeSession.nomor_port}` : ""}
                          </strong>
                        </div>
                        <div>
                          <span>Status sesi</span>
                          <strong>{activeSession.status}</strong>
                        </div>
                      </div>
                    )}
                    <div className="interrupt-warning">
                      Sesi charging akan dihentikan dan biaya dihitung dari energi yang sudah masuk.
                    </div>
                    <div className="interrupt-chips">
                      {[
                        "Charger berhenti mendadak",
                        "Kabel/konektor bermasalah",
                        "Layar/aplikasi error",
                        "Lainnya",
                      ].map((chip) => (
                        <button
                          key={chip}
                          type="button"
                          className="interrupt-chip"
                          disabled={stoppingSession}
                          onClick={() =>
                            setInterruptReason((prev) =>
                              prev ? `${prev}\\n${chip}` : chip,
                            )
                          }
                        >
                          {chip}
                        </button>
                      ))}
                    </div>
                    <label className="interrupt-field">
                      <span>Deskripsi gangguan</span>
                      <textarea
                        value={interruptReason}
                        onChange={(e) => setInterruptReason(e.target.value)}
                        placeholder="Contoh: charger berhenti mendadak..."
                        maxLength={160}
                        disabled={stoppingSession}
                        rows={4}
                      />
                      <div className="interrupt-field-meta">
                        <span>Minimal 5 karakter</span>
                        <span>{interruptReason.length}/160</span>
                      </div>
                    </label>
                    {sessionError && (
                      <p className="interrupt-error" role="alert">
                        {sessionError}
                      </p>
                    )}
                  </div>
                  <footer className="interrupt-footer">
                    <button
                      type="button"
                      className="interrupt-btn-secondary"
                      onClick={async () => {
                        if (stoppingSession) return;
                        if (activeSession?.id_session) {
                          try {
                            await resumeChargingSession(activeSession.id_session);
                          } catch {
                            // ignore
                          }
                        }
                        setShowInterruptModal(false);
                        setInterruptReason("");
                        if (activeSession?.id_session) {
                          try {
                            const refreshed = await getActiveChargingSession();
                            if (refreshed) setActiveSession(refreshed);
                          } catch {
                            // ignore
                          }
                        }
                      }}
                      disabled={stoppingSession}
                    >
                      Batal
                    </button>
                    <button
                      type="button"
                      className="interrupt-btn-primary"
                      onClick={() => handleInterruptSession(interruptReason)}
                      disabled={stoppingSession || interruptReason.trim().length < 5}
                    >
                      {stoppingSession ? (
                        <>
                          <span className="interrupt-spinner" aria-hidden="true" />
                          Mengirim...
                        </>
                      ) : (
                        "Kirim Laporan"
                      )}
                    </button>
                  </footer>
                </section>
              </div>,
              document.body,
            )}

          {invoice && (
            <section className="home-invoice-card">
              <div className="mapdash-sheet-title-row">
                <span className="mapdash-sheet-title">
                  Invoice Digital Terakhir
                </span>
                <div className="home-invoice-card-actions">
                  <span className={`dash-status-badge ${sessionStatusTone(invoice.status)}`}>
                    {invoice.status}
                  </span>
                  <button
                    type="button"
                    className="home-invoice-close"
                    aria-label="Tutup invoice"
                    onClick={() => setInvoice(null)}
                  >
                    <FiX aria-hidden="true" />
                  </button>
                </div>
              </div>
              <p className="mapdash-session-location">
                <FiMapPin aria-hidden="true" /> {invoice.nama_lokasi} ·{" "}
                {invoice.kode_charger}
              </p>
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
                  <strong>
                    {formatRupiah(
                      Math.max(0, invoice.jumlah_hold - invoice.biaya_aktual),
                    )}
                  </strong>
                </div>
              </div>
              <div className="invoice-grid-actions">
                <button
                  type="button"
                  className="invoice-print-button"
                  disabled={!invoice.id_payment}
                  onClick={() => handleOpenInvoice({ id_payment: invoice.id_payment })}
                >
                  <FiPrinter aria-hidden="true" /> Lihat & Cetak Nota
                </button>
              </div>
            </section>
          )}

          <section className="home-section home-stations-section">
            <div className="home-section-title-row">
              <div>
                <h2 className="home-section-title">Station sekitar</h2>
                <p className="home-section-caption">
                  {stationsLoading
                    ? "Memuat charging station..."
                    : activeVehicleConnector
                      ? `${Math.min(nearbyStations.length, 3)} rekomendasi · konektor ${activeVehicleConnector}${locationStatus === "live" ? " · terdekat" : " · aktifkan lokasi untuk melihat jarak"}`
                      : "Pilih kendaraan untuk rekomendasi konektor"}
                </p>
              </div>
              <div className="home-station-heading-actions">
                <button
                  type="button"
                  className="home-map-link"
                  onClick={openStationSearch}
                >
                  Lihat semua
                </button>
                {locationStatus !== "live" && (
                  <button
                    type="button"
                    className="home-location-retry"
                    onClick={handleLocateMe}
                  >
                    Aktifkan lokasi
                  </button>
                )}
              </div>
            </div>
            {stationsError && (
              <div className="home-inline-error" role="alert">
                <span>{stationsError}</span>
                <button className="dash-link-btn" onClick={reloadStations}>
                  Coba lagi
                </button>
              </div>
            )}
            {!stationsLoading && !stationsError && !activeVehicleConnector && (
              <div className="home-nearby-empty">
                <p className="dash-empty">
                  Tambahkan kendaraan aktif untuk melihat station dengan
                  konektor yang sesuai.
                </p>
                <button
                  type="button"
                  className="home-map-link"
                  onClick={onNavigateToVehicles}
                >
                  Tambah kendaraan
                </button>
              </div>
            )}
            {!stationsLoading &&
              !stationsError &&
              activeVehicleConnector &&
              nearbyStations.length === 0 && (
                <div className="home-nearby-empty">
                  <p className="dash-empty">
                    Belum ada station yang sesuai dengan konektor kendaraan
                    aktif.
                  </p>
                  <button
                    type="button"
                    className="home-map-link"
                    onClick={() => goToMap()}
                  >
                    Lihat semua di Maps
                  </button>
                </div>
              )}

            <div className="mapdash-station-scroll home-station-scroll">
              {nearbyStations.slice(0, 3).map((s) => {
                const badge = stationStatusLabel(s);
                return (
                  <button
                    key={s.id_location}
                    className="mapdash-station-mini"
                    onClick={() => goToMap(s)}
                  >
                    <div className="mapdash-station-mini-top">
                      <span className={`dash-status-badge ${badge.tone}`}>
                        {badge.text}
                      </span>
                      {s.jarak_km != null && (
                        <span className="mapdash-station-mini-dist">
                          <FiMapPin aria-hidden="true" /> {s.jarak_km} km
                        </span>
                      )}
                    </div>
                    <p className="mapdash-station-mini-name">{s.nama_lokasi}</p>
                    <p className="mapdash-station-mini-meta">
                      {(s.tipe_konektor_list ?? [])
                        .map(konektorLabel)
                        .join(" / ")}{" "}
                      · {s.port_tersedia} dari {s.jumlah_port} port tersedia ·{" "}
                      {formatRupiah(s.tarif_per_kwh)}/kWh
                    </p>
                  </button>
                );
              })}
            </div>
          </section>

          <section className="home-section home-history-section">
            <div className="home-section-title-row home-history-heading">
              <div>
                <h2 className="home-section-title">Riwayat Transaksi</h2>
                <p className="home-section-caption">
                  {filteredTransactionHistory.length} transaksi ditemukan. Menampilkan maksimal {TRANSACTIONS_PER_TABLE} transaksi per kategori pada setiap halaman.
                </p>
              </div>
              <div
                className="home-history-controls"
                aria-label="Filter riwayat transaksi"
              >
                <label className="home-history-period-control">
                  <span>Periode</span>
                  <select
                    id="history-period"
                    className="home-history-period-select"
                    value={historyPeriod}
                    onChange={(event) => {
                      setHistoryPeriod(event.target.value);
                      setHistoryPage(0);
                    }}
                  >
                    <option value="all">Semua</option>
                    <option value="7">7 hari</option>
                    <option value="30">30 hari</option>
                    <option value="custom">Custom</option>
                  </select>
                </label>
                <label className="home-history-search">
                  <FiSearch aria-hidden="true" />
                  <input
                    type="search"
                    value={historyKeyword}
                    onChange={(event) => {
                      setHistoryKeyword(event.target.value);
                      setHistoryPage(0);
                    }}
                    placeholder="Cari transaksi..."
                    aria-label="Cari transaksi"
                  />
                </label>
                {historyPeriod === "custom" && (
                  <div className="home-history-dates">
                    <label>
                      Mulai{" "}
                      <input
                        type="date"
                        value={historyFrom}
                        onChange={(event) => {
                          setHistoryFrom(event.target.value);
                          setHistoryPage(0);
                        }}
                      />
                    </label>
                    <label>
                      Sampai{" "}
                      <input
                        type="date"
                        value={historyTo}
                        onChange={(event) => {
                          setHistoryTo(event.target.value);
                          setHistoryPage(0);
                        }}
                      />
                    </label>
                  </div>
                )}
              </div>
            </div>

            {historyError && (
              <p className="dash-empty">
                {historyError}{" "}
                <button
                  className="dash-link-btn"
                  onClick={fetchTransactionHistory}
                >
                  Coba lagi
                </button>
              </p>
            )}

            <div className="home-history-tables">
              {!historyLoading &&
                !historyError &&
                filteredTransactionHistory.length === 0 && (
                  <p className="dash-empty home-history-empty">Belum ada transaksi.</p>
                )}
              {historyLoading && (
                <p className="dash-empty home-history-empty" role="status">Memuat transaksi...</p>
              )}
              {transactionTables.map((tableRows, tableIndex) =>
                tableRows.length > 0 ? (
                  <div
                    className="transaction-list"
                    key={`transaction-table-${tableIndex}`}
                    role="group"
                    aria-label={`Kelompok transaksi ${tableIndex + 1}`}
                  >
                    {tableRows.map((trx) => {
                      // Jenis transaksi menentukan arah arus uang; status tetap tampil terpisah.
                      const isIncome = trx.jenis_pembayaran
                        ? trx.jenis_pembayaran === "topup"
                        : trx.energi_kwh == null;
                      return (
                        <button
                          className={`transaction-item ${isIncome ? "is-income" : "is-expense"}`}
                          key={trx.id_payment}
                          onClick={() => handleOpenInvoice(trx)}
                        >
                          <div className="transaction-main">
                            <span className="transaction-icon">
                              {isIncome ? <FiArrowUp aria-hidden="true" /> : <FiArrowDown aria-hidden="true" />}
                            </span>
                            <div>
                              <p className="transaction-location">
                                {isIncome ? "Top Up Dompet Digital" : trx.nama_lokasi}
                              </p>
                              <p className="transaction-meta">
                                {trx.tanggal}
                                {isIncome
                                  ? ` · ${trx.metode_pembayaran}`
                                  : ` · ${trx.energi_kwh} kWh`}
                              </p>
                            </div>
                          </div>
                          <div className="transaction-side">
                            <strong>
                              {isIncome ? "+" : "−"}{" "}
                              {formatRupiah(trx.total)}
                            </strong>
                            <span className={`dash-status-badge ${sessionStatusTone(trx.status)}`}>
                              {trx.status}
                            </span>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                ) : null,
              )}
            </div>
            {filteredTransactionHistory.length > TRANSACTION_PAGE_SIZE && (
              <div
                className="home-history-pagination"
                aria-label="Halaman riwayat transaksi"
              >
                <button
                  type="button"
                  onClick={() =>
                    setHistoryPage((page) => Math.max(0, page - 1))
                  }
                  disabled={historyPage === 0}
                >
                  Sebelumnya
                </button>
                <span>
                  {historyPage + 1} /{" "}
                  {Math.ceil(filteredTransactionHistory.length / TRANSACTION_PAGE_SIZE)}
                </span>
                <button
                  type="button"
                  onClick={() =>
                    setHistoryPage((page) =>
                      Math.min(
                        Math.ceil(filteredTransactionHistory.length / TRANSACTION_PAGE_SIZE) - 1,
                        page + 1,
                      ),
                    )
                  }
                  disabled={
                    (historyPage + 1) * TRANSACTION_PAGE_SIZE >= filteredTransactionHistory.length
                  }
                >
                  Berikutnya
                </button>
              </div>
            )}
          </section>
        </main>
      </div>

      {/* ============================================================
                LAYAR 2 — PETA (dibuka saat driver menekan "Cari Charging
                Station" atau salah satu kartu station dari dashboard)
               ============================================================ */}
      <div
        className={`mapdash-container ${view === "map" ? "is-active" : "is-hidden"} ${selectedStation ? "has-selected-station" : ""}`}
      >
        <div ref={mapNodeRef} className="mapdash-map" />

        {/* Top bar mengambang di atas peta */}
        <div className="mapdash-topbar">
          <div className="mapdash-topbar-right">
            <button
              type="button"
              className="mapdash-round-btn"
              aria-label="Tampilkan status sesi aktif"
              title="Status sesi charging"
              disabled={!activeSession}
              onClick={() => setShowSessionStatus((visible) => !visible)}
            >
              <FiZap aria-hidden="true" />
            </button>
            <button
              type="button"
              className="mapdash-round-btn"
              aria-label="Pengaturan driver"
              onClick={openSettings}
            >
              <FiSettings aria-hidden="true" />
            </button>
          </div>
        </div>

        {showSessionStatus && activeSession && (
          <div className="mapdash-notif mapdash-session-status" role="status" aria-label="Status sesi charging">
              <span>
                <FiZap aria-hidden="true" /> <strong>Sesi aktif</strong> ·{" "}
                {activeSession.nama_lokasi}
              </span>
            <button
              className="mapdash-notif-close"
              onClick={() => setShowSessionStatus(false)}
              aria-label="Tutup status sesi"
            >
              <FiX aria-hidden="true" />
            </button>
          </div>
        )}

        {((sessionError && !activeSession) ||
          (sessionSyncError && !activeSession) ||
          (sessionNotice && !activeSession)) && (
          <div
            className="mapdash-location-notice"
            role={sessionError || sessionSyncError ? "alert" : "status"}
          >
            {(sessionError || sessionSyncError || sessionNotice) && (
              <span>{sessionError || sessionSyncError || sessionNotice}</span>
            )}
          </div>
        )}

        {/* Kartu rute ke station terpilih */}
        {!activeSession && selectedStation && (
          <div
            className="route-card"
            role="region"
            aria-label="Rute ke station"
          >
            <div className="route-card-head">
              <div className="route-card-titles">
                <span className="route-card-eyebrow">Tujuan</span>
                <span className="route-card-name">
                  {selectedStation.nama_lokasi}
                </span>
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
                <span className="route-card-dist">
                  {formatJarak(route.distanceM)}
                </span>
                <span className="route-card-dot">·</span>
                <span className="route-card-eta">
                  {formatDurasi(route.durationS)}
                </span>
                <span className="route-card-note">
                  estimasi tanpa lalu lintas
                </span>
              </div>
            )}

            {routeStatus === "loading" && (
              <p className="route-card-status" aria-live="polite">
                <span className="route-card-spinner" aria-hidden="true" />{" "}
                Menghitung rute…
              </p>
            )}
            {routeStatus === "error" && (
              <p className="route-card-error" role="alert">
                {routeError}
              </p>
            )}

            <div className="route-card-start-block">
              {isStationClosed(selectedStation) ? (
                <p className="route-card-closed" role="status">
                  Station sedang tutup
                  {selectedStation.buka_berikutnya
                    ? `, buka pukul ${selectedStation.buka_berikutnya} WIB`
                    : ""}
                  . Mulai charging tidak tersedia; Anda masih dapat melihat
                  rute, membuka Google Maps, atau melihat detail.
                </p>
              ) : !chargingSettings.require_arrival ? (
                <p className="route-card-arrived">
                  Mode uji coba jarak jauh aktif.
                </p>
              ) : hasArrived ? (
                <p className="route-card-arrived">
                  Anda sudah berada di sekitar station.
                </p>
              ) : (
                <p className="route-card-hint">
                  {distToSelectedM != null
                    ? `Mulai charging aktif setelah Anda sampai dalam radius ${chargingSettings.arrival_radius_m} m (± ${formatJarak(distToSelectedM)} lagi).`
                    : "Aktifkan izin lokasi agar kami tahu kapan Anda sampai di station."}
                </p>
              )}
              <button
                className="route-card-start"
                onClick={() => openStartCharging(selectedStation, null)}
                disabled={
                  isStationClosed(selectedStation) ||
                  selectedStation?.can_start === false ||
                  (chargingSettings.require_arrival && !hasArrived)
                }
              >
                <FiZap aria-hidden="true" /> Mulai Charging
              </button>
            </div>

            <div className="route-card-actions">
              <button
                className="route-card-primary"
                onClick={() => handleShowRoute(selectedStation)}
                disabled={routeStatus === "loading"}
              >
                {route ? (
                  "↻ Perbarui rute"
                ) : routeStatus === "error" ? (
                  "↻ Coba lagi"
                ) : (
                  <>
                    <FiNavigation aria-hidden="true" /> Tampilkan Rute
                  </>
                )}
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
          className={`mapdash-locate-btn ${locationStatus === "denied" || locationStatus === "unsupported" ? "no-location" : ""}`}
          onClick={handleLocateMe}
          aria-label="Lokasi saya"
          title={
            locationStatus === "denied"
              ? "Izin lokasi ditolak — jarak tidak ditampilkan"
              : locationStatus === "unsupported"
                ? "Browser tidak mendukung lokasi — jarak tidak ditampilkan"
                : locationStatus === "locating"
                  ? "Mencari lokasi Anda..."
                  : "Lokasi Anda (live)"
          }
        >
          <FiCrosshair aria-hidden="true" />
          {locationStatus === "live" && (
            <span className="mapdash-locate-live-dot" />
          )}
        </button>

        {/* Bottom sheet */}
        <div className={`mapdash-sheet ${showStationFilters ? "filters-open" : ""}`}>
          <div className="mapdash-search-card-heading">
            <button type="button" className="mapdash-search-back" onClick={() => setView("home")} aria-label="Kembali ke dashboard">
              <FiArrowLeft aria-hidden="true" />
            </button>
            <h1>Cari Charging Station</h1>
          </div>
          {activeSession ? (
            <div className="mapdash-session">
              <div className="mapdash-sheet-title-row">
                <span className="mapdash-sheet-title">
                  Sesi Charging Berlangsung
                </span>
                <span
                  className={`dash-status-badge ${
                    activeSession.dijeda ? "warn" : "ok"
                  }`}
                >
                  {activeSession.dijeda
                    ? "Dijeda"
                    : activeSession.sudah_penuh
                      ? "Baterai Penuh"
                      : activeSession.status}
                </span>
              </div>
              <p className="mapdash-session-location">
                <FiMapPin aria-hidden="true" /> {activeSession.nama_lokasi} ·{" "}
                {activeSession.kode_charger}
                {activeSession.nomor_port && <> · {activeSession.nomor_port} · {portStatusLabel(activeSession.status_port || "Charging").text}</>}
                {activeSession.soc_sekarang != null ? (
                  <>
                    <span> · </span>
                    <FiBattery aria-hidden="true" />{" "}
                    {activeSession.soc_sekarang}%
                  </>
                ) : (
                  ""
                )}
              </p>

              <div className="dash-progress-track">
                <div
                  className="dash-progress-fill"
                  style={{ width: `${sessionProgressPct}%` }}
                />
              </div>
              <div className="dash-session-stats">
                <div>
                  <p className="stat-value">{activeSession.energi_kwh} kWh</p>
                  <p className="stat-label">Energi Terisi</p>
                </div>
                <div>
                  <p className="stat-value">
                    {formatDuration(sessionDurationMs)}
                  </p>
                  <p className="stat-label">Durasi</p>
                </div>
                <div>
                  <p className="stat-value">
                    {formatRupiah(sessionEstimatedCost)}
                  </p>
                  <p className="stat-label">Estimasi Biaya</p>
                </div>
              </div>
              <p className="home-session-cost-note">
                Dana ditahan {formatRupiah(activeSession.saldo_hold)}. Biaya
                akhir dihitung saat sesi selesai.
              </p>
              <div className="home-session-actions">
                <button
                  className="dash-btn-stop"
                  onClick={handleStopSession}
                  disabled={stoppingSession}
                >
                  {stoppingSession
                    ? "Memproses…"
                    : activeSession.sudah_penuh
                      ? "Selesai"
                      : "Hentikan Sesi"}
                </button>
                <button
                  className="dash-btn-issue"
                  onClick={openInterruptModal}
                  disabled={stoppingSession || pausingSession}
                >
                  {pausingSession ? "Menjeda..." : "Gangguan"}
                </button>
              </div>
              {sessionError && (
                <p className="home-session-error" role="alert">
                  {sessionError}
                </p>
              )}
              {sessionSyncError && (
                <p className="home-session-error" role="status">
                  {sessionSyncError}
                </p>
              )}
            </div>
          ) : (
            <>
              {/* Kontrol pencarian, dropdown konektor, filter, dan hasil tinggal dalam satu panel. */}
              <section className="mapdash-filter-panel" aria-label="Cari dan filter station">
                <div className="mapdash-search-row">
                  <label className="mapdash-station-search">
                    <FiSearch aria-hidden="true" />
                    <span className="sr-only">Cari nama, kode, atau alamat station</span>
                    <input
                      type="search"
                      value={stationKeyword}
                      onChange={(event) => setStationKeyword(event.target.value)}
                      placeholder="Cari station atau alamat"
                      aria-label="Cari station berdasarkan nama, kode, atau alamat"
                    />
                  </label>
                  <button
                    type="button"
                    className={`mapdash-filter-toggle ${showStationFilters ? "active" : ""}`}
                    aria-expanded={showStationFilters}
                    aria-controls="mapdash-advanced-filters"
                    onClick={() => setShowStationFilters((open) => !open)}
                  >
                    <FiFilter aria-hidden="true" /> Filter
                    {activeStationFilterCount > 0 && <span className="mapdash-filter-count">{activeStationFilterCount}</span>}
                  </button>
                </div>
                <label className="mapdash-connector-select">
                  <span>Jenis konektor</span>
                  <select value={connectorFilter} onChange={(event) => setConnectorFilter(event.target.value)} aria-label="Filter jenis konektor">
                    {CONNECTOR_FILTERS.map((filter) => <option key={filter} value={filter}>{filter}</option>)}
                  </select>
                </label>
                {showStationFilters && (
                  <div className="mapdash-advanced-filters" id="mapdash-advanced-filters">
                    <label>Ketersediaan<select value={availabilityFilter} onChange={(event) => setAvailabilityFilter(event.target.value)}><option value="all">Semua status</option><option value="available">Ada port tersedia</option><option value="full">Penuh</option></select></label>
                    <label>Daya minimum (kW)<input type="number" min="0" step="10" inputMode="numeric" value={minimumPowerFilter === "all" ? "" : minimumPowerFilter} onChange={(event) => setMinimumPowerFilter(event.target.value || "all")} placeholder="Tanpa batas" /></label>
                    <label>Tarif maksimum (Rp/kWh)<input type="number" min="0" step="100" inputMode="numeric" value={maximumPriceFilter === "all" ? "" : maximumPriceFilter} onChange={(event) => setMaximumPriceFilter(event.target.value || "all")} placeholder="Tanpa batas" /></label>
                    {(activeStationFilterCount > 0 || stationKeyword.trim()) && <button type="button" className="mapdash-clear-filters" onClick={clearStationFilters}>Hapus pencarian dan filter</button>}
                  </div>
                )}
                {locationStatus !== "live" && (
                  <div className="mapdash-search-footer">
                    <span className="mapdash-location-inline">Jarak disembunyikan<button type="button" onClick={handleLocateMe}>Aktifkan lokasi</button></span>
                  </div>
                )}
              </section>
              <div className="mapdash-sheet-title-row">
                <span className="mapdash-sheet-title">
                  {filteredStations.length} station
                </span>
              </div>

              <div className="dash-station-list mapdash-station-list-full">
                  {filteredStations.map((s) => {
                    const badge = stationStatusLabel(s);
                    return (
                      <div
                        key={s.id_location}
                        className={`dash-station-item ${selectedStationId === s.id_location ? "selected" : ""}`}
                        onClick={() => handleFocusStation(s)}
                      >
                        <div className="dash-station-main">
                          <p className="dash-station-name">
                            {s.kode_station} · {s.nama_lokasi}
                          </p>
                          <p className="dash-station-address">{s.alamat}</p>
                          <div className="dash-station-meta">
                            {s.jarak_km != null && (
                              <span>
                                <FiMapPin aria-hidden="true" /> {s.jarak_km} km
                              </span>
                            )}
                            <span>
                              <FiZap aria-hidden="true" />{" "}
                              {(s.tipe_konektor_list ?? [])
                                .map(konektorLabel)
                                .join(" / ")}
                            </span>
                            <span>{formatRupiah(s.tarif_per_kwh)}/kWh</span>
                          </div>
                        </div>
                        <div className="dash-station-side">
                          <span className={`dash-status-badge ${badge.tone}`}>
                            {badge.text}
                          </span>
                          <span className="dash-station-count">
                            {s.port_tersedia} dari {s.jumlah_port} port tersedia
                          </span>
                          <button
                            className="dash-btn-navigate"
                            disabled={badge.tone !== "ok"}
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
                              <span>Pilih port</span>
                              <small>
                                {formatRupiah(s.tarif_per_kwh)}/kWh · parkir{" "}
                                {formatRupiah(s.biaya_parkir)}
                              </small>
                            </div>
                            {stationPorts(s).map((charger) => {
                              const chargerBadge = technicalStatusLabel(charger);
                              return (
                                <button
                                  key={charger.id_port}
                                  className="charger-option"
                                  disabled={isStationClosed(s) || !s.can_start || chargerBadge.tone !== "ok"}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    openStartCharging(s, charger);
                                  }}
                                >
                                  <span className="charger-option-main">
                                    <strong>
                                      {charger.kode_perangkat ||
                                        `Port ${charger.id_port}`}
                                    </strong>
                                    <span>
                                      {konektorLabel(charger.tipe_konektor)} ·{" "}
                                      {charger.daya_kw ??
                                        charger.daya_kw_max ??
                                        0}{" "}
                                      kW
                                    </span>
                                  </span>
                                  <span
                                    className={`dash-status-badge ${chargerBadge.tone}`}
                                  >
                                    {chargerBadge.text}
                                  </span>
                                </button>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    );
                  })}
                  {filteredStations.length === 0 && (
                    <p className="dash-empty">
                      Tidak ada station yang cocok. Ubah kata kunci atau filter.
                    </p>
                  )}
              </div>
            </>
          )}
        </div>
      </div>

      {(selectedInvoice || invoiceLoading) && (
        <div
          className="charge-flow-overlay"
          onClick={() => setSelectedInvoice(null)}
        >
          <div
            className="charge-flow-panel invoice-detail-panel"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="settings-panel-header invoice-modal-header">
              <span className="settings-panel-title">
                {selectedInvoice?.jenis_pembayaran === "topup" ? "Nota Top Up" : "Nota Charging"}
              </span>
              <button
                type="button"
                className="invoice-modal-close"
                onClick={() => {
                  setSelectedInvoice(null);
                  setInvoiceLoading(false);
                }}
                aria-label="Tutup nota"
              >
                <FiX aria-hidden="true" />
              </button>
            </div>

            {invoiceLoading && !selectedInvoice ? (
              <p className="dash-empty">Memuat detail invoice...</p>
            ) : (
              <>
                <article className="invoice-receipt">
                  <header className="invoice-receipt-brand">
                    <span className="invoice-receipt-mark"><FiZap aria-hidden="true" /></span>
                    <div>
                      <strong>EVCharge Hub</strong>
                      <span>Bukti transaksi digital</span>
                    </div>
                    <span className={`invoice-receipt-status dash-status-badge ${sessionStatusTone(selectedInvoice.status)}`}>{selectedInvoice.status ?? "Diproses"}</span>
                  </header>

                  <div className="invoice-receipt-number">
                    <span>Nomor invoice</span>
                    <div className="invoice-receipt-number-actions">
                      <strong>INV-{String(selectedInvoice.id_payment ?? selectedInvoice.id_session ?? "").padStart(6, "0")}</strong>
                      <button
                        type="button"
                        className={`invoice-copy-button${invoiceCopyStatus === "copied" ? " is-copied" : ""}${invoiceCopyStatus === "failed" ? " is-failed" : ""}`}
                        aria-label="Salin ID transaksi"
                        disabled={(selectedInvoice.id_payment ?? selectedInvoice.id_session) == null || (selectedInvoice.id_payment ?? selectedInvoice.id_session) === ""}
                        onClick={handleCopyInvoiceId}
                      >
                        {invoiceCopyStatus === "copied" ? (
                          <>
                            <FiCheck aria-hidden="true" /> Tersalin
                          </>
                        ) : invoiceCopyStatus === "failed" ? (
                          <>Gagal menyalin</>
                        ) : (
                          <>
                            <FiCopy aria-hidden="true" /> Salin ID transaksi
                          </>
                        )}
                        <span className="invoice-copy-live" aria-live="polite" aria-atomic="true">
                          {invoiceCopyStatus === "copied" ? "Tersalin" : invoiceCopyStatus === "failed" ? "Gagal menyalin" : ""}
                        </span>
                      </button>
                    </div>
                  </div>

                  {selectedInvoice.jenis_pembayaran === "topup" ? (
                    <div className="invoice-receipt-section">
                      <h3>Top Up Dompet Digital</h3>
                      <dl className="invoice-receipt-rows">
                        <div><dt>Waktu pembayaran</dt><dd>{selectedInvoice.waktu_pembayaran ? new Date(selectedInvoice.waktu_pembayaran).toLocaleString("id-ID") : "Tidak tersedia"}</dd></div>
                        <div><dt>Nominal Top Up</dt><dd>{formatRupiah(selectedInvoice.nominal ?? 0)}</dd></div>
                        <div><dt>Biaya layanan</dt><dd>{formatRupiah(selectedInvoice.biaya_layanan ?? 0)}</dd></div>
                        <div><dt>Metode pembayaran</dt><dd>{selectedInvoice.metode_pembayaran ?? "Tidak tersedia"}</dd></div>
                        <div><dt>Referensi</dt><dd>{selectedInvoice.referensi_gateway ?? "Tidak tersedia"}</dd></div>
                        <div><dt>Status pembayaran</dt><dd>{selectedInvoice.status_pembayaran ?? selectedInvoice.status ?? "Tidak tersedia"}</dd></div>
                      </dl>
                      <div className="invoice-receipt-total"><span>Total dibayar</span><strong>{formatRupiah(selectedInvoice.total_dibayar ?? selectedInvoice.biaya_aktual)}</strong></div>
                    </div>
                  ) : (
                    <>
                      <div className="invoice-receipt-section">
                        <h3>Informasi pengisian</h3>
                        <dl className="invoice-receipt-rows">
                          <div><dt>Station</dt><dd>{selectedInvoice.nama_lokasi ?? "Tidak tersedia"}{selectedInvoice.kode_station ? ` · ${selectedInvoice.kode_station}` : ""}</dd></div>
                          <div><dt>Alamat</dt><dd>{selectedInvoice.alamat ?? "Tidak tersedia"}</dd></div>
                          <div><dt>Charger / port</dt><dd>{selectedInvoice.kode_charger ?? "Tidak tersedia"} · {selectedInvoice.nomor_port ?? "Port tidak tersedia"}</dd></div>
                          <div><dt>Konektor port</dt><dd>{selectedInvoice.tipe_konektor_port ?? "Tidak tersedia"}</dd></div>
                          <div><dt>Kendaraan</dt><dd>{selectedInvoice.kendaraan?.nama ?? "Tidak tersedia"} · {selectedInvoice.kendaraan?.nomor_polisi ?? "Nomor polisi tidak tersedia"}</dd></div>
                          <div><dt>Waktu mulai</dt><dd>{selectedInvoice.waktu_mulai ? new Date(selectedInvoice.waktu_mulai).toLocaleString("id-ID") : "Tidak tersedia"}</dd></div>
                          <div><dt>Waktu selesai</dt><dd>{selectedInvoice.waktu_selesai ? new Date(selectedInvoice.waktu_selesai).toLocaleString("id-ID") : "Tidak tersedia"}</dd></div>
                          <div><dt>Durasi sesi</dt><dd>{selectedInvoice.waktu_mulai && selectedInvoice.waktu_selesai ? formatDuration(new Date(selectedInvoice.waktu_selesai).getTime() - new Date(selectedInvoice.waktu_mulai).getTime()) : "Tidak tersedia"}</dd></div>
                          <div><dt>Energi terpakai</dt><dd>{selectedInvoice.energi_kwh == null ? "Tidak tersedia" : `${selectedInvoice.energi_kwh} kWh`}</dd></div>
                          <div><dt>Tarif energi</dt><dd>{selectedInvoice.tarif_per_kwh == null ? "Tidak tersedia" : `${formatRupiah(selectedInvoice.tarif_per_kwh)}/kWh`}</dd></div>
                        </dl>
                      </div>
                      <div className="invoice-receipt-section">
                        <h3>Rincian pembayaran</h3>
                        <dl className="invoice-receipt-rows">
                          <div><dt>Biaya charging</dt><dd>{selectedInvoice.biaya_charging == null ? "Tidak tersedia" : formatRupiah(selectedInvoice.biaya_charging)}</dd></div>
                          <div><dt>Biaya parkir</dt><dd>{selectedInvoice.biaya_parkir == null ? "Tidak tersedia" : formatRupiah(selectedInvoice.biaya_parkir)}</dd></div>
                          <div><dt>Metode pembayaran</dt><dd>{selectedInvoice.metode_pembayaran ?? "Tidak tersedia"}</dd></div>
                          <div><dt>Sumber pembayaran</dt><dd>{selectedInvoice.sumber_pembayaran ?? "Dompet Digital"}</dd></div>
                          <div><dt>Status pembayaran</dt><dd>{selectedInvoice.status_pembayaran ?? selectedInvoice.status ?? "Tidak tersedia"}</dd></div>
                          <div><dt>Dana hold</dt><dd>{selectedInvoice.jumlah_hold == null ? "Tidak tersedia" : formatRupiah(selectedInvoice.jumlah_hold)}</dd></div>
                          <div><dt>Saldo dikembalikan</dt><dd>{selectedInvoice.selisih_dikembalikan == null ? "Tidak tersedia" : formatRupiah(selectedInvoice.selisih_dikembalikan)}</dd></div>
                          {selectedInvoice.pernah_dijeda && <div><dt>Jeda sesi</dt><dd>{selectedInvoice.keterangan_jeda}</dd></div>}
                        </dl>
                        <div className="invoice-receipt-total"><span>Total dibayar</span><strong>{formatRupiah(selectedInvoice.biaya_aktual)}</strong></div>
                      </div>
                    </>
                  )}
                  <footer className="invoice-receipt-footer">Terima kasih telah menggunakan EVCharge Hub.</footer>
                </article>

                <div className="invoice-receipt-actions">
                  <button type="button" className="invoice-print-button" onClick={handlePrintInvoice}>
                    <FiPrinter aria-hidden="true" /> Cetak
                  </button>
                  <button type="button" className="invoice-share-button" onClick={handleShareInvoice}>
                    <FiShare2 aria-hidden="true" /> Bagikan PDF
                  </button>
                </div>
                {invoiceActionMessage && <p className="invoice-action-message" role="status">{invoiceActionMessage}</p>}
              </>
            )}
          </div>
        </div>
      )}

      {/* ============================================================
                LAYAR 3 — PROFIL DRIVER (halaman penuh)
               ============================================================ */}
      <div
        className={`profile-screen ${view === "profile" ? "is-active" : "is-hidden"}`}
      >
        <header className="profile-header">
          <div className="profile-header-top">
            <button
              className="profile-back-btn"
              onClick={() => {
                setView("home");
                setIsEditingProfile(false);
              }}
              aria-label="Kembali"
            >
              ←
            </button>
            <h1 className="profile-header-title">
              {isEditingProfile ? "Edit Profil" : "Profil Saya"}
            </h1>
            <span className="profile-header-spacer" />
          </div>
        </header>

        <main className="profile-content">
          {profileLoading && (
            <>
              <div className="profile-hero profile-skeleton-hero">
                <span className="profile-skeleton profile-skeleton-avatar" />
                <span
                  className="profile-skeleton profile-skeleton-line"
                  style={{ width: "55%" }}
                />
                <span
                  className="profile-skeleton profile-skeleton-line"
                  style={{ width: "35%" }}
                />
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
              <button className="profile-retry-btn" onClick={fetchProfile}>
                Coba lagi
              </button>
            </div>
          )}

          {!profileLoading && !profileError && profile && !isEditingProfile && (
            <>
              <section className="profile-hero">
                <span className="profile-avatar">
                  {getInitial(profile.nama_lengkap)}
                </span>
                <h2 className="profile-name">{profile.nama_lengkap}</h2>
                <p className="profile-email-sub">{profile.email}</p>
                <div className="profile-hero-chips">
                  <span
                    className={`dash-status-badge ${profile.status_akun === "aktif" ? "ok" : "danger"}`}
                  >
                    {capitalize(profile.status_akun)}
                  </span>
                  {profile.peran && (
                    <span className="profile-chip">
                      {capitalize(profile.peran)}
                    </span>
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
                  <span
                    className={`dash-status-badge ${profile.email_verified ? "ok" : "warn"}`}
                  >
                    {profile.email_verified
                      ? "Terverifikasi"
                      : "Belum verifikasi"}
                  </span>
                </div>
                <div className="profile-row">
                  <span className="profile-row-icon">
                    <FiPhone aria-hidden="true" />
                  </span>
                  <div className="profile-row-body">
                    <span className="profile-row-label">Nomor Telepon</span>
                    <span className="profile-row-value">
                      {profile.nomor_telepon || "-"}
                    </span>
                  </div>
                </div>
                <div className="profile-row">
                  <span className="profile-row-icon">
                    <FiCalendar aria-hidden="true" />
                  </span>
                  <div className="profile-row-body">
                    <span className="profile-row-label">Tanggal Lahir</span>
                    <span className="profile-row-value">
                      {formatTanggalLahir(profile.tanggal_lahir)}
                    </span>
                  </div>
                </div>
                <div className="profile-row">
                  <span className="profile-row-icon">
                    <FiMapPin aria-hidden="true" />
                  </span>
                  <div className="profile-row-body">
                    <span className="profile-row-label">Alamat</span>
                    <span className="profile-row-value">
                      {profile.alamat || "-"}
                    </span>
                  </div>
                </div>
              </div>

              <button
                className="profile-primary-btn"
                onClick={startEditProfile}
              >
                ✏️ Edit Profil
              </button>
            </>
          )}

          {!profileLoading && !profileError && profile && isEditingProfile && (
            <form
              className="profile-card profile-form"
              onSubmit={handleSubmitEditProfile}
            >
              <div className="profile-field">
                <label htmlFor="edit-nama">Nama Lengkap</label>
                <input
                  id="edit-nama"
                  type="text"
                  value={editForm.nama_lengkap}
                  onChange={handleEditFieldChange("nama_lengkap")}
                  autoComplete="name"
                />
              </div>

              <div className="profile-field">
                <label htmlFor="edit-email">Email</label>
                <input
                  id="edit-email"
                  type="email"
                  value={editForm.email}
                  onChange={handleEditFieldChange("email")}
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
                  onChange={handleEditFieldChange("nomor_telepon")}
                  maxLength={PHONE_MAX_DIGITS}
                  pattern={PHONE_PATTERN}
                  title={PHONE_VALIDATION_MESSAGE}
                  autoComplete="tel"
                />
                <small>{PHONE_VALIDATION_MESSAGE}</small>
              </div>

              <div className="profile-field">
                <label htmlFor="edit-lahir">Tanggal Lahir</label>
                <input
                  id="edit-lahir"
                  type="date"
                  value={editForm.tanggal_lahir}
                  onChange={handleEditFieldChange("tanggal_lahir")}
                />
              </div>

              <div className="profile-field">
                <label htmlFor="edit-alamat">Alamat</label>
                <textarea
                  id="edit-alamat"
                  rows={3}
                  value={editForm.alamat}
                  onChange={handleEditFieldChange("alamat")}
                />
              </div>

              {editError && (
                <p className="settings-pin-error profile-form-error">
                  {editError}
                </p>
              )}

              <div className="profile-form-actions">
                <button
                  type="button"
                  className="profile-secondary-btn"
                  onClick={cancelEditProfile}
                  disabled={editSubmitting}
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="profile-primary-btn"
                  disabled={editSubmitting}
                >
                  {editSubmitting ? "Menyimpan..." : "Simpan"}
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
            setSettingsScreen("menu");
          }}
        >
          <div className="settings-panel" onClick={(e) => e.stopPropagation()}>
            <div className="settings-panel-handle" />

            {settingsScreen === "menu" && (
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

                <button
                  className="settings-profile"
                  onClick={openProfileScreen}
                >
                  <span className="settings-profile-avatar">
                    <FiUser aria-hidden="true" />
                  </span>
                  <div className="settings-profile-info">
                    <p className="settings-profile-name">
                      {profile?.nama_lengkap ?? user.nama}
                    </p>
                    <p className="settings-profile-sub">Lihat & edit profil</p>
                  </div>
                  <span className="settings-menu-arrow">
                    <FiChevronRight aria-hidden="true" />
                  </span>
                </button>

                <div className="settings-menu">
                  <button
                    className="settings-menu-item"
                    onClick={onNavigateToVehicles}
                  >
                    <span className="settings-menu-icon">
                      <FiTruck aria-hidden="true" />
                    </span>
                    <span className="settings-menu-label">Kendaraan Saya</span>
                    <span className="settings-menu-arrow">
                      <FiChevronRight aria-hidden="true" />
                    </span>
                  </button>
                  <p className="settings-menu-section-title">Keamanan</p>
                  <button
                    className="settings-menu-item"
                    onClick={openPinScreen}
                  >
                    <span className="settings-menu-icon">
                      <FiLock aria-hidden="true" />
                    </span>
                    <span className="settings-menu-label">{wallet?.pin_sudah_diset ? "Ubah PIN" : "Buat PIN"}</span>
                    {wallet && !wallet.pin_sudah_diset && (
                      <span className="settings-menu-badge">Belum dibuat</span>
                    )}
                    <span className="settings-menu-arrow">
                      <FiChevronRight aria-hidden="true" />
                    </span>
                  </button>
                  <button
                    className="settings-menu-item"
                    onClick={onNavigateToHelp}
                  >
                    <span className="settings-menu-icon">
                      <FiHelpCircle aria-hidden="true" />
                    </span>
                    <span className="settings-menu-label">Bantuan</span>
                    <span className="settings-menu-arrow">
                      <FiChevronRight aria-hidden="true" />
                    </span>
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
                            LAYAR PIN KEAMANAN
                           ------------------------------------------------ */}
            {settingsScreen === "pin" && (
              <PinSecuritySettings
                wallet={wallet}
                onWalletChanged={fetchWallet}
                onBack={() => setSettingsScreen("menu")}
                onClose={() => {
                  setShowSettings(false);
                  setSettingsScreen("menu");
                }}
              />
            )}

            {/* ------------------------------------------------
                            LAYAR PROFIL DRIVER
                           ------------------------------------------------ */}
            {settingsScreen === "profile" && (
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
                      setSettingsScreen("menu");
                    }}
                    aria-label="Tutup pengaturan"
                  >
                    <FiX aria-hidden="true" />
                  </button>
                </div>

                {profileLoading && (
                  <p className="dash-empty">Memuat profil...</p>
                )}

                {!profileLoading && profileError && (
                  <p className="settings-pin-error">{profileError}</p>
                )}

                {!profileLoading && !profileError && profile && (
                  <div className="settings-profile-detail">
                    <div className="settings-profile-detail-avatar-row">
                      <span className="settings-profile-avatar settings-profile-avatar-lg">
                        <FiUser aria-hidden="true" />
                      </span>
                      <p className="settings-profile-detail-name">
                        {profile.nama_lengkap}
                      </p>
                      <span
                        className={`dash-status-badge ${profile.status_akun === "aktif" ? "ok" : "danger"}`}
                      >
                        {profile.status_akun}
                      </span>
                    </div>

                    <div className="settings-profile-detail-list">
                      <div className="settings-profile-detail-item">
                        <span className="settings-menu-label">Peran</span>
                        <span className="settings-profile-detail-value">
                          {profile.peran}
                        </span>
                      </div>
                      <div className="settings-profile-detail-item">
                        <span className="settings-menu-label">Email</span>
                        <span className="settings-profile-detail-value">
                          {profile.email}{" "}
                          {profile.email_verified
                            ? "✓"
                            : "(belum diverifikasi)"}
                        </span>
                      </div>
                      <div className="settings-profile-detail-item">
                        <span className="settings-menu-label">
                          Nomor Telepon
                        </span>
                        <span className="settings-profile-detail-value">
                          {profile.nomor_telepon ?? "-"}
                        </span>
                      </div>
                      <div className="settings-profile-detail-item">
                        <span className="settings-menu-label">
                          Tanggal Lahir
                        </span>
                        <span className="settings-profile-detail-value">
                          {profile.tanggal_lahir ?? "-"}
                        </span>
                      </div>
                      <div className="settings-profile-detail-item">
                        <span className="settings-menu-label">Umur</span>
                        <span className="settings-profile-detail-value">
                          {profile.umur != null ? `${profile.umur} tahun` : "-"}
                        </span>
                      </div>
                      <div className="settings-profile-detail-item">
                        <span className="settings-menu-label">Alamat</span>
                        <span className="settings-profile-detail-value">
                          {profile.alamat ?? "-"}
                        </span>
                      </div>
                    </div>

                    <button
                      type="button"
                      className="settings-pin-submit"
                      onClick={openProfileEditor}
                    >
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
          position={driverPosition ?? INITIAL_MAP_POSITION}
          initialPortId={startPortId}
          onClose={() => {
            setShowStartCharging(false);
            setStartPortId(null);
          }}
          onStarted={handleSessionStarted}
          onTopUp={handleTopupFromCharging}
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
