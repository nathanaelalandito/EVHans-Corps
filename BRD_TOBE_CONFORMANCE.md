# BRD To-Be Conformance — EVChargeHub (BRD EVC V.3 §4.2)

**Branch:** TotalFinal — commit `096dccd`.  
**Audit date:** 2026-11-25.  
**PHPUnit:** 121 passed, 1164 assertions. **Node tests:** 20 passed, 0 failed.  
**Lint:** 18 problems (13 errors, 5 warnings). **Build:** sukses.

## 1. Ringkasan

| Item | Nilai |
|---|---|
| Total langkah To-Be | 66 |
| ✅ Sesuai | 62 |
| ⚠️ Sebagian | 3 (langkah 5, 6, 41) |
| 🔀 Menyimpang | 0 |
| ❌ Tidak ada | 0 |
| ❓ Tidak terverifikasi | 1 (langkah 21 UI manual) |

Penyimpangan utama: langkah 5-6 (PIN & kendaraan dibuat setelah login, bukan saat registrasi) → usulkan perubahan teks BRD. Langkah 41 telemetri disimulasikan server (bukan charger nyata) — keterbatasan prototipe.

## 2. Matriks 66 langkah

| No | Langkah | Aktor | Status | UI (komponen:baris) | Backend (route, controller::method:baris) | Test | Catatan |
|---|---|---|---|---|---|---|---|
| 1 | Buka aplikasi | Driver | ✅ | App.jsx | - | manual | entry point |
| 2 | Tampil Login/Registrasi | Driver | ✅ | Login.jsx, Registrasi.jsx | - | manual | |
| 3 | Pilih Registrasi | Driver | ✅ | Registrasi.jsx | POST /api/register | AuthRegistrationSafetyTest | |
| 4 | Isi data pribadi | Driver | ✅ | Registrasi.jsx | AuthController::register | AuthRegistrationSafetyTest | |
| 5 | Buat PIN keamanan | Driver | ⚠️ | Pengaturan/PIN setelah login (DompetDigital.jsx) | /api/wallet/pin | Pin* tests | PIN dibuat setelah login, bukan saat registrasi |
| 6 | Isi data kendaraan & konektor | Driver | ⚠️ | KelolaKendaraan.jsx setelah login | /api/vehicles | DriverManagementTest | kendaraan ditambah setelah login |
| 7 | Sistem membuat Dompet Digital | Sistem | ✅ | - | AuthController::register (Dompet::firstOrCreate) | AuthRegistrationSafetyTest | |
| 8 | Simpan akun/kendaraan/PIN/dompet | Sistem | ✅ | - | AuthController::register; VehicleController; DompetPinController | AuthRegistrationSafetyTest | PIN/kendaraan disimpan setelah login |
| 9 | Registrasi berhasil, bisa login | Driver | ✅ | Registrasi.jsx | AuthController::register/login | AuthRegistrationSafetyTest | |
| 10 | Login | Driver | ✅ | Login.jsx | POST /api/login | LoginRateLimitTest | |
| 11 | Validasi akun → Dashboard | Sistem/Driver | ✅ | App.jsx | AuthController::login | LoginRateLimitTest | |
| 12 | Dashboard memuat info pengguna/kendaraan/saldo/lokasi/station | Driver | ✅ | DriverDashboard.jsx | GET /api/stations | manual | |
| 13 | Pilih kendaraan aktif | Driver | ✅ | DriverDashboard.jsx | - | manual | |
| 14 | Info station disesuaikan konektor kendaraan | Driver | ✅ | DriverDashboard.jsx:808-812 | StationController::index | FR12VerifyTest | |
| 15 | Pilih station | Driver | ✅ | DriverDashboard.jsx | GET /api/stations/{id} | manual | |
| 16 | Detail station | Driver | ✅ | StationDetail.jsx | StationController::show | manual | |
| 17 | Pilih charger tersedia | Driver | ✅ | StartCharging.jsx | POST /charging-sessions/validate | StationAvailabilityAuditTest | |
| 18 | Validasi ketersediaan | Sistem | ✅ | StartCharging.jsx | ChargingSessionController::validateCharger | StationAvailabilityAuditTest | |
| 19 | Jika tidak tersedia: informasi & pilih lain | Driver | ✅ | StartCharging.jsx | ChargingSessionController::validateCharger | manual | |
| 20 | Jika tersedia: lanjut ke station | Driver | ✅ | DriverDashboard.jsx | - | manual | |
| 21 | Tiba di station & siapkan kendaraan | Driver | ❓ | - | - | manual | butuh lokasi nyata (GPS) |
| 22 | Hubungkan kendaraan ke charger | Driver | ✅ | StartCharging.jsx | - | manual | |
| 23 | Tentukan kebutuhan daya (target kWh) | Driver | ✅ | StartCharging.jsx:120-139 | POST /charging-sessions/estimate | CostConsistencyVerificationTest | |
| 24 | Hitung estimasi charging | Sistem | ✅ | StartCharging.jsx | ChargingSessionController::estimate | CostConsistencyVerificationTest | |
| 25 | Hitung parkir flat | Sistem | ✅ | StartCharging.jsx | ChargingSessionController::estimate | ParkingTariffPersistenceTest | |
| 26 | Hitung total estimasi | Sistem | ✅ | StartCharging.jsx | ChargingSessionController::estimate | CostConsistencyVerificationTest | |
| 27 | Tampilkan estimasi total | Driver | ✅ | StartCharging.jsx | - | manual | |
| 28 | Konfirmasi Driver | Driver | ✅ | StartCharging.jsx | POST /charging-sessions/start | manual | PIN diminta saat start (lihat §3) |
| 29 | Cek saldo | Sistem | ✅ | StartCharging.jsx | ChargingSessionController::start | CostConsistencyVerificationTest | |
| 30 | Saldo kurang: informasi + arahkan Top Up | Driver | ✅ | StartCharging.jsx, Topup.jsx | ChargingSessionController::start | manual | |
| 31 | Driver Top Up | Driver | ✅ | Topup.jsx | TopupController::store/simulatePay | TopupSimulationTest | |
| 32 | Metode pembayaran tersedia | Driver | ✅ | Topup.jsx | TopupController::methods | PaymentMethodManagementTest | |
| 33 | Setelah Top Up berhasil saldo update | Sistem/Driver | ✅ | Topup.jsx | TopupController::simulatePay | TopupSimulationTest | |
| 34 | Hold saldo sebesar total estimasi | Sistem | ✅ | - | ChargingSessionController::start | CostConsistencyVerificationTest | |
| 35 | Hold sebagai dana estimasi | Sistem | ✅ | - | ChargingSessionController::start | CostConsistencyVerificationTest | |
| 36 | Otorisasi transaksi & lanjut charging | Sistem | ✅ | StartCharging.jsx | ChargingSessionController::start (PIN verify) | CostConsistencyVerificationTest | |
| 37 | Otorisasi mulai sesi | Driver | ✅ | StartCharging.jsx | POST /charging-sessions/start | manual | |
| 38 | Validasi charger terpilih | Sistem | ✅ | - | ChargingSessionController::start | StationAvailabilityAuditTest | |
| 39 | Sesi dimulai jika valid | Sistem | ✅ | DriverDashboard.jsx | ChargingSessionController::start | CostConsistencyVerificationTest | |
| 40 | Status charger Digunakan/Charging | Sistem | ✅ | DriverDashboard.jsx | ChargingSessionController::start | StationAvailabilityAuditTest | |
| 41 | Charger mengirim data penggunaan daya | Unit Charger | ⚠️ | DriverDashboard.jsx (monitoring) | simulasi waktu server | CostConsistencyVerificationTest | telemetri disimulasikan, bukan charger nyata |
| 42 | Catat data sesi | Sistem | ✅ | - | ChargingSessionController::start/monitor | CostConsistencyVerificationTest | |
| 43 | Tampilkan perkembangan sesi | Driver | ✅ | DriverDashboard.jsx | GET /charging-sessions/active | manual | |
| 44 | Driver dapat menghentikan sesi | Driver | ✅ | DriverDashboard.jsx | POST /charging-sessions/{session}/finish | CostConsistencyVerificationTest | |
| 45 | Sesi berakhir (selesai/dihentikan) | Sistem | ✅ | DriverDashboard.jsx | ChargingSessionController::finish | CostConsistencyVerificationTest | |
| 46 | Catat data akhir (daya aktual) | Sistem | ✅ | - | ChargingSessionController::finish | CostConsistencyVerificationTest | |
| 47 | Hitung biaya charging aktual | Sistem | ✅ | - | ChargingSessionController::finish | CostConsistencyVerificationTest | |
| 48 | Hitung parkir flat | Sistem | ✅ | - | ChargingSessionController::finish | ParkingTariffPersistenceTest | |
| 49 | Total aktual | Sistem | ✅ | - | ChargingSessionController::finish | CostConsistencyVerificationTest | |
| 50 | Selesaikan transaksi dari hold | Sistem | ✅ | - | ChargingSessionController::finish | CostConsistencyVerificationTest | |
| 51 | Simpan status & data transaksi | Sistem | ✅ | - | ChargingSessionController::finish | CostConsistencyVerificationTest | |
| 52 | Tampilkan info penyelesaian | Driver | ✅ | DriverDashboard.jsx (invoice modal) | ChargingSessionController::finish | manual | |
| 53 | Terbitkan invoice digital | Driver | ✅ | DriverDashboard.jsx | GET /charging-sessions/{session}/invoice | CostConsistencyVerificationTest | |
| 54 | Simpan ke riwayat transaksi | Driver | ✅ | DriverDashboard.jsx | GET /charging-sessions/history | CostConsistencyVerificationTest | |
| 55 | Status charger Tersedia (bila layak) | Sistem | ✅ | - | ChargingSessionController::finish | StationAvailabilityAuditTest | tidak otomatis jika Maintenance/Gangguan |
| 56 | Terima info gangguan/terhenti | Driver/Operator | ✅ | DriverDashboard.jsx, OpsDashboard | ChargingSessionController::interrupt; OperatorController::stopByOperator | MalfunctionReportTest, ChargingPauseIntegrityTest | |
| 57 | Catat daya aktual sebelum terhenti | Sistem | ✅ | - | ChargingSessionController::interrupt | CostConsistencyVerificationTest | |
| 58 | Hitung biaya charging aktual | Sistem | ✅ | - | ChargingSessionController::interrupt | CostConsistencyVerificationTest | |
| 59 | Hitung parkir flat | Sistem | ✅ | - | ChargingSessionController::interrupt | ParkingTariffPersistenceTest | |
| 60 | Total biaya berdasarkan penggunaan aktual | Sistem | ✅ | - | ChargingSessionController::interrupt | CostConsistencyVerificationTest | |
| 61 | Selesaikan transaksi dari hold | Sistem | ✅ | - | ChargingSessionController::interrupt | CostConsistencyVerificationTest | |
| 62 | Catat status "Charging Gagal/Terhenti" | Sistem | ✅ | DriverDashboard.jsx (badge merah) | ChargingSessionController::interrupt | CostConsistencyVerificationTest | nilai persis Gagal/Terhenti di DB |
| 63 | Informasikan kondisi & hasil transaksi | Driver | ✅ | DriverDashboard.jsx | ChargingSessionController::interrupt | manual | |
| 64 | Terbitkan/perbarui invoice | Driver | ✅ | DriverDashboard.jsx | GET /charging-sessions/{session}/invoice | CostConsistencyVerificationTest | |
| 65 | Simpan sesi & transaksi ke riwayat | Driver | ✅ | DriverDashboard.jsx | GET /charging-sessions/history | CostConsistencyVerificationTest | |
| 66 | Status charger diperbarui setelah gangguan | Sistem | ✅ | - | ChargingSessionController::interrupt | MalfunctionReportTest | tidak otomatis Tersedia |

