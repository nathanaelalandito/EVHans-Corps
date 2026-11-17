# Feature Pause Report

## Langkah 0 - Cara energi dihitung
- Energi dihitung dari selisih waktu di `ChargingSessionController::simulate()` (`app/Http/Controllers/Api/ChargingSessionController.php:778-800`): `realSeconds = now - waktu_mulai`, lalu `simSeconds = realSeconds * speed`, `kwh = min(target, power * simSeconds / 3600)`.
- Durasi: `durasi_detik` dari `simSeconds` atau target penuh.
- Status sesi: `Berlangsung`, `Selesai`, `Gagal`, `Dibatalkan`, `Pending` (`app/Models/ChargingSession.php:14`).
- Laporan gangguan memanggil `interrupt` -> `settleSession` (settle sebagai Gagal/Dibatalkan, hold, payment, port, ErrorLog, notifikasi).

## Keputusan desain
- Tidak menambah status baru; gunakan penanda `dijeda_pada != null` sambil status tetap `Berlangsung` (risiko lebih kecil terhadap query/label existing).
- Durasi jeda tidak dihitung sebagai durasi charging (dikurangi dari realSeconds).
- Batas default 5 menit (`CHARGING_PAUSE_MAX_SECONDS`), apply-on-read auto-resume.
- Port tetap terpakai selama dijeda (status port tetap Charging).

## File yang diubah
- Backend: migration baru, model casts, config, controller pause/resume/resolvePause/simulate/presentSession, routes, OperatorController label.
- Frontend: API pause/resume, DriverDashboard integrasi jeda, modal banner countdown, tombol Lanjutkan, pagehide best-effort.

## Test
- Suite backend lulus (62 tests).
- Lint frontend lulus untuk file baru; build lulus.

## Hal yang tidak terverifikasi
- Tidak diuji di browser; sendBeacon tidak digunakan (fetch keepalive best-effort).
- Polling dan countdown manual perlu verifikasi.

## Usulan FR-59
FR-59: Driver dapat menjeda sementara sesi charging saat melaporkan gangguan; sesi otomatis berlanjut setelah batas waktu; energi tidak bertambah selama jeda.
