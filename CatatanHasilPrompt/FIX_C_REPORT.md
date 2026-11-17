# FIX C — Form, Validasi, PIN, Port, Nota

## Ringkasan

Fase C menerapkan C1–C5 pada frontend dan backend. Suite Laravel awal fase (sebelum perubahan C1) lulus: 100 test / 915 assertion. Suite akhir lulus: 106 test / 1.067 assertion. Seluruh suite Node akhir lulus 18/18; `npm run build` lulus (147 modul). Browser tidak dijalankan.

## C1 — Autofill dan pemisahan akun

- `frontend/src/Login.jsx`, `Welcome.jsx`, `Registrasi.jsx`: autocomplete sesuai jenis isian; placeholder registrasi tidak lagi memakai domain Admin/Operator.
- `frontend/src/api/auth.js`, `app.jsx`: login dan logout membersihkan storage/state yang berisi identitas, station, kendaraan, dan konteks sesi user; preferensi `ev_hide_saldo` dipertahankan.
- Tes baru `frontend/tests/auth-storage.test.mjs`: atribut autofill serta isolasi storage login/logout, 2/2 lulus.
- Skenario manual: login sebagai Admin, logout, login sebagai Driver; pastikan halaman Driver tidak memakai pilihan station/kendaraan maupun cache identitas Admin.

## C2 — Telepon 8–15 digit

- Validator backend diseragamkan di `backend/app/Http/Controllers/AuthController.php`, `UpdateProfileDriverRequest.php`, `Api/OperationsController.php`, dan `Api/OperatorController.php`: `^[0-9]{8,15}$` dengan pesan “Nomor telepon 8 sampai 15 digit angka”.
- Util `frontend/src/utils/phone.js` dipakai form Registrasi, Driver, Admin Operator, dan profil Operator. Input/paste dinormalisasi menjadi digit dengan batas 15.
- `backend/tests/Feature/DriverPart1AuditTest.php` diperluas untuk registrasi, profil Driver, create/edit Operator dari Admin, dan profil Operator. Menguji batas 7/8/15/16 digit, karakter huruf, spasi/tanda, dan kosong sesuai aturan endpoint. `frontend/tests/phone-validation.test.mjs` menambah tes helper/form.
- Pemeriksaan seed: 16 nomor di `UserSeeder`, 0 melanggar; kolom yang ada `VARCHAR(15)`, tidak ada migrasi data.
- Hasil: termasuk dalam suite akhir 106/1.067; Node 18/18.

## C3 — PIN Keamanan

- `backend/app/Http/Controllers/Api/DompetPinController.php`: PIN enam digit berulang/urutan naik-turun ditolak pada buat/ubah/reset; PIN lama salah memakai pesan generik; lockout tiga percobaan/15 menit dipertahankan; audit log hanya berisi aksi, aktor, waktu, dan metadata boolean, bukan PIN/hash.
- `frontend/src/PinSecuritySettings.jsx`, `DriverDashboard.jsx`, `driverDashboardEV.css`: bagian Keamanan dengan tombol Buat/Ubah PIN, tampil/sembunyi per field, pesan error field, aturan PIN lemah, dan autocomplete yang ditetapkan.
- `backend/tests/Feature/DriverPart1AuditTest.php`: tes PIN lemah, PIN lama salah, lockout, token/ownership, kebocoran respons/log/audit. `frontend/tests/pin-security.test.mjs` menguji util dan kontrak tampilan.
- Dua tes waktu jeda di `ChargingPauseIntegrityTest.php` menggunakan waktu tes deterministik (`travelTo`) agar tidak bergantung pada jeda eksekusi suite.
- Hasil: suite akhir lulus 106/1.067; Node 18/18.

## C4 — Label port/status

- `frontend/src/utils/stationStatus.js` dan `api/station.js`: satu pemetaan status charger/port dalam Bahasa Indonesia, termasuk `Out of Order` → Gangguan dan status tak dikenal → netral. Dashboard, detail, pemilihan sesi, dan kartu sesi memakai helper bersama.
- `StationDetail.jsx` menampilkan informasi charger dan port dari field API yang tersedia: kode, daya, jumlah port, nomor port, konektor, AC/DC tersimpan, status, tarif, dan kecocokan kendaraan. Ringkasan memakai “X dari Y port tersedia”. Tidak ditambahkan spesifikasi yang tidak bersumber dari data.
- Backend `StationController.php` menambah alias jumlah port tanpa menghapus field kontrak lama, serta tarif pada port; `ChargingSessionController.php` menambah status port. `OperatorController.php` membatasi `tipe_charging` baru ke AC/DC.
- Tes dibalik/diperluas: `StationAvailabilityAuditTest` menegaskan kontrak jumlah port/status; `OperatorScopeAuditTest` menguji nilai AC/DC; `ChargingPauseIntegrityTest` memastikan field monitoring lama tetap tersedia. Node test station memvalidasi label dan pemakaian antar layar.
- Hasil: suite akhir lulus 106/1.067; Node 18/18; build lulus.

