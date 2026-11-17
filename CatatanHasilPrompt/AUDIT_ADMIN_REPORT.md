# AUDIT ADMIN – EVChargeHub (BRD EVC V.3)

## 1. Ringkasan Eksekutif

**Stack:** Backend Laravel 11 + Sanctum + MySQL (PHP 8.3); Frontend React 19 + Vite 8. Admin dan Operator berbagi dashboard `OperatorAdminDashboard.jsx`.  
**Kelengkapan Admin:** 29 ✅ / 13 ⚠️ / 1 ❌ dari 43 requirement yang diaudit (≈67% tuntas, ≈83% jika ⚠️ dihitung setengah).  
**Temuan keamanan:** 3 🔴 Critical, 4 🟠 High, 4 🟡 Medium, 3 🟢 Low.  
**Rekomendasi demo:** **NO-GO untuk produksi**; **GO bersyarat untuk demo internal** setelah menutup temuan Critical (default password, `OperatorController` tanpa role check, token tidak terinvalidasi saat akun dinonaktifkan). Banyak kontrol ada di UI, tetapi backend tidak konsisten.

## 2. Matriks Kelengkapan

| Req# | Deskripsi | Status | Bukti (file:baris) | Catatan/Kekurangan |
|---|---|---|---|---|
| FR-02 | Login/logout sesuai peran (Admin→dashboard Admin) | ✅ | frontend/src/app.jsx:24-45; backend/app/Http/Controllers/AuthController.php:72-118 | Routing berdasarkan `peran`/email. |
| FR-45 | Kelola akun Operator (buat, ubah, nonaktifkan) | ⚠️ | backend/app/Http/Controllers/Api/OperationsController.php:514-576, 655-682 | Buat + ubah status; **tidak ada edit nama/email/telepon** setelah dibuat. |
| FR-55 | Validasi email & telepon Operator | ✅ | OperationsController.php:518-525 | Regex `@ops.ac.id`, telepon 1-15 digit. |
| FR-46 | Hak akses Operator berbasis station | ⚠️ | OperationsController.php:963-985; backend/app/Http/Controllers/Api/OperatorController.php (tanpa cek) | Filtering ada di Operations; `OperatorController` tidak memfilter station. |
| Use case | "Kelola Akun User Pengemudi" & "Kelola Hak Akses User dan Operator" | ❌ | TIDAK DITEMUKAN | Tidak ada endpoint/UI pengelolaan akun Driver oleh Admin. |
| - | Tidak ada registrasi publik Operator/Admin | ✅ | frontend/src/Registrasi.jsx:1-180; AuthController.php:19-69 | Registrasi publik hanya Driver; `peran` dipaksa `driver`. |
| FR-52 | Wizard penambahan station | ⚠️ | frontend/src/OperatorAdminDashboard.jsx:437-530 | Alur 4 langkah ada, tetapi **multi-request tidak atomik**. |
| FR-14 | Kelola data station (tambah, ubah, nonaktifkan) | ✅ | OperationsController.php:173-265 | Tidak ada hard delete (soft via status). |
| FR-15 | Kelola lokasi station (nama, alamat, koordinat, jam, fasilitas, foto) | ⚠️ | backend/database/migrations/2026_09_22_052710_create_location_table.php | Tidak ada kolom fasilitas/foto. |
| FR-54 | Pencarian lokasi untuk alamat/koordinat | ✅ | OperationsController.php:266-312 | Proxy Nominatim + cache/rate limit. |
| FR-53 | Kode panggil station unik | ✅ | backend/database/migrations/2026_11_09_090000_add_station_codes_and_clean_station_names.php | `unique('kode_station')` di DB. |
| FR-16 | Kelola status station | ⚠️ | OperationsController.php:178-185; Location migration | Status `Aktif/Nonaktif/Maintenance` (tanpa Gangguan di level station; `Penuh` diturunkan). |
| FR-17/56 | Kelola unit charger & port | ✅ | OperationsController.php:313-460 | Nomor, tipe, daya, status; validasi backend. |
| FR-51 | Pencarian & ringkasan station operasional | ✅ | OperatorAdminDashboard.jsx:210-220 | Pencarian client-side pada dashboard. |
| Status blokir sesi | Nonaktif/Maintenance/Gangguan memblokir sesi baru | ✅ | backend/app/Http/Controllers/Api/ChargingSessionController.php:260-290 | `status_loc`, `status_mesin`, `status_port` dicek. |
| Deactivate station dengan sesi aktif | Perilaku saat station dinonaktifkan | ⚠️ | OperationsController.php:173-200 | Status berubah, tetapi **sesi aktif tidak diselesaikan/dihentikan**. |
| FR-47 | Kelola penugasan Operator di station | ✅ | OperationsController.php:613-654 | Replace assignment + audit. |
| Rule min 1 Operator aktif | Enforcement saat buat/ubah/nonaktifkan | ⚠️ | OperationsController.php:188-196, 620-630, 655-682 | Enforced saat aktivasi & assignment; **tidak saat nonaktifkan Operator terakhir/akun Operator**. |
| Multi-station Operator | Satu Operator ke beberapa station | ✅ | StationOperator model; assignOperator | Diizinkan (many-to-many). |
| FR-26 | Kelola tarif "Saat Ini" & "Schedule" | ✅ | OperationsController.php:463-513; TariffScheduleService.php | Dua mode didukung. |
| Tarif terjadwal dieksekusi | Apply-on-read berdasarkan periode | ✅ | Location.php:60-68; TariffScheduleService.php | Tidak butuh cron; persisten di DB. |
| Tarif saat charger digunakan | Tidak langsung diterapkan ke sesi berjalan | ✅ | ChargingSession.php:14; Tarif.php:55-75 | Sesi memakai `id_tarif` beku. |
| Snapshot tarif per sesi | Field snapshot di sesi | ✅ | ChargingSession.php:14, 24 | `id_tarif` disimpan. |
| Validasi tarif | Nilai, tipe, batas | ✅ | OperationsController.php:466-472 | `min:100`, `min:0`, integer. |
| Riwayat perubahan tarif | Siapa/kapan/nilai lama→baru | ✅ | TariffScheduleService.php; AuditLog.php | Audit dicatat. |
| FR-48 | Konfigurasi sistem (Arrival Check, radius 1 km, dll.) | ✅ | OperationsController.php:775-845 | 4 parameter. |
| Config dipakai Driver | Arrival Check membaca config | ✅ | ChargingSessionController.php:275-290 | `config('charging.*')`. |
| Validasi config | Radius tidak absurd | ✅ | OperationsController.php:804-808 | `min:10,max:5000`. |
| Issue #3 (detail FR-48) | Detail konfigurasi belum dijabarkan BRD | ⚠️ | OperationsController.php:779-786 | Hanya 4 parameter; BRD tidak merinci. |
| FR-50 | Dashboard Admin | ✅ | OperationsController.php:32-78 | Ringkasan lintas station. |
| FR-18 | Monitoring status charger & port | ✅ | OperationsController.php:32-78 | Status charger/port. |
| FR-39 | Laporan pendapatan | ✅ | OperationsController.php:83-170 | Filter tanggal/station/charger. |
| FR-40 | Laporan utilisasi charger | ✅ | OperationsController.php:120-170 | Energi & sesi. |
| FR-41 | Laporan gangguan perangkat | ✅ | OperationsController.php:735-760 | Error log. |
| FR-44 | Notifikasi gangguan charger ke Admin | ⚠️ | OperatorAdminDashboard.jsx; NotificationOps.jsx | Tidak ada push; hanya UI/audit. |
| Riwayat penggunaan per charger/lokasi | Filter laporan | ✅ | OperationsController.php:95-100 | `id_location`,`id_charger`. |
| Laporan selesai & gagal | Energi aktual | ✅ | OperationsController.php:120-125 | Sesi `Selesai`/`Gagal`. |
| FR-49 | Audit operasional | ✅ | OperationsController.php:683-773 | Perubahan status, tarif, penugasan, config. |
| Log fields | Aktor, aksi, entitas, before/after, timestamp | ✅ | AuditLog.php:1-45 | Lengkap. |
| Audit search/filter | Aktor, tanggal, jenis aksi | ⚠️ | OperatorAdminDashboard.jsx:399-406 | Pencarian **client-side**; tidak ada filter server by aktor/tanggal. |
| Log append-only | Tidak bisa diedit/dihapus via API | ✅ | routes/api.php; AuditLog model | Tidak ada endpoint update/delete audit. |
| Alur end-to-end Admin | Login→Operator→wizard→tarif→config→dashboard/audit | ⚠️ | Lihat controller/UI di atas | Berjalan, tetapi wizard non-atomik dan cek role tidak konsisten. |
| Usability dashboard | Responsif, tabel, search/filter/pagination, loading/error/empty, konfirmasi | ⚠️ | frontend/src/OperatorAdminDashboard.jsx | Tidak diaudit penuh (konfirmasi ada untuk aksi). |
| NFR04 | Skalabilitas (pagination server-side, index) | ⚠️ | OperationsController.php:683-773 | Audit limit 30/50; dashboard/laporan tanpa pagination. |
| NFR01 | Keamanan dasar | ⚠️ | Lihat Fase 2 | Beberapa endpoint tidak terproteksi role. |

