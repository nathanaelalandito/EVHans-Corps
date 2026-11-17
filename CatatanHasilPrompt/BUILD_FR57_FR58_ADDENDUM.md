# Addendum Verifikasi FR-57 & FR-58

Dokumen ini menutup temuan sisa pada `BUILD_FR57_FR58_REPORT.md`. Tidak ada bug baru yang ditemukan pada poin 2 dan 3, sehingga kode aplikasi tidak diubah. Perubahan pada tahap ini hanya berupa tambahan test dan dokumen ini.

## 1. Status Git dan Klasifikasi Perubahan

Snapshot `git status --porcelain=v1 -uall` sebelum addendum ini dibuat:

```text
 M backend/app/Http/Controllers/Api/ChargingSessionController.php
 M backend/app/Http/Controllers/Api/OperationsController.php
 M backend/app/Http/Controllers/Api/TopupController.php
 M backend/app/Http/Controllers/AuthController.php
 M backend/app/Models/MetodePembayaran.php
 M backend/bootstrap/app.php
 M backend/database/migrations/2026_10_04_130000_add_failed_status_to_charging_session_table.php
 M backend/database/migrations/2026_11_16_000002_add_station_facilities_photo_and_gangguan_status.php
 M backend/database/seeders/MetodePembayaranSeeder.php
 M backend/database/seeders/PaymentMethodSeeder.php
 M backend/routes/api.php
 M frontend/src/OperatorAdminDashboard.jsx
 M frontend/src/api/operations.js
 M frontend/src/operatorAdminDashboard.css
?? BUILD_FR57_FR58_REPORT.md
?? backend/app/Http/Middleware/EnsureAccountActive.php
?? backend/database/migrations/2026_11_16_000004_add_tipe_metode_to_metode_pembayaran_table.php
?? backend/tests/Feature/DriverManagementTest.php
?? backend/tests/Feature/PaymentMethodManagementTest.php
```

`git diff --stat` pada snapshot yang sama:

```text
 .../Controllers/Api/ChargingSessionController.php  |  19 +-
 .../Http/Controllers/Api/OperationsController.php  | 344 +++++++++++++++-
 .../app/Http/Controllers/Api/TopupController.php   |  21 +-
 backend/app/Http/Controllers/AuthController.php    |   4 +-
 backend/app/Models/MetodePembayaran.php            |   1 +
 backend/bootstrap/app.php                          |  10 +-
 ...add_failed_status_to_charging_session_table.php |   9 +
 ...tation_facilities_photo_and_gangguan_status.php |   8 +-
 .../database/seeders/MetodePembayaranSeeder.php    |  13 +-
 backend/database/seeders/PaymentMethodSeeder.php   |   2 +-
 backend/routes/api.php                             |  20 +-
 frontend/src/OperatorAdminDashboard.jsx            | 458 ++++++++++++++++++++-
 frontend/src/api/operations.js                     |  42 ++
 frontend/src/operatorAdminDashboard.css            |  35 +-
 14 files changed, 949 insertions(+), 37 deletions(-)
```

`git diff --stat` tidak memuat file untracked. `BUILD_FR57_FR58_ADDENDUM.md` juga akan muncul sebagai untracked setelah dokumen ini dibuat.

Klasifikasi file:

| Kategori | File | Alasan |
|---|---|---|
| Fitur langsung FR-57/FR-58 | `OperationsController.php`, `routes/api.php`, `MetodePembayaran.php`, `MetodePembayaranSeeder.php`, `PaymentMethodSeeder.php`, migrasi `2026_11_16_000004_add_tipe_metode...`, `OperatorAdminDashboard.jsx`, `operatorAdminDashboard.css`, `api/operations.js`, `DriverManagementTest.php`, `PaymentMethodManagementTest.php` | Implementasi endpoint, validasi, audit, UI, dan test fitur |
| Pendukung FR-57 | `ChargingSessionController.php`, `AuthController.php`, `EnsureAccountActive.php`, `bootstrap/app.php` | Settlement saat deaktivasi Driver, penolakan login akun nonaktif, dan guard status akun |
| Pendukung FR-58 | `TopupController.php` | Pemakaian `tipe_metode` dan snapshot biaya layanan Top Up |
| Di luar scope langsung FR-57/FR-58 | `2026_10_04_130000_add_failed_status_to_charging_session_table.php`, `2026_11_16_000002_add_station_facilities_photo_and_gangguan_status.php` | Hanya penyesuaian kompatibilitas SQLite agar baseline test dapat berjalan; bukan perubahan fitur |
| Dokumentasi | `BUILD_FR57_FR58_REPORT.md`, `BUILD_FR57_FR58_ADDENDUM.md` | Laporan pekerjaan |

