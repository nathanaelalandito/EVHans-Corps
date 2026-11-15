# AUDIT DRIVER – EVChargeHub (BRD EVC V.3)

## 1. Ringkasan Eksekutif

**Stack:** Backend Laravel 11 + Sanctum + MySQL (PHP 8.3); Frontend React 19 + Vite 8 + Axios. Auth via Bearer token di `localStorage`.  
**Kelengkapan Driver:** 33 ✅ / 10 ⚠️ / 1 ❌ dari 44 requirement yang diaudit (≈75% tuntas, ≈86% jika ⚠️ dihitung setengah).  
**Temuan keamanan:** 3 🔴 Critical, 4 🟠 High, 7 🟡 Medium, 6 🟢 Low.  
**Rekomendasi demo:** **NO-GO untuk produksi**; **GO bersyarat untuk demo internal** setelah menutup S-01, S-02, S-03 (Critical) dan menonaktifkan `DompetPinController::topUp` instant + `APP_DEBUG`. Semua temuan Critical berada di jalur keuangan/otorisasi dan dapat dieksploitasi oleh Driver biasa.

## 2. Matriks Kelengkapan

| Req# | Deskripsi | Status | Bukti (file:baris) | Catatan/Kekurangan |
|---|---|---|---|---|
| FR-01 | Registrasi akun Driver (dompet otomatis; PIN; kendaraan + konektor) | ⚠️ | backend/app/Http/Controllers/AuthController.php:19-69; frontend/src/Registrasi.jsx:1-180 | Akun/profil/dompet dibuat; **kendaraan & PIN tidak dibuat saat registrasi**. |
| FR-02 | Login & logout | ✅ | AuthController.php:72-118; frontend/src/api/auth.js:1-45 | Logout menghapus token server-side (`currentAccessToken()->delete()`). |
| FR-03 | Kelola profil Driver | ✅ | backend/app/Http/Controllers/Api/ProfileDriverController.php:1-40 | Update milik user login. |
| FR-04 | Kelola kendaraan & konektor | ✅ | backend/app/Http/Controllers/Api/VehicleController.php:1-130 | CRUD dengan ownership check. |
| FR-05 | Kelola PIN transaksi | ✅ | backend/app/Http/Controllers/Api/DompetPinController.php:46-120 | Set/ubah/verifikasi/reset/disable + lockout. |
| FR-06 | Lihat Dompet Digital | ✅ | DompetPinController.php:33-44 | Saldo, hold, status, kunci. |
| FR-07 | Top Up simulasi via PG simulasi | ✅ | backend/app/Http/Controllers/Api/TopupController.php:40-80, 95-115 | `simulatePay` hanya jika `APP_DEBUG=true`. |
| FR-08 | Saldo tersedia | ✅ | backend/app/Models/Dompet.php:45-48 | `saldoTersedia()`. |
| FR-09 | Station terdekat + rekomendasi kompatibel | ✅ | backend/app/Http/Controllers/Api/StationController.php:20-70 | Jarak hanya jika koordinat valid. |
| FR-10 | Detail station | ✅ | StationController.php:54-70 | Lokasi, charger, port, tarif. |
| FR-11 | Ketersediaan charger & port | ✅ | StationController.php:58-70; ChargingSessionController.php:285-295 | Port tidak siap tidak bisa dipilih. |
| FR-12 | Cari & filter | ⚠️ | frontend/src/DriverDashboard.jsx:2217-2218; StationController.php:20-40 | Filter daya/tarif/kata kunci dilakukan **client-side**; backend hanya filter konektor. |
| FR-13 | Navigasi menuju station | ✅ | frontend/src/api/routing.js (dipakai DriverDashboard) | Rute + link Google Maps. |
| FR-53 | Kode panggil station unik | ✅ | StationController.php:62 | `kode_station` dikembalikan & masuk pencarian frontend. |
| GPS | Lokasi tidak tersedia → jarak tidak valid | ✅ | StationController.php:30-32, 60-62 | `jarak_km` null jika koordinat tidak numerik. |
| NFR02 | Info station walau sebagian charger offline | ✅ | StationController.php:56-70 | Semua charger/port tetap dimuat. |
| FR-20 | Validasi pemilihan charger & port | ✅ | ChargingSessionController.php:83-105, 285-295 | Cegah port dipakai 2 sesi via update kondisional. |
| FR-21 | Mulai sesi (port+PIN+saldo+arrival 1 km) | ✅ | ChargingSessionController.php:130-180, 260-285 | Arrival radius dari config (default 1000 m). |
| FR-19/22 | Monitoring sesi | ✅ | ChargingSessionController.php:380-430 | Status, energi, biaya, hold dari simulasi. |
| FR-23 | Hentikan sesi oleh Driver | ✅ | ChargingSessionController.php:182-205 | `/finish` & `/stop`. |
| FR-24 | Pencatatan data sesi | ✅ | backend/database/migrations/2026_09_22_055539_create_charging_session_table.php | Waktu, energi, durasi, biaya, status. |
| FR-25 | Sesi gagal/terhenti | ✅ | ChargingSessionController.php:206-235, 300-360 | Status `Gagal`/`Dibatalkan`, ErrorLog, port `Out of Order`. |
| Status charger | Tersedia → Charging → Tersedia (atau gangguan) | ✅ | Ports migration; ChargingSessionController.php:332-336 | Port status diperbarui. |
| FR-27 | Estimasi biaya charging | ✅ | ChargingSessionController.php:107-130 | Backend `costFor`. |
| FR-28 | Biaya aktual berdasarkan energi aktual | ✅ | ChargingSessionController.php:310-325 | `actualKwh` dari request/simulasi. |
| FR-29 | Biaya parkir flat | ✅ | backend/app/Models/Tarif.php:55-75 | Flat sekali per sesi; tidak ada `biaya_parkir_jam`. |
| FR-30 | Total = energi + parkir | ✅ | Tarif.php:70 | `total`. |
| FR-31 | Dompet sebagai satu-satunya pembayaran | ✅ | ChargingSessionController.php:150-165 | Metode `Dompet Digital`. |
| FR-32 | Validasi saldo cukup | ✅ | ChargingSessionController.php:160-168, 297-305 | Arahkan top up (frontend). |
| FR-33 | Hold saldo = total estimasi | ✅ | ChargingSessionController.php:168-175 | `saldo_hold += total`. |
| FR-34 | Settle + lepas hold otomatis | ✅ | ChargingSessionController.php:308-345 | Potong aktual, kembalikan sisa (`refundAmount`). |
| FR-35 | Penanganan kegagalan pembayaran/penyelesaian | ⚠️ | ChargingSessionController.php:338-345 | Status payment `Gagal` hanya jika energi 0; tidak ada retry/rekonsiliasi. |
| FR-36 | Rekonsiliasi status transaksi | ❌ | TIDAK DITEMUKAN | Tidak ada job/endpoint rekonsiliasi. |
| FR-37 | Invoice/struk digital (termasuk gagal) | ✅ | ChargingSessionController.php:60-68, 362-405 | `/invoice`. |
| FR-38 | Riwayat transaksi | ✅ | PaymentController.php:1-40; ChargingSessionController.php:52-59 | History charging + payment. |
| Tarif beku | Snapshot tarif saat sesi mulai | ✅ | ChargingSessionController.php:120-125; ChargingSession.php:14 | `id_tarif` disimpan. |
| No refund/booking/antrian | Tidak ada fitur terlarang di Driver | ✅ | Migration 2026_11_11_000001...; pencarian kode | Tabel `refund` di-drop; booking/antrian tidak ditemukan. |
| FR-42 | Notifikasi charging selesai/terganggu | ⚠️ | frontend/src/DriverDashboard.jsx:940-995 | Notifikasi in-app/toast; tidak ada push. |
| FR-43 | Notifikasi pembayaran/top up gagal | ⚠️ | frontend/src/api/Topup.js; DompetDigital.jsx | Pesan error UI; tidak ada push. |
| FR-44 | Notifikasi gangguan charger | ⚠️ | backend/app/Models/ErrorLog.php; NotificationOps.jsx | Notifikasi operator-side; Driver hanya melihat respons error. |
| Alur end-to-end | Registrasi→…→invoice→riwayat | ⚠️ | Lihat controller di atas | Berjalan, tetapi FR-01 parsial dan energi aktual berasal dari client. |
| NFR06 | Usability mobile-first | ⚠️ | frontend/src/*.css | Responsif ada, tidak diaudit penuh (ukuran tombol/state). |
| NFR03 | Performa query station terdekat | ⚠️ | StationController.php:20-40 | Load seluruh tabel + relasi; tanpa pagination. |
| NFR05 | Auditabilitas | ⚠️ | backend/app/Models/AuditLog.php; charging_session/payment | Aksi staff tercatat; perubahan PIN/top up tidak diaudit. |

## 3. Temuan Keamanan

| ID | Severity | Kategori | Lokasi (file:baris) | Deskripsi & skenario eksploit | Saran perbaikan |
|---|---|---|---|---|---|
| S-01 | 🔴 Critical | Integritas keuangan | backend/app/Http/Controllers/Api/DompetPinController.php:120-175 | `topUp()` langsung menambah saldo + membuat `Payment` Sukses tanpa Payment Gateway. Driver dapat memanggil `POST /api/wallet/topup` dan menambah saldo sendiri. | Hapus/deprecate endpoint instant; gunakan alur `TopupController` + webhook/callback terverifikasi. |
| S-02 | 🔴 Critical | Integritas keuangan | backend/app/Http/Controllers/Api/ChargingSessionController.php:176-190, 206-220 | `finish`/`interrupt` menerima `energi_kwh` dari client sebagai energi aktual; Driver dapat mengirim nilai lebih kecil untuk menurunkan biaya. | Gunakan energi simulasi server-side atau validasi `energi_kwh <= simulated` + data perangkat. |
| S-03 | 🔴 Critical | Otorisasi | backend/app/Http/Controllers/Api/OperatorController.php (seluruh) | Tidak ada pemeriksaan peran; Driver terautentikasi dapat memanggil endpoint Operator (buat/ubah/hapus charger & port, ubah status, tarif). | Tambah `ensureStaff`/role check atau middleware role; pisahkan controller. |
| S-04 | 🟠 High | Otorisasi | backend/routes/api.php:95-145 | Route Operator/Operations hanya `auth:sanctum`, tanpa middleware role; proteksi bergantung pada controller (sebagian tidak ada). | Pasang middleware role (`operator`,`admin`) di route group. |
| S-05 | 🟠 High | Konfigurasi | backend/.env:3,20-22 | `APP_DEBUG=true` mengaktifkan `simulatePay` (self-settle top up) dan respons error detail; `CHARGING_REQUIRE_ARRIVAL=false` menonaktifkan arrival check. | Set `APP_DEBUG=false`, `CHARGING_REQUIRE_ARRIVAL=true` di production. |
| S-06 | 🟠 High | Keamanan sesi | backend/config/sanctum.php (expiration) | `expiration => null`: token tidak pernah kedaluwarsa. | Set expiry (mis. 120 menit) + refresh. |
| S-07 | 🟠 High | Validasi input | backend/app/Http/Controllers/AuthController.php:24 | Password hanya `min:6`, tanpa kompleksitas. | Tambah aturan (panjang 8+, huruf/angka/simbol). |
| S-08 | 🟡 Medium | Rate limiting | backend/routes/api.php (semua) | Tidak ada throttle pada login/PIN/top up; bergantung pada lockout 3x PIN. | Tambah `throttle` middleware pada endpoint sensitif. |
| S-09 | 🟡 Medium | CORS | backend/config/cors.php:17 | `allowed_origins => ['*']`. | Batasi origin frontend; `supports_credentials` sesuai. |
| S-10 | 🟡 Medium | Information disclosure | backend/app/Http/Controllers/AuthController.php:60-67 | Catch mengembalikan `$e->getMessage()` ke klien. | Kembalikan pesan generik; log server-side. |
| S-11 | 🟡 Medium | Konsistensi frontend/backend | frontend/src/api/station.js:67 | `ARRIVAL_RADIUS_M = 200` sementara default backend 1000 m. | Ambil dari `/charging-settings`; samakan. |
| S-12 | 🟡 Medium | Performa/DoS | backend/app/Http/Controllers/Api/StationController.php:20-40 | Memuat seluruh station+charger+port+tarif tanpa pagination/limit. | Paginasi & filter server-side; index DB. |
| S-13 | 🟡 Medium | GPS spoofing | backend/app/Http/Controllers/Api/ChargingSessionController.php:275-290 | Koordinat client dipercaya untuk arrival check; spoofing memungkinkan bypass jarak. | Catat sebagai risiko; pertimbangkan verifikasi tambahan/perangkat. |
| S-14 | 🟡 Medium | Manajemen PIN | backend/app/Http/Controllers/Api/DompetPinController.php:205-225 | PIN dapat dinonaktifkan (`DELETE /wallet/pin`), melemahkan otorisasi transaksi. | Jadikan PIN wajib untuk transaksi; batasi disable. |
| S-15 | 🟢 Low | Token storage | frontend/src/api/auth.js:10-11 | Token di `localStorage` (rentan XSS); tidak HttpOnly. | Gunakan cookie HttpOnly/Secure/SameSite bila SPA same-origin. |
| S-16 | 🟢 Low | Verifikasi email | ProfileDriverController.php:20-30 | `email_verified_at = now()` tanpa verifikasi. | Kirim email verifikasi. |
| S-17 | 🟢 Low | Dependency | frontend npm audit; backend composer audit | 4 high (npm: vite, minimatch, source-map-js, zod) + advisory Symfony medium. | Jalankan `npm audit fix`/update dependency. |
| S-18 | 🟢 Low | Sisa kode | backend/app/Models/Refund.php | Model `Refund` tersisa meski tabel di-drop. | Hapus model/migration referensi. |
| S-19 | 🟢 Low | Enum status | backend database/migrations ports | Status charger/port memakai `Active/Offline/Maintenance/Out of Order`, tidak sepenuhnya sesuai BRD (Nonaktif/Maintenance/Gangguan). | Samakan enum/status dengan BRD. |
| S-20 | 🟢 Low | Audit log | backend/app/Models/AuditLog.php | Perubahan PIN, top up, hold/settle tidak semua tercatat. | Tambah audit untuk transaksi keuangan. |

## 4. Penyimpangan dari BRD

- **FR-01 parsial:** registrasi tidak membuat kendaraan/konektor/PIN (hanya akun+profil+dompet).
- **Arrival check default:** BRD 1 km; frontend konstanta 200 m; `.env` menonaktifkan arrival check (dev).
- **Status perangkat:** kode memakai `Active/Offline/Maintenance/Out of Order`, sedangkan BRD memakai `Nonaktif/Maintenance/Gangguan`.
- **Top up instant:** `POST /api/wallet/topup` menambah saldo tanpa gateway, bertentangan dengan "Top Up lewat Payment Gateway simulasi".
- **Hold release:** sudah otomatis (sesuai BRD), tidak ada refund manual.
- **Tidak ditemukan:** booking, antrian internal, pembayaran kartu/QR langsung untuk charging, registrasi operator mandiri, pelaporan kerusakan konektor oleh driver.
- **`biaya_parkir_jam`:** tidak ditemukan (sudah diganti flat) — sesuai BRD.

## 5. Asumsi & Hal yang Tidak Bisa Diverifikasi

- Skema DB aktual diasumsikan sesuai migrasi (tidak dibandingkan langsung dengan DB live).
- Tidak ada suite test otomatis yang dijalankan; verifikasi fungsional berbasis pembacaan kode.
- Endpoint dinamis tidak diuji dengan token asli (IDOR disimpulkan dari filter ownership di controller).
- Usability mobile (NFR06) tidak diukur dengan pengguna nyata.
- GPS spoofing dicatat sebagai risiko teoretis, tidak diuji.

## 6. Daftar Perbaikan Terurut Prioritas

1. **S-01** Hapus `DompetPinController::topUp` instant / proteksi — `backend/app/Http/Controllers/Api/DompetPinController.php`, `backend/routes/api.php` — **S**.
2. **S-02** Jangan percaya `energi_kwh` client; gunakan simulasi server — `ChargingSessionController.php` — **M**.
3. **S-03/S-04** Tambah role middleware & cek peran di `OperatorController` — `routes/api.php`, `OperatorController.php` — **M**.
4. **S-05** Matikan debug & aktifkan arrival check di production — `backend/.env` — **S**.
5. **S-06** Set expiry token Sanctum — `backend/config/sanctum.php` — **S**.
6. **FR-01** Tambah kendaraan + PIN saat registrasi — `AuthController.php`, `Registrasi.jsx` — **M**.
7. **S-11** Samakan radius arrival frontend-backend — `frontend/src/api/station.js`, `/charging-settings` — **S**.
8. **FR-36** Tambah rekonsiliasi transaksi — baru — **L**.
9. **S-08/S-09/S-10** Throttle, CORS, error handling — middleware/config/controllers — **M**.
10. **NFR03** Paginasi & index station — `StationController.php` — **M**.
11. **S-17** Update dependency — frontend/backend — **S**.
12. **S-20** Audit log transaksi keuangan — controllers/models — **M**.