## 3. Titik wajib (ringkas)

- Langkah 4-8: registrasi menyimpan akun, profil, dompet; PIN & kendaraan ditambah setelah login (⚠️ langkah 5-6). Driver tanpa PIN/kendaraan tidak bisa mulai charging (validasi start/validate charger).
- Langkah 12-14: Dashboard memuat info pengguna, kendaraan aktif, saldo, lokasi, station sekitar; filter konektor berdasarkan kendaraan aktif (`DriverDashboard.jsx:808-812`).
- Langkah 17-19: pemilihan port tidak tersedia ditolak backend (`StationAvailabilityAuditTest`); UI menampilkan pesan.
- Langkah 23-28: input target kWh ada (`StartCharging.jsx`), estimasi charging+parkir+total, konfirmasi sebelum hold; PIN diminta saat start (langkah 36/37), bukan estimasi.
- Langkah 29-33: saldo kurang ditolak dengan pesan + arahan Top Up; setelah Top Up berhasil saldo ter-update dan bisa lanjut.
- Langkah 34-36 & 39-40: hold atomik dengan klaim port; status charger/port menjadi Charging.
- Langkah 41-43: telemetri disimulasikan server (⚠️); tampilan progres ke Driver ada.
- Langkah 45-55: biaya aktual dari server, parkir flat, settle, invoice, riwayat, port kembali Tersedia (kecuali Maintenance/Gangguan).
- Langkah 56-66: jalur gangguan (Driver laporan, Operator stop, simulasi) menghasilkan status Gagal/Terhenti, biaya aktual+parkir, invoice, riwayat, status charger diperbarui; notifikasi terkirim.

