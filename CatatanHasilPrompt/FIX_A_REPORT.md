# FIX A — Uang dan Keamanan

## Ringkasan pelaksanaan

- Test suite awal: **77 test, 752 assertion, lulus**.
- Test suite akhir: **98 test, 877 assertion, lulus**.
- Test DB memakai konfigurasi suite SQLite. Tidak ada migrasi, seeding, atau penulisan ke DB development.
- Build frontend berhasil. Browser tidak dijalankan; lihat skenario manual di bagian akhir.
- Test karakterisasi yang dibalik tetap ada: test legacy Top Up kini menegaskan jalur lama tak ditemukan dan saldo tidak berubah; test energi klien kini menegaskan `energi_kwh` kiriman diabaikan.
- Keputusan desain yang belum tercakup: tidak ada. Perubahan mengikuti tabel keputusan permintaan.

## A1 — Hentikan Top Up langsung

**Perubahan:** route `POST /api/wallet/topup` dan method kredit saldo `DompetPinController::topUp` dihapus. Import dan helper metode pembayaran yang hanya dipakai method itu ikut dihapus. Pencarian frontend menunjukkan layar Dompet memakai `TopUp` (`frontend/src/DompetDigital.jsx`); alur tersebut sudah memakai `/topup/methods`, `POST /topup`, dan `POST /topup/{reference}/simulate-pay`. Helper `topUpWallet` yang tak punya pemanggil dihapus dari `frontend/src/api/wallet.js`.

**Test:** `Part3IntegrityAuditTest::test_legacy_wallet_topup_credits_balance_without_simulated_checkout` dibalik/diganti menjadi `test_topup_requires_checkout_and_simulation_before_crediting_wallet`: route lama 404; checkout saat `payment.simulation=false` tak dapat dibayar dan saldo tetap nol. `TopupSimulationTest::test_simulation_disabled_returns_403` dan `test_simulate_pay_is_idempotent` tetap lulus.

**Suite setelah A1:** 77 test, 754 assertion, lulus.

## A2 — Energi aktual ditentukan server

**Perubahan:** `finish` dan `interrupt` tidak lagi menerima/validasi `energi_kwh`; `settleSession` selalu memakai hasil `simulate($session)`. Alias stop mengikuti `finish`; stop Operator dan jalur penyelesaian internal juga tetap memakai simulasi server. Frontend Driver sudah tidak mengirim energi pada request selesai/laporan gangguan.

**Test dibalik:** `Part3IntegrityAuditTest::test_driver_can_submit_client_chosen_energy_to_understate_settlement` menjadi `test_driver_client_chosen_energy_is_ignored_for_settlement`: nilai klien 0,1 kWh diabaikan; sesi yang telah berjalan sesuai fixture menghasilkan 10 kWh, tagihan dibatasi oleh hold Rp27.000, saldo/hold sesuai.

**Test energi berbasis waktu:** `CostConsistencyVerificationTest` dan `ParkingSettlementScenarioTest` mengatur waktu mulai/port dengan `travelTo()` agar skenario stabil, bukan memalsukan energi request. Terbukti normal 6 kWh = Rp17.000; gagal 3 kWh = Rp9.500; gagal 0 kWh = Rp2.000; biaya di atas hold tetap dibatasi hold. Fixture `NotificationServiceExceptionTest` dan `ReportRevenueVerificationTest` juga diselaraskan ke simulasi waktu.

**Suite setelah A2:** 77 test, 754 assertion, lulus.

## A3 — Integritas jeda dan role Driver

**Perubahan:** `resolvePause()` sekarang membaca sesi terkunci dengan `lockForUpdate` dan melakukan pembaruan auto-resume dalam transaksi. Setelah lock DB memastikan jeda belum pernah diselesaikan, penambahan `total_jeda_detik` dilakukan sekali; pembacaan monitoring berulang dan settle sesudahnya tidak menggandakan durasi jeda.

Route jeda/lanjut dilindungi middleware Driver. Middleware `role:driver` juga diterapkan pada wallet/PIN, profil Driver, kendaraan, charging sessions, dan checkout Top Up karena endpoint tersebut mengelola sumber daya khusus Driver. Route stop Operator dipisahkan ke group `role:operator,admin`. Station dan payment history tetap menggunakan auth bersama: station mempunyai kontrol akses per station tersendiri dan payment history bukan endpoint yang diminta untuk dipersempit pada butir ini.