## 3. Matriks Otorisasi

| Endpoint | Method | Driver | Operator (station sendiri) | Operator (station lain) | Admin | Tanpa token |
|---|---|---|---|---|---|---|
| `/stations`, `/stations/{id}` | GET | Bisa | Bisa (semua station) | Bisa (semua station) | Bisa | Ditolak |
| `/operations/dashboard` | GET | Ditolak | Bisa (assigned) | Ditolak | Bisa (global) | Ditolak |
| `/operations/stations` | POST | Ditolak | Ditolak | Ditolak | Bisa | Ditolak |
| `/operations/stations/{id}` | PUT | Ditolak | Bisa (assigned) | Ditolak | Bisa | Ditolak |
| `/operations/stations/{id}/chargers` | POST | Ditolak | Bisa (assigned) | Ditolak | Bisa | Ditolak |
| `/operations/chargers/{id}` | PUT | Ditolak | Bisa (assigned) | Ditolak | Bisa | Ditolak |
| `/operations/ports/{id}` | PUT | Ditolak | Bisa (assigned) | Ditolak | Bisa | Ditolak |
| `/operations/stations/{id}/tarifs` | POST | Ditolak | Bisa (assigned) | Ditolak | Bisa | Ditolak |
| `/operations/tarifs/{id}` | PUT/DELETE | Ditolak | Bisa (assigned) | Ditolak | Bisa | Ditolak |
| `/operations/operators` | POST | Ditolak | Ditolak | Ditolak | Bisa | Ditolak |
| `/operations/operators/{id}/station` | PUT | Ditolak | Ditolak | Ditolak | Bisa | Ditolak |
| `/operations/operators/{id}/status` | PUT | Ditolak | Ditolak | Ditolak | Bisa | Ditolak |
| `/operations/audit-logs` | GET | Ditolak | Ditolak | Ditolak | Bisa | Ditolak |
| `/operations/config` | GET/PUT | Ditolak | Ditolak | Ditolak | Bisa | Ditolak |
| `/operator/*` (OperatorController) | * | **Bisa (semua)** | Bisa | Bisa | Bisa | Ditolak |
| `/wallet/*` | * | Milik sendiri | Milik sendiri | Milik sendiri | Milik sendiri | Ditolak |
| `/charging-sessions/{id}/finish` | POST | Milik sendiri | Bisa stop operator (peran dicek) | Ditolak | Bisa | Ditolak |

