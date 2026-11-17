# AUDIT ADMIN ADDENDUM – EVChargeHub (BRD EVC V.3)

## 1. Ringkasan Eksekutif

- **Area 1 Biaya Parkir:** persistensi tarif parkir flat ✅, tetapi **sinkronisasi frontend-backend putus** pada daftar station (`biaya_parkir` vs `biaya_parkir_flat`) dan **parkir tidak dihitung pada sesi gagal dengan energi 0**.
- **Area 2 Kelola Driver:** **❌ TIDAK ADA** di Admin (route/controller/UI).
- **Area 3 Kelola Metode Bayar:** **❌ TIDAK ADA** CRUD; metode Top Up disimpan di tabel `metode_pembayaran` dan dibaca Driver.
- **Area 4 Notifikasi:** **parsial** — hanya notifikasi turunan untuk Operator (gangguan + transaksi station), tidak ada notifikasi Driver/Admin persisten, status baca hanya localStorage.

Temuan per severity: 🔴 2 Critical, 🟠 4 High, 🟡 6 Medium, 🟢 4 Low.

## 2. Area 1 - Biaya Parkir

### Peta penyimpanan
- Nilai parkir disimpan di `tarif.biaya_parkir_flat` (integer) dan dibaca via `Tarif::costFor()` (`backend/app/Models/Tarif.php:22,30,62-81`).
- Sesi menyimpan snapshot tarif melalui `id_tarif` (`backend/app/Models/ChargingSession.php:14`), sedangkan estimasi parkir disalin ke `estimasi_biaya_parkir` (`backend/app/Http/Controllers/Api/ChargingSessionController.php:168-175`).
- Tidak ditemukan sisa `biaya_parkir_jam` atau parkir × durasi.

### Tabel rumus
| Lokasi | File:baris | Rumus | Sumber parkir |
|---|---|---|---|
| Estimasi/hold | ChargingSessionController.php:118-125 | `costFor(target_kwh, power)` | `tarif.biaya_parkir_flat` |
| Settle aktual | ChargingSessionController.php:310-325 | `min(hold, costFor(actualKwh, power).total)` | snapshot `session->tarif` |
| Invoice | ChargingSessionController.php:362-405 | `costFor(actualKwh, power)` | snapshot tarif |
| Driver UI | frontend/src/api/charging.js:31 | `biaya_parkir = s.biaya_parkir_flat` | API |
| Daftar station | frontend/src/api/station.js:28 | `biaya_parkir = s.biaya_parkir ?? 0` | **salah field** |

### Titik putus persistensi/sinkronisasi
1. **Mismatch field station**: backend mengirim `biaya_parkir_flat` (`StationController.php:118,133`), frontend membaca `s.biaya_parkir` (`station.js:28`) → nilai parkir tampil 0 di daftar station Driver.
2. **Sesi gagal energi 0**: `settleSession` menghitung `actualCost = 0` jika `actualKwh <= 0` (`ChargingSessionController.php:312-315`), sehingga **parkir flat tidak masuk** meskipun BRD menyatakan parkir tetap dihitung pada sesi gagal/terhenti.
3. **Hold vs aktual**: jika aktual > hold, `min(hold, actualCost)` membatasi biaya ke hold (`ChargingSessionController.php:313-315`); selisih tidak ditagih (open requirement FR-34).

### Skenario uji (angka)
Tarif Rp2.500/kWh, parkir flat Rp2.000, target 10 kWh, aktual 6 kWh:
- Estimasi hold = 10×2500 + 2000 = Rp27.000.
- Aktual = 6×2500 + 2000 = Rp17.000, refund Rp10.000.
Kode menghasilkan nilai tersebut untuk sesi normal; untuk sesi gagal dengan 0 kWh, kode menghasilkan Rp0 (seharusnya Rp2.000 menurut BRD).

