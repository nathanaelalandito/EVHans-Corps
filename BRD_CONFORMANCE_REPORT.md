# BRD Conformance Report — EVChargeHub (branch TotalFinal)

## 1. Ringkasan eksekutif
- Branch diaudit: `TotalFinal` (commit `b046d4e` saat audit dimulai; push terakhir `a7c068f`/`1235594` sebelum laporan). Working tree bersih setelah restore `bantuan.css`.
- PHPUnit: `111 tests, 111 passed, 1146 assertions` (SQLite in-memory).
- Frontend Node tests: 7 file, 18 pass, 2 fail (`station-availability.test.mjs`: regex expectation lama vs kode `isStationClosed(s) || station?.can_start === false` dan `portStatusLabel(activeSession.status_port || "Charging")`).
- `npm run build`: lulus.
- Lint frontend: 17 error (hooks) + warning; build tetap lulus.

Hitungan status (audit kode + test): ✅ 48 (47 FR + 1 NFR), ⚠️ 12 (9 FR + 3 NFR), 🔀 0, ❌ 0, ❓ 2 (NFR03, NFR04). Temuan utama: otorisasi backend cukup ketat; integritas charging transaksional; beberapa UI/batasan hanya frontend; audit log append-only.

## 2. Matriks kesesuaian (ringkas)
| Req | Pri | Status | Bukti utama |
|---|---:|---|---|
| FR-01 | 1 | ✅ | `AuthController.php:77-80` Dompet otomatis |
| FR-02 | 1 | ✅ | `routes/api.php:21-23`, `EnsureRole.php` |
| FR-03 | 2 | ⚠️ | `ProfileDriverController.php`, hanya Driver |
| FR-04 | 1 | ✅ | `routes/api.php:48-52` |
| FR-05 | 1 | ✅ | `DompetPinController.php` |
| FR-06 | 1 | ✅ | `DompetPinController::show` |
| FR-07 | 1 | ✅ | `TopupController.php:61-106` |
| FR-08 | 1 | ✅ | `wallet.saldo` |
| FR-09 | 1 | ✅ | `StationController.php` + frontend filter |
| FR-10 | 1 | ✅ | `StationController::show` |
| FR-11 | 1 | ✅ | `presentStation` |
| FR-12 | 2 | ✅ | backend filter q/connector/availability/min_power/max_tariff + frontend |
| FR-13 | 2 | ⚠️ | navigasi frontend, tidak diuji browser |
| FR-14 | 1 | ✅ | `OperationsController.php` |
| FR-15 | 1 | ✅ | `createStation` |
| FR-16 | 1 | ✅ | status_loc + badge |
| FR-17 | 1 | ✅ | `createCharger` |
| FR-18 | 1 | ✅ | `getChargers/getPorts` |
| FR-19 | 1 | ✅ | `presentSession` simulasi |
| FR-20 | 1 | ✅ | `validateCharger` |
| FR-21 | 1 | ✅ | `start` + `checkStartable` |
| FR-22 | 1 | ✅ | `presentSession` |
| FR-23 | 1 | ✅ | `finish`, `interrupt`, operator stop |
| FR-24 | 1 | ✅ | `ChargingSession` create |
| FR-25 | 1 | ✅ | `interrupt` status Gagal/Terhenti |
| FR-26 | 1 | ✅ | `TariffScheduleService` |
| FR-27 | 1 | ✅ | `estimate` |
| FR-28 | 1 | ✅ | `sessionTotal` |
| FR-29 | 1 | ✅ | `biaya_parkir_flat` satu kali |
| FR-30 | 1 | ✅ | total transaksi |
| FR-31 | 1 | ✅ | hanya Dompet Digital |
| FR-32 | 1 | ✅ | `saldoTersedia()` |
| FR-33 | 1 | ✅ | `saldo_hold` |
| FR-34 | 1 | ✅ | `settleSession` |
| FR-35 | 2 | ✅ | `interrupt`, topup failed |
| FR-36 | 2 | ⚠️ | rekonsiliasi sebagian di history/invoice |
| FR-37 | 1 | ✅ | invoice modal + PDF |
| FR-38 | 1 | ✅ | history endpoint |
| FR-39 | 2 | ⚠️ | reports endpoint + frontend |
| FR-40 | 2 | ⚠️ | utilisasi |
| FR-41 | 2 | ⚠️ | gangguan |
| FR-42 | 2 | ✅ | notifikasi charging |
| FR-43 | 2 | ✅ | topup gagal |
| FR-44 | 2 | ✅ | charger issue |
| FR-45 | 1 | ✅ | `createOperator` |
| FR-46 | 1 | ✅ | middleware role |
| FR-47 | 1 | ✅ | `assignOperator` |
| FR-48 | 2 | ⚠️ | config endpoint |
| FR-49 | 1 | ✅ | `auditLogs` + AuditLog append |
| FR-50 | 1 | ✅ | admin dashboard |
| FR-51 | 2 | ⚠️ | search/ringkasan |
| FR-52 | 1 | ✅ | wizard station |
| FR-53 | 2 | ✅ | unique kode_station |
| FR-54 | 2 | ✅ | geocode proxy |
| FR-55 | 1 | ✅ | validasi email/telepon |
| FR-56 | 1 | ✅ | charger/port CRUD |
| NFR01 | - | ⚠️ | hash/rate limit, audit |
| NFR02 | - | ⚠️ | station info tampil, belum E2E |
| NFR03 | - | ❓ | responsivitas belum diukur |
| NFR04 | - | ❓ | skalabilitas belum diuji |
| NFR05 | - | ✅ | audit log |
| NFR06 | - | ⚠️ | mobile UI belum diuji browser |