**Test baru:** `ChargingPauseIntegrityTest` memuat 17 test, termasuk jeda tidak menambah energi, durasi/energi mengecualikan jeda, pause/resume idempoten, status nonaktif ditolak, auth/owner, auto-resume tepat 300 detik, settle Driver dan Operator saat jeda, gangguan saat/tanpa jeda dan penerima notifikasi, penonaktifan Driver, 3+2 menit jeda+3 menghasilkan 6 kWh/Rp17.000, audit tanpa notifikasi, kontrak monitoring lama/baru, port tetap terkunci bagi Driver lain, serta 403 untuk Admin/Operator dan endpoint Driver.

**Suite setelah A3:** 94 test, 833 assertion, lulus.

**Batas pembuktian:** SQLite feature test membuktikan urutan akses baca/settle dan idempotensi; ia tidak mensimulasikan dua transaksi MySQL yang benar-benar bersamaan. `lockForUpdate` sudah dipakai dalam transaksi, tetapi race contention di DB produksi perlu skenario MySQL.

## A4 — Rate limit login

**Perubahan:** named limiter `login` di `AppServiceProvider` membatasi lima percobaan per menit berdasarkan email lowercase + IP, dan route login memakai `throttle:login`.

**Test baru:** `LoginRateLimitTest`: lima kredensial salah mendapat pesan generik, percobaan keenam 429 generik, login sah berhasil setelah 61 detik; akun dikenal/tidak dikenal memberi pesan 401 identik.

**Suite setelah A4:** 96 test, 851 assertion, lulus.

## A5 — Error dan HTML

**Perubahan backend:** catch registrasi mencatat exception di log server dan hanya mengirim pesan umum; detail exception tidak dikembalikan.

**Perubahan frontend:** `main.jsx` membangun `<pre>` dengan DOM dan menulis error melalui `textContent`; hook `?debug` dan token/user literal dihapus. Popup Leaflet station memakai elemen DOM dan `textContent`, bukan HTML interpolasi nama station.

**Test:** `AuthRegistrationSafetyTest` memicu exception internal saat membuat profil, memastikan detail rahasia tidak ada dalam response dan transaksi user dibatalkan. `frontend/tests/security-source.test.mjs` berisi dua test source untuk error handler/debug hook dan popup DOM.

**Verifikasi UI:** `node --test tests/security-source.test.mjs` lulus 2/2 dan `npm run build` lulus. `npx eslint src/main.jsx src/DriverDashboard.jsx`: `main.jsx` lulus; `DriverDashboard.jsx` tetap melaporkan 16 error/4 warning lama di bagian lain file (antara lain import/variabel tak terpakai, aturan hooks, dan `FiAlertTriangle` undefined). Saya tidak mengubah area di luar scope. Lint keseluruhan proyek juga gagal pada file-file existing lainnya.

**Catatan keamanan:** token literal lama pada hook debug harus dianggap bocor. Cabut token tersebut secara manual pada environment yang pernah menggunakannya; task ini tidak mengakses atau mengubah DB development.

## A6 — Konfigurasi, seeder, dependency, model yatim

**Perubahan:** `.env.example` memakai `APP_DEBUG=false`. Guard production ditambahkan ke `DatabaseSeeder`, `UserSeeder`, `StationSeeder`, `StationOpSeeder`, `TarifSeeder`, `PaymentMethodSeeder`, dan `MetodePembayaranSeeder`. `ProductionSeederGuardTest` mengubah environment aplikasi test menjadi production dan memastikan ketujuh seeder menolak berjalan tanpa membuat user/station.

`app/Models/Refund.php` dihapus setelah pencarian seluruh repo tidak menemukan referensi model. Tidak ada migrasi lama yang diubah.

**Composer:** `composer audit --locked` awal menemukan 11 advisory pada 7 paket, termasuk High/Medium `league/commonmark` 2.10.1. `composer depends league/commonmark --tree` menunjukkan Laravel Framework memerlukan `league/commonmark ^2.8.1`. Update awal dengan batasan dependensi terlalu lebar gagal karena Symfony YAML 8.1 memerlukan PHP >=8.4.1 sedangkan runtime adalah PHP 8.3.30. Update terkendali dengan YAML dipatok ke 7.4.23 kompatibel PHP 8.3 dan memperbarui framework serta paket patch terkait: Laravel 13.32.0 → 13.42.0, CommonMark 2.10.1 → 2.10.7, Symfony YAML 8.1.8 → 7.4.23; 51 paket diperbarui dan satu polyfill ditambahkan. Suite penuh lulus setelahnya. `composer audit --locked` akhir: **No security vulnerability advisories found**.