### Usulan patch
```diff
// frontend/src/api/station.js:28
- biaya_parkir: s.biaya_parkir ?? 0,
+ biaya_parkir: s.biaya_parkir_flat ?? s.biaya_parkir ?? 0,
```
```php
// backend/app/Http/Controllers/Api/ChargingSessionController.php:312-315
- $actualCost = $actualKwh > 0
-     ? min($hold, $session->tarif->costFor($actualKwh, $this->powerOf($session))['total'])
-     : 0;
+ $actualCost = $actualKwh > 0
+     ? min($hold, $session->tarif->costFor($actualKwh, $this->powerOf($session))['total'])
+     : min($hold, (int) $session->tarif->biaya_parkir_flat);
```

## 3. Area 2 - Kelola Driver (Admin)

**Status: TIDAK DITEMUKAN.** Tidak ada route, controller, halaman, atau menu untuk pengelolaan akun Driver oleh Admin. Verifikasi: `backend/routes/api.php`, pencarian `driver`/`pengemudi`/`customer` pada frontend.

### Rancangan minimal (tanpa menulis kode)
- Endpoint Admin: `GET /operations/drivers`, `GET /operations/drivers/{id}`, `PUT /operations/drivers/{id}/status`.
- Field tampil: profil, kendaraan/konektor, saldo total, hold, riwayat transaksi/sesi.
- Aturan: Admin hanya baca + ubah status akun; tidak boleh lihat hash/PIN, tidak boleh ubah saldo, tidak boleh membuat sesi atas nama Driver. Operator tidak boleh akses (middleware role).
- Penonaktifan Driver: revoke token, sesi aktif diselesaikan via `stopByOperator` atau dibatalkan, hold dilepas.
- Soft delete agar riwayat transaksi tetap konsisten.

### Usulan teks FR baru
| Req# | Priority | Description | Rationale | Use Case Reference | Impacted Stakeholders |
|---|---|---|---|---|---|
| FR-56 | Should | Admin dapat melihat daftar dan detail Driver (profil, kendaraan, ringkasan dompet, riwayat transaksi/sesi). | Dukungan operasional dan audit. | Kelola Akun User Pengemudi | Admin, Driver |
| FR-57 | Should | Admin dapat mengaktifkan/menonaktifkan akun Driver; penonaktifan segera mencabut akses dan menyelesaikan sesi aktif. | Keamanan dan integritas saldo. | Kelola Akun User Pengemudi | Admin, Driver |

## 4. Area 3 - Kelola Metode Bayar

**Status: TIDAK DITEMUKAN sebagai fitur kelola.** Metode Top Up disimpan di tabel `metode_pembayaran` (`backend/database/migrations/2026_09_22_052232_create_metode_pembayaran_table.php`) dan dibaca oleh `TopupController::methods()` (`backend/app/Http/Controllers/Api/TopupController.php:20-45`). Tidak ada endpoint create/update/activate/deactivate.

### Analisis
1. Metode saat ini: GoPay, DANA, VA BRI, SeaBank (seed di `MetodePembayaranSeeder.php`).
2. Admin/Operator **tidak bisa** menambah/mengubah/menonaktifkan metode.
3. Metode nonaktif tidak dapat diuji karena tidak ada CRUD; backend memang memfilter `status_metode = 'Aktif'` (`TopupController.php:23`).
4. Fee per metode (`biaya_layanan`) ada di tabel dan dihitung pada total Top Up (`TopupController.php:60-80`).
5. Tidak ditemukan jalur pembayaran charging selain Dompet Digital (sesuai FR-31).
6. Callback gateway simulasi (`simulatePay`) hanya aktif jika `APP_DEBUG=true` (`TopupController.php:95-105`), dan `settle()` idempotent (`TopupController.php:110-125`).

### Rekomendasi scope
- **Opsi (a) cukup daftar metode simulasi tetap** (tanpa CRUD) — **Recommended** untuk prototipe, effort S. Gateway hanya simulasi, sehingga CRUD menambah risiko tanpa nilai bisnis.
- Opsi (b) CRUD penuh — effort M-L, perlu endpoint, validasi, audit log, dan pengujian IDOR.

### Usulan teks FR baru (jika Opsi b dipilih)
| Req# | Priority | Description | Rationale | Use Case Reference | Impacted Stakeholders |
|---|---|---|---|---|---|
| FR-58 | Could | Admin/Operator dapat mengelola metode Top Up (aktif/nonaktif, fee) dan metode nonaktif tidak muncul di Driver. | Fleksibilitas konfigurasi gateway simulasi. | Kelola Tarif dan metode Pembayaran | Admin, Operator, Driver |

