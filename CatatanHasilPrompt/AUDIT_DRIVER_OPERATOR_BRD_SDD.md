# Audit Kesesuaian Menyeluruh — Driver & Operator terhadap BRD/SDD

**Tanggal audit:** 17 November 2026 · **Mode:** hanya baca aplikasi/DB dev; perubahan terbatas pada feature test baru dan laporan ini. Semua test berjalan memakai SQLite in-memory dari `backend/phpunit.xml`. Tidak dijalankan migrasi, seeder, atau operasi tulis pada DB development.

## 1. Ringkasan eksekutif

Stack yang teridentifikasi: Laravel `^13.17` + Sanctum, React `^19.2.8` + Vite, Leaflet. `composer audit` (locked) mencatat **11 advisori pada 7 paket**, termasuk **1 High, 0 Critical**; beberapa advisori tidak diberi severity oleh registry. `npm audit` penuh: **0 kerentanan** dari 207 dependency.

| Aktor / cakupan | Sesuai | Sebagian | Menyimpang | Tidak ada | Tidak terverifikasi | Total |
|---|---:|---:|---:|---:|---:|---:|
| Driver (36 FR + 4 NFR) | 21 | 14 | 3 | 1 | 1 | 40 |
| Operator (14 FR) | 9 | 5 | 0 | 0 | 0 | 14 |

**Severity temuan baru:** 3 High (dua jalur manipulasi transaksi, satu advisori dependency High), 6 Medium, 2 Low; 0 Critical. Temuan rinci di Fase 5. Hitungan tidak memasukkan delapan isu yang sudah diketahui, dan tidak menghitung kembali temuan dari laporan Part 1/2.

**Rekomendasi demo: NO-GO untuk alur uang/API sampai dua endpoint manipulasi transaksi ditutup atau dinonaktifkan.** `/api/wallet/topup` mengkredit saldo tanpa gateway simulasi; `finish` menerima energi aktual yang dipilih klien. Sisanya bisa didemokan terbatas setelah keputusan pada skenario manual, dengan catatan SDD tidak tersedia dan retensi satu jam belum ada.

Suite awal: **73 test, 725 assertions lulus**. Setelah test audit tambahan: **77 test, 752 assertions lulus**. Seluruh test pass; status ini tidak menggantikan race test MySQL, browser Chrome, atau E2E gateway nyata.

## 2. Fase 0 — SDD dan dokumen acuan

### SDD

**SDD tidak ditemukan.** Pemindaian file repo (di luar `node_modules`/`vendor`) menemukan `docs/BRD_EV_Charge_HUB.docx`, `docs/PRD_TEMPLATE.md`, `docs/DESIGN_DNA.md`, `docs/DATA_SIMULASI.md`, dan beberapa laporan audit/build. Tidak ditemukan file bernama SDD/Software Design, ERD, DFD, diagram use case/activity/sequence/class, atau FAD (`.pdf`, `.docx`, `.puml`, `.drawio`). Karena itu tidak ada isi arsitektur, kontrak API, ERD, status, atau UI dari SDD yang dapat dibandingkan; tabel Fase 4 dibatasi pada pernyataan ini dan dokumen pendukung yang benar-benar ada.

### Dokumen yang tersedia

| Dokumen | Hal yang dapat diperiksa | Catatan |
|---|---|---|
| `docs/BRD_EV_Charge_HUB.docx` | Scope, FR-01…FR-56, NFR, asumsi, batasan, glosarium | Berstatus draf baseline; metadata versi/tanggal/persetujuan masih placeholder. Ini acuan utama permintaan audit. |
| `docs/PRD_TEMPLATE.md` | Alur Driver/Operator, produk, kebutuhan UX, retensi/akses, alur proses | Namanya template tetapi berisi baseline rinci; tidak menggantikan SDD dan beberapa alurnya lebih ketat dari UI sekarang. |
| `docs/DESIGN_DNA.md` | Hierarki, status warna+teks, aksesibilitas, target layar 320px, konsistensi UI | Hanya aturan desain; tidak mendefinisikan endpoint/schema. |
| `docs/DATA_SIMULASI.md` | 9 station, kode, akun dan alur seeder | Menyatakan password demo di-reset oleh seeder; jangan dipakai di lingkungan nyata. |

BRD glosarium: Station → Charger (unit perangkat) → Port (konektor fisik yang menampung satu sesi). Tarif flat parkir, saldo hold, dan pengembalian otomatis; tidak ada refund manual/booking/antrian. NFR di BRD: NFR-02 adalah autentikasi/otorisasi, NFR-03 target kinerja 5 menit/10 pengguna, NFR-05 retensi satu jam, NFR-06 Chrome, NFR-07 jarak/Arrival Check, NFR-08 transaksi atomik, NFR-09 audit, NFR-10 usability. **Catatan penomoran:** arahan kerja sebelumnya menyebut NFR02 sebagai visibilitas info station; dokumen BRD yang ada memakai NFR02 untuk auth/otorisasi dan memuat visibilitas station pada scope/FR-11. Ini konflik label dokumen, bukan asumsi implementasi.

## 3. Fase 1 — Matriks Driver

Legenda status hanya: **✅ Sesuai · ⚠️ Sebagian · Menyimpang dari BRD/SDD · ❌ Tidak ada · ❓ TIDAK TERVERIFIKASI**. Acuan kebutuhan adalah bagian 5.1/5.2 pada BRD; endpoint lengkap terdapat di `backend/routes/api.php`.

