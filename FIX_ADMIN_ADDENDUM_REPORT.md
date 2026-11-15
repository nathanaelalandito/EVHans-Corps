# FIX ADMIN ADDENDUM REPORT – EVChargeHub

## Ringkasan
Langkah 1-3 addendum selesai. Test feature: 10 lulus (27 assertion).

## Langkah 1 - Sinkronisasi biaya parkir
- `frontend/src/api/station.js`: baca `biaya_parkir_flat` (fallback `biaya_parkir`).
- `ChargingSessionController::settleSession`: sesi gagal energi 0 tetap menagih parkir flat (dibatasi hold).
- `presentInvoice`: tampilkan parkir flat pada sesi gagal energi 0.
- Test: `ParkingTariffPersistenceTest`, `ParkingSettlementScenarioTest` (normal 17000, gagal 0 energi 2000, aktual > hold cap 27000).

## Langkah 2 - Simulasi Payment Gateway
- `config/payment.php`: flag `PAYMENT_SIMULATION` (default true).
- `TopupController::simulatePay`: pakai flag, bukan `APP_DEBUG`.
- Test: IDOR, idempotency, flag off 403.

## Langkah 3 - Notifikasi minimal (polling)
- Migrasi + model `notifikasi` dengan dedup_key dan index.
- `NotificationService` + endpoint `/notifications*` (paginated, only owner).
- Integrasi: settleSession (selesai/gagal/stop operator), topup expired, charger gangguan (admin/operator assigned/driver aktif).
- Frontend: `NotificationsBell` dipasang di Driver, Operator, Admin; polling 25 detik, pause saat tab hidden.
- Keputusan desain: notifikasi baru dari tabel `notifikasi`; notifikasi turunan operator tetap untuk overlay, tidak duplikat karena sumber berbeda dan tidak disimpan ganda.

## Hal yang belum bisa diverifikasi
- Push notification tidak diimplementasikan (polling saja).
- Frontend E2E tidak dijalankan (build lulus).
- Notifikasi Admin untuk gangguan bergantung pada aksi status charger.