## 2. Nilai `status_akun` dan Guard Akun Aktif

Nilai yang didefinisikan pada skema:

- `backend/database/migrations/0001_01_01_000000_create_users_table.php:21`: enum `['Aktif', 'Nonaktif', 'Suspend', 'Banned']`, default `Aktif`.
- `backend/database/seeders/UserSeeder.php:18-144`: seluruh contoh nilai yang dipakai adalah `Aktif`, `Nonaktif`, `Suspend`, atau `Banned`.

Guard:

- `backend/app/Http/Middleware/EnsureAccountActive.php:14` memblokir hanya jika `$user->status_akun !== 'Aktif'`.
- `backend/app/Http/Controllers/AuthController.php:121` menolak login akun yang statusnya bukan `Aktif`.
- Validasi perubahan status Driver hanya menerima `Aktif`/`Nonaktif` di `backend/app/Http/Controllers/Api/OperationsController.php:1174`.

Test baru di `backend/tests/Feature/DriverManagementTest.php:547`:

- `test_active_admin_operator_and_driver_pass_account_status_guard`.
- Admin aktif dapat membuka `/api/operations/drivers`.
- Operator aktif dapat membuka `/api/operations/dashboard`.
- Driver aktif dapat membuka `/api/charging-sessions/history`.
- Ketiga akun tetap berstatus `Aktif` setelah request.

Hasil test terfokus:

```text
php artisan test --compact tests/Feature/DriverManagementTest.php --filter="active_admin_operator|h2_deactivation"
-> 2 tests, 2 passed, 34 assertions
```

Dengan demikian, akun Admin, Operator, dan Driver yang sah tidak terkunci oleh guard status akun.

## 3. Migrasi Lama dan Perilaku MySQL

Perbandingan dilakukan terhadap `git show HEAD:<file>` untuk memastikan statement MySQL tidak berubah.

### Migrasi status `charging_session`

File: `backend/database/migrations/2026_10_04_130000_add_failed_status_to_charging_session_table.php`

- Baris 11-13: `up()` langsung `return` hanya jika driver SQLite.
- Baris 15: `DB::statement("ALTER TABLE charging_session MODIFY status ENUM(... 'Gagal') ...")` identik dengan versi `HEAD`.
- Baris 20-22 dan 24: guard serta statement `down()` juga hanya menambahkan early return SQLite; statement MySQL identik dengan `HEAD`.

### Migrasi status `location`

File: `backend/database/migrations/2026_11_16_000002_add_station_facilities_photo_and_gangguan_status.php`

- Baris 17-19: `DB::statement("ALTER TABLE location MODIFY status_loc ENUM(... 'Gangguan') ...")` dibungkus `if driver !== 'sqlite'`.
- Baris 24-26: statement `down()` juga dibungkus kondisi yang sama.
- Statement MySQL dan operasi `Schema::table()` untuk `fasilitas`/`foto` identik dengan versi `HEAD`.

Bukti statis:

```text
Driver SQLite  -> tidak menjalankan ALTER ... MODIFY ... ENUM
Driver MySQL   -> menjalankan statement ALTER yang sama persis seperti HEAD
```

Baseline test SQLite lulus dengan guard tersebut. Eksekusi nyata di MySQL belum dilakukan karena tidak tersedia; lihat bagian 6.

## 4. Gating UI untuk Operator

Tidak ada routing URL untuk tab. Tab hanya disimpan sebagai state:

- `frontend/src/OperatorAdminDashboard.jsx:257`: `activeTab` adalah state React.
- Tidak ditemukan penggunaan `URLSearchParams`, `location.search`, `location.hash`, `window.history`, atau `useSearchParams` di file tersebut.

Routing dashboard:

- `frontend/src/App.jsx:32-38` dan `:48-53`: Admin diarahkan ke `admin-dashboard`; Operator diarahkan ke `operator-dashboard`.
- `frontend/src/App.jsx:124-132`: `operator-dashboard` merender `OpsDashboard`, bukan `OperatorAdminDashboard`.
- `frontend/src/App.jsx:182-184`: `admin-dashboard` merender `OperatorAdminDashboard`.

Guard di panel Admin/Operator:

