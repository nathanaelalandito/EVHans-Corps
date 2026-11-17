# AUDIT DRIVER PART 2 — Pembayaran, Notifikasi, Station Tutup

Audit lanjutan terhadap BRD EVC V.3 dan permintaan Bagian 2. SDD tidak ditemukan di repo. Audit dibatasi pada pembacaan kode, query SELECT ke DB development, dan feature test pada SQLite `:memory:`. Tidak ada kode aplikasi atau DB development yang diubah.

## Ringkasan reproduksi

| Area | Hasil |
|---|---|
| Top Up | ✅ Metode → instruksi → simulasi → saldo berhasil; saldo bertambah nominal saja. ❌ Row transaksi Top Up tidak muncul di riwayat dompet karena tidak dibuatkan row `payment`. |
| Notifikasi Driver | ⚠️ Bell persisten dipasang dan kontrak endpoint cocok. Polling badge menyembunyikan error; daftar tidak diperbarui selama panel terbuka. FR-44 untuk Driver yang melaporkan sendiri gangguan tidak tersimpan. |
| Notifikasi Operator | ⚠️ Ada dua bell/sumber. FR-44 tersimpan bagi Admin dan Operator station terkait; penugasan dev lengkap. Aktivitas sesi ditampilkan lewat endpoint turunan di luar BRD; status baca lokal. Tidak ada toast saat item baru masuk. |
| Station tutup | ⚠️ Backend menolak mulai sesi untuk lokasi nonaktif/gangguan/perawatan dan di luar jam. Frontend masih menampilkan station Nonaktif, menghitung status Gangguan dan jam tutup sebagai tersedia, serta dapat membuka pemilih port. |
| UI browser | ❓ TIDAK TERVERIFIKASI — yang diperiksa adalah JSX/CSS dan kontrak API; tidak ada klaim hasil browser. |

Suite awal: `php artisan test --compact` → **62 lulus, 574 assertion**. Test file baru terfokus → **6 lulus, 47 assertion**. Suite akhir: **68 lulus, 621 assertion**. Frontend build lulus; lint akhir gagal dengan 31 error dan 6 warning. Tidak ada test script frontend di `frontend/package.json`.

## A. Pembayaran Top Up

### Rantai dan hasil kontrak

| Langkah | Frontend / endpoint | Backend | Hasil inspeksi |
|---|---|---|---|
| Layar dan daftar metode | `Topup.jsx:86-93`; `api/Topup.js:3`; `GET /api/topup/methods` | `routes/api.php:115`; `TopupController::methods`, `TopupController.php:28-56` | ✅ Frontend membaca `data.methods`, `min_amount`, `max_amount`; API mengirim nama field itu dan `id` sebagai `id_metode`. |
| Konfirmasi PIN dan buat instruksi | `Topup.jsx:149-172, 427-431`; `api/Topup.js:5`; `POST /api/wallet/pin/verify`, lalu `POST /api/topup` | `DompetPinController::verifyPin`; `TopupController::store`, `TopupController.php:60-105` | ✅ Payload `{method, amount}` cocok dengan validasi integer dan minimum/maksimum backend. Metode nonaktif ditolak backend dan tidak masuk daftar metode aktif. |
| Halaman bayar dan polling | `Topup.jsx:95-113, 248-313`; `api/Topup.js:7`; `GET /api/topup/{reference}` setiap 3 detik | `TopupController::show`, `expireIfNeeded`, `format`, `TopupController.php:108-114, 224-267` | ⚠️ Status berbayar/kedaluwarsa dipetakan ke `paid`/`expired`. Error polling ditelan tanpa status error atau batas percobaan (`Topup.jsx:99-108`), sehingga jaringan gagal berulang terlihat seperti “menunggu” tanpa akhir. |
| Simulasi bayar | `Topup.jsx:177-185`; `api/Topup.js:9`; `POST /api/topup/{reference}/simulate-pay` | `TopupController::simulatePay`, `settle`, `TopupController.php:122-152` | ✅ Flag aktif; pembayaran kedua idempoten; saldo naik hanya sebesar `nominal`. Tombol simulasi tidak memakai `loading`/disable (`Topup.jsx:307-310`), walau settlement aman terhadap klik ganda. |
| Notifikasi gagal/expired | Frontend terus memanggil `GET /api/topup/{reference}`; route `routes/api.php:117` | `expireIfNeeded` memanggil `NotificationService::notifyTopupFailed`, `TopupController.php:224-237`; service `NotificationService.php:23-26` | ⚠️ Row dibuat saat endpoint status/simulate mengamati instruksi yang sudah expired. Tidak ada scheduler yang mengirim notifikasi tepat saat waktu kedaluwarsa jika Driver tidak melakukan polling. |
| Sukses dan saldo | `Topup.jsx:209-238` | `settle`, `TopupController.php:138-152, 263-265` | ✅ Respons mengembalikan saldo baru; test membuktikan fee tidak masuk ke saldo. |
| Riwayat dompet | `DompetDigital.jsx:143-162`; `api/payments.js:3-6`; `GET /api/payments/history` | `PaymentController::history`, `PaymentController.php:17-35, 59-85` | ❌ Putus: riwayat membaca tabel `payment`, sedangkan checkout Top Up baru hanya membuat row `topup` dengan `id_payment = null` (`TopupController.php:92-103`) dan settlement tidak membuat `Payment` (`:138-152`). |