| Req# | Deskripsi | Status | Endpoint/UI | Bukti | Test | Catatan |
|---|---|---|---|---|---|---|
| FR-01 | Registrasi Driver | ⚠️ Sebagian | `POST /api/register`; `Registrasi.jsx` | `AuthController.php:19-80` membuat user, profil dan Dompet; PIN/kendaraan tidak dibuat di flow register (`VehicleController` berdiri sendiri). | `DriverPart1AuditTest::test_registration_phone...` | PRD 7.1 menyusun PIN + kendaraan sebagai persiapan registrasi. API belum mengikat kendaraan/PIN ke transaksi registrasi; Dompet otomatis ✅. |
| FR-02 | Login/logout sesuai peran | ⚠️ Sebagian | `POST /login`, `POST /logout` | `AuthController.php:99-145`: hash password, error generik, token lama dicabut saat login, token aktif dicabut saat logout; `config/sanctum.php` expiration 120 menit. Tidak ada `RateLimiter` pada login. | `DriverManagementTest::test_e_deactivated_driver_cannot_login`, `test_f_token_issued_before_deactivation...` | Brute-force login limiter belum ada; issue ini juga tertulis sebagai issue terbuka pada BRD. |
| FR-03 | Kelola profil Driver | ✅ Sesuai | `GET/PUT /api/driver/profile`; Profil/Settings Driver | `ProfileDriverController.php:16-42`, `UpdateProfileDriverRequest.php:24-33`; profil berdasarkan `request->user()`. | `DriverPart1AuditTest::test_driver_profile_phone...` | Field tervalidasi dan tidak menerima `id_user` dari payload sebagai target. |
| FR-04 | CRUD kendaraan/konektor | ✅ Sesuai | `GET/POST/PUT/DELETE /api/vehicles`; Kendaraan Saya | `VehicleController.php:20-94`: query melalui relasi user, connector allowlist, plat unik, update/delete milik caller. | Tidak ada test khusus CRUD vehicle di suite yang diperiksa. | UI menyediakan aktif vehicle selection; pemilihan aktif disimpan local browser (`DriverDashboard.jsx:204-205,552-566`). ID kendaraan adalah integer. |
| FR-05 | PIN transaksi | ⚠️ Sebagian | `/api/wallet/pin`, `PUT /pin`, `/verify`, `/reset`; Pengaturan PIN | `DompetPinController.php:69-137,277-302`; bcrypt/Hash, enam digit, PIN lama, lockout 3/15. Belum ada aturan weak PIN / audit log; error salah PIN spesifik. | `DriverPart1AuditTest::test_pin_change_hashes_values...`; `ChecksWalletPin` ada di session tests | UI PIN ada, tetapi API limit/reset dan audit gap lihat Part 1; kontrol internal pada `POST /wallet/topup` tidak memenuhi gateway flow (FR-07). |
| FR-06 | Melihat Dompet Digital | ✅ Sesuai | `GET /api/wallet` | `DompetPinController.php:42-62` mengirim saldo, hold, available, status dan indikator PIN, tanpa hash PIN. | `DriverPart1AuditTest::test_pin_change_hashes_values...` | Hash/token tidak ditemukan pada payload wallet. |
| FR-07 | Top Up simulasi | Menyimpang dari BRD/SDD | `/api/topup` checkout dan **legacy** `POST /api/wallet/topup` | Checkout gateway berada di `TopupController.php:60-165`; legacy controller `DompetPinController.php:183-249` membuat pembayaran `Sukses` dan menambah saldo langsung tanpa `PAYMENT_SIMULATION`. | `Part3IntegrityAuditTest::test_legacy_wallet_topup_credits_balance_without_simulated_checkout`; `Bagian2AuditContractTest::test_checkout_flow_reproduces_missing_payment_history_entry` | Akses langsung legacy endpoint melewati gateway simulasi. Riwayat checkout saat ini tidak konsisten seperti temuan Part 2. |
| FR-08 | Saldo tersedia | ✅ Sesuai | `GET /api/wallet`, estimasi | `Dompet.php:46-49` menghitung `max(0, saldo-hold)`; `ChargingSessionController.php:209-217` memasukkan saldo tersedia ke estimasi. | `CostConsistencyVerificationTest`, `ParkingSettlementScenarioTest` | Nilai rupiah di-cast integer. |
| FR-09 | Rekomendasi station | ✅ Sesuai | Station list + Dashboard | `DriverDashboard.jsx:1404-1417` menyaring berdasarkan konektor kendaraan aktif dan mengurutkan jarak bila ada; hanya maksimal tiga direkomendasikan (`:1598`). | `StationAvailabilityAuditTest` mencakup status station, bukan ranking UI. | Jarak tetap `null` tanpa GPS; UI menampilkan jarak hanya jika nilai ada (`:2053-2055`). Station tutup yang tampil sudah dibahas pada laporan Part 2. |
| FR-10 | Detail station | ✅ Sesuai | `GET /api/stations/{id}`, `StationDetail` | `StationController.php:45-69,77-166`; detail memuat tarif, jam, charger dan port. | `StationAvailabilityAuditTest` | Kualitas label detail port termasuk temuan Part 1, tidak diulang di sini. |
| FR-11 | Ketersediaan charger/port | ⚠️ Sebagian | `GET /api/stations`; kartu/chooser | `StationController.php:84-126` menghitung port tersedia dari charger Active; agregat field dinamai `charger_tersedia`. | `StationAvailabilityAuditTest`; `AUDIT_DRIVER_PART1.md` | Salah konteks hitungan/label sudah dicatat Part 1/2; hanya dirujuk. |
| FR-12 | Cari/filter station | ✅ Sesuai | Search + filter Maps | `DriverDashboard.jsx:756-795,2555-2591`: keyword nama/kode/alamat, konektor, ketersediaan, daya minimum, tarif maksimum. | Tidak ada test React/filter di suite. | Filter diterapkan client-side setelah API mengirim seluruh daftar station. |
| FR-13 | Navigasi station | ✅ Sesuai | Tombol rute / Google Maps | `StationDetail.jsx:224-232` membentuk link navigasi Google Maps. | Tidak ada test UI/browser. | Tautan dibentuk dari koordinat/alamat station yang tersedia. |
| FR-19 | Monitor progres charging | ✅ Sesuai | `GET /charging-sessions/active`, polling frontend | `ChargingSessionController.php:88-95,957-1019`; progres simulasi dihitung server dari energi dan waktu. | `CostConsistencyVerificationTest`; `ParkingSettlementScenarioTest` | Frontend tetap perlu skenario browser untuk lifecycle polling. |
| FR-20 | Validasi/klaim satu port | ⚠️ Sebagian | `POST /charging-sessions/validate`, `/start` | `ChargingSessionController.php:224-310`: validasi ulang, transaksi DB dan conditional update port hanya jika masih Available. | Tidak ditemukan test dua request serentak. | Conditional update adalah perlindungan atomik; hasil race MySQL belum terbukti oleh SQLite in-memory. Uji dua Driver serentak dianjurkan. |
| FR-21 | Mulai sesi simulasi | Menyimpang dari BRD/SDD | `POST /prepare`, `/estimate`, `/start` | `ChargingSessionController.php:225-310,744-790`: validasi vehicle owner, port/status, saldo, PIN, waktu dan jarak. Koordinat datang dari payload klien (`:228-235`), bukan sumber yang dapat diverifikasi server. | `StationAvailabilityAuditTest`; belum ada test spoof koordinat | Caller API dapat mengirim koordinat station sendiri; backend memvalidasi klaim angka, bukan membuktikan GPS perangkat. PIN/port/saldo tetap diperiksa. |
| FR-22 | Pantau status, energi, biaya, hold | ✅ Sesuai | sesi aktif/polling | `ChargingSessionController.php:88-95,957-1019`; UI active session di `DriverDashboard.jsx`. | `CostConsistencyVerificationTest` | Tidak menilai visual runtime browser. |
| FR-23 | Hentikan sesi | ✅ Sesuai | `/finish`, `/stop`, `/operator/sessions/{id}/stop` | `ChargingSessionController.php:342-401,560-660`; owner check untuk Driver dan assignment untuk Operator; stop menghitung settlement aktual dan melepaskan hold. | `CostConsistencyVerificationTest`, `DriverManagementTest::test_h2...` | Sesi jeda diselesaikan melalui settlement yang memproses status jeda. |
| FR-24 | Catat sesi | ✅ Sesuai | create/settlement session | `ChargingSessionController.php:298-323,584-660`; waktu, status, energi, tarif FK, hold dan pembayaran tersimpan. | `CostConsistencyVerificationTest` | Nilai energi settlement dapat dimanipulasi dari payload; FR-28 di bawah. |
| FR-25 | Sesi gagal/terhenti | ✅ Sesuai | `/interrupt`, stop operator, perubahan status unit | `ChargingSessionController.php:405-445,584-660`; failed/stop melunasi biaya dan hold dalam transaksi. | `CostConsistencyVerificationTest::test_case2_failed_3kwh`, `test_case3_failed_zero`; `NotificationVerificationTest` | Gangguan dan jeda berasal dari flow berlainan; invoice pause marker tercatat sebagai gap di Part 1. |
| FR-27 | Estimasi | ✅ Sesuai | `POST /estimate` | `ChargingSessionController.php:179-220`; `Tarif::costFor` menghitung energi/minimum/parkir dan total integer. | `CostConsistencyVerificationTest`, `ParkingSettlementScenarioTest` | Estimate tidak mengubah saldo. |
| FR-28 | Biaya aktual | Menyimpang dari BRD/SDD | `POST /finish`, `/interrupt` | Request `finish` menerima `energi_kwh` (`ChargingSessionController.php:342-347`); settlement memilih input klien jika tersedia (`:589-597`). | `Part3IntegrityAuditTest::test_driver_can_submit_client_chosen_energy...` | Bukti reproduksi: klien memilih 0,1 kWh pada hold Rp27.000; invoice hanya Rp2.250 walau progress simulator dihitung server. Energi aktual seharusnya berasal dari simulasi/server. |
| FR-29 | Parkir flat per sesi | ✅ Sesuai | `Tarif::costFor`, settlement | `Tarif.php:58-89`; flat ditambahkan satu kali; energi 0 tetap dikenai flat pada settlement (`ChargingSessionController.php:595-598`). | `CostConsistencyVerificationTest::test_case3_failed_zero`; `ParkingSettlementScenarioTest::test_failed_zero_energy_charges_parking` | Bukan biaya per jam. |
| FR-30 | Total biaya | ✅ Sesuai | cost helper | `Tarif.php:72-88`: total = biaya energi + parkir. | `CostConsistencyVerificationTest`, `ParkingSettlementScenarioTest` | Semua rupiah berupa integer. |
| FR-31 | Pembayaran charging via Dompet Digital | ✅ Sesuai | `ChargingSessionController::start/settleSession` | `ChargingSessionController.php:311-323,616-628` membuat payment dengan metode Dompet Digital; metode lain hanya di Top Up. | `CostConsistencyVerificationTest`, `DriverManagementTest::test_h2...` | Legacy `/wallet/topup` adalah isu Top Up, bukan metode pembayaran charging. |
| FR-32 | Cukup saldo sebelum sesi | ✅ Sesuai | estimate + start | `ChargingSessionController.php:209-217,262-283`; saldo dicek lagi di transaksi setelah wallet di-lock. | `CostConsistencyVerificationTest`, `DriverManagementTest::test_g...` | Backend, bukan hanya disabled UI. |
| FR-33 | Hold saldo | ✅ Sesuai | start | `ChargingSessionController.php:269-310`: `DB::transaction`, lock wallet, conditional claim port, tambah hold. | `CostConsistencyVerificationTest`, `ParkingSettlementScenarioTest` | Claim port dan hold berada pada transaksi yang sama. |
| FR-34 | Settlement + release hold | ⚠️ Sebagian | `settleSession` | `ChargingSessionController.php:584-660` transaksi atomik; actual cost dipotong dari saldo, hold dilepas. Actual cost dibatasi `min(hold, biaya hitung)` (`:595-600`). | `CostConsistencyVerificationTest::test_case4_actual_greater_than_hold`; `DriverManagementTest::test_h2...` | Perilaku aktual > hold terbukti dipotong maksimum sebesar hold. BRD tidak mendefinisikan siapa menanggung selisih; open requirement harus diputuskan. |
| FR-35 | Pembayaran gagal | ⚠️ Sebagian | Top Up expiration + payment status | `TopupController` menandai expiry; settlement charging mengatur Payment gagal hanya ketika status Gagal **dan** biaya aktual nol (`ChargingSessionController.php:626`). | `NotificationVerificationTest::test_d_topup_expired_notifies_driver`; `Bagian2AuditContractTest` | Charging gagal dengan energi/biaya >0 menghasilkan `status_pembayaran=Sukses`; perlu definisi apakah “Sukses” berarti settlement sukses walaupun sesi gagal. |
| FR-36 | Rekonsiliasi sesi/payment | ✅ Sesuai | settlement transaction | `ChargingSessionController.php:616-660` mengubah sesi, wallet, port, payment bersama. | `DriverManagementTest::test_h2...`; `CostConsistencyVerificationTest` | Idempotensi final dikontrol status sesi dalam lock. |
| FR-37 | Nota/invoice | ⚠️ Sebagian | `GET /payments/{id}`, `/charging-sessions/{id}/invoice` | `PaymentController.php:38-66,105-164`; payload charging ada. | `DriverPart1AuditTest::test_payment_invoice...`; `CostConsistencyVerificationTest` | Rincian/bukti belum lengkap seperti tercatat di `AUDIT_DRIVER_PART1.md`; tidak mengulang temuan. |
| FR-38 | Riwayat | ⚠️ Sebagian | `GET /payments/history` | `PaymentController.php:17-35,69-101` mengambil Payment rows. | `Bagian2AuditContractTest::test_checkout_flow_reproduces_missing_payment_history_entry` | Checkout gateway tidak membuat entry yang dibaca riwayat; temuan rinci ada di Part 2. |
| FR-42 | Notifikasi sesi | ⚠️ Sebagian | `/notifications` | `NotificationService.php:13-21`; baca row per `id_user` pada `NotificationController.php`. | `NotificationVerificationTest::test_a_session_completed...`, `test_b_session_failed...` | Isu duplicate UI/polling tercatat di Part 2; tidak dirinci ulang. |
| FR-43 | Notifikasi Top Up gagal | ⚠️ Sebagian | expiry Top Up → `notifikasi` | `TopupController.php:224-237`; hanya diciptakan ketika expiry diproses oleh request status/poll. | `NotificationVerificationTest::test_d_topup_expired...` | Scheduler tanpa request belum ada; detail Part 2. |
| FR-44 | Notifikasi gangguan | ⚠️ Sebagian | perubahan charger/port → notification service | `NotificationService.php:28-57`; penerima Admin, Operator assigned dan Driver aktif. | `NotificationVerificationTest::test_e_g_h_charger_issue_recipients_and_idempotent` | Driver yang melaporkan sendiri tidak menerima jenis FR-44 sesuai test karakterisasi Part 2. |
| FR-53 | Kode panggil station unik | ✅ Sesuai | Search station by keyword/kode | `StationController.php:30-44`; UI keyword mencakup `kode_station` (`DriverDashboard.jsx:764-766`); migrasi `2026_11_09_090000...:29` unique. | Tidak ada test unik kode khusus pada suite. | Keyword Maps mencari code; tidak ada search API khusus untuk Driver. |
| NFR-02 | Auth & otorisasi | ⚠️ Sebagian | `auth:sanctum`, `role`, assignment filter | `routes/api.php:20-151`; `EnsureAccountActive.php`; `OperatorScopeAuditTest` memeriksa scope API utama. | `OperatorScopeAuditTest`, `DriverManagementTest`, `PaymentMethodManagementTest` | Pola controller scoped kuat; bukan semua aksi mutasi diuji individual. Tamu menerima 401, role terlarang 403/404. |
| NFR-03 | Kinerja station/charging | ⚠️ Sebagian | `GET /stations` | `StationController.php:30-44` eager-load charger/port/tarif (mengurangi N+1), tetapi query `get()` seluruh station lalu hitung dan sort jarak PHP; tidak ada indeks geo atau limit bounding-box di migration. | Belum ada uji 10-user/latency; test database SQLite in-memory. | Dataset demo 9 station (`DATA_SIMULASI.md`), tetapi strategi tidak skala dan kriteria khusus user “tidak load seluruh tabel” belum terpenuhi. |
| NFR-05 | Retensi 1 jam | ❌ Tidak ada | Tidak ditemukan scheduler/cleanup | `routes/console.php` hanya mendaftarkan `inspire`; pencarian scheduler/prune/retention di `backend/app`, `routes` tidak menemukan job penghapusan transaksi/audit. | Tidak ada test rotasi data. | BRD meminta retensi audit/transaksi/cadangan satu jam; fungsi cleanup dan cadangan belum ada. |
| NFR-06 | Chrome, mobile 375px, loading/error/empty | ❓ TIDAK TERVERIFIKASI | CSS responsif dan state UI | `DESIGN_DNA.md:8` mengatur 320px dan kontrol sentuh 44px; UI mempunyai beberapa state loading/error/empty. Tidak ada browser automation dalam repo. | Tidak ada test Chrome/375px. | Tidak mengklaim UI diuji. Skenario manual ada di §8. |

