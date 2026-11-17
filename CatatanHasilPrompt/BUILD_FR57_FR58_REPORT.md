# Laporan Implementasi FR-57 & FR-58 – EVChargeHub

## 1. Ringkasan

FR-57 **Kelola Driver** dan FR-58 **Kelola Metode Bayar** telah diimplementasikan end-to-end untuk Admin:

- Backend Laravel menyediakan endpoint daftar, detail, perubahan status Driver, serta CRUD metode pembayaran Top Up.
- Seluruh endpoint baru dibatasi untuk `auth:sanctum` + `role:admin`; Operator, Driver, dan tamu ditolak.
- Frontend Admin memiliki tab **Kelola Driver** (pencarian, filter, paginasi, detail, aktivasi/nonaktivasi) dan **Metode Bayar** (tambah, ubah, aktivasi/nonaktivasi tanpa hapus).
- Perubahan penting dicatat pada `audit_log`, termasuk aktor, nilai sebelum/sesudah, dan alasan opsional.
- Verifikasi akhir: **58 test lulus, 518 assertion**, dan **frontend build berhasil**.

## 2. Keputusan Implementasi

- `users.id_user` diperlakukan sebagai string (`char(13)`), bukan integer.
- Status akun Driver memakai nilai yang sudah ada: `Aktif` dan `Nonaktif`; perubahan status tidak menyentuh saldo, hold, atau PIN.
- Menonaktifkan Driver dengan sesi `Berlangsung` otomatis menyelesaikan sesi memakai tarif beku dan biaya parkir flat, melepas hold, dan mengembalikan port menjadi `Available`.
- Menonaktifkan Driver mencabut seluruh token Sanctum miliknya; login akun nonaktif menghasilkan respons generik `401` agar tidak membocorkan status akun.
- Metode pembayaran hanya dipakai untuk **Top Up Dompet Digital**, bukan pembayaran charging.
- Biaya layanan Top Up disimpan sebagai snapshot pada transaksi; perubahan tarif metode tidak mengubah transaksi lama.
- Metode yang dinonaktifkan tidak muncul pada pilihan Top Up Driver, tetapi Top Up pending yang sudah dibuat tetap dapat diselesaikan atau kedaluwarsa.
- Tidak ada endpoint penghapusan metode pembayaran; siklus hidup dikelola melalui status.
- Nama metode divalidasi unik tanpa membedakan huruf besar/kecil.

## 3. Endpoint Backend

Seluruh endpoint berikut berada pada middleware `auth:sanctum` dan `role:admin`, serta tetap memanggil `ensureAdmin()` di controller.

| Method | Path | Keterangan |
|---|---|---|
| GET | `/api/operations/drivers` | Daftar Driver; mendukung `search`, `status`, `page`, `per_page` (1–50) |
| GET | `/api/operations/drivers/{driver}` | Detail profil, dompet, kendaraan, 10 sesi terakhir, 10 Top Up terakhir |
| PUT | `/api/operations/drivers/{driver}/status` | Ubah status `Aktif`/`Nonaktif` dengan `alasan` opsional |
| GET | `/api/operations/payment-methods` | Daftar metode pembayaran dengan paginasi |
| POST | `/api/operations/payment-methods` | Tambah metode (`nama_metode`, `tipe_metode`, `biaya_layanan`) |
| PUT | `/api/operations/payment-methods/{id}` | Ubah data metode dengan `alasan` opsional |
| PUT | `/api/operations/payment-methods/{id}/status` | Ubah status `Aktif`/`Nonaktif` dengan `alasan` opsional |

Field sensitif seperti password, token, PIN, dan hash tidak pernah dikirim pada respons Driver.

## 4. Ringkasan Perubahan Backend

- `OperationsController`
  - Menambahkan `drivers()`, `driver()`, `updateDriverStatus()`.
  - Menambahkan `paymentMethods()`, `storePaymentMethod()`, `updatePaymentMethod()`, `updatePaymentMethodStatus()`.
  - Menambahkan presenter metode pembayaran, validasi enum/integer, pengecekan nama unik case-insensitive, dan audit log.
- `ChargingSessionController`
  - Menambahkan `settleForAccountDeactivation()` dan mengizinkan Admin menyelesaikan sesi saat penonaktifan akun.
- `AuthController`
  - Login akun nonaktif ditolak dengan pesan generik.
- `EnsureAccountActive`
  - Akun dengan status selain `Aktif` ditolak `403` pada endpoint terautentikasi.
- `routes/api.php`
  - Endpoint Driver dan metode pembayaran dipindahkan ke group `role:admin`.
- Seeder
  - `MetodePembayaranSeeder` dan `PaymentMethodSeeder` mengisi `tipe_metode` (`ewallet`/`va`).
- Migrasi
  - `2026_11_16_000004_add_tipe_metode_to_metode_pembayaran_table.php`.
  - Dua migrasi lama dibuat kondisional untuk SQLite agar baseline test tetap berjalan.

## 5. Ringkasan Perubahan Frontend