### Hipotesis penyebab — diperiksa satu per satu

1. **Migrasi dev tertinggal — tidak didukung oleh bukti DB saat ini.** `php artisan migrate:status` berjalan terhadap koneksi `mysql` dan semua migrasi tercatat `Ran`, termasuk `2026_10_12_230000_add_checkout_fields_to_topup_table`, `2026_11_16_000003_create_notifikasi_table`, `2026_11_16_000004_add_tipe_metode_to_metode_pembayaran_table`, dan `2026_11_17_024103_add_pause_columns_to_charging_session_table`. Pembacaan skema MySQL mengonfirmasi kolom `topup.biaya_layanan`, `metode_pembayaran.tipe_metode`, tabel/kolom `notifikasi`, serta `charging_session.dijeda_pada`, `total_jeda_detik`, `jeda_berakhir_pada` ada.
2. **Seeder metode — sesuai.** `database/seeders/MetodePembayaranSeeder.php:14-25` mengisi `tipe_metode` dan fee. Query SELECT dev menemukan 9 metode `ewallet` dan 1 `va`. Seeder tidak dijalankan dalam audit.
3. **Dua migrasi enum kondisional SQLite — skema MySQL berbeda memang disengaja.** `2026_10_04_130000_add_failed_status_to_charging_session_table.php:11-15` melewati SQLite dan menjalankan `ALTER ... ENUM(... 'Gagal')` di MySQL. `2026_11_16_000002_add_station_facilities_photo_and_gangguan_status.php:17-18` melewati SQLite dan mengubah enum `location.status_loc` untuk menambahkan `Gangguan` di MySQL. `SHOW COLUMNS` mengonfirmasi daftar enum MySQL memuat nilai tersebut. Akibatnya fixture SQLite biasa tidak dapat menulis `Gangguan`; test station baru sementara mengabaikan check constraint hanya selama insert test itu.
4. **Flag/cache config — tidak mendukung penyebab saat ini.** `config/payment.php:4` default ke `true`; `.env` tidak memuat `PAYMENT_SIMULATION`; `php artisan config:show payment.simulation` menghasilkan `true`; `bootstrap/cache/config.php` tidak ada. Test `TopupSimulationTest::test_simulation_disabled_returns_403` membuktikan 403 bila flag dimatikan.
5. **Nama field, tipe nominal, ID metode — cocok.** `Topup.jsx` mengirim state metode/nominal; `api/Topup.js:5` mengirim `{method, amount}`; controller memvalidasi `method` integer yang aktif dan `amount` integer 10.000–5.000.000. Respons daftar memberi `id`, UI memilih berdasarkan `id`, lalu backend mengaitkannya ke `id_metode`.
6. **Validasi baru — test membuktikan batasnya.** Metode aktif muncul; method tidak aktif/unknown dan nominal tak valid diuji dalam `PaymentMethodManagementTest` (`test_q_topup_rejects_inactive_or_unknown_payment_method`) serta test validasi Top Up terkait. Tidak ada bukti metode valid ditolak.
7. **Pesan error dan UI bayar — parsial.** `Topup.jsx:21-24` menampilkan `message` atau error validasi pertama sebagai teks React; kegagalan buat instruksi/PIN/simulasi terlihat. Namun catch polling di `:104-106` kosong dan tidak memperbarui error/loading. Secara statis layar memiliki state sukses, expired, menunggu dan error; visual browser tidak diklaim.
8. **Server satu proses — ❓ TIDAK TERVERIFIKASI.** `PHP_CLI_SERVER_WORKERS` tidak diset di shell pemeriksaan, tetapi daftar proses `php artisan serve` ditolak oleh izin Windows (Access denied). Poll status 3 detik (`Topup.jsx:99`) dapat mengantre bila server yang dipakai memang satu worker dan ada request lambat; hipotesis ini perlu dibuktikan dengan request paralel/log waktu pada server yang dipakai.
9. **Akun/token — kondisi umum terverifikasi, akun uji spesifik tidak.** DB dev memiliki 3 Driver Aktif, 1 Nonaktif, 1 Suspend, 1 Banned; pengguna uji tidak disebut. `sanctum.expiration` terbaca 120 menit. `api/client.js:13-20,31-38` mengirim Bearer `ev_token` dan menghapusnya saat 401, tetapi App tidak terlihat memaksa logout saat interceptor membersihkan token. Akun/token tertentu perlu dicocokkan di browser saat error terjadi.