### Jarak, race port, dan skenario angka

- **GPS display:** API mengembalikan `jarak_km=null` bila koordinat tidak ada (`StationController.php:109-111`); Dashboard hanya merender jarak non-null (`DriverDashboard.jsx:2053-2055`). Sesuai untuk tidak menampilkan jarak palsu.
- **Arrival Check:** konfigurasi default radius 1.000m dan aktif (`config/charging.php:4-10`); Admin mengubah nilai valid 10–5.000m (`OperationsController.php:1054-1087`); `prepare`/`start` wajib mengirim lat/lng dan backend mengukur jarak (`ChargingSessionController.php:135-153,225-235,774-790`). Namun tidak ada bukti lat/lng benar-benar berasal dari GPS asli, sehingga direct API bisa mengklaim koordinat station. Ini gap kontrol, bukan kegagalan rumus geodesik.
- **Rebutan port:** claim dengan `UPDATE ... WHERE status_port=Available` (`ChargingSessionController.php:285-289`) adalah operasi atomik, tetapi belum ada test dua request bersamaan pada MySQL. Reproduksi manual: dua Driver valid + saldo/PIN cukup mengirim `/start` serentak ke port yang sama; harapkan tepat satu 201, satunya 409, satu session dan satu hold.

| Kasus tarif | Hitung | Hasil test/implementasi | Status |
|---|---:|---|---|
| Normal 6 kWh | 6×Rp2.500 + Rp2.000 | Rp17.000; `CostConsistencyVerificationTest::test_case1_normal` | ✅ |
| Gagal 3 kWh | 3×Rp2.500 + Rp2.000 | Rp9.500; `test_case2_failed_3kwh` | ✅ |
| Gagal 0 kWh | Rp0 + Rp2.000 | Rp2.000; `test_case3_failed_zero` | ✅ |
| Hold Rp27.000, normal 6 kWh | Rp27.000 − Rp17.000 | Sisa Rp10.000 dilepas otomatis; wallet final saldo Rp83.000 dari saldo Rp100.000; `test_case1_normal` | ✅ |
| Aktual biaya melebihi hold Rp10.000 | Kalkulasi aktual lebih besar dari hold | Sistem menagih maksimum Rp10.000 (cap), tidak mencatat hutang/saldo negatif; `test_case4_actual_greater_than_hold` | ⚠️ Open requirement BRD |

