# FIX B — Pembayaran, Notifikasi, dan Station Tutup

## Ringkasan

- Suite backend pada awal fase B: **98 test, 877 assertion, lulus**. Akhir fase: **100 test, 915 assertion, lulus**.
- DB feature test memakai SQLite test. Tidak ada migrate/seed/write ke DB development.
- Butir dikerjakan berurutan B1 → B2 → B3 → B4, dengan suite penuh sesudah setiap butir.
- Build Vite berhasil (145 modul). Test sumber frontend: **9/9 lulus**.
- UI browser tidak dijalankan. ESLint bersih untuk helper/API/test station; pemeriksaan berkas UI melaporkan masalah lint lama pada `DriverDashboard.jsx` dan `React` tak terpakai di `StationDetail.jsx` (17 error, 4 warning dalam pemanggilan gabungan). Tidak ada error lint yang dilaporkan dari `api/station.js`, `stationAvailability.js`, dan `station-availability.test.mjs`.
- Keputusan yang digunakan: polling Top Up menampilkan retry sesudah **3** kegagalan berturut-turut; banner charging diberi identitas **status sesi aktif**, bukan notifikasi kedua. Keduanya sesuai jawaban/keputusan pada sesi ini.

## B1 — Pembayaran checkout Top Up

**Perubahan:** `TopupController::settle` membuat satu row `Payment` untuk checkout sukses dan menghubungkan `topup.id_payment`. `total_bayar` berisi nominal + snapshot biaya layanan; kredit dompet tetap hanya nominal. Row Top Up sukses lama tanpa `id_payment` dapat dilengkapi tanpa kredit saldo kedua. `TopupExpiryService` menandai Top Up Pending yang lewat waktu sebagai Gagal di bawah lock transaksi dan mengirim notifikasi deduplicated. Command `topups:expire` dijadwalkan setiap menit dengan `withoutOverlapping()`. `Topup.jsx` menunjukkan error jaringan setelah 3 kegagalan poll, menyediakan “Coba lagi”, dan mengunci tombol simulasi saat request berjalan.

**Test dibalik:** `Bagian2AuditContractTest::test_checkout_flow_reproduces_missing_payment_history_entry` kini menjadi `test_checkout_flow_creates_owned_payment_history_entry`: checkout menghasilkan satu Payment dengan biaya snapshot, saldo naik hanya sebesar nominal, retry pembayaran tidak menggandakan Payment/saldo, Driver lain mendapat 404 dan tanpa token 401.

**Test baru/ditambah:** `TopupSimulationTest` memeriksa row Payment serta relasi Top Up, dan command expiry tanpa polling: pemanggilan kedua tidak memproses ulang; notifikasi hanya satu, Payment gagal tidak dibuat. Test Node `topup-polling.test.mjs` mencakup retry setelah tiga error, tombol retry, sukses yang mereset error, serta loading/disable.

**Hasil:** suite setelah B1 **99 test / 902 assertion lulus**; test fokus `Bagian2AuditContractTest|TopupSimulationTest` **7/7 / 58 assertion lulus**; test frontend terkait lulus.

Top Up expired/gagal saat ini tidak dicatat sebagai Payment, mengikuti perilaku riwayat yang ada; test command menegaskan tidak ada Payment gagal. Tidak ada perubahan rumus fee atau kredit saldo.

## B2 — FR-44 untuk Driver pelapor

`ChargingSessionController::interrupt` menangkap `id_user` string pelapor sebelum settlement dan meneruskannya ke `notifyChargerIssue`. Test dibalik menjadi `Bagian2AuditContractTest::test_driver_issue_report_notifies_reporter_admin_and_assigned_operator_only`: pelapor menerima notifikasi sesi gagal dan gangguan charger; Admin dan Operator yang ditugaskan menerima gangguan; Operator station lain tidak; dedup menghasilkan satu notifikasi tiap penerima.

**Hasil:** suite setelah B2 **99 test / 907 assertion lulus**; test fokus notifikasi **2/2 / 15 assertion lulus**. ID user tidak di-cast ke integer.

## B3 — Pengalaman notifikasi Driver

- `NotificationsBell` menampilkan indikator kecil stale/error saat unread-count gagal; polling berikutnya tetap mencoba ulang. Ketika jumlah unread naik dan panel terbuka, daftar halaman pertama dimuat ulang tanpa mengubah filter. Badge tetap bersumber dari unread-count.
- Banner charging diganti menjadi status sesi dengan ikon zap, label “Sesi aktif”, dan `role="status"`.
- Interceptor 401 membersihkan token/user lalu mengirim `evchargehub:auth-expired`; `App` beralih ke welcome dan membersihkan konteks sesi/resume tanpa mengirim request logout yang berulang.
- Test baru `notification-flow.test.mjs` membuktikan peningkatan unread, status stale dan refresh panel tanpa mengubah filter, event 401, serta banner sesi. Hasil suite sesudah B3 **99 test / 907 assertion lulus**; seluruh test frontend (Top Up, notifikasi, station) **9/9 lulus**.

## B4 — Ketersediaan station dan jam WIB