### Reproduksi dan test

Test baru `Bagian2AuditContractTest::test_checkout_flow_reproduces_missing_payment_history_entry` menjalankan `GET methods` → `POST topup` → polling → `simulate-pay` → saldo dan `/payments/history`. Hasil: saldo tepat Rp20.000 meski fee Rp350; Top Up berstatus Sukses; riwayat `/payments/history` kosong. Test ini sengaja mengunci perilaku saat ini agar akar masalah bisa direproduksi tanpa mengubah aplikasi.

Test pendukung yang sudah ada: `test_simulate_pay_is_idempotent`, `test_driver_cannot_settle_other_drivers_topup`, `test_simulation_disabled_returns_403`, `NotificationVerificationTest::test_d_topup_expired_notifies_driver`, dan `PaymentMethodManagementTest::test_q_topup_rejects_inactive_or_unknown_payment_method`.

### Usulan patch (belum diterapkan)

```diff
// backend/app/Http/Controllers/Api/TopupController.php — di dalam transaksi settle()
 if (! $topup || $topup->status_topup !== 'Pending') return;
+$payment = Payment::create([
+    'id_session' => null,
+    'id_metode' => $topup->id_metode,
+    'jenis_pembayaran' => 'topup',
+    'total_bayar' => $topup->nominal + $topup->biaya_layanan,
+    'status_pembayaran' => 'Sukses',
+    'waktu_pembayaran' => now(),
+    'referensi_gateway' => $topup->referensi,
+]);
+$topup->update(['id_payment' => $payment->id_payment, 'status_topup' => 'Sukses', 'waktu_topup' => now()]);
 DB::table('dompet')->where('id_wallet', $topup->id_wallet)->increment('saldo', $topup->nominal, ...);
```

Tambahkan status polling error yang bisa dicoba ulang, serta `loading`/disable pada tombol simulasi. Jangan masukkan fee ke saldo; fee hanya tercatat pada total pembayaran.

## B. Notifikasi Driver

### Inventaris antarmuka dan sumber

| Komponen | Tempat | Data/endpoint | Makna |
|---|---|---|---|
| `NotificationsBell` | `DriverDashboard.jsx:1469` | tabel `notifikasi`; `GET /api/notifications`, `GET /api/notifications/unread-count`, `PUT /api/notifications/{id}/read` | Satu-satunya daftar persisten Driver. Bell polling badge tiap 25 detik; daftar diambil saat panel dibuka. |
| Banner sesi | `DriverDashboard.jsx:2287-2301` | `activeSession` + state lokal `showNotif` | Pesan “sesi Anda sedang berjalan”, bukan daftar notifikasi tabel. Banner tidak punya endpoint/tanda baca. |
| Pesan/toast sesi/top up | state lokal `sessionNotice` dan error state `Topup.jsx` | respons action saat layar aktif | Sementara; bukan inbox persisten. |
| `NotificationOverlay` | `NotificationOps.jsx` | Khusus dashboard Operator; tidak dipasang di Driver. | Tidak ada overlay Driver kedua pada jalur dashboard saat ini. |

Jadi ada **bell persisten dan indikator/banner sesi lokal**, bukan dua bell Driver. Tanpa konteks layar atau akun yang dilihat pengguna, “dua” yang dimaksud tidak bisa dipastikan; keduanya jelas memiliki sumber dan fungsi berbeda.

### Rantai per jenis