- `frontend/src/OperatorAdminDashboard.jsx:180-181`: `isAdmin = role === 'admin'`.
- `frontend/src/OperatorAdminDashboard.jsx:1056-1077`: tombol navigasi Overview, Operator, Kelola Driver, dan Metode Bayar hanya dirender jika `isAdmin`.
- `frontend/src/OperatorAdminDashboard.jsx:1501`: konten Driver memakai `activeTab === 'drivers' && isAdmin`.
- `frontend/src/OperatorAdminDashboard.jsx:1631`: konten Metode Bayar memakai `activeTab === 'payment-methods' && isAdmin`.

Kesimpulan:

- Alur normal Operator tidak pernah merender `OperatorAdminDashboard`.
- Tidak ada URL tab yang dapat dibuka langsung.
- Memaksa `activeTab` saja tetap tidak menampilkan konten karena `isAdmin` tetap `false` untuk Operator.
- Batas keamanan tetap backend: route Driver dan Metode Bayar berada pada group `role:admin` (`backend/routes/api.php:87-95`) dan test Operator/Driver/tamu sudah menolak akses.

## 5. Konsistensi Settlement Deaktivasi

Status akhir sesi saat deaktivasi Driver adalah `Selesai`:

- `backend/app/Http/Controllers/Api/ChargingSessionController.php:451-453`: `settleForAccountDeactivation()` memanggil `settleSession(..., [], 'Selesai')`.
- `backend/app/Http/Controllers/Api/ChargingSessionController.php:503`: port kembali `Available`.
- `backend/app/Http/Controllers/Api/ChargingSessionController.php:509`: status sesi menjadi status final.
- `backend/app/Http/Controllers/Api/ChargingSessionController.php:523`: pembayaran menjadi `Sukses` untuk settlement non-Gagal.

Test baru di `backend/tests/Feature/DriverManagementTest.php:573`:

- `test_h2_deactivation_settlement_matches_invoice_payment_history_and_revenue_report`.
- Deaktivasi Driver dengan sesi aktif, lalu assert status sesi `Selesai`, pembayaran `Sukses`, dan total `27000`.
- Reaktivasi Driver agar endpoint Driver dapat diuji kembali.
- Invoice `/api/charging-sessions/{session}/invoice`: status `Selesai`, pembayaran `Sukses`, `biaya_aktual` `27000`, energi `10 kWh`.
- Riwayat `/api/charging-sessions/history`: status `Selesai`, total `27000`, energi `10 kWh`.
- Riwayat `/api/payments/history`: status pembayaran `Sukses`, total `27000`.
- Laporan `/api/operations/reports?from=...&to=...&id_location=...`: `summary.sesi_selesai = 1`, `summary.pendapatan = 27000`, dan pendapatan station = `27000`.

Implementasi laporan yang dibandingkan:

- `backend/app/Http/Controllers/Api/OperationsController.php:132-133`: total pendapatan dari pembayaran `Sukses`, jumlah sesi `Selesai`.
- `backend/app/Http/Controllers/Api/OperationsController.php:169-171`: agregat pendapatan dan sesi per station.

Semua assertion konsistensi lulus. Test penuh:

```text
cd backend
php artisan test --compact
-> 60 tests, 60 passed, 552 assertions
```

## 6. Verifikasi Build, Lint, dan Hal yang TIDAK TERVERIFIKASI

Verifikasi yang berhasil:

```text
vendor/bin/pint --dirty --format agent
-> lulus

npx eslint src/OperatorAdminDashboard.jsx src/api/operations.js
-> lulus tanpa error

npm run build
-> berhasil, 136 modules transformed
```

Hal yang TIDAK TERVERIFIKASI:

1. Eksekusi migrasi pada MySQL nyata. Docker/MySQL tidak tersedia; bukti perilaku MySQL hanya perbandingan statis dengan `HEAD` dan pembacaan kondisi driver.
2. Test browser/end-to-end untuk gating UI Operator. Tidak ada test harness React; bukti berupa inspeksi alur state/routing, guard JSX, dan build produksi.
3. Skenario manipulasi `localStorage` untuk memalsukan `peran`. Ini bukan state/URL normal; backend tetap membatasi endpoint dengan `role:admin`, tetapi spoofing UI tidak diuji otomatis.
4. `npm run lint` seluruh proyek masih gagal karena error pre-existing pada file lain di luar FR-57/FR-58. Hanya file yang diubah pada pekerjaan ini yang diverifikasi bersih.
5. Test laporan pendapatan hanya mencakup rentang tanggal hari yang sama dengan settlement; perilaku lintas hari/zona waktu tidak diuji khusus.