Fitur tambahan tim: FR-57 (kelola Driver), FR-58 (metode bayar), FR-59 (jeda sesi), reset PIN via password, lockout 3x/15 menit, rate limit login, topup expiry, telepon 8-15 digit, rumus utilisasi. Semua terimplementasi wajar, di luar scope BRD (tidak menyimpang).

## 3. Pemeriksaan wajib
1. Jalur saldo di luar topup: ❌ tidak ada (TopupController only).  
2. Energi aktual: ✅ dihitung server (`presentSession` simulasi waktu; client tidak dipakai finish).  
3. Parkir flat: ✅ satu kali (`biaya_parkir_flat`); tidak ada `biaya_parkir_jam`.  
4. Skenario angka: ✅ sesuai logika (hold = estimasi energi + parkir; settle membatasi hold; tarif dibekukan via `id_tarif`).  
5. Transaksi DB + lock: ✅ `DB::transaction`, `lockForUpdate`, settle idempoten.  
6. Satu port satu sesi: ✅ `Port::where(...Available)->update` atomic; Nonaktif/Maintenance/Gangguan dan di luar jam ditolak.  
7. Arrival Check: ✅ dibaca dari config dan divalidasi backend.  
8. Otorisasi endpoint: ✅ middleware role + station access; Operator A tidak bisa station B.  
9. Admin-only: ✅ ensureAdmin.  
10. Registrasi publik hanya Driver: ✅ `peran => driver`.  
11. IDOR Driver: ✅ session/user filters; perlu test tambahan.  
12. PIN/password hash + lockout + rate limit: ✅/⚠️ (lockout 3x/15 menit, pesan generik).  
13. Security scan: ❓ belum dijalankan `composer audit`/`npm audit` pada audit ini.  
14. Notifikasi: ✅ tabel + endpoint + bell; penerima benar.  
15. Station Driver: ✅ Nonaktif disembunyikan; tutup/maintenance/gangguan tampil badge; jam backend.  
16. Top Up: ✅ checkout, fee tidak masuk saldo, metode nonaktif ditolak, fee snapshot.  
17. Tarif terjadwal: ✅ jatuh tempo, audit log append-only.  
18. Operator laporan/stop: ✅ station scoping, stop sesi.  
19. Admin wizard/kode/radius: ✅ atomik, unique, radius validasi.  
20. Driver UI: ⚠️/❓ ikon diimpor (grep menunjukkan `FiAlertTriangle` pernah undefined sebelumnya, sudah diperbaiki); telepon 8-15 digit; autoComplete ada.

## 4. Otorisasi dan konsistensi angka
- Matriks otorisasi utama: tanpa token → 401; Driver → 403 pada operator/admin; Operator station lain → 403/404; Admin → 200.
- Konsistensi angka: hold 27.000, aktual 6 kWh = 17.000, sisa 10.000; gagal 3 kWh = 9.500; gagal 0 kWh = 2.000; aktual > hold dibatasi hold; tarif berubah saat sesi tidak memengaruhi sesi berjalan (tarif dibekukan).

## 5. Temuan
(a) Melanggar BRD: tidak ditemukan pelanggaran kritis dari baca kode; beberapa fitur tambahan di luar BRD (acceptable).  
(b) Bug/keamanan: 2 test frontend gagal karena perubahan kode terbaru; lint 17 error hooks; belum audit dependency.  
(c) Fitur tambahan: FR-57/58/59, reset PIN, lockout, rate limit, topup expiry, telepon 8-15, rumus utilisasi.

## 6. Hal tidak terverifikasi
- UI browser/E2E, responsivitas, aksesibilitas, notifikasi real-time, clipboard fallback, jam WIB di browser.

## 7. Prioritas perbaikan
1. Perbaiki 2 test frontend station (S).  [DONE: test updated]
2. Jalankan `composer audit` dan `npm audit` (S).  [DONE: 0 advisories / 0 vulnerabilities]
3. Refactor lint hooks tanpa ubah perilaku (M).
4. Tambah test otorisasi/IDOR dan skenario angka 5 kasus (M).

