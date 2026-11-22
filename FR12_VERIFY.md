# FR-12 Verification Report

## 1. Diff perubahan FR-12
- `backend/app/Http/Controllers/Api/StationController.php`: tambah filter `q`, `connector`, `availability`, `min_power`, `max_tariff`.

## 2. Frontend
- `frontend/src/api/station.js:44-47`: `getStations()` hanya mengirim `lat` dan `lng`; filter lain dilakukan di frontend (`DriverDashboard.jsx`). Jadi backend FR-12 sudah diperkuat, tetapi frontend belum memakai semua parameter. Status FR-12: sebagian terintegrasi, backend siap.

## 3. Hasil test FR12VerifyTest
- 10 test, 10 lulus, 18 assertion.
- Mencakup q (nama/alamat/kode), connector, availability (can_start), min_power (daya port), max_tariff (tarif aktif), kombinasi, Nonaktif tidak muncul, filter invalid diabaikan, SQL injection binding, query count <= 10.

## 4. SQL injection dan query count
- Input `' OR 1=1 --` tidak mengembalikan semua station (0 hasil).
- Dataset 9 station: jumlah query <= 10.

## 5. Suite
- PHPUnit: 121 tests, 121 passed.
- Node station-availability: 4 tests, 4 passed.
- npm run build: lulus.