Jeda: `/pause` dan `/resume` memodifikasi metadata jeda; simulasi mengecualikan durasi pause dan settlement menyelesaikan jeda yang sedang berjalan (`ChargingSessionController.php:446-555,584-605,986-1019`). UI/invoice tidak menyertakan uraian jeda; silang rujuk Part 1.

## 4. Fase 2 — Matriks Operator

| Req# | Deskripsi | Status | Endpoint/UI | Bukti | Test | Catatan |
|---|---|---|---|---|---|---|
| FR-02 | Login/logout sesuai peran | ⚠️ Sebagian | `/login`, `/logout` | `AuthController.php:99-145`, guard akun aktif global | `DriverManagementTest::test_f_token...` mencakup token Driver dinonaktifkan | Tidak ada login rate limit. |
| FR-14 | Kelola data station | ✅ Sesuai | `/operations/stations`, update station | `OperationsController.php:241-309`; Operator boleh ubah field operasional station tugasnya, Admin memiliki lintas station. | `OperatorScopeAuditTest::test_operator_id_manipulation...` | Pembuatan station hanya Admin (`createStation`, `:312+`). |
| FR-16 | Kelola status station | ✅ Sesuai | `PUT /operations/stations/{station}` | `OperationsController.php:241-300` memeriksa assignment dan menyelesaikan sesi aktif sebelum status tutup/maintenance/gangguan. | `StationAvailabilityAuditTest`, `OperatorScopeAuditTest` | Active station mensyaratkan Operator aktif assigned. |
| FR-17 | Kelola charger | ✅ Sesuai | `/operations/chargers`, `/operator/chargers` | `OperationsController.php:449-505`; API legacy Operator juga query dengan station assignment (`OperatorController.php:319-400`). | `ChargerStatusNotificationTest`; `OperatorScopeAuditTest` | Endpoint baru audit perubahan; endpoint legacy tertentu hanya mencatat perubahan status, lihat FR-56/NFR-09. |
| FR-18 | Monitoring charger | ✅ Sesuai | `/operator/dashboard`, `/operator/chargers/{id}`, `/operations/dashboard` | Dashboard query di `OperatorController.php:134-245`; operations dashboard filter `accessibleLocationIds` (`OperationsController.php:34-75`). | `MalfunctionReportTest::test_operator_report_only_returns_assigned_station_malfunctions`; `OperatorScopeAuditTest` | Data API terlingkup; UI E2E tidak diperiksa browser. |
| FR-23 | Operator menghentikan sesi | ✅ Sesuai | `POST /operator/sessions/{session}/stop` | Route `api.php:112`; stop mewajibkan alasan dan settlement mengecek assignment di `ChargingSessionController.php:375-402,565-585`. | `NotificationVerificationTest::test_c_operator_stop...`, `DriverManagementTest::test_h2...` | Termasuk sesi jeda yang masih berstatus Berlangsung; tidak ada skenario test khusus stop-during-pause. |
| FR-25 | Sesi gagal/terhenti | ✅ Sesuai | status unit + settlement | `OperatorController.php:428-499,658-738`; menyelesaikan sesi dan hold sebelum mengubah status. | `ChargerStatusNotificationTest`, `CostConsistencyVerificationTest` | Biaya aktual memakai simulasi server pada stop operator. |
| FR-26 | Tarif langsung/terjadwal, parkir flat | ⚠️ Sebagian | `/operations/stations/{id}/tarifs`, `/operator/tarif` | `TariffScheduleService.php:18-78,95-149`; periode disambungkan dan audit tercatat; query tarif sesi memilih tarif aktif berdasarkan waktu. | `ParkingTariffPersistenceTest`, `CostConsistencyVerificationTest::test_case5_tariff_snapshot` | Jadwal otomatis berlaku melalui date range, tanpa cron; test membuat schedule tetapi belum memajukan waktu dan membuktikan switch saat tepat jatuh tempo. |
| FR-39 | Laporan pendapatan | ✅ Sesuai | `/operations/reports`, `/operator/reports` | `OperationsController.php:79-235`; `OperatorController.php:773-900`; filter station dan total pembayaran sukses. | `ReportRevenueVerificationTest`, `DriverManagementTest::test_h2...` | Pembayaran charging non-zero pada sesi gagal tercatat Sukses demi settlement, sehingga masuk pendapatan. |
| FR-40 | Laporan utilisasi | ⚠️ Sebagian | report endpoint | API menghitung charger/session/energi (`OperationsController.php:174-235`; `OperatorController.php:773+`). | Tidak ada test yang membandingkan utilisasi terhadap dataset dengan kondisi aktif/gagal/jeda. | Definisi rumus utilisasi dan denominator waktu tidak tampak dinormalisasi di BRD; verifikasi angka perlu fixture. |
| FR-41 | Laporan gangguan | ✅ Sesuai | `/operator/reports`, `/operations/reports` | `OperatorController.php:175-190,773+`; `OperationsController.php:...` report joins lokasi dan error. | `MalfunctionReportTest::test_admin_report...`, `test_operator_report_only...` | Operator report membatasi charger ke location assignment; test eksplisit membuktikan station lain tidak masuk. |
| FR-44 | Notifikasi gangguan charger | ✅ Sesuai | notification service + API bell/operator | `NotificationService.php:28-57`; recipients select assigned operators. | `NotificationVerificationTest::test_e_g_h_charger_issue_recipients_and_idempotent` | Operator A menerima station tugasnya; Operator B tidak; Admin menerima. Duplikasi UI/sumber sudah dirinci Part 2. |
| FR-51 | Cari/ringkas station operasional | ⚠️ Sebagian | `/operations/dashboard`, `/operator/stations` | `OperationsController.php:34-75` memberi ringkasan; `OperatorController.php:43-54` mengembalikan seluruh penugasan. | `OperatorScopeAuditTest` | Endpoint lokasi search `operations/station-location-search` ber-guard Admin; API operator tidak menerima keyword/paginasi daftar station assignment. |
| FR-56 | Kelola charger dan port | ⚠️ Sebagian | `/operations/*` dan `/operator/*` | `OperationsController.php:401-555` validasi + audit sebelum/sesudah; `OperatorController.php:287-400,560-640` legacy store/update mengubah spesifikasi tanpa audit record untuk data teknis. | `OperatorScopeAuditTest`; tidak ada test audit legacy update port | UI Operator menggunakan API `/operator/*`; ubah `tipe_konektor`, daya, model/kode charger dapat lolos tanpa NFR-09 audit. |