## C5 — Riwayat dan nota transaksi

- `backend/app/Http/Controllers/Api/PaymentController.php`: nota Top Up menyertakan nominal, snapshot biaya layanan, total dibayar, metode, referensi, waktu, status Top Up/pembayaran. Nota charging mencantumkan status sesi terjemahan, tarif snapshot, rincian energi/parkir flat, total, hold, pengembalian, sumber Dompet Digital, dan total jeda. Status riwayat charging mengikuti hasil sesi (`Gagal`/`Terhenti`), bukan status payment yang dapat sukses setelah settlement.
- `backend/app/Http/Controllers/Api/ChargingSessionController.php`: invoice sesi menyertakan sumber Dompet Digital dan rincian jeda; status `Dibatalkan` ditampilkan sebagai `Terhenti`.
- `frontend/src/DriverDashboard.jsx`: badge memakai `sessionStatusTone`, nota menampilkan nominal/fee Top Up dan keterangan jeda, tombol keyboard-accessible “Salin ID transaksi”, serta ringkasan riwayat tanpa kata “tabel”.
- `Bagian2AuditContractTest::test_checkout_flow_creates_owned_payment_history_entry` membuktikan Top Up dengan nominal 20.000 + fee 350 = total dibayar 20.350; saldo tetap naik 20.000. `DriverPart1AuditTest::test_payment_invoice_is_private_and_requires_authentication` membuktikan nota Top Up milik sendiri, Driver lain 404, tanpa token 401.
- `ParkingSettlementScenarioTest::test_normal_scenario` membuktikan charging 6 kWh = 15.000 energi + 2.000 parkir = 17.000; `test_failed_zero_energy_charges_parking` membuktikan 0 kWh gagal tetap 2.000 parkir. `ChargingPauseIntegrityTest::test_three_kwh_pause_two_minutes_three_kwh_settles_as_six_kwh` membuktikan 120 detik jeda tercatat dan tidak masuk energi, total 17.000.
- `DriverManagementTest::test_h2_deactivation_settlement_matches_invoice_payment_history_and_revenue_report` tetap membandingkan total invoice, riwayat, payment, dan laporan pendapatan: 27.000 untuk skenario 10 kWh + parkir.
- Tes terpilih C5: 46/46, 709 assertion. Suite akhir: 106/106, 1.067 assertion.

## Tes dibalik/diperluas

Tidak ada test karakterisasi salah yang dihapus. `DriverPart1AuditTest`, `StationAvailabilityAuditTest`, `OperatorScopeAuditTest`, dan test settlement jeda diperluas agar mengunci perilaku sesuai keputusan; test Top Up checkout yang sebelumnya gagal historinya kini menuntut satu nota/payment dan rincian fee. Test jeda deterministik menstabilkan waktu eksekusi tanpa mengubah perilaku aplikasi.

## Lint, build, dan hal yang belum terverifikasi

- `node --test tests/*.test.mjs`: 18/18 lulus; `npm run build`: lulus.
- ESLint `DriverDashboard.jsx` masih mengeluarkan 16 error dan 4 warning pada area lain yang sudah ada (unused imports/state, urutan deklarasi hook, callback/ref, dan `FiAlertTriangle` undefined). Error lint ini tidak berasal dari markup C5; file tidak dapat dinyatakan lint bersih.
- ❓ TIDAK TERVERIFIKASI: tampilan nota, badge merah, dan aksi salin belum diperiksa di browser/perangkat. Skenario manual: buka transaksi sukses, gagal 0 kWh, sesi pernah dijeda, serta Top Up dengan fee; verifikasi status/angka dan salin ID menggunakan mouse serta keyboard. Cek layout mobile dan print/PDF.
- Tidak ada operasi tulis pada DB development; feature tests memakai konfigurasi SQLite in-memory.

## Perubahan desain

Tidak ada keputusan baru yang diperlukan. Status sesi diutamakan untuk label charging sementara `status_pembayaran` tetap disediakan terpisah. Top Up menampilkan total yang dibayar termasuk fee snapshot; saldo tetap bertambah hanya nominal. Rumus biaya/hold tidak diubah.

## Verifikasi akhir

- Laravel: 106 test, 1.067 assertion, lulus.
- Frontend Node: 18/18 lulus; Vite build lulus.
- `git status` dan `git diff --stat` dicatat pada ringkasan akhir sesi.
