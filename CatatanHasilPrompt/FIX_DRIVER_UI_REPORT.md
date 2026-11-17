# Fix Driver UI Report

## Akar penyebab modal terpotong
Modal lama dirender inline di dalam kontainer dengan `overflow` dan posisi induk; tinggi modal melebihi viewport. Perbaikan: render lewat portal ke `document.body`, backdrop + panel centered, scroll lock body, footer sticky, body scroll internal.

## Inventaris status -> warna
| Status | Tone |
|---|---|
| Gagal, Terhenti, Dibatalkan, Failed, Cancelled | danger (merah) |
| Selesai, Sukses, Success, Berhasil | ok (hijau) |
| Berlangsung, Charging, Berjalan, Aktif | info (biru) |
| Pending, Menunggu, Estimasi, Waiting | warn (amber) |
| Lainnya | neutral (abu) |

Pemetaan terpusat: `frontend/src/utils/sessionStatus.js` (`sessionStatusTone`), dipakai di Invoice Digital Terakhir dan Riwayat Transaksi.

## Investigasi lambat
Rantai: modal -> `handleInterruptSession` -> `interruptChargingSession` -> `POST /api/charging-sessions/{id}/interrupt` -> `ChargingSessionController::interrupt` -> `settleSession` (transaksi DB, settle, hold, payment, port, error log, notifikasi). Backend menyertakan `notifySessionFailed` dan `notifyChargerIssue` (loop penerima) serta `ErrorLog::create`.

Faktor frontend sebelumnya: `afterSessionSettled` memanggil `fetchWallet` lalu `fetchTransactionHistory` berurutan. Perbaikan: `Promise.all`, modal ditutup segera setelah respons sukses, refetch berjalan di latar belakang.

Faktor lingkungan: `php artisan serve` satu proses dapat memblokir polling; Vite proxy tidak dipakai. Tidak diubah di tugas ini.

## File yang diubah
- `frontend/src/DriverDashboard.jsx`: modal portal, chip jenis gangguan, konteks sesi, validasi inline, spinner, optimasi afterSessionSettled, badge tone terpusat.
- `frontend/src/driverDashboard.css`: styling modal interrupt, status info/neutral.
- `frontend/src/utils/sessionStatus.js`: pemetaan status -> tone.

## Bukti perilaku bisnis tidak berubah
- Rumus biaya, settle, hold, snapshot tarif, penerima notifikasi, idempotensi tidak disentuh.
- Endpoint dan payload tetap sama; hanya frontend yang berubah.

## Hal yang tidak terverifikasi
- Tidak diuji di browser; skenario manual perlu dijalankan.
- Pengukuran waktu backend sebelum/sesudah tidak dilakukan dengan benchmark otomatis.
- Test frontend tidak ada.

## Skenario uji manual
- Driver 375px dan desktop: modal centered, tidak terpotong, Esc/backdrop/Batal menutup (kecuali saat mengirim), scroll lock, area sentuh >=44px.
- Kirim kosong: tombol disabled dan validasi inline.
- Kirim sukses: modal menutup, notice muncul, invoice/riwayat terbarui.
- Error jaringan: pesan inline + Coba lagi.
- Kirim ganda: tombol disabled + guard handler.
- Badge Gagal merah di Invoice Digital Terakhir dan Riwayat Transaksi.
