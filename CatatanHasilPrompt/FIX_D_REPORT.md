# FIX D — Operator, audit trail, konsistensi

## Ringkasan

Fase D mengerjakan D1–D5. Test Laravel awal sebelum perubahan fase ini: **106 test / 1.067 assertion lulus**. Test Laravel akhir pada implementasi ini: **111 test / 1.146 assertion lulus**. Test frontend Node: **20/20 lulus**; ESLint file UI berubah lulus; `npm run build` lulus. Browser tidak dijalankan.

## D1 — Satu sumber notifikasi Operator

- `frontend/src/OpsDashboard.jsx`, `ChargerMonitor.jsx`, `ChargerDetail.jsx`: bell turunan dan overlay dihilangkan; satu `NotificationsBell` dari endpoint tabel `notifikasi` menjadi sumber notifikasi. CTA gangguan diarahkan ke laporan.
- `frontend/src/OpsReport.jsx`, `MalfunctionReportModal.jsx`: aktivitas turunan dipertahankan sebagai daftar/laporan biasa; aksi penanganan gangguan tetap tersedia.
- `frontend/src/api/operatorNotifications.js`: state baca `localStorage` serta pemanggilan daftar notifikasi turunan dihapus. Endpoint backend tidak dihapus.
- `frontend/src/NotificationsBell.jsx`, `frontend/src/utils/notificationPolling.js`, `frontend/src/notificationsBell.css`: toast hanya untuk ID yang baru ditemukan setelah polling awal; daftar terbuka dimuat ulang dan filter dipertahankan.
- Test: `Bagian2AuditContractTest` membuktikan satu gangguan memberi satu notifikasi Operator station terkait, station Operator lain tidak menerima, dan status baca tersimpan. `frontend/tests/notification-flow.test.mjs` membuktikan deteksi ID baru dan pemakaian satu bell. Hasil: suite Laravel dan Node lulus.

## D2 — Audit trail Operator

- `backend/app/Http/Controllers/Api/OperatorController.php`: store/update charger dan port menulis satu `AuditLog` dalam transaksi yang sama dengan aktor server, station, aksi, ID entitas, nilai sebelum/sesudah, dan alasan opsional. Kontrak respons tetap.
- Test `OperatorScopeAuditTest::test_legacy_operator_charger_and_port_writes_record_actor_and_before_after_values`: empat operasi menghasilkan empat log dengan aktor/nilai yang benar. Lulus.

## D3 — Jatuh tempo tarif

- Test baru `backend/tests/Feature/TariffScheduleBoundaryTest.php`: tarif lama berlaku sebelum jadwal; jadwal berlaku tepat pada waktu mulai; sesi lama tetap memakai snapshot lama; sesi baru memakai tarif dan parkir baru. Lulus dengan Carbon test clock.
- Tidak ada perubahan logika tarif/snapshot.

## D4 — Status pembayaran sesi gagal

- Test `CostConsistencyVerificationTest` mengunci perilaku saat ini: sesi gagal dengan biaya positif (termasuk 3 kWh + parkir = Rp9.500 dan 0 kWh + parkir = Rp2.000) berstatus pembayaran `Sukses` bila settlement berhasil. Kegagalan tanpa biaya (total Rp0) berstatus `Gagal` dan saldo tidak berubah.
- Perilaku aplikasi tidak diubah. Usulan definisi untuk keputusan produk: `Sukses` berarti settlement/pembayaran berhasil, meski sesi berakhir gagal; `Gagal` berarti settlement tidak berhasil/tidak ada pembayaran. Mohon konfirmasi definisi ini sebelum perubahan lanjutan.

## D5 — Utilisasi dan pencarian station