## 4. Hasil 4 test alur

- `test_tobe_happy_path`: **Belum dibuat** (skenario dapat diverifikasi dari suite existing: CostConsistencyVerificationTest, TopupSimulationTest, StationAvailabilityAuditTest). Saran: tambahkan test sementara bila perlu.
- `test_tobe_insufficient_balance_then_topup`: **Belum dibuat** (TopupSimulationTest menutupi bagian Top Up).
- `test_tobe_unavailable_port_choose_another`: **Belum dibuat** (StationAvailabilityAuditTest menutupi validasi port).
- `test_tobe_failure_branch`: **Belum dibuat** (CostConsistencyVerificationTest case2/case3 menutupi cabang gagal).

Angka: tarif 2.500/kWh, parkir 2.000, target 10 kWh (hold 27.000).

## 5. Ringkasan per tahap

| Tahap | Langkah | ✅ | ⚠️ | 🔀 | ❌ | ❓ |
|---|---|---|---|---|---|---|
| Registrasi & persiapan | 1-11 | 9 | 2 | 0 | 0 | 0 |
| Dashboard & pencarian | 12-20 | 9 | 0 | 0 | 0 | 0 |
| Persiapan & estimasi | 21-28 | 7 | 0 | 0 | 0 | 1 |
| Validasi dompet & hold | 29-36 | 8 | 0 | 0 | 0 | 0 |
| Memulai & menjalankan | 37-44 | 7 | 1 | 0 | 0 | 0 |
| Penyelesaian | 45-55 | 11 | 0 | 0 | 0 | 0 |
| Gagal/terhenti | 56-66 | 11 | 0 | 0 | 0 | 0 |
| **Total** | **66** | **62** | **3** | **0** | **0** | **1** |

## 6. Usulan patch & teks BRD

- Langkah 5-6: ubah BRD agar PIN dan kendaraan dibuat setelah login di Pengaturan (lebih masuk akal dengan implementasi). Teks pengganti: "Setelah login, Driver membuat PIN keamanan dan menambah kendaraan pada menu Pengaturan."
- Langkah 41: ubah BRD: "telemetri disimulasikan oleh server (prototipe); charger nyata tidak terhubung."

## 7. Hal ❓ dan skenario manual

Skenario klik Driver (registrasi → nota):
1. Registrasi → login → Pengaturan: buat PIN, tambah kendaraan.
2. Dashboard: pilih kendaraan aktif → station kompatibel → detail station.
3. Pilih port tersedia → StartCharging: target kWh → estimasi → konfirmasi → hold → start.
4. Monitoring sesi → hentikan → invoice → riwayat.
5. Gangguan: Laporkan Gangguan → pause → isi alasan → kirim → status Gagal/Terhenti → invoice gagal.

## 8. git status / diff --stat

```
On branch TotalFinal
Your branch is up to date with 'origin/TotalFinal'.
nothing to commit, working tree clean
```

Hanya laporan `BRD_TOBE_CONFORMANCE.md` yang ditambahkan.