| Jenis | Trigger → row `notifikasi` | Endpoint/token/kontrak | Render dan baca | Status |
|---|---|---|---|---|
| FR-42 selesai | `ChargingSessionController::finish` memanggil `notifySessionCompleted` (`ChargingSessionController.php:342-366`; `NotificationService.php:13-16`). | `GET /api/notifications` memakai middleware `auth:sanctum` (`routes/api.php:25-30`); `NotificationController.php:11-18` memfilter `id_user`. Client Axios menambahkan Bearer token (`api/client.js:13-20`). | `NotificationsBell` dipasang di dashboard, membaca paginator `data.data`, polling badge dan memanggil `PUT .../read`; backend menyimpan `dibaca_pada` (`NotificationController.php:29-46`). | ✅ Tes `test_a_session_completed_notifies_driver`; kontrak list/baca dikunci test baru. |
| FR-42 gagal/terhenti | `interrupt`, `stopByOperator` memanggil service (`ChargingSessionController.php:375-435`; service `:18-20`). | Sama seperti atas. | Sama. | ✅ Tes `test_b...` dan `test_c_operator_stop_notifies_driver`. |
| FR-43 Top Up expired | `expireIfNeeded` berjalan ketika polling `GET /topup/{ref}` melihat expired lalu membuat row `topup_gagal` (`TopupController.php:224-237`). | Endpoint notification user mengembalikan row jika token sah. | Bell merender tipe `topup_gagal`; baca tersimpan ke `dibaca_pada`. | ✅ Tes `test_d_topup_expired_notifies_driver` untuk row; ⚠️ tidak ada pemicu terjadwal tanpa request status. DB dev saat audit berisi 0 `topup_gagal`. |
| FR-44 gangguan oleh Operator, Driver punya sesi aktif | Saat status charger berubah, controller menangkap ID Driver aktif lalu `NotificationService::notifyChargerIssue` mengirim ke admin aktif, operator yang ditugaskan, dan Driver aktif (`OperatorController.php:444-499`; service `NotificationService.php:28-57`). | Endpoint `/api/notifications` per user. | Bell memuat row dan status baca tersimpan. | ✅ `NotificationVerificationTest::test_e_g_h_charger_issue_recipients_and_idempotent` membuktikan Admin, Operator station itu dan Driver menerima, Operator station lain tidak. |
| FR-44 saat Driver sendiri melaporkan gangguan | `interrupt` lebih dulu settlement sesi, lalu memanggil `notifyChargerIssue` tanpa `driverIds` (`ChargingSessionController.php:415-431`). Service hanya mencari sesi berstatus `Berlangsung` (`NotificationService.php:40-45`), sementara sesi pelapor sudah ditutup. | Endpoint tetap benar, tetapi tidak ada row `charger_gangguan` untuk pelapor. | Pelapor melihat FR-42 `charging_gagal`, bukan notifikasi FR-44 gangguan. | ⚠️ Sebagian; `Bagian2AuditContractTest::test_driver_issue_report_does_not_notify_reporter_of_charger_issue` mereproduksi row gagal ada dan row gangguan tidak ada. |

`NotificationController::index` mengirim paginator di `data.data` beserta `current_page/next_page_url`; komponen membaca kedua bentuk paginator/array (`NotificationsBell.jsx:117-140`). Test baru `Bagian2AuditContractTest::test_frontend_notification_list_contract_returns_renderable_and_read_fields` memastikan `id_notifikasi`, `tipe`, `judul`, `pesan`, `dibaca_pada`, dan paginasi hadir, lalu tandai baca tersimpan.

### Diagnosis frontend/runtime

- API base `http://127.0.0.1:8000/api` ada di `frontend/src/api/client.js:4`; route Laravel muncul sebagai `api/notifications` pada `route:list`. Prefix cocok untuk konfigurasi itu, tetapi akan salah jika backend development berjalan pada host/port berbeda.
- Bell terpasang pada dashboard Driver (`DriverDashboard.jsx:1469`). Polling berhenti saat tab tersembunyi, berjalan lagi saat `visibilitychange`, dan interval dibersihkan saat unmount (`NotificationsBell.jsx:107-155`). Ini perilaku yang disengaja.
- Saat bell terbuka, list diambil sekali (`NotificationsBell.jsx:157-207`); polling 25 detik hanya memperbarui unread count. Notifikasi baru saat modal tetap terbuka tidak dimasukkan ke daftar sampai fetch ulang/buka kembali.
- Error endpoint unread-count ditelan (`NotificationsBell.jsx:107-115`) sehingga badge bisa diam/stale. Error daftar menampilkan pesan generik, bukan detail server (`:117-140,622-628`). Interceptor menghapus token pada 401, tetapi tidak memberi event ke state App untuk menutup sesi.
- DB dev: tabel/kolom ada; query SELECT menemukan 7 row notifikasi: 4 `charger_gangguan`, 3 `charging_gagal`, 0 `topup_gagal` dan 0 `charging_selesai`. Ini snapshot DB, bukan bukti akun/layar tertentu.
- Riwayat Notifikasi di browser tidak dapat dipastikan akun/token mana yang sedang dipakai tanpa sesi browser. Feature tests backend berjalan dengan Sanctum terautentikasi.

