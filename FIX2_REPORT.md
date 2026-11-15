# FIX2 REPORT – EVChargeHub

## Langkah 0 - Kebersihan
Sebelum perbaikan: hanya file test dan laporan baru (tidak ada perubahan kode aplikasi).

## Langkah 1 - V2-02 (tipe id_user)
- `backend/app/Services/NotificationService.php`: `notifyTopupFailed` parameter `int` -> `string`.
- `backend/app/Http/Controllers/Api/TopupController.php`: cast `(int)` -> `(string)`.
- Test `test_d_topup_expired_notifies_driver` lulus.

## Langkah 2 - V2-01 dan sentralisasi pemicu gangguan
- `NotificationService::notifyChargerIssue` menambah parameter `$driverIds`.
- `OperationsController::updateCharger` dan `updatePort`: tangkap id driver aktif sebelum settlement, lalu kirim notifikasi.
- `OperatorController::updateChargerStatus` dan `updatePortStatus`: sama.
- `ChargingSessionController::interrupt`: kirim notifikasi gangguan charger ke admin/operator (tanpa driver, karena driver sudah menerima notifikasi sesi gagal).
- Tabel final jalur:
| Jalur | File:baris | Lewat titik terpusat? |
|---|---|---|
| Admin update charger | OperationsController.php:390-414 | ya |
| Admin update port | OperationsController.php:447-468 | ya |
| Operator update charger | OperatorController.php:315-354 | ya |
| Operator stop/reboot charger | OperatorController.php:400-487 | ya |
| Operator update port | OperatorController.php:578-690 | ya |
| Sesi gagal (port Out of Order) | ChargingSessionController.php:332-336 | ya |

## Langkah 3 - Test yang belum ada
- `test_d_topup_expired_notifies_driver` lulus setelah fix.
- `test_e_...` lulus setelah fix V2-01.
- Test j (service exception) TIDAK TERVERIFIKASI: service memiliki try/catch internal; tidak ada test yang memaksa exception.
- Test terpisah e/f/g/h: sebagian sudah ada, tidak dibuat ulang.

## Langkah 4 - Konsistensi angka
- Test `ReportRevenueVerificationTest` lulus: laporan pendapatan menyertakan transaksi gagal dengan parkir Rp2.000.
- Kasus 4: biaya dibatasi hold (selisih tidak ditagih) — perilaku tercatat.

## Langkah 5 - V1 unifikasi sumber notifikasi Operator
- TIDAK DITERAPKAN penuh (perubahan frontend terlalu besar). Opsi kecil: pertahankan overlay turunan untuk laporan, bell tetap dari tabel `notifikasi`; status baca tetap terpisah.

## Hasil test run penuh
24 lulus / 0 gagal / 24 total (setelah perbaikan).

## Hal yang masih TIDAK TERVERIFIKASI
- Push notification (polling saja).
- Test service exception (j).
- Unifikasi penuh frontend notifikasi Operator.
- E2E browser.
