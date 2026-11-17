# Audit EVChargeHub — 17 November 2026

## Ruang lingkup dan batasan

Audit statis lanjutan terhadap BRD EVC V.3, laporan audit/fix/build sebelumnya, batas tipe ID pengguna, render teks, serta cakupan tes yang tersedia. Laporan yang sudah ada tidak ditimpa. Database development tidak dibaca atau diubah. PHPUnit memakai SQLite in-memory menurut `backend/phpunit.xml:24-25`.

## Ringkasan

- PHPUnit awal: **62 tes lulus, 574 assertion**.
- Frontend build awal: **lulus**, Vite mentransformasi 142 modul.
- Frontend lint awal: **gagal**, 31 error dan 6 warning; sejalan dengan kegagalan lint yang dicatat `CatatanHasilPrompt/AUDIT_DRIVER_CURRENT_REPORT.md` bagian 0, meski jumlah saat ini 37 masalah.
- Pencarian `frontend/src` tidak menemukan `dangerouslySetInnerHTML` atau konversi numerik `id_user`/`user.id`. `Number(...)` di `OperatorAdminDashboard.jsx:592,617,630,757,761,991,1132` mengubah ID lokasi numerik; `parseInt` di `:1721` membaca radius.

## Temuan

### AUD-01 — Pause/resume belum dibatasi ke role Driver

**Status: ⚠️ Sebagian** — kepemilikan sesi diperiksa, tetapi pembatasan role khusus Driver tidak terlihat.

**Akar penyebab:** route pause/resume berada di group `auth:sanctum` tanpa middleware role. Controller memeriksa `id_user` sesi sama dengan `id_user` pemanggil, sehingga mencegah pengguna mengubah sesi milik orang lain, tetapi akun Admin/Operator yang memiliki sesi sendiri tetap dapat memakai endpoint yang dirancang dalam alur jeda Driver. Laporan sebelumnya juga mencatat bahwa role operator/admin dapat mengoperasikan sesi Driver lain; verifikasi kode saat ini menunjukkan ownership check mencegah kasus sesi milik orang lain.

**Bukti:** `backend/routes/api.php:110-111` mendaftarkan kedua route; `ChargingSessionController.php:448-458` dan `:498-508` hanya membandingkan kepemilikan. Catatan terdahulu ada di `AUDIT_DRIVER_CURRENT_REPORT.md` bagian 1.

**Usulan patch (belum diterapkan):**

```diff
- Route::post('/charging-sessions/{session}/pause', [ChargingSessionController::class, 'pause']);
- Route::post('/charging-sessions/{session}/resume', [ChargingSessionController::class, 'resume']);
+ Route::middleware('role:driver')->group(function () {
+     Route::post('/charging-sessions/{session}/pause', [ChargingSessionController::class, 'pause']);
+     Route::post('/charging-sessions/{session}/resume', [ChargingSessionController::class, 'resume']);
+ });
```

Tambahkan feature test yang memastikan Admin/Operator mendapat 403 dan Driver hanya dapat mengubah sesi miliknya.

### AUD-02 — Skenario pause/resume belum tercakup tes otomatis

**Status: ❓ TIDAK TERVERIFIKASI** — suite yang ada tidak memuat nama tes pause/resume; hasil suite tidak membuktikan batas waktu jeda, pengurangan durasi, auto-resume, dan akses role.

**Bukti:** daftar `backend/tests/Feature` berisi `ParkingSettlementScenarioTest.php`, tes notifikasi, top up, dan pengelolaan driver; pencarian `pause`/`resume` tidak menemukan tes. Implementasi berada di `ChargingSessionController.php:448-535` dan fungsi penyelesaian jeda di `:913`.

**Usulan patch:** tambahkan feature tests terisolasi DB test untuk pause, resume, auto-resume, energi selama jeda, dan akses role. Tidak ada file tes dibuat pada audit ini karena perilaku akses yang diharapkan perlu disepakati bersama perubahan middleware.

## Pemeriksaan spesifik instruksi

- **ID pengguna string:** ✅ Sesuai — `users.id_user` adalah `char(13)` di `0001_01_01_000000_create_users_table.php:15`; model menandai `$incrementing = false` dan `$keyType = 'string'` di `User.php:19-21`. Cast numerik yang ditemukan pada kode aplikasi adalah uang, energi, koordinat, radius, atau ID entitas numerik; pencarian tidak menemukan cast untuk ID pengguna.
- **Teks server dirender sebagai teks:** ✅ Sesuai pada pola React yang dipindai — tidak ditemukan `dangerouslySetInnerHTML` pada `frontend/src`.
- **Perilaku charging parkir flat saat energi nol:** ✅ Sesuai terhadap temuan lama — cabang `ChargingSessionController.php:595-598` mengenakan parkir flat pada energi nol; bukti regresi tersedia di `ParkingSettlementScenarioTest::test_failed_zero_energy_charges_parking` (`backend/tests/Feature/ParkingSettlementScenarioTest.php:140`).
- **Parkir di daftar station:** ✅ Sesuai terhadap temuan lama — `frontend/src/api/station.js:28` membaca `biaya_parkir_flat` dengan fallback.
- **DB development:** ❓ TIDAK TERVERIFIKASI — sengaja tidak diakses pada audit ini; hasil tes menggunakan SQLite in-memory.
- **UI browser:** ❓ TIDAK TERVERIFIKASI — audit ini tidak menjalankan browser dan tidak mengklaim UI teruji.

## Verifikasi akhir

Suite backend, lint, dan build dijalankan kembali setelah laporan dibuat. Hasil akhir dicatat pada respons audit; tidak ada kode aplikasi yang diubah.