### Isolasi station dan tarif

Test baru [OperatorScopeAuditTest.php](/C:/RPL_Project/Tugas/backend/tests/Feature/OperatorScopeAuditTest.php) memanipulasi ID Station B saat token Operator A aktif. Test mengecek dashboard hanya mengembalikan A; reports, station/charger/port/tarif writes ke B ditolak; read detail station/charger dan edit port/tarif B ditolak; memilih `X-Station-Id` B untuk notification ditolak. Test kedua menolak akses Operator ke Kelola Driver, Metode Bayar, audit/config, ubah akun dan penugasan sendiri. **2 test, 20 assertions lulus.** Ini bukti perwakilan kategori; belum mengirim request ke setiap endpoint dari route list secara individual.

Kode membatasi objek melalui `ensureStationAccess` dan `accessibleLocationIds` (`OperationsController.php:1446-1577`); API legacy memilih station dari relasi `station_operators` dan mem-filter ID resource sebelum update (`OperatorController.php:26-54,319-400,603-638`). Endpoint admin ada di `role:admin` (`routes/api.php:87-96`) dan juga memanggil `ensureAdmin`. Admin tidak selalu dapat memakai legacy `/operator/*` tanpa assignment karena helper mengharuskan satu station; UI Admin memakai `/operations/*` yang global.

Tarif dibekukan per sesi melalui `id_tarif` pada saat start (`ChargingSessionController.php:298-310`). Perubahan langsung menutup periode lama, sesi lama tetap berelasi pada tarif lama. Scheduled tariff disimpan sebagai rentang waktu; `activeTarif` memilih periode saat start, sehingga eksekusi tidak memerlukan cron. Validasi tarif min Rp100/kWh dan biaya flat integer nonnegatif pada kedua controller; `TariffScheduleService` membuat audit. Status sebelum/sesudah tercatat untuk `/operations/*` dan jadwal. Legacy `/operator/tarif` memanggil service yang sama.

## 5. Fase 3 — Keamanan Driver dan Operator

### Ringkasan kontrol

| Area | Hasil audit | Bukti / test |
|---|---|---|
| Hash password/PIN | Password login/register pakai `Hash::make/check`; PIN disimpan hash. | `AuthController.php:67,115`; `DompetPinController.php:87,130`; `DriverPart1AuditTest::test_pin_change_hashes_values...` |
| Rate limit / lockout | PIN punya 3 percobaan/15 menit; login tidak punya limiter. | `DompetPinController.php:23-30,343-371`; `AuthController::login` tidak memakai RateLimiter. BRD menandai login limiter sebagai isu terbuka. |
| Expiry token | Sanctum expiry 120 menit. | `backend/config/sanctum.php:45-54`; expiry produk tetap perlu diverifikasi di server produksi. |
| Pesan login / response error | Login salah generik. Registrasi menangkap exception dan mengirim `$e->getMessage()` ke client. | `AuthController.php:115-123,87-96`; response stack/detail DB pada error register berisiko bocor. |
| IDOR Driver | Vehicle, profile, wallet, payment/session invoice dan notification menggunakan `request user`/ownership filter. | `VehicleController.php:34-63`; `PaymentController.php:38-78`; `ChargingSessionController.php:72-80,565-585`; `NotificationController.php:13-43`. Test: `DriverPart1AuditTest::test_payment_invoice...`, `NotificationVerificationTest::test_h...`. |
| IDOR Operator | Shared station APIs memeriksa relasi assigned; test manipulasi ID A→B lulus. | `OperatorScopeAuditTest::test_operator_id_manipulation...`. |
| Mass assignment/role/saldo | Endpoint operator/admin mengikat role dari server; validasi field allowlist; tidak ada endpoint Driver mengubah saldo arbitrary pada `DriverManagementTest::test_k...`. | `OperationsController.php:622-680,763-811`; test tersebut mencoba URL saldo/hold/PIN yang tidak ada. |
| Nilai uang/integritas saldo | Rupiah disimpan integer; settlement/Top Up transactional dan lock; dua bypass ditemukan: legacy topup dan input energi. | `Dompet.php:33-49`, `TopupController.php:137-165`, `ChargingSessionController.php:584-660`; test reproduksi baru di bawah. |
| SQL injection | Query builder/Eloquent dan parameter binding; `whereRaw` pada nama metode memakai placeholder. Tidak ditemukan concatenation request ke raw SQL/order-by. | `OperationsController.php:111-120` dan query search pada method listing; review statis. |
| Stored XSS | React text binding umumnya escaped. Tidak ditemukan `dangerouslySetInnerHTML`; `main.jsx:13` memasukkan stack/error ke `root.innerHTML` mentah. Map popup HTML yang menginterpolasi data station sudah dicatat sebagai temuan lama pada Part 2. | `main.jsx:11-13`; tidak ada test browser XSS. |
| Secret/.env | `backend/.env` di-ignore dan tidak tracked. Ada token-shaped literal debug di `frontend/src/main.jsx:7-9` dan password demo bersama di `UserSeeder.php`/`DATA_SIMULASI.md`; apakah token masih valid tidak dapat ditentukan dari repo. | `git check-ignore backend/.env`; `git ls-files backend/.env` kosong; redaksi token tidak disalin ke laporan. Rotasi token bila pernah aktif. |
| CORS / APP_DEBUG | Default CORS membatasi localhost Vite; config app debug default false. `.env.example` menetapkan `APP_DEBUG=true`, sehingga menyalin sample ke server bisa salah konfigurasi. | `backend/config/cors.php:20-26`, `backend/config/app.php:42`, `backend/.env.example:4`; production `.env` tidak dibaca/dipublikasikan. |
| Dependency audit | Composer: 11 advisories/7 packages, 1 High, 0 Critical; npm: 0/207, 0 High/Critical. | `composer audit --locked --format=json`; `npm audit --json`, 17 Nov 2026. High: `league/commonmark` GFM table scan advisory. Keterpaparan runtime belum dinilai lebih jauh; cek dependency graph/update terencana. |