## 5. Area 4 - Notifikasi

### Tabel rantai
| Jenis | Trigger | Penerima | Penyimpanan | Pengiriman | UI | Status |
|---|---|---|---|---|---|---|
| Charging selesai/terganggu (FR-42) | Sesi selesai/interrupt | Driver | TIDAK ADA | TIDAK ADA | Banner in-app saat sesi aktif | ❌ putus |
| Pembayaran/Top Up gagal (FR-43) | Top up gagal/expired | Driver | TIDAK ADA | TIDAK ADA | Pesan error UI | ❌ putus |
| Gangguan charger (FR-44) | Charger `Out of Order`/error log | Operator (station terkait) | `error_log` (turunan) | Polling saat buka halaman | `NotificationOverlay` operator | ⚠️ parsial |
| Gangguan charger (FR-44) | Charger gangguan | Admin | TIDAK ADA agregasi | TIDAK ADA | TIDAK ADA | ❌ putus |
| Gangguan charger (FR-44) | Charger gangguan | Driver | TIDAK ADA | TIDAK ADA | TIDAK ADA | ❌ putus |

### Akar penyebab utama
1. **Tidak ada tabel notifikasi** dan tidak ada endpoint notifikasi untuk Driver/Admin.
2. Notifikasi Operator bukan notifikasi persisten, melainkan query turunan dari `error_log` dan `charging_session` (`OperatorController.php:837-930`).
3. Status baca disimpan di `localStorage` (`frontend/src/api/operatorNotifications.js:10-20`), bukan database, sehingga tidak sinkron antar perangkat.
4. FR-44 untuk Admin dan Driver tidak diimplementasikan.

### Usulan patch (minimal)
- Buat tabel `notifikasi` (id, id_user, tipe, judul, pesan, id_entitas, status_baca, created_at).
- Buat service `NotificationService` yang dipanggil dari `ChargingSessionController::settleSession` (sesi selesai/gagal) dan dari alur top up (gagal/expired).
- Endpoint `GET /notifications`, `PUT /notifications/{id}/read`.
- UI badge + daftar di Driver, Operator, Admin.

## 6. Gap antara BRD dan implementasi

- "Kelola Akun User Pengemudi" dan "Kelola Hak Akses User dan Operator" ada di Use Case Diagram tetapi **tidak ada FR** di tabel BRD 5.1.
- "Kelola Tarif dan metode Pembayaran" ada di Use Case Operator, tetapi **tidak ada FR** untuk kelola metode bayar.
- BRD 3.2.1 menyebut kartu debit/kredit/QR, bertentangan dengan FR-31 (hanya Dompet Digital).
- Notifikasi FR-42/FR-43/FR-44 hanya "SHOULD" (prioritas High) dan implementasinya parsial.

## 7. Asumsi & hal yang tidak bisa diverifikasi

- Skema DB aktual diasumsikan sesuai migrasi.
- Tidak ada suite test otomatis; verifikasi statis.
- Notifikasi realtime tidak dapat diuji tanpa frontend runtime.

## 8. Daftar Perbaikan Terurut Prioritas

1. **A1-01** Perbaiki mismatch field parkir di daftar station — `frontend/src/api/station.js:28` — **S**.
2. **A1-02** Hitung parkir flat pada sesi gagal dengan energi 0 — `ChargingSessionController.php:312-315` — **S**.
3. **A4-01** Buat tabel + endpoint notifikasi + service — baru — **L**.
4. **A4-02** Implementasi notifikasi Driver (FR-42, FR-43) — `ChargingSessionController.php`, `TopupController.php`, frontend — **M**.
5. **A4-03** Implementasi notifikasi Admin (FR-44) — `OperatorController.php`, Admin UI — **M**.
6. **A2-01** Implementasi Kelola Driver Admin — `OperationsController.php`, frontend — **L**.
7. **A3-01** Putuskan scope metode bayar (Opsi a recommended) — docs — **S**.
8. **A4-04** Pindahkan status baca notifikasi ke database — `operatorNotifications.js` + backend — **M**.