- `StationOperatingHours` menjadi helper bersama untuk perhitungan jam dalam `Asia/Jakarta`, jam lintas tengah malam, dan jam kosong sebagai 24 jam. `ChargingSessionController::isOpenNow` mendelegasikan ke helper tersebut.
- `StationController` menyembunyikan `Nonaktif` pada index Driver, mengirim `is_open`, `can_start`, `buka_berikutnya`, dan membuat `charger_tersedia=0` jika station tak bisa memulai sesi. Status `Gangguan` ditangani eksplisit; status station memakai label Indonesia. Daftar Operator tidak dipersempit oleh filter Nonaktif ini.
- Adapter frontend meneruskan field availability. Dashboard mengurutkan station yang bisa dipakai lebih dulu; filter “Ada port tersedia” dan rekomendasi/hitungan rekomendasi hanya menghitung station `can_start`. Station tutup tetap tampak dengan badge termasuk “Buka pukul HH:MM”; pilihan port dinonaktifkan. Detail memakai jam/backend WIB, tidak lagi menghitung dengan jam perangkat, dan jumlah port menyebut “X dari Y port tersedia”.
- Test karakterisasi `StationAvailabilityAuditTest::test_driver_station_list_exposes_current_status_and_does_not_apply_operating_hours` dibalik menjadi `test_driver_station_list_hides_inactive_and_excludes_closed_and_malfunction_from_availability`. Test prepare tetap menolak status/jam tutup dan menerima sesi overnight saat buka. Ditambahkan `test_missing_operating_hours_mean_open_24_hours`. Node `station-availability.test.mjs` mengunci label, filter/rekomendasi/pemilihan, dan tidak adanya perhitungan waktu lokal di detail.
- Hasil suite setelah B4: **100 test / 915 assertion lulus**. Build frontend berhasil. Test frontend keseluruhan **9/9 lulus**.

## File utama dan tujuan

| Butir | File | Alasan |
|---|---|---|
| B1 | `backend/app/Http/Controllers/Api/TopupController.php`, `backend/app/Services/TopupExpiryService.php`, `backend/app/Console/Commands/ExpireTopups.php`, `backend/routes/console.php` | Riwayat Payment Top Up, settle/expiry idempoten, expiry terjadwal |
| B1 | `backend/tests/Feature/Bagian2AuditContractTest.php`, `backend/tests/Feature/TopupSimulationTest.php`, `frontend/src/Topup.jsx`, `frontend/src/utils/topupPolling.js`, `frontend/tests/topup-polling.test.mjs` | Bukti kontrak pembayaran dan retry UI |
| B2 | `backend/app/Http/Controllers/Api/ChargingSessionController.php`, `backend/tests/Feature/Bagian2AuditContractTest.php` | Pelapor FR-44 masuk daftar penerima dan dedup diuji |
| B3 | `frontend/src/NotificationsBell.jsx`, `frontend/src/notificationsBell.css`, `frontend/src/DriverDashboard.jsx`, `frontend/src/api/client.js`, `frontend/src/app.jsx`, `frontend/src/utils/notificationPolling.js`, `frontend/tests/notification-flow.test.mjs` | Error polling, refresh panel, banner status sesi, redirect auth-expired |
| B4 | `backend/app/Support/StationOperatingHours.php`, `backend/app/Http/Controllers/Api/StationController.php`, `backend/app/Http/Controllers/Api/ChargingSessionController.php`, `backend/tests/Feature/StationAvailabilityAuditTest.php` | Status/ketersediaan server dan helper jam bersama |
| B4 | `frontend/src/api/station.js`, `frontend/src/utils/stationAvailability.js`, `frontend/src/DriverDashboard.jsx`, `frontend/src/StationDetail.jsx`, `frontend/tests/station-availability.test.mjs` | Badge, urutan/filter/rekomendasi, disable pilihan, waktu backend |

## ❓ TIDAK TERVERIFIKASI dan skenario manual

- **Browser/UI:** belum dijalankan. Uji Top Up sukses dan fee, tiga kegagalan polling lalu “Coba lagi”, panel notifikasi terbuka dengan filter aktif saat notifikasi baru masuk, polling offline lalu pulih, dan 401 yang kembali ke login.
- **Station UI:** uji akun Driver untuk Aktif, Penuh, Tutup Sementara, Maintenance, Gangguan, Nonaktif, di luar jam, jam lintas tengah malam, dan jam kosong. Pastikan station tutup tetap terlihat namun tidak muncul di rekomendasi/filter tersedia dan port tak dapat dipilih. Cocokkan label buka WIB dengan server.
- **Database produksi/MySQL:** locking dan scheduler dibuktikan lewat SQLite feature test dan `schedule:list`, bukan beban MySQL atau scheduler server yang berjalan terus-menerus. Pastikan cron Laravel scheduler aktif pada deployment.
- **Lint UI:** `npm run build` lulus. ESLint untuk file station util/API/test bersih. Pemanggilan lint yang menyertakan `DriverDashboard.jsx` masih menemukan 16 error + 4 warning yang telah ada dari fase sebelumnya; `StationDetail.jsx` juga memiliki import default `React` yang lint tandai tidak dipakai. Perlu ditangani terpisah agar tidak memperluas scope B4.

## Urutan tindak lanjut

| Prioritas | Perbaikan | File utama | Effort | Dependensi |
|---|---|---|---|---|
| 1 | Smoke test checkout + Payment dan expiry di staging | Topup, command scheduler, riwayat Payment | S | Scheduler terpasang dan gateway simulasi aktif |
| 2 | Uji manual polling/error/401 dan panel bell Driver | `Topup.jsx`, `NotificationsBell.jsx`, `app.jsx` | S | Browser + API berjalan |
| 3 | Uji visual peta/detail station semua status dan jadwal WIB | `DriverDashboard.jsx`, `StationDetail.jsx` | M | Fixture station untuk setiap status |
| 4 | Verifikasi concurrency settle Top Up dan scheduler pada MySQL | Topup service/controller dan DB staging | M | Lingkungan MySQL staging |