### Matriks Otorisasi

401 = tanpa token; 403 = peran/assignment tidak diizinkan; 404 dipakai pada sebagian resource ownership untuk menyamarkan keberadaan ID. “Operator sendiri/lain” merujuk station yang ditugaskan/tidak ditugaskan. Untuk endpoint generic auth, role Operator/Admin dapat melewati middleware, tetapi data tetap dibatasi user bila resource pribadi.

| Endpoint | Method | Tanpa token | Driver | Operator station sendiri | Operator station lain | Admin |
|---|---|---:|---:|---:|---:|---:|
| `/api/register`, `/api/login` | POST | ✅ publik | ✅ (registrasi selalu role Driver) | ✅ publik | ✅ publik | ✅ publik |
| `/api/logout` | POST | 401 | ✅ own token revoke | ✅ own token revoke | ✅ own token revoke | ✅ own token revoke |
| `/api/driver/profile` | GET, PUT | 401 | ✅ profil sendiri | ⚠️ generic auth mengakses profil akun sendiri | ⚠️ generic auth mengakses profil akun sendiri | ⚠️ generic auth mengakses profil akun sendiri |
| `/api/vehicles[/{id}]` | GET, POST, PUT, DELETE | 401 | ✅ kendaraan sendiri | ⚠️ bisa CRUD kendaraan milik sendiri | ⚠️ bisa CRUD kendaraan milik sendiri | ⚠️ bisa CRUD kendaraan milik sendiri |
| `/api/stations[/{id}]` | GET | 401 | ✅ seluruh station publik yang login bisa lihat | ✅ list/show difilter station assigned | 404 bila station bukan tugas | ✅ global |
| `/api/wallet/*` | GET/POST/PUT/DELETE | 401 | ✅ wallet user sendiri | ⚠️ wallet user sendiri; legacy instant topup tersedia | ⚠️ sama | ⚠️ sama |
| `/api/payments/history`, `/api/payments/{payment}` | GET | 401 | ✅ milik user; foreign 404 | ✅ hanya milik user (umumnya kosong) | ✅ hanya milik user (umumnya kosong) | ✅ hanya milik user (umumnya kosong) |
| `/api/notifications*` | GET/PUT | 401 | ✅ row user sendiri | ✅ row user sendiri | ✅ row user sendiri | ✅ row user sendiri |
| `/api/charging-sessions/history|active|validate|prepare|estimate|start` | GET/POST | 401 | ✅ validasi vehicle/wallet owner | ⚠️ route generic; hanya sumber data milik akun sendiri | ⚠️ sama | ⚠️ sama |
| `/api/charging-sessions/{id}/invoice|finish|stop|interrupt|pause|resume` | GET/POST | 401 | ✅ own session; foreign 404 | 404 foreign user session | 404 foreign user session | ✅ Admin untuk akses sesuai guard settlement |
| `/api/topup/*` checkout | GET/POST | 401 | ✅ milik wallet pemanggil; foreign ref 404 | ⚠️ route generic auth, topup wallet akun sendiri | ⚠️ sama | ⚠️ sama |
| `/api/operations/dashboard`, `/reports` | GET | 401 | 403 | ✅ data assigned; memilih station lain 403 | 403/filtered | ✅ lintas station |
| `/api/operations/stations/{id}`, `/chargers/{id}`, `/ports/{id}` | PUT; create via POST | 401 | 403 | ✅ assigned | 403 | ✅ global, beberapa perubahan data master Admin-only |
| `/api/operations/stations/{id}/tarifs`, `/tarifs/{id}` | POST/PUT/DELETE | 401 | 403 | ✅ assigned | 403/404 | ✅ global |
| `/api/operator/stations`, `/dashboard`, `/reports`, `/chargers`, `/ports`, `/notifications` | GET | 401 | 403 | ✅ scoped via `station_operators` | 403 bila `X-Station-Id` silang | ⚠️ group membolehkan role, tetapi endpoint yang memerlukan assignment akan 403 bila Admin tidak ditugaskan |
| `/api/operator/chargers/*`, `/ports/*`, `/tarif/*`, malfunction actions | GET/POST/PUT/DELETE | 401 | 403 | ✅ assignment/resource scope | 404/403 | ⚠️ admin middleware lolos tetapi butuh assignment pada controller legacy |
| `/api/operator/sessions/{id}/stop` | POST | 401 | 403 | ✅ only station assignment + alasan | 404 foreign station | ✅ jika Admin memiliki assignment (tanpa assignment 404) |
| `/api/operations/operators*`, `/operations/drivers*`, `/payment-methods*`, `/config`, `/audit-logs` | GET/POST/PUT | 401 | 403 | 403 | 403 | ✅ |

Catatan: generik `auth:sanctum` pada profile/vehicles/charging memungkinkan role Operator/Admin memanggil fitur Driver untuk akun miliknya sendiri. Itu bukan IDOR lintas pengguna, tetapi batas aktor API tidak sepenuhnya mengikuti pemisahan UI. Bila peran akun seharusnya tidak menggunakan fitur Driver, tambahkan middleware `role:driver`.

## 6. Fase 4 — Kesesuaian SDD

**Tidak dapat dilakukan: SDD dan diagram desain tidak ditemukan.** Tidak ada klaim endpoint/schema/status “berbeda dari SDD” karena tidak ada baseline SDD untuk pembanding. File `PRD_TEMPLATE.md`, `DESIGN_DNA.md`, dan `DATA_SIMULASI.md` dipakai sebatas requirement pendukung sebagaimana Fase 0.

## 7. Fase 5 — Temuan lain, prioritas, dan konflik dokumen

### Temuan baru (tidak mengulang delapan isu yang diketahui)