### Usulan patch (belum diterapkan)

```diff
// backend/app/Http/Controllers/Api/ChargingSessionController.php:431
- app(NotificationService::class)->notifyChargerIssue($settled->charger, 'Out of Order', $data['alasan'] ?? null);
+ app(NotificationService::class)->notifyChargerIssue($settled->charger, 'Out of Order', $data['alasan'] ?? null, [(string) $settled->id_user]);
```

Di frontend, tampilkan status error/retry untuk unread-count dan refresh isi list saat panel terbuka. Pertahankan banner sesi sebagai indikator sesi, tetapi jangan tampilkan seolah-olah ia inbox notifikasi kedua.

## C. Notifikasi Operator

### Inventaris, duplikasi, dan sumber data

| Komponen | Endpoint | Sumber dan baca |
|---|---|---|
| `NotificationsBell` di `OpsDashboard.jsx:115` | `/api/notifications`, `/api/notifications/unread-count` | Tabel `notifikasi`, tanda baca persisten DB. Mencakup FR-44 charger untuk Admin/Operator. Polling badge ~25 detik. |
| Tombol bell kedua + `NotificationOverlay` (`OpsDashboard.jsx:102-128`) | `GET /api/operator/notifications` | `error_log` untuk malfungsi dan query turunan `charging_session/payment` untuk transaksi (`OperatorController.php:945-1075`). Timestamp “sudah dilihat” disimpan di `localStorage` per `id_location` (`api/operatorNotifications.js:3-20,43-52`). |

Keduanya tampak pada header yang sama: sumber pertama `notifikasi`, sumber kedua `error_log`/transaksi turunan. Status baca tidak sinkron. Kesalahan `getOperatorNotifications()` ditelan di `OpsDashboard.jsx:55-56`, sehingga overlay dapat mempertahankan data lama tanpa pesan.

### Trigger, penerima, tabel status

| Jenis | Trigger | Penerima | Tersimpan | Endpoint | Tampil | Status |
|---|---|---|---|---|---|---|
| FR-44 dari perubahan charger | Status unit berubah ke kondisi gangguan; row baru/dedup key dibuat oleh `NotificationService` | Admin aktif lintas station; Operator yang ada di `station_operators` lokasi itu; Driver dengan sesi aktif pada charger | ✅ `notifikasi` | `/api/notifications` | Bell persisten; status baca DB | ✅ Test `test_e_g_h_charger_issue_recipients_and_idempotent` membuktikan penerima assigned, Admin, Driver aktif, dan mengecualikan Operator station lain. |
| Laporan malfungsi Driver | ErrorLog dibuat/berstatus belum selesai | Overlay hanya mengambil error pada lokasi tugas (`OperatorController.php:952-973`) | ✅ `error_log`, bukan `notifikasi` | `/api/operator/notifications` | Panel Gangguan Perangkat | ✅ Query dibatasi `charger.id_location = assignment.id_location`. |
| Sesi baru dimulai | Row `charging_session` berstatus `Berlangsung` | Operator lokasi charger | ❌ bukan `notifikasi`; row sesi dibaca sebagai aktivitas turunan | `/api/operator/notifications` | Tab Transaksi; waktu aktivitas lokal menentukan unread | ✅ Fitur tambahan di luar FR-44. |
| Sesi selesai/terhenti/gagal | Perubahan status/energi/pembayaran pada row `charging_session` | Operator lokasi charger | ❌ bukan `notifikasi`; dibentuk dari query sesi + payment | `/api/operator/notifications` | Tab Transaksi | ✅ Fitur tambahan di luar BRD awal. |
| Top Up | Checkout wallet tidak terikat ke station | Tidak ada penerima station yang ditentukan | Tidak masuk query transaksi sesi | Tidak ada event Top Up station di endpoint overlay | Tidak tampil sebagai aktivitas station | ⚠️ Bukan FR Operator BRD; keputusan scope diperlukan bila ingin ditambah. |