- `backend/app/Http/Controllers/Api/OperatorController.php`: `/api/operator/stations` menerima pencarian `q` untuk nama/kode serta paginasi maksimum 100 bila parameter pencarian/paginasi dipakai. Tanpa parameter, bentuk respons lama tetap dipertahankan. Cakupan tetap berdasarkan penugasan.
- Test `OperatorScopeAuditTest::test_operator_assigned_station_search_and_pagination_preserve_scope_and_legacy_shape`: bentuk lama, pencarian nama/kode, batas maksimum, dan isolasi station lulus.
- Utilisasi memakai **detik charging ÷ (jumlah port yang ditugaskan × detik periode) × 100**. Sesi selesai/gagal memakai interval mulai–selesai; sesi berjalan memakai mulai–sekarang; jeda tersimpan dikurangi, dan jeda aktif saat ini juga dikecualikan. Angka dikembalikan dalam `summary.utilization` bersama detik pembilang/penyebut, jumlah port, dan rentang waktu. Rentang default adalah bulan berjalan, selaras dengan UI laporan.
- `frontend/src/OpsReport.jsx`: kartu Utilisasi port menampilkan persentase dan rumus ringkas.
- Test baru `OperatorUtilizationReportTest::test_utilization_counts_completed_failed_and_paused_charging_time_only`: fixture sesi selesai (termasuk jeda tercatat), gagal, dan aktif yang sedang dijeda menghasilkan 7.800 detik dari 86.400 detik-port, yaitu 9,03%. Lulus.
- Batas data: skema menyimpan total detik jeda, bukan interval tiap jeda. Untuk laporan yang memotong sesi tepat pada batas periode, jeda historis hanya dapat dikurangkan sebagai agregat yang dibatasi durasi overlap. Jumlah port mencakup semua port di station yang ditugaskan; riwayat online/offline port tidak tersedia untuk denominator.

## Daftar test fase ini

- D1: `Bagian2AuditContractTest`; frontend Node `notification-flow.test.mjs`.
- D2/D5 pencarian: `OperatorScopeAuditTest` (audit write dan pencarian/paginasi).
- D3: `TariffScheduleBoundaryTest`.
- D4: `CostConsistencyVerificationTest`.
- D5 utilisasi: `OperatorUtilizationReportTest`.
- Test karakterisasi notifikasi yang dibalik: test D1 sekarang mewajibkan notifikasi untuk Operator station terkait, menolak notifikasi untuk Operator station lain, dan memverifikasi read timestamp DB.
- Semua test Laravel akhir: **111/111 lulus, 1.146 assertion**. Node: **20/20**. ESLint `src/OpsReport.jsx`: lulus. `npm run build`: lulus.

## Keputusan dan verifikasi tersisa

- Formula utilisasi mengikuti pilihan pengguna: waktu charging dibagi seluruh waktu-port tugas.
- ❓ TIDAK TERVERIFIKASI: tampilan aktual di browser, deployment scheduler/polling di lingkungan produksi, serta perilaku DB MySQL. Test memakai SQLite in-memory; tidak ada operasi tulis ke DB development.
- Tidak ada klaim pengujian browser.

## Skenario uji manual

1. Login sebagai Operator yang ditugaskan ke station A. Picu satu gangguan pada A; pastikan satu bell bertambah/toast tampil dan notifikasi tersedia di panel. Login Operator station B dan pastikan tidak menerima item itu.
2. Buka laporan gangguan, lakukan tindak lanjut, lalu pastikan daftar laporan tetap berfungsi dan status baca notifikasi bertahan setelah reload.
3. Pada rentang satu hari dengan satu port dan fixture sesi yang setara test, cocokkan kartu utilisasi dengan pembilang/penyebut pada respons API; ubah rentang dan pastikan kartu ikut berubah.
4. Cari station Operator dengan nama dan kode, pindah halaman, lalu pastikan station yang tidak ditugaskan tidak pernah muncul.

## Prioritas perubahan fase D

1. `OperatorController.php` + `OperatorScopeAuditTest.php` — pencarian/paginasi dan audit trail; effort M.
2. `OperatorController.php`, `OpsReport.jsx`, `OperatorUtilizationReportTest.php` — metrik utilisasi yang teruji; effort M.
3. `OpsDashboard.jsx`, `OpsReport.jsx`, `NotificationsBell.jsx`, util notifikasi dan test terkait — satu sumber dan toast baru; effort M.
4. `TariffScheduleBoundaryTest.php`, `CostConsistencyVerificationTest.php` — karakterisasi batas jadwal dan settlement; effort S.