| ID / severity | Akar masalah + bukti | Dampak / status | Usulan patch dan effort |
|---|---|---|---|
| H1 High | `DompetPinController::topUp` (`:183-249`) adalah route `/api/wallet/topup` terpisah, membuat Payment sukses lalu `$wallet->saldo += nominal`; tidak mengecek `PAYMENT_SIMULATION` atau status gateway. | User token dapat melewati checkout simulasi dan menambah saldo langsung. Terbukti `Part3IntegrityAuditTest::test_legacy_wallet_topup_credits_balance_without_simulated_checkout`. | Nonaktifkan endpoint lama atau ubah agar membuat checkout pending yang hanya settle via gateway; test flag off, tidak ada credit sebelum simulasi. **S** |
| H2 High | `finish` memvalidasi `energi_kwh` dari body dan `settleSession` mengutamakan nilai payload (`ChargingSessionController.php:342-347,589-597`). | Driver bisa mengakhiri sesi dengan energi kecil dan tagihan rendah; test baru menghasilkan 0,1kWh/Rp2.250 dari hold Rp27.000. | Jangan menerima energi aktual dari Driver; hitung dari simulator/server pada `finish/interrupt`; bila test operator perlu input aktual, lindungi endpoint khusus Admin/Operator dan audit. **M** |
| H3 High dependency | `composer audit --locked`: advisori High pada `league/commonmark` (versi terdampak sampai 2.10.1), bagian dari 11 advisori/7 paket. | Risiko DoS pada parsing GFM jika fungsi parser digunakan dengan input bermusuhan; graph pemakaian belum diverifikasi. | Periksa `composer show --tree`, upgrade ke versi aman dan jalankan regression. **S/M** |
| M1 Medium | Arrival Check memakai koordinat request sebagai kebenaran (`prepare/start` payload; `ensureArrived`). | Direct caller dapat mengganti koordinat ke lokasi station; GPS valid dari browser tidak membuktikan koordinat ke server. | Dokumentasikan sebagai mitigasi demo saja atau pindahkan validasi ke klien native/attestation yang punya sumber tepercaya; tes API koordinat spoof. **M/L** |
| M2 Medium | Login tidak memakai RateLimiter; BRD sendiri mencatat login lockout belum terimplementasi (`AuthController.php:99-145`). | Percobaan password otomatis tanpa batas aplikasi. | Rate limit per IP + identitas, respons tetap generik, test batas/expiry. **S** |
| M3 Medium | Tidak ada cleanup/retention schedule; `routes/console.php` hanya `inspire`. | NFR-05 retensi satu jam tidak dipenuhi; pertumbuhan audit/transaksi tidak dibatasi. | Definisikan retensi per tipe data, command/job terjadwal dan test umur data; backup perlu mekanisme terpisah. **M** |
| M4 Medium | `/api/stations` eager-loads relasi tapi `get()` semua station, hitung dan urut jarak di PHP (`StationController.php:30-44`). Indeks geo tidak ada. | Sesuai demo 9 station, belum sesuai prinsip query terdekat tanpa muat semua tabel/NFR perf pada pertumbuhan data. | Bounding box/spatial index atau query bounding radius; paginate/filter; uji 10 pengguna dengan dataset realistis. **M/L** |
| M5 Medium | UI Operator lama memanggil `/api/operator/*`; store/update port/charger mengubah data teknis tanpa AuditLog, sementara endpoint `/api/operations/*` baru mewajibkan alasan/audit. | Jejak perubahan teknis Operator hilang pada jalur UI yang dipakai (`OperatorController.php:287-400,560-638`). | Migrasikan UI ke route audit-capable atau tambahkan audit/reason pada controller lama; test nilai before/after + aktor. **M** |
| M6 Medium | `main.jsx:11-13` memasukkan `e.error.stack`/`e.message` ke `root.innerHTML`. | Error string yang memuat markup dapat dirender sebagai HTML; bertentangan dengan kewajiban server text ditampilkan sebagai text. Token debug di baris 7-9 juga berupa secret-shaped literal (validitas tidak terverifikasi). | Ganti `innerHTML` ke elemen React/textContent dan hapus/rotasi token debug. **S** |
| L1 Low | `backend/app/Models/Refund.php` masih ada walau migrasi `2026_11_11_000001...:26` menghapus tabel `refund`; migration `down()` menghidupkannya kembali. | Model yatim bisa menyebabkan query gagal bila dipakai; tidak ada route/API refund. | Hapus class model setelah konfirmasi history/rollback yang dibutuhkan. **S** |
| L2 Low | `.env.example` memiliki `APP_DEBUG=true`; `DATA_SIMULASI.md` dan seed memakai akun/password demo bersama. | Salah menyalin konfigurasi/seed ke environment selain demo membuka debug atau kredensial umum. `.env` sendiri ignored/tidak tracked. | Ganti sample `APP_DEBUG=false`; blokir seed demo di production; rotasi token debug jika valid. **S** |

### Angka/status bisnis dan isu data

- Rupiah: `Tarif` dan wallet memakai integer casts; `costFor()` membulatkan nilai energi ke dua desimal dan rupiah ke integer (`Tarif.php:62-89`). Test tiga angka utama lulus (lihat §3). Aktualitas energi masih bisa di-override client, dan over-hold dicap; dua keputusan bisnis jangan dicampur.
- Tidak ada route booking/antrian/refund manual pada `routes/api.php`; pembayaran charging terikat Dompet Digital. Tabel/model Refund yang tersisa adalah artefak lama, bukan alur refund aktif. Pencarian source tidak menemukan `biaya_parkir_jam`.
- Status `Maintenance`, `Offline`, `Out of Order`, `Gangguan`, `Penuh` masih memakai enum yang berbeda per tabel; beberapa mapping/status station telah dibahas Part 1/2 dan tidak dirinci kembali.
- `id_user` tetap string/char di model dan schema; tidak ditemukan cast seluruh `id_user` ke integer. `OperationsController.php:1587` meng-cast hanya suffix numerik dari ID untuk membuat nomor urut, bukan mengubah ID akun menjadi angka. Cast `id_location`, `id_port`, dan `id_vehicle` numerik adalah PK tabel masing-masing.
- SQL search menggunakan query builder/parameter binding. Tidak ada raw sort column dari request dalam endpoint yang diperiksa.

### Konflik/ketidaklengkapan dokumen dan teks usulan

| Konflik | Bukti | Usulan teks/perbaikan dokumen |
|---|---|---|
| PRD 7.1 menempatkan PIN/kendaraan sebelum akun masuk; implementasi register hanya akun/profil/dompet dan PIN/kendaraan dikerjakan setelah login. | `PRD_TEMPLATE.md:70-79`; `AuthController.php:49-80`; `VehicleController.php`. | Putuskan apakah requirement adalah onboarding bertahap atau satu wizard. Teks: “Setelah registrasi berhasil, Driver diarahkan menyelesaikan PIN dan minimal satu kendaraan sebelum memulai sesi.” |
| Nomor NFR02 berbeda antara brief kerja (info station offline) dan BRD (auth/otorisasi). | BRD §5.2 NFR-02; brief bersama audit menyebut NFR02 station visibility. | Samakan ID NFR; jadikan visibilitas station requirement terpisah agar traceability test jelas. |
| PRD template menyebut target UI 320px; permintaan audit menetapkan 375px; BRD NFR-06 menetapkan Chrome tanpa lebar viewport. | `DESIGN_DNA.md:...` (min 320px), BRD NFR-06. | Nyatakan minimum 375px untuk acceptance demo Chrome jika itu target dosen; tetap pertahankan checklist 320px DNA sebagai target lebih luas. |
| BRD adalah draf; approvals, tanggal/versi final masih placeholder; prioritas disebut sementara. | `BRD_EV_Charge_HUB.docx`, §§1-2, §5. | Lengkapi baseline/approval dan beri keputusan eksplisit untuk over-hold, login throttle, retensi serta aktor fitur onboarding. |
| Dokumen terkait menyebut SDD, Use Case, DFD, ERD dan Test Plan sebagai MUST/SHOULD, tetapi file tak ditemukan. | BRD §6.3; PRD §12 backlog; pemindaian repo. | Tambahkan artefak yang disetujui ke `docs/` atau ubah status backlog; jangan gunakan template sebagai dokumen desain selesai. |

