# VERIFY FIX REPORT – EVChargeHub

## 1. Ringkasan
- V1: ⚠️ sebagian — Operator melihat kejadian yang sama di overlay turunan dan bell baru; status baca tidak sinkron; `localStorage` masih dipakai.
- V2: ⚠️ sebagian — 2 jalur memicu notifikasi (`OperationsController`, `OperatorController`), tetapi driver aktif tidak menerima karena sesi sudah settled sebelum notifikasi.
- V3: ⚠️ sebagian — test a,b,c,g,h,i,k,l lulus; d,e gagal; j tidak diuji.
- V4: ✅ sebagian — Kasus 1-4 konsisten; Kasus 5 snapshot terbukti.

Test run penuh: 22 lulus / 2 gagal / 24 total.

## 2. Temuan

### V2-01 🔴 Critical — Driver tidak menerima notifikasi gangguan charger
- Lokasi: `backend/app/Http/Controllers/Api/OperationsController.php:413-414`, `backend/app/Http/Controllers/Api/OperatorController.php:481-487`, `backend/app/Services/NotificationService.php:44-66`.
- Akar penyebab: `updateCharger` menyelesaikan sesi aktif sebelum `notifyChargerIssue`, sehingga query `charging_session.status = 'Berlangsung'` kosong.
- Usulan patch: tangkap `id_user` sesi aktif sebelum settlement, lalu kirim notifikasi ke driver tersebut.

### V2-02 🟠 High — `notifyTopupFailed` menerima `int`, padahal `id_user` char
- Lokasi: `backend/app/Services/NotificationService.php:23`, `backend/app/Http/Controllers/Api/TopupController.php:101-104`.
- Akar penyebab: `(int) id_user` menjadi 0, sehingga notifikasi tidak tersimpan.
- Usulan patch: ubah parameter menjadi `string`.

### V1-01 🟡 Medium — Duplikasi sumber notifikasi Operator
- Komponen: `ChargerMonitor.jsx`, `ChargerDetail.jsx`, `OpsReport.jsx`, `NotificationOps.jsx`, `NotificationsBell.jsx`.
- Endpoint: `/operator/notifications` dan `/notifications`.
- Rekomendasi: satukan ke tabel `notifikasi`; hapus status baca dari `localStorage`; effort M.

## 3. Tabel Jalur Status Charger (V2)
| Jalur | File:baris | Memanggil NotificationService? |
|---|---|---|
| Admin update charger | OperationsController.php:390-414 | ya |
| Admin update port | OperationsController.php:447-468 | ya |
| Operator update charger | OperatorController.php:315-354 | ya |
| Operator stop/reboot charger | OperatorController.php:400-487 | ya |
| Operator update port | OperatorController.php:578-690 | tidak |
| Settle sesi gagal (port Out of Order) | ChargingSessionController.php:332-336 | tidak (via charger status) |

## 4. Tabel Cakupan Test (V3)
| # | Test | Status |
|---|---|---|
| a | test_a_session_completed_notifies_driver | sudah ada, lulus |
| b | test_b_session_failed_notifies_driver | sudah ada, lulus |
| c | test_c_operator_stop_notifies_driver | sudah ada, lulus |
| d | test_d_topup_expired_notifies_driver | sudah ada, **gagal** (V2-02) |
| e | test_e_g_h_charger_issue_recipients_and_idempotent | sudah ada, **gagal** (V2-01) |
| f | operator station lain tidak menerima | sudah ada, lulus |
| g | test_g_mark_read_persisted | sudah ada, lulus |
| h | test_h_idor_and_i_unauth | sudah ada, lulus |
| i | unauth 401 | sudah ada, lulus |
| j | kegagalan service tidak membatalkan settle | TIDAK TERVERIFIKASI (belum ada test) |
| k | test_k_unread_count_and_pagination | sudah ada, lulus |
| l | test_l_message_no_sensitive_data | sudah ada, lulus |

## 5. Tabel Konsistensi Angka (V4)
| Kasus | Saldo | Invoice | Riwayat | Monitoring | Laporan/Dashboard | Konsisten? |
|---|---|---|---|---|---|---|
| 1 normal 6 kWh | 83000 | 17000 | 17000 | 17000 | tidak diuji (endpoint admin) | ✅ |
| 2 gagal 3 kWh | 90500 | 9500 | tidak diuji | tidak diuji | tidak diuji | ✅ |
| 3 gagal 0 kWh | 98000 | 2000 | tidak diuji | tidak diuji | tidak diuji | ✅ |
| 4 aktual > hold | 90000 | 10000 | tidak diuji | tidak diuji | tidak diuji | ✅ |
| 5 tarif berubah | 83000 | 17000 | tidak diuji | tidak diuji | tidak diuji | ✅ |

## 6. Hal yang tidak bisa diverifikasi tanpa browser/E2E
- Duplikasi visual overlay vs bell.
- Polling 25 detik dan pause saat tab hidden.
- Render pesan sebagai teks (XSS) di browser.
- Skenario manual: buka dua tab Operator, tandai baca di satu tab, cek tab lain.