## 4. Temuan Keamanan

| ID | Severity | Kategori | Lokasi (file:baris) | Deskripsi & skenario eksploit | Saran perbaikan |
|---|---|---|---|---|---|
| A-01 | 🔴 Critical | Kredensial default | backend/database/seeders/UserSeeder.php:173 | Semua akun seed (admin/operator) memakai password `password123`. Penyerang dapat login sebagai Admin. | Gunakan password kuat/unik di seed atau buat akun via CLI; wajib ganti saat login pertama. |
| A-02 | 🔴 Critical | Otorisasi | backend/app/Http/Controllers/Api/OperatorController.php (seluruh) | Tidak ada cek peran/station; Driver terautentikasi dapat memanggil `/operator/*` (buat/ubah/hapus charger & port, ubah status). | Tambah `ensureStaff`/role check dan filter station assignment. |
| A-03 | 🔴 Critical | Sesi/token | backend/app/Http/Controllers/Api/OperationsController.php:655-682; config/sanctum.php | Akun Operator yang dinonaktifkan tetap bisa memakai token lama (expiry `null`). | Set expiry token + revoke token saat status berubah. |
| A-04 | 🟠 High | Horizontal IDOR | backend/app/Http/Controllers/Api/StationController.php:20-40 | `/stations` mengembalikan **semua station** ke Operator; tidak dibatasi penugasan. | Filter station berdasarkan `station_operators` untuk role operator. |
| A-05 | 🟠 High | Otorisasi rute | backend/routes/api.php:95-145 | Route Operator/Operations hanya `auth:sanctum`, tanpa middleware role; proteksi bergantung controller (sebagian tidak ada). | Pasang middleware role di route group. |
| A-06 | 🟠 High | Password policy | backend/app/Http/Controllers/Api/OperationsController.php:520 | Password Operator minimal 6 karakter, tanpa kompleksitas/force change. | Terapkan policy kuat + wajib ganti password awal. |
| A-07 | 🟠 High | Race condition | backend/app/Http/Controllers/Api/OperationsController.php:317; DB migration charger | `kode_perangkat` unique hanya validasi aplikasi, tidak ada unique index DB. | Tambah unique constraint di migrasi. |
| A-08 | 🟡 Medium | Konfigurasi | OperationsController.php:792-835 | Admin menulis langsung ke `.env` via `file_put_contents` tanpa lock/validasi lengkap. | Tulis config via env management yang aman/atomik; batasi parameter. |
| A-09 | 🟡 Medium | CORS | backend/config/cors.php:17 | `allowed_origins => ['*']`. | Batasi origin frontend. |
| A-10 | 🟡 Medium | Token expiry | backend/config/sanctum.php | `expiration => null`. | Set expiry (mis. 120 menit). |
| A-11 | 🟡 Medium | Default config | OperationsController.php:779; config/charging.php | Default `arrival_radius_m` 200 di controller vs 1000 di config. | Samakan default & ambil dari config. |
| A-12 | 🟢 Low | Audit filter | OperatorAdminDashboard.jsx:399-406 | Audit dicari client-side; tidak ada filter server by aktor/tanggal. | Tambah query params & filter server-side. |
| A-13 | 🟢 Low | Append-only DB | backend/database/migrations/2026_11_07_124924_create_audit_logs_table.php | Append-only hanya di aplikasi; DB tidak mencegah update/delete. | Tambah trigger/permission DB (opsional). |
| A-14 | 🟢 Low | Dependency | frontend npm audit; backend composer audit | Advisory high/moderate (vite, minimatch, source-map-js, zod, symfony). | Update dependency. |