## 8. Konsistensi angka (CostConsistencyVerificationTest)
| Kasus | Saldo | Invoice | Riwayat | Laporan Admin/Operator | Dashboard |
|---|---:|---:|---:|---:|---:|
| Normal 6 kWh | 83.000 | 17.000 | 17.000 | 17.000 | 17.000 |
| Gagal 3 kWh | 90.500 | 9.500 | 9.500 | 9.500 | 9.500 |
| Gagal 0 kWh | 98.000 | 2.000 | 2.000 | 2.000 | 2.000 |
| Aktual > hold | dibatasi hold | hold | hold | hold | hold |
| Tarif berubah saat sesi | sesi tetap tarif lama | tarif lama | tarif lama | tarif lama | tarif lama |

## 9. Matriks otorisasi (dibuktikan test/middleware)
| Endpoint utama | Tanpa token | Driver | Operator station sendiri | Operator station lain | Admin |
|---|---|---|---|---|---|
| `/api/charging-sessions/start` | 401 | 201 (valid) | 403 | 403 | 403 |
| `/api/operations/stations` | 401 | 403 | 403 | 403 | 201 |
| `/api/operations/drivers` | 401 | 403 | 403 | 403 | 200 |
| `/api/operations/audit-logs` | 401 | 403 | 403 | 403 | 200 |
| `/api/operator/chargers` | 401 | 403 | 200 (assigned) | 403 | 200 |

## ## 11. Kekurangan per ⚠️
- FR-03: hanya profil Driver; kelola profil Operator/Admin tidak terlihat.
- FR-12: filter utama di frontend; backend search terbatas.
- FR-13: navigasi bergantung browser, belum diuji E2E.
- FR-36: rekonsiliasi sebagian (history/invoice), belum endpoint khusus.
- FR-39/40/41: laporan ada, tetapi belum diverifikasi angka dengan data nyata.
- FR-48: konfigurasi ada, validasi radius perlu uji.
- FR-51: pencarian/ringkasan sebagian.
- NFR01: hash/rate limit ada, audit dependency belum dijalankan (sudah: 0 advisories).
- NFR02: info station tampil, belum E2E.
- NFR06: mobile UI belum diuji browser.

## 10. Detail 17 error lint (file:baris)
1. `Bantuan.jsx:1:8` React unused (lama)
2. `DriverDashboard.jsx:1:8` React unused (lama, sudah diperbaiki)
3. `DriverDashboard.jsx:21:3` FiFileText unused (lama, sudah diperbaiki)
4. `DriverDashboard.jsx:208:10` vehiclesError unused (lama, sudah diperbaiki)
5. `DriverDashboard.jsx:250:5` setState sync in effect (lama)
6. `DriverDashboard.jsx:348:13` cannot access before declared (lama)
7. `DriverDashboard.jsx:419:5` setState sync in effect (lama)
8. `DriverDashboard.jsx:451:5` setState sync in effect (lama)
9. `DriverDashboard.jsx:473:5` setState sync in effect (lama)
10. `DriverDashboard.jsx:585:5` setState sync in effect (lama)
11. `DriverDashboard.jsx:596:7` setState sync in effect (lama)
12. `DriverDashboard.jsx:742:7` setState sync in effect (lama)
13. `DriverDashboard.jsx:902:7` setState sync in effect (lama)
14. `DriverDashboard.jsx:978:7` cannot access before declared (lama)
15. `DriverDashboard.jsx:998:9` cannot access before declared (lama)
16. `DriverDashboard.jsx:1020:13` cannot access before declared (lama)
17. `DriverDashboard.jsx:1451:9` cycleVehicle unused (lama, sudah diperbaiki)
18. `DriverDashboard.jsx:1474:9` goToActiveSessionOnMap unused (lama, sudah diperbaiki)
19. `KelolaKendaraan.jsx:1:8` React unused (lama, sudah diperbaiki)
20. `KelolaKendaraan.jsx:73:9` setState sync in effect (lama)
21. `ProfilDriver.jsx:7:10` hitungUmur unused (lama, sudah diperbaiki)
22. `ProfilOps.jsx:1:8` React unused (lama, sudah diperbaiki)
23. `ProfilOps.jsx:3:56` FaPlug unused (lama, sudah diperbaiki)
24. `ProfilOps.jsx:74:9` setState sync in effect (lama)
25. `SetOverlayOps.jsx:1:8` React unused (lama, sudah diperbaiki)
26. `SetOverlayOps.jsx:2:19` FaCog unused (lama, sudah diperbaiki)
27. `SetOverlayOps.jsx:2:26` FaVolumeUp unused (lama, sudah diperbaiki)
28. `SetOverlayOps.jsx:2:38` FaSyncAlt unused (lama, sudah diperbaiki)
29. `StartCharging.jsx:93:8` missing dependency (lama)
30. `StartCharging.jsx:98:11` availablePorts dependency (lama)
31. `StartCharging.jsx:125:13` setState sync in effect (lama)

Catatan: setelah cleanup, lint tersisa 17 error (hooks).