File utama: `frontend/src/OperatorAdminDashboard.jsx`, `frontend/src/operatorAdminDashboard.css`, `frontend/src/api/operations.js`.

### Tab Kelola Driver

- Pencarian nama/email/nomor telepon, filter status akun, dan paginasi 8 data per halaman.
- Tabel Driver menampilkan identitas, kontak, tanggal terdaftar, status, dan aksi.
- Panel detail memuat:
  - Profil dan status akun.
  - Saldo, dana hold, saldo tersedia, dan status dompet.
  - Daftar kendaraan.
  - Riwayat 10 sesi charging terakhir.
  - Riwayat 10 Top Up terakhir.
- Modal konfirmasi aktivasi/nonaktivasi dengan alasan opsional.
- Peringatan eksplisit bahwa sesi aktif akan diselesaikan otomatis saat Driver dinonaktifkan.

### Tab Metode Bayar

- Daftar metode dengan tipe, biaya layanan, dan status.
- Form tambah/ubah inline: nama, tipe (`E-Wallet`/`Virtual Account`), biaya layanan, dan alasan opsional saat mengubah.
- Modal konfirmasi aktivasi/nonaktivasi dengan alasan opsional.
- Tidak ada tombol hapus.
- Catatan UI menjelaskan bahwa metode nonaktif tidak muncul untuk Top Up baru, tetapi transaksi pending tetap dapat diselesaikan.

### API Frontend

- `getDrivers(params)`, `getDriverDetail(id)`, `updateDriverStatus(id, payload)`.
- `getPaymentMethods(params)` kini menerima parameter paginasi.
- `createPaymentMethod`, `updatePaymentMethod`, `updatePaymentMethodStatus`.

## 6. Cakupan Test

### FR-57 – `backend/tests/Feature/DriverManagementTest.php`

| Test | Perilaku yang diverifikasi |
|---|---|
| a | Admin dapat mencari, memfilter, memaginasi, dan membuka detail Driver |
| b | Daftar/detail Driver tidak membocorkan field sensitif |
| c | Operator tidak dapat mengakses endpoint Driver |
| d | Driver ditolak `403`; tamu ditolak `401` |
| e | Driver nonaktif tidak dapat login |
| f | Token lama ditolak setelah Driver dinonaktifkan |
| g | Driver nonaktif tidak dapat memulai sesi atau membuat Top Up |
| h | Penonaktifan menyelesaikan sesi aktif, melepas hold, dan mengembalikan port |
| i | Reaktivasi mengizinkan login tanpa mengubah saldo |
| j | Target Admin/Operator menghasilkan `404`; status tidak valid `422` |
| k | Tidak ada endpoint Driver yang dapat mengubah saldo, hold, atau PIN |
| l | Aktivasi/nonaktivasi tercatat di audit log beserta aktor dan alasan |

### FR-58 – `backend/tests/Feature/PaymentMethodManagementTest.php`

| Test | Perilaku yang diverifikasi |
|---|---|
| m | Admin dapat membuat, melihat, mengubah, dan mengubah status metode |
| n1 | Nama metode kosong ditolak |
| n2 | Duplikat nama case-insensitive saat create ditolak |
| n3 | Duplikat nama case-insensitive saat update ditolak |
| n4 | Biaya layanan atau tipe metode tidak valid ditolak |
| o | Operator/Driver ditolak `403`; tamu ditolak `401` |
| p | Driver hanya melihat metode berstatus `Aktif` |
| q | Top Up dengan metode nonaktif/tidak dikenal ditolak `422` |
| r | Snapshot biaya layanan tidak berubah setelah tarif metode diubah |
| s | Top Up pending tetap dapat settle/expired setelah metode dinonaktifkan |
| t | Tidak tersedia endpoint DELETE metode pembayaran |
| u | Tambah, ubah data, dan ubah status tercatat di audit log |

## 7. Hasil Verifikasi

Perintah dan hasil akhir:

```text
cd backend
php artisan test --compact
-> 58 tests, 58 passed, 518 assertions
```

```text
cd frontend
npx eslint src/OperatorAdminDashboard.jsx src/api/operations.js
-> lulus tanpa error
npm run build
-> build berhasil (136 modules transformed)
```

Catatan: `npm run lint` untuk seluruh proyek masih melaporkan error pre-existing pada file lain yang tidak terkait FR-57/FR-58. File yang diubah pada pekerjaan ini sudah lolos lint.

## 8. Batasan dan Catatan

- Verifikasi otomatis menggunakan SQLite in-memory melalui `phpunit.xml`.
- Docker/MySQL tidak tersedia pada lingkungan verifikasi; tidak ada perintah destruktif yang dijalankan terhadap database development.
- Tidak ada perubahan pada mekanisme pembayaran charging; metode pembayaran tetap khusus Top Up.
- Laporan ini tidak mengklaim seluruh proyek bebas lint; hanya file yang diubah pada FR-57/FR-58 yang diverifikasi bersih.