## 8. Test baru, status git, dan skenario manual

### Test baru pada audit ini

| File/test | Bukti yang dikunci | Hasil |
|---|---|---|
| `Part3IntegrityAuditTest::test_legacy_wallet_topup_credits_balance_without_simulated_checkout` | Reproduksi kredit langsung legacy wallet topup | Lulus, mereproduksi perilaku saat ini |
| `Part3IntegrityAuditTest::test_driver_can_submit_client_chosen_energy_to_understate_settlement` | Reproduksi payload energi 0,1kWh dan biaya Rp2.250 dari hold Rp27.000 | Lulus, mereproduksi perilaku saat ini |
| `OperatorScopeAuditTest::test_operator_id_manipulation_cannot_read_or_change_other_station_resources` | Manipulasi ID station/resource pada sejumlah route read/write | Lulus, 14 assertion pada scope |
| `OperatorScopeAuditTest::test_operator_cannot_manage_admin_accounts_configuration_or_audit` | Pemisahan route Admin dan larangan self-assignment | Lulus, 6 assertion |

Test tambahan berasal dari Part 1/2, bukan diubah: `DriverPart1AuditTest.php`, `Bagian2AuditContractTest.php`, `StationAvailabilityAuditTest.php`. Suite akhir **77/77 lulus, 752 assertions**.

### Status repository

Snapshot akhir di bawah tetap memuat untracked report/test yang sudah ada sebelum Bagian 3; file lama itu tidak diubah. File baru Bagian 3 hanya laporan dan dua test. Tidak ada perubahan aplikasi.

```text
git status --short
?? CatatanHasilPrompt/AUDIT_DRIVER_CURRENT_REPORT.md       (sudah ada sebelum audit ini)
?? CatatanHasilPrompt/AUDIT_DRIVER_PART1.md                (sudah ada sebelum audit ini)
?? CatatanHasilPrompt/AUDIT_DRIVER_PART2.md                (sudah ada sebelum audit ini)
?? CatatanHasilPrompt/AUDIT_EVC_2026-11-17_REPORT.md       (sudah ada sebelum audit ini)
?? CatatanHasilPrompt/AUDIT_DRIVER_OPERATOR_BRD_SDD.md     (baru)
?? backend/tests/Feature/Bagian2AuditContractTest.php      (sudah ada sebelum audit ini)
?? backend/tests/Feature/DriverPart1AuditTest.php          (sudah ada sebelum audit ini)
?? backend/tests/Feature/OperatorScopeAuditTest.php        (baru)
?? backend/tests/Feature/Part3IntegrityAuditTest.php       (baru)
?? backend/tests/Feature/StationAvailabilityAuditTest.php  (sudah ada sebelum audit ini)

git diff --stat
(kosong; perubahan test/laporan berstatus untracked sehingga tidak muncul pada diff biasa)
```

### ❓ TIDAK TERVERIFIKASI dan skenario manual

1. **Chrome/mobile 375px:** buka login, register, dashboard, Maps, pilih port, sesi aktif/jeda, Top Up error/sukses, dan laporan Operator pada Chrome lebar 375px; cek scroll horizontal, target sentuh 44px, loading/error/empty, tombol disabled dan error API.
2. **GPS:** cabut izin lokasi / matikan GPS; pastikan station tetap muncul tanpa jarak dan ada retry. Uji start dalam radius dan luar radius; kemudian kirim payload koordinat station dari luar lokasi untuk mendemonstrasikan batas spoof API.
3. **MySQL race:** dua Driver melakukan `/start` serentak pada satu port; periksa satu sukses, satu conflict, satu sesi, hold sesuai satu transaksi. SQLite test tidak membuktikan `SELECT/UPDATE ... FOR UPDATE` MySQL.
4. **Checkout E2E:** browser dari pilih metode sampai simulate payment, retry error jaringan, expiry, double-click, saldo/history/notifikasi; test feature bukan browser E2E. Gejala tampilan/polling runtime hanya dapat dinilai di server demo.
5. **Konfigurasi Admin:** ubah Arrival Check radius, reload worker/config-cache, lalu pastikan `/charging-settings` dan server validator menggunakan nilai baru; jangan menguji di DB dev dengan perubahan permanen.
6. **Retensi/backup:** tentukan data uji lama dan baru, jalankan scheduler yang kelak disepakati, buktikan audit/transaksi lebih lama satu jam dirotasi tanpa menghapus sesi/rekonsiliasi yang masih dibutuhkan.
7. **Token debug:** pastikan token literal `?debug` tidak dapat digunakan pada backend aktif; bila token pernah nyata, cabut token dan audit pemakaian tanpa menyalin nilainya ke log/laporan.

Database development tidak ditulis selama audit. `composer audit`/`npm audit` butuh network; setelah akses diizinkan hasilnya didapat. Tidak ada browser UI yang diklaim sudah diuji.

## 9. Perbaikan terurut prioritas

| Prioritas | File | Effort | Dependensi |
|---|---|---|---|
| P0 — Tutup top-up langsung | `backend/routes/api.php`, `DompetPinController.php` | S | Putuskan hapus legacy endpoint atau routing ke checkout; tidak bergantung perubahan UI. |
| P0 — Energi hanya dari server | `ChargingSessionController.php`, test settlement | M | Putuskan jalur khusus operator untuk memasukkan pembacaan aktual jika diperlukan. |
| P1 — Rotasi/isolasi token debug + raw HTML | `frontend/src/main.jsx`, environment/token | S | Cek validitas token di environment aman dan cabut jika masih aktif. |
| P1 — Upgrade Composer advisories | `backend/composer.json`, `composer.lock` | S/M | Periksa dependency tree dan kompatibilitas Laravel/CommonMark; jalankan suite/build. |
| P1 — Login rate limiting | `AuthController.php`, limiter config/tests | S | Tetapkan batas per IP/email dan jangka waktu. |
| P1 — Retensi satu jam | `routes/console.php`, command/service, schema audit | M | Tentukan retensi tiap tabel, cadangan dan scheduler environment. |
| P2 — Audit trail jalur Operator aktif | `OperatorController.php`, `OpsDashboard.jsx`, tests | M | Migrasi UI ke endpoint baru atau seragamkan endpoint/audit. |
| P2 — Validasi race di MySQL | `ChargingSessionController.php`, MySQL CI/feature test | M | DB test MySQL concurrency; SQLite tidak cukup. |
| P2 — Query station dekat | `StationController.php`, migration index, frontend pagination | M/L | Tentukan batas radius/urutan dan target kinerja demo. |
| P3 — Traceability docs + aktor onboarding | `docs/BRD_EV_Charge_HUB.docx`, `docs/PRD_TEMPLATE.md`, SDD/ERD/DFD | M | Keputusan dosen/PO; SDD saat ini tidak tersedia. |
| P3 — Retire orphan Refund model | `backend/app/Models/Refund.php` | S | Pastikan migration rollback tidak lagi perlu model/table tersebut. |

**Pertanyaan keputusan:** apakah saya lanjut memperbaiki dua temuan P0 (wallet top-up bypass dan energi aktual dari payload klien) terlebih dahulu? Untuk kasus biaya aktual yang melebihi hold, BRD juga perlu keputusan apakah biaya dicap sebesar hold atau saldo boleh menjadi piutang.
