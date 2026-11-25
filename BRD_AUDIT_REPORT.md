# Hasil Audit BRD EVChargeHub (EVC V.3) terhadap Sistem

**Sumber BRD:** `BRD_[HansCorps] terbaru.docx` (Versi EVC V.3, tanggal 14 Desember 2026).  
**Branch:** TotalFinal — commit `096dccd`.  
**Audit date:** 2026-11-25.  
**Mode:** baca saja; tidak ada perubahan kode aplikasi.

## 1. Ringkasan eksekutif

| Item | Hasil |
|---|---|
| PHPUnit | 121 passed, 1164 assertions |
| Node tests | 20 passed, 0 failed |
| composer audit | No advisories |
| npm audit | 0 vulnerabilities |
| npm run build | sukses |
| eslint | 18 problems (13 errors, 5 warnings) |
| FR-01..FR-56 + NFR01..06 | ✅58, ⚠️1 (FR-12 frontend), ❓3 (NFR03/04/06) |
| To-Be 66 langkah | ✅62, ⚠️3, ❓1 |

**Kesimpulan:** Sistem secara umum sesuai BRD EVC V.3; gap utama adalah FR-12 (filter frontend belum memakai parameter backend), NFR performa/usability belum diukur, dan dokumentasi BRD (Issue #1, #3, #4) perlu diselaraskan.

## 2. Temuan utama

1. **High — FR-12:** backend `StationController.php:32-90` mendukung q/availability/min_power/max_tariff, tetapi frontend `DriverDashboard.jsx:669,800-839` memanggil `getStations()` tanpa params dan memfilter lokal.
2. **Medium — Lint React:** 13 errors (TDZ/setState-in-effect) di `DriverDashboard.jsx`, `KelolaKendaraan.jsx`, `ProfilOps.jsx`, `StartCharging.jsx`.
3. **Medium — Arrival Check:** validasi bergantung koordinat klien (`ChargingSessionController.php:275-290`); keterbatasan prototipe.
4. **Low — Dokumen BRD:** Issue #1 (FR-34 open), #3 (FR-48 perlu detail), #4 (ERD Refund & biaya_parkir_jam) belum diselaraskan; Document Revisions hanya 1.00; glosarium belum mencakup istilah baru.

## 3. Ketidaksesuaian BRD vs implementasi (usulan teks)

- FR-57/58/59 (Kelola Driver, Metode Bayar, Jeda sesi) belum ada di tabel 5.1 BRD → tambahkan baris baru.
- Bagian 3.2.1 Pembayaran masih menyebut kartu debit/kredit, saldo aplikasi, QR payment, promosi, rating → hapus, ganti dengan Dompet Digital satu-satunya.
- Issue #1 (FR-34): biaya aktual dibatasi hold (open requirement).
- Issue #3 (FR-48): arrival check & radius dari konfigurasi.
- Issue #4: hapus entitas Refund dan field biaya_parkir_jam.

## 4. To-Be (66 langkah)

- 62 ✅, 3 ⚠️ (langkah 5 PIN dibuat setelah login, 6 kendaraan ditambah setelah login, 41 telemetri disimulasikan), 1 ❓ (langkah 21 butuh lokasi nyata).
- Usulan teks BRD: PIN dan kendaraan dibuat setelah login di Pengaturan; telemetri disimulasikan server.

## 5. Konsistensi angka (tarif 2.500/kWh, parkir 2.000, target 10 kWh, hold 27.000)

| Kasus | Saldo akhir | Invoice/Riwayat/Laporan |
|---|---|---|
| Normal 6 kWh | 83.000 | 17.000 |
| Gagal 3 kWh | 90.500 | 9.500 |
| Gagal 0 kWh | 98.000 | 2.000 |
| Aktual > hold (10 kWh, hold 10.000) | 90.000 | 10.000 (dibatasi hold) |
| Tarif berubah saat sesi | 83.000 | 17.000 (tarif lama) |

## 6. Git status

```
On branch TotalFinal
Your branch is up to date with 'origin/TotalFinal'.
nothing to commit, working tree clean
```

Detail audit lengkap ada di `BRD_CONFORMANCE_REPORT.md` dan `BRD_TOBE_CONFORMANCE.md`.

Mau saya perbaiki item prioritas (FR-12 filter backend) sekarang?
'@ | Set-Content -LiteralPath "C:\RPL_Project\Tugas\BRD_AUDIT_REPORT.md" -Encoding UTF8; Write-Host "written"