**Suite setelah A6:** 98 test, 877 assertion, lulus.

## Daftar test baru/dibalik

- Dibalik: `Part3IntegrityAuditTest::test_legacy_wallet_topup_credits_balance_without_simulated_checkout` → checkout diwajibkan dan simulasi off tidak menambah saldo.
- Dibalik: `Part3IntegrityAuditTest::test_driver_can_submit_client_chosen_energy_to_understate_settlement` → energi klien diabaikan.
- Fixture waktu diperbaiki pada `CostConsistencyVerificationTest`, `ParkingSettlementScenarioTest`, `NotificationServiceExceptionTest`, dan `ReportRevenueVerificationTest` agar nilai energi berasal dari simulator server.
- Baru: `ChargingPauseIntegrityTest` (17 test), `LoginRateLimitTest` (2 test), `AuthRegistrationSafetyTest` (1 test), `ProductionSeederGuardTest` (1 test), dan `frontend/tests/security-source.test.mjs` (2 test Node).
- Hasil akhir: backend 98/98 test, 877 assertion; frontend source test 2/2; production build berhasil.

## ❓ TIDAK TERVERIFIKASI dan skenario manual

- **Browser/UI:** buka Dompet Digital → Top Up, pastikan metode dan checkout tampil; bayar simulasi, refresh saldo/riwayat, lalu matikan simulasi untuk memastikan error jelas. Buka peta Driver dengan nama station berisi `<img onerror=...>` dan pastikan tampil literal sebagai teks.
- **Session UI:** jalankan charging, jeda 2 menit, lanjut 3 menit, lalu selesaikan; cocokkan energi/biaya dengan backend. Uji refresh saat countdown jeda berjalan dan auto-resume.
- **Login UI:** lakukan percobaan gagal enam kali, pastikan pesan tetap umum dan cooldown ditampilkan dengan baik; setelah satu menit login harus bisa dilakukan.
- **Token debug lama:** cabut token literal lama di environment yang pernah digunakan.
- **MySQL concurrency:** jalankan dua request monitoring/settle bersamaan terhadap sesi jeda expired dan pastikan `total_jeda_detik`, saldo, pembayaran, dan hold hanya diselesaikan sekali.
- **DB development:** tidak dijalankan query maupun perintah dalam fase perbaikan ini. Seeder production guard diuji memakai SQLite test.
- **Composer runtime production:** audit advisory sudah dibersihkan pada lockfile; deploy versi lockfile baru dan smoke-test runtime/fitur aplikasi tetap perlu dilakukan pada staging.

## Perbaikan dan file per butir

| Urutan | Butir | File utama | Effort | Dependensi |
|---|---|---|---|---|
| 1 | A1 Top Up checkout-only | `backend/routes/api.php`, `DompetPinController.php`, `frontend/src/api/wallet.js`, `Part3IntegrityAuditTest.php` | S | Tidak ada |
| 2 | A2 energi server-only | `ChargingSessionController.php`, fixture settlement/notification test | S | A1 independen |
| 3 | A3 jeda/role | `ChargingSessionController.php`, `routes/api.php`, `ChargingPauseIntegrityTest.php` | M | Wajib sebelum demo sesi |
| 4 | A4 login rate limit | `AppServiceProvider.php`, `routes/api.php`, `LoginRateLimitTest.php` | S | Tidak ada |
| 5 | A5 error/XSS/debug | `AuthController.php`, `frontend/src/main.jsx`, `DriverDashboard.jsx`, test safety | S | Cabut token lama manual |
| 6 | A6 production/dependency | `.env.example`, seeder, `composer.lock`, hapus `Refund.php`, guard test | M | Smoke test staging sesudah deploy |

## Status kerja

Laporan lengkap ini menunggu review. Daftar `git status` dan `git diff --stat` terakhir dilampirkan di respons terminal akhir, sesudah seluruh suite dijalankan.