**Reproduksi DB development (SELECT saja):** `migrate:status` dan introspeksi skema memastikan `notifikasi` ada. Query agregat assignment menunjukkan 9 Operator aktif, 0 aktif tanpa assignment; station ID 1–9 masing-masing memiliki satu assignment. Tidak ada akun/station yang disebut pengguna untuk dicocokkan, dan nilai `ev_active_station_id` browser tidak dapat dibaca dari DB, sehingga akun yang dipakai saat gejala terjadi tetap ❓ TIDAK TERVERIFIKASI. Test fixture menguji pemisahan station.

`OpsDashboard` memuat ulang dashboard dan endpoint overlay tiap 30 detik (`OpsDashboard.jsx:70-80`); bell tabel punya polling sendiri. Badge count dapat naik, tetapi tidak ada toast/animasi khusus saat polling menemukan item baru. Ada toast untuk hasil aksi Operator, bukan untuk event baru.

### Usulan patch (belum diterapkan)

Satukan bell/panel Operator pada satu komponen dan satu sumber `notifikasi`; gabungkan aksi penanganan malfungsi ke panel itu. File yang kemungkinan perlu disentuh: `frontend/src/OpsDashboard.jsx`, `frontend/src/NotificationsBell.jsx`, `frontend/src/NotificationOps.jsx`, `frontend/src/api/operatorNotifications.js`, `frontend/src/api/client.js`, `backend/app/Http/Controllers/Api/OperatorController.php`, dan `backend/app/Services/NotificationService.php`. Tambahkan toast singkat hanya saat ID notifikasi baru diterima, bukan pada setiap polling.

## D. Station tutup dan pemilihan port

### Sumber data dan aturan saat ini

- API Driver: `GET /api/stations` dan `GET /api/stations/{id}` (`routes/api.php:55-56`). `StationController::index` mengembalikan semua `Location` tanpa filter status (`StationController.php:32-50`), termasuk saat sebagian charger/port offline; itu mendukung NFR02.
- Status daftar dihitung di `StationController::stationStatus` (`:171-183`): Maintenance → `Dalam Perawatan`, Nonaktif → `Tutup Sementara`, selain itu hanya jumlah port bebas menentukan Aktif/Penuh. Nilai lokasi `Gangguan` tidak ditangani khusus.
- Jam dikirim oleh API (`StationController.php:119-122`), tetapi daftar/rekomendasi tidak mendapat `open_now`/`can_start`. Backend `ChargingSessionController::checkStartable` menolak status lokasi selain `Aktif` dan jam tutup dengan 422 (`:750-755`). `isOpenNow` memakai `Asia/Jakarta` dan menerima interval melewati tengah malam serta 24 jam (`:1132-1150`).
- `StationDetail.operasional` menghitung jam memakai `new Date().getHours()` lokal browser (`frontend/src/StationDetail.jsx:29-40`), bukan waktu `Asia/Jakarta`; jam device berbeda dapat menampilkan badge yang berbeda dari backend. Detail menampilkan “Tutup sekarang” dan rentang jam, bukan waktu buka berikutnya (`:150-158`).
- Driver menghitung `nearbyStations` hanya dari kecocokan konektor dan jarak, tanpa status/jam (`DriverDashboard.jsx:1404-1417`). Label hitungan memakai `nearbyStations.length` (`:1598-1600,1970-1976`). Map/list memakai `filteredStations`; connector filter memakai semua port, dan angka hasilnya ditampilkan sebagai station cocok (`:756-798,2600-2604`). Status “ada port tersedia” hanya mengecek `status === Aktif` dan `charger_tersedia > 0` (`:770-774`).
- Jumlah port bebas diolah dari port available pada charger `Active` (`DriverDashboard.jsx:571-610`); ini tidak mengurangi jumlah bila lokasi tutup/perawatan/jam lewat. Pada detail, `compatibleFree` memeriksa status port saja (`StationDetail.jsx:100-111`).
- Kartu station memiliki `onClick` pemilihan/fokus dan charger picker; tombol per-port hanya disabled oleh status charger/port, bukan status station/jam (`DriverDashboard.jsx:2613-2676`). Backend tetap menolak saat `prepare`/`start` memanggil shared `checkStartable`.

### Kondisi reproduksi

Tes baru membuat station dengan port tersedia, mengunci waktu 12.00 WIB, lalu memanggil daftar dan `POST /api/charging-sessions/prepare`. Hasil yang diamati:

| Kondisi | Muncul di daftar? | Rekomendasi/hitungan konektor? | Filter “tersedia”/angka port? | Bisa dipilih UI? | Backend mulai sesi | Badge sekarang |
|---|---|---|---|---|---|---|
| Lokasi `Nonaktif` | ✅ Ya; API memberi `Tutup Sementara` | ✅ Tetap dihitung `nearbyStations` | Tidak di filter tersedia map; port fisik tetap dihitung 1 | ⚠️ Detail button disabled, tetapi row dapat dipilih dan charger picker tidak memeriksa status lokasi | 422 `Station sedang tidak beroperasi.` | Card “Nonaktif”; detail “Tutup Sementara” |
| Lokasi `Maintenance` | ✅ Ya; API memberi `Dalam Perawatan` | ✅ Tetap dihitung rekomendasi | Tidak di filter tersedia map; port fisik tetap dihitung | ⚠️ Row dapat dipilih; port aktif masih dapat dipilih | 422 `Station sedang tidak beroperasi.` | Card “Perawatan”; detail “Dalam Perawatan” |
| Lokasi `Gangguan` | ✅ Ya; API salah memberi `Aktif` jika ada port bebas | ✅ Dihitung rekomendasi dan status Aktif | ✅ Masuk filter tersedia; port dihitung tersedia | ✅ Port tampak dapat dipilih | 422 `Station sedang tidak beroperasi.` | Salah: “Tersedia” |
| `Penuh` (lokasi Aktif, 0 port bebas) | ✅ Ya | ✅ Tetap masuk rekomendasi konektor | Tidak pada filter tersedia; masuk filter penuh | Port yang sedang dipakai tidak dapat dipilih | 409 jika request port tidak tersedia | “Penuh” |
| Aktif di luar jam | ✅ Ya; API memberi `Aktif` | ✅ Masuk rekomendasi dan hitungan station | ✅ Masuk filter tersedia, angka port tetap tersedia | ✅ Port dapat dipilih | 422 `Station sedang tutup.` | “Tersedia”; detail bisa bilang “Tutup sekarang” memakai jam lokal browser |
| Sebagian charger offline | ✅ Station tetap ditampilkan sesuai NFR02 | Konektor semua port dapat dihitung, termasuk charger offline | Port bebas hanya dihitung pada charger `Active`; station parsial tetap punya angka untuk port online | Charger/port nonaktif ditandai disabled jika label status tidak `ok` | 409 untuk charger/port tak siap | Station tetap terlihat; badge bergantung port online |
| Charger `Maintenance`/`Offline`; port `Charging`/`Reserved`/`Out of Order`/`Maintenance` | Station terlihat; dapat berlabel `Penuh` bila tidak ada port online bebas | ✅ Konektor tetap dapat muncul dalam hitungan kecocokan | Port kondisi tersebut tidak dihitung bebas | Opsi port dinonaktifkan lewat status charger/port | 409 dengan pesan port generik | “Maintenance” untuk charger Maintenance, selain itu label status teknis |

### Test baru dan bukti

`StationAvailabilityAuditTest::test_driver_station_list_exposes_current_status_and_does_not_apply_operating_hours` mengunci keluaran API untuk Aktif, Nonaktif, Maintenance, Gangguan, Penuh, dan di luar jam. Ia mereproduksi Gangguan/out-of-hours diberi status `Aktif` serta Nonaktif tetap ada di daftar.

`test_prepare_rejects_nonactive_locations_and_closed_hours_but_accepts_overnight_hours` membuktikan status Nonaktif/Maintenance/Gangguan dan jam tutup ditolak 422, sedangkan station buka 23:00–01:00 pada 00:30 WIB diterima. `test_prepare_rejects_unavailable_charger_and_port_statuses` membuktikan charger Maintenance/Offline dan port Charging/Reserved/Out of Order/Maintenance ditolak 409.

### Usulan patch (belum diterapkan)

```diff
// backend/app/Http/Controllers/Api/StationController.php
 ->when($connector, ...)
+->where('status_loc', '!=', 'Nonaktif') // sesuai keputusan awal: Nonaktif tidak masuk daftar Driver

// presentStation: keluarkan status dan kesiapan yang sama dengan backend start
- 'status' => $this->stationStatus($location, $availableCount),
+ 'status' => $this->stationStatus($location, $availableCount),
+ 'is_open' => $this->isOpenNowJakarta($location->jam_buka, $location->jam_tutup),
+ 'can_start' => $location->status_loc === 'Aktif' && $availableCount > 0
+     && $this->isOpenNowJakarta($location->jam_buka, $location->jam_tutup),
```