## 5. Penyimpangan dari BRD

- **Use case "Kelola Akun User Pengemudi" & "Kelola Hak Akses User dan Operator":** tidak diimplementasikan (Admin tidak mengelola akun Driver).
- **FR-45 parsial:** akun Operator hanya dibuat + status diubah; tidak ada edit data kontak setelah dibuat.
- **Station status:** enum `Aktif/Nonaktif/Maintenance` (tanpa Gangguan di level station; `Penuh` diturunkan dari port).
- **Charger/port status:** `Active/Offline/Maintenance/Out of Order`, tidak sepenuhnya sesuai BRD (Nonaktif/Maintenance/Gangguan).
- **FR-15:** tidak ada fasilitas/foto lokasi.
- **Issue #3 (FR-48):** detail konfigurasi belum dijabarkan BRD; hanya 4 parameter yang bisa dikonfigurasi.
- **Issue #4 (ERD vs arahan dosen):** kode memakai model relational dengan FK; tidak ada bukti perubahan ERD di repo. (TIDAK DITEMUKAN dokumen ERD alternatif.)
- **Tidak ditemukan:** booking, antrian internal, refund manual, pembayaran nyata, registrasi Operator mandiri, pelaporan kerusakan konektor.
- **`biaya_parkir_jam`:** tidak ditemukan (sudah flat) — sesuai BRD.
- **Refund:** tabel `refund` di-drop, tetapi model `Refund.php` masih ada.

## 6. Asumsi & Hal yang Tidak Bisa Diverifikasi

- Skema DB aktual diasumsikan sesuai migrasi.
- Tidak ada suite test otomatis yang dijalankan.
- Otorisasi disimpulkan dari pembacaan kode, bukan uji HTTP langsung.
- Usability dashboard tidak diukur dengan pengguna.
- Issue BRD #4 (ERD vs arahan dosen) tidak dapat diverifikasi dari repo (TIDAK DITEMUKAN dokumen ERD).

## 7. Daftar Perbaikan Terurut Prioritas

1. **A-01** Ganti password default seed — `UserSeeder.php` — **S**.
2. **A-02** Tambah role/station check di `OperatorController` — `OperatorController.php`, `routes/api.php` — **M**.
3. **A-03** Revoke token saat nonaktifkan Operator + set expiry — `OperationsController.php`, `config/sanctum.php` — **M**.
4. **A-04/A-05** Filter station untuk Operator & middleware role — `StationController.php`, `routes/api.php` — **M**.
5. **A-06** Policy password Operator + force change — `OperationsController.php` — **S**.
6. **A-07** Unique constraint `kode_perangkat` — migration + `OperationsController.php` — **S**.
7. **FR-45** Tambah edit data Operator — `OperationsController.php`, frontend — **M**.
8. **Rule min Operator** cek saat nonaktifkan Operator — `OperationsController.php` — **S**.
9. **A-08/A-11** Perbaiki config default & penulisan `.env` — `OperationsController.php`, `config/charging.php` — **M**.
10. **FR-15/FR-16** Tambah fasilitas/foto & status Gangguan — migration + controller + UI — **L**.
11. **Audit filter server-side** — `OperationsController.php`, frontend — **M**.
12. **A-14** Update dependency — frontend/backend — **S**.
