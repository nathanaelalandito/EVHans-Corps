# Catatan penggabungan (driver + EVHans-Corps)

Dasar: EVHans-Corps-main (semua fitur operator tidak diubah). Fitur driver dari
frontend-ev / backend-ev ditambahkan; bila nama sama, nama EVHans-Corps dipakai
(`saldo_hold`, `saldoTersedia()`, `status_loc`, `status_mesin`, `id_port`, enum berawalan kapital, `station.js`).

Setelah pull: `php artisan migrate:fresh --seed` (enum EVH diubah in-place, jadi DB lama harus dibuat ulang).

## Tambahan dari driver
- Alur charging per PORT: prepare -> estimate -> start (PIN + hold) -> finish / interrupt (+ alias /stop)
- Invoice, riwayat transaksi, top-up cepat di dashboard, "Laporkan Gangguan" (masuk ke notifikasi operator via error_log)
- Top-up checkout QR/VA: TopupController, Topup.jsx, route /api/topup/*
- DompetDigital.jsx disertakan tetapi belum terhubung (lihat catatan di chat)

## Migration baru
- 2026_10_12_230000_add_checkout_fields_to_topup_table (milik driver)
- 2026_11_02_000001_add_id_port_to_charging_session_table
- 2026_11_02_000002_add_metode_and_nullable_payment_to_topup_table