Tambahkan `Gangguan` ke pemetaan status lokasi (`stationStatus` jangan menyimpulkannya dari port), lalu kirim alasan/buka berikutnya. Frontend mempertahankan station tertutup/perawatan/gangguan di daftar tetapi mengurutkan `can_start` dulu; hanya rekomendasi, hitungan “tersedia”, map action, dan pemilihan port memakai `can_start`. Gunakan timestamp/status dari backend WIB di `StationDetail` agar tidak bergantung timezone perangkat.

```diff
// frontend/src/DriverDashboard.jsx map popup — station text berasal dari server
- .bindPopup(`<strong>${s.nama_lokasi}</strong><br/>${s.charger_tersedia}/${s.charger_total} port ...`)
+ const popup = document.createElement('div');
+ const title = document.createElement('strong');
+ title.textContent = s.nama_lokasi ?? '';
+ popup.append(title, document.createElement('br'), document.createTextNode(`${s.charger_tersedia}/${s.charger_total} port`));
+ marker.bindPopup(popup);
```

Pemindaian tidak menemukan `dangerouslySetInnerHTML`, tetapi `bindPopup` menginterpolasi nama station ke string HTML pada `DriverDashboard.jsx:915-917`. Ini sink HTML yang perlu diperbaiki dengan `textContent`/text node.

## Keputusan yang memerlukan arahan

1. **Penerima notifikasi sesi/transaksi Operator:** kode sekarang menampilkan mulai/selesai/gagal melalui endpoint turunan `/operator/notifications`, fitur tambahan di luar FR-44. Apakah dipertahankan, atau panel disederhanakan hanya pada notifikasi gangguan sesuai BRD?
2. **Top Up pada notifikasi Operator:** saat ini tidak masuk aktivitas station. Apakah memang perlu ditambah? Ini juga di luar BRD.
3. **Nonaktif:** audit memakai keputusan awal bahwa status Nonaktif disembunyikan, sementara Maintenance/Gangguan/tutup jam tetap tampil dengan badge. Konfirmasi bila ingin semua station tutup tetap terlihat.
4. **Satu komponen Operator:** usulan menggabungkan bell tabel dan overlay turunan. Apakah sumber final yang dipilih tabel `notifikasi` (disarankan untuk baca konsisten) dengan fitur tindakan malfungsi terintegrasi?

## Perbaikan terurut prioritas

| Prioritas | Temuan / file utama | Effort | Status |
|---|---|---|---|
| P1 | Buat row `Payment` saat checkout settle; `backend/app/Http/Controllers/Api/TopupController.php`; test `TopupSimulationTest.php` | M | ❌ Riwayat tidak mencatat Top Up checkout baru |
| P1 | Escape popup Leaflet; `frontend/src/DriverDashboard.jsx` | S | ⚠️ Nama station server masuk HTML string |
| P1 | Kirim FR-44 ke Driver pelapor; `backend/app/Http/Controllers/Api/ChargingSessionController.php`; `NotificationVerificationTest.php` | S | ⚠️ Test mereproduksi notifikasi gangguan pelapor hilang |
| P1 | Filter readiness/status/jam untuk daftar rekomendasi/pemilih; `StationController.php`, `ChargingSessionController.php`, `DriverDashboard.jsx`, `StationDetail.jsx`, `api/station.js`; `StationAvailabilityAuditTest.php` | L | ⚠️ Gangguan/out-of-hours tampak tersedia; Nonaktif masih tampil |
| P2 | Polling error dan refresh list terbuka; `NotificationsBell.jsx`, `Topup.jsx`, `api/client.js` | M | ⚠️ Error polling disembunyikan; list bisa stale; sim button tak punya loading |
| P2 | Satukan dua bell Operator dan sumber/status baca; `OpsDashboard.jsx`, `NotificationsBell.jsx`, `NotificationOps.jsx`, `operatorNotifications.js`, `OperatorController.php` | L | ⚠️ Tabel vs derived/localStorage |
| P2 | Toast ringan untuk notifikasi Operator baru; komponen bell canonical | S | ⚠️ Belum ada indikator event baru selain badge/panel saat refresh |
| P3 | Verifikasi akun/operator/station dan worker pada lingkungan yang mengalami gejala; konfigurasi/dev setup | S | ❓ Identitas akun uji/station browser tidak diberikan; proses server tak dapat diinspeksi dari sesi ini |

Semua usulan patch di atas hanya rekomendasi audit dan belum diterapkan.
