# AUDIT DRIVER PART 1 — Form, validasi, PIN, port, riwayat

**Mode:** audit kode dan feature test Laravel. Kode aplikasi tidak diubah. Suite memakai konfigurasi test SQLite in-memory (`backend/phpunit.xml`); database development tidak ditulis. SDD tidak ditemukan di repo; BRD yang tersedia `docs/BRD_EV_Charge_HUB.docx`. UI tidak dijalankan di browser, sehingga gejala autofill browser dan tampilan visual runtime tidak dapat dipastikan dari audit ini.

## 1. Autofill / default email

**Status: ⚠️ Sebagian.** Login dan registrasi memakai state awal kosong, tetapi ada debug hook yang mengisi akun Driver tetap ke storage; logout/login tidak membersihkan seluruh konteks lokal; input login dan beberapa form akun belum mengatur autocomplete.

### Inventaris

| Form / tempat | Email, username, telepon | Nilai dan atribut yang ditemukan |
|---|---|---|
| Login bersama Driver/Operator/Admin | email, password | `Login.jsx:5` state kosong; `:54-64` email `type=email`, `name=email`, placeholder generik, tanpa `autoComplete`; password `:67-76`, tanpa autocomplete. Tidak ada nilai email Admin yang tertanam. |
| Registrasi Driver | email, telepon, password | `Registrasi.jsx:8-14` state kosong; email `:83-95` placeholder menyebut domain Admin/Operator (membingungkan untuk registrasi Driver publik), tanpa autocomplete; telepon `:110-124` dinormalisasi, `autoComplete=tel`; password `:97-107` tanpa autocomplete. |
| Profil Driver | email dan telepon | `DriverDashboard.jsx:448-456` form edit disalin dari `profile`; `:419-424` profil didapat lewat API `getProfile`; input `:2977-3002` memakai value dari form dan autocomplete email/tel. Tidak ditemukan nilai akun konstanta pada form edit. |
| Pengaturan Driver | tidak ada input email/username | Termasuk layar PIN (`PinSecuritySettings.jsx`); password hanya ada di alur reset PIN. |
| Tambah kendaraan | tidak ada input email/username/telepon | Form kendaraan mengumpulkan spesifikasi dan nomor polisi; tidak membawa identitas login. |
| Top Up | tidak ada input email/username | Nomor e-wallet pembayaran dapat berasal dari profil (`Topup.jsx`), bukan field email. |
| Laporan gangguan | tidak ada input email/username | Pelapor diambil dari akun aktif di API. |
| Pengaturan Operator | telepon, email readonly | `OperatorSettingsModal.jsx:41` mengisi telepon dari profil API; email readonly dari respons profil/user. |
| Kelola Operator Admin | email lokal-part dan telepon | `OperatorAdminDashboard.jsx:1185-1187,1496` controlled state awal kosong; email memakai autocomplete `new-password` untuk menghindari autofill login, telepon dinormalisasi. |

### Akar penyebab dan reproduksi

- **Kondisi reproduksi terkonfirmasi dari kode:** buka aplikasi dengan query `?debug`; [main.jsx](/C:/RPL_Project/Tugas/frontend/src/main.jsx:7) menulis token dan `ev_user` berisi akun tetap `bona@gmail.com`/Driver ke localStorage. Ini bukan email Admin, tapi dapat membuat identitas akun lama/seed tampak sebagai akun aktif jika aplikasi membaca sesi tersimpan. Hilangkan `?debug` untuk membedakan debug hook dari gejala default email pada login.
- [auth.js](/C:/RPL_Project/Tugas/frontend/src/api/auth.js:22) logout menghapus `ev_token`, `ev_user`, dan `ev_active_station_id` (`:26-28`). Fungsi login juga hanya menghapus station aktif (`:7`); state lokal lain yang dipakai UI tidak otomatis dibersihkan. Bukti ini tidak membuktikan email Admin tersimpan di storage.
- `Login.jsx` state awal kosong dan placeholder `nama@email.com` generik; `Registrasi.jsx` juga kosong, tetapi placeholder registrasi menyebut `@admin.ac.id / @ops.ac.id` (`:91`), padahal endpoint registrasi publik membuat Driver (`AuthController.php:49-52`).
- **Autofill browser:** `Login` omits `autoComplete` untuk email/password. `Registrasi` omits `email`, `new-password`; tidak ada `name` yang salah, karena atribut nama `email`/`password` sesuai. Operator settings memakai autocomplete `tel`; Admin create Operator email memakai `new-password`. Kode tidak dapat membuktikan password manager/browser mengisi akun tertentu.
- Pencarian pada seluruh `frontend/src` tidak menemukan `admin@...` sebagai default email atau placeholder email Admin. Masih ada debug identity Driver yang hardcoded pada `main.jsx`.

### Usulan patch (diff konseptual)

```diff
// frontend/src/main.jsx
- if (new URLSearchParams(window.location.search).has('debug')) { write fixed token and user }
+ // pindahkan login debug ke fixture lokal yang eksplisit dan jangan pernah menulisnya sebagai sesi normal
// frontend/src/api/auth.js
  finally { remove ev_token, ev_user, ev_active_station_id;
+   clear user-scoped UI/context state (contoh kendaraan aktif) saat logout dan sebelum akun baru dipasang
  }
// frontend/src/Login.jsx
+ autoComplete="email"                 // email
+ autoComplete="current-password"      // password
// frontend/src/Registrasi.jsx
- placeholder="nama@email.com (atau @admin.ac.id / @ops.ac.id)"
+ placeholder="nama@email.com"
+ autoComplete="email" / "new-password"
```

**Test tertulis:** belum ada test UI/localStorage/autofill; tidak ada klaim browser diuji. API phone test mencakup jalur backend, bukan autofill. **Keputusan:** pilih apakah query `?debug` harus dihapus atau hanya diletakkan di tooling lokal yang tidak mempengaruhi sesi biasa; pilih apakah preferensi non-identitas seperti `ev_hide_saldo` ikut di-reset (tidak diperlukan untuk mencegah kebocoran akun).

## 2. Validasi telepon

**Status: ⚠️ Sebagian.** Backend membatasi ke angka, maksimal 15, tetapi menerima satu digit. Registrasi Driver, profil Driver, form create Operator Admin, dan pengaturan profil Operator memakai normalizer yang membuang karakter bukan angka pada perubahan input (termasuk paste); pesan inline tidak seragam. Kolom migrasi berubah menjadi 15 karakter.

### Endpoint dan aturan aktif

| Tempat/endpoint | Frontend | Backend | DB |
|---|---|---|---|
| Registrasi Driver `POST /api/register` | `Registrasi.jsx:110-124`: `normalizePhone`, numeric keyboard, `maxLength=15`, regex HTML `[0-9]{1,15}`, inline error dari respons | `AuthController.php:19-28`: regex `^[0-9]{1,15}$` | `user_profile.nomor_telepon`: awalnya `CHAR(13)` (`2026_09_22_044618_create_user_profile_table.php:25`), migrasi `2026_11_14_000001...:15` mengubah menjadi `VARCHAR(15)` |
| Profil Driver `PUT /api/driver/profile` | `DriverDashboard.jsx:2990-3003`: normalisasi, `inputMode=numeric`, max 15, pattern, `autoComplete=tel`; inline error profil saat submit | `UpdateProfileDriverRequest.php:29`: regex 1–15 | kolom `VARCHAR(15)` pasca migrasi |
| Buat Operator Admin `POST /api/operations/operators` | `OperatorAdminDashboard.jsx:1187` serta `:1496`: normalize, numeric mode, max/pattern, inline/request errors | `OperationsController.php:626-632`: regex 1–15 | kolom yang sama |
| Edit Operator Admin `PUT /api/operations/operators/{id}/profile` | UI detail operator memerlukan pemeriksaan field edit; input create baru terlihat di atas | `OperationsController.php:770-774`: regex 1–15 | kolom yang sama |
| Profil Operator `PUT /api/operator/profile` | `OperatorSettingsModal.jsx:41`: input numeric, normalize, max/pattern; belum ada `autoComplete=tel` | `OperatorController.php:924-931`: regex 1–15 | kolom yang sama |

Aturan keunikan **tidak ditemukan** untuk nomor telepon pada endpoint di atas. Batas minimum saat ini **1 digit**. Rekomendasi awal minimum 8 digit (tidak ada bukti BRD menentukan angka minimum); keunikan sebaiknya diputuskan sebagai aturan bisnis sebelum diterapkan karena nomor keluarga/shared line bisa valid. Kolom tidak menyimpan tanda `+`; implementasi menerima format angka lokal saja.

Seed `UserSeeder.php:20-155` berisi nomor uji yang tampak 12 digit (contoh `081200000000`), sehingga seed yang terinspeksi tidak melanggar batas 15 dan memenuhi usulan minimum 8. Audit tidak membaca baris data aktual DB development; kepatuhan seluruh data produksi/dev **❓ TIDAK TERVERIFIKASI**. Migrasi mempertahankan data lama (`:8-16`) dan tidak menormalisasi nomor yang ada.

### Test

File baru [DriverPart1AuditTest.php](/C:/RPL_Project/Tugas/backend/tests/Feature/DriverPart1AuditTest.php:35) menguji valid 15 digit dan invalid 16 digit, huruf, spasi, tanda baca, kombinasi, kosong pada registrasi Driver, profil Driver, create/edit Operator Admin, dan profil Operator. Hasil terpilih: **5 test, 104 assertions lulus**; suite keseluruhan akhir tercatat di bagian penutup. Test menegaskan kontrak sekarang, termasuk batas 1 digit yang belum diputuskan minimum bisnisnya.

### Usulan patch (diff konseptual)

```diff
- 'regex:/^[0-9]{1,15}$/'
+ 'regex:/^[0-9]{8,15}$/' // setelah minimum disetujui
// frontend/src/utils/phone.js + seluruh input telepon
- PHONE_PATTERN = [0-9]{1,15}
+ PHONE_PATTERN = [0-9]{8,15} // maxLength tetap 15; jelaskan minimal pada pesan inline
// sebelum rilis
+ audit SELECT panjang/karakter nomor_telepon; laporkan/normalisasi lewat rencana migrasi data terpisah
```

**Keputusan:** minimum yang disarankan 8 digit; perlu/tidaknya unique constraint/validasi unik; kebijakan terhadap data lama yang lebih pendek dari 8 atau format nonangka.

## 3. PIN Keamanan FR-05

**Status: ⚠️ Sebagian.** Ada API set/change/verify/reset dan UI Pengaturan Driver. Hash, verifikasi PIN lama, lockout, dan respons tanpa PIN ada. Aturan PIN lemah, audit log perubahan PIN, toggle tampil/sembunyi, pesan generik, dan sejumlah skenario tes belum ada.

### Pemetaan gap

| Kebutuhan | Backend | UI |
|---|---|---|
| Buat PIN jika belum ada | ✅ `DompetPinController.php:69-93`, `POST /api/wallet/pin`; 6 digit dan konfirmasi | ✅ `PinSecuritySettings.jsx:277-313`, tombol Buat PIN, masked, loading/sukses/error |
| Ubah dengan PIN lama | ✅ `:100-137`, `Hash::check` PIN lama, PIN baru harus beda (`different`) | ✅ `:114-137,315-328`; PIN lama/baru/konfirmasi, validasi client, error tunggal inline |
| PIN disimpan hash/tidak keluar respons | ✅ `:87`, `:130`; wallet show hanya metadata `:48-61`; response hanya pesan | ✅ Tidak merender nilai PIN; `renderPinField` `:161-180` memakai `type=password` |
| Lockout | ⚠️ `:23-30,343-371`: 3 percobaan salah, lock 15 menit; counter diterapkan pada change/verify/top up, namun reset dengan password (`:277-302`) menghapus lockout | ⚠️ status terkunci diperlihatkan; UI mendapat respons API |
| Pesan error generik | ❌ Backend membedakan “PIN lama salah”, sisa percobaan, dan pesan lockout (`:127`, `:365-371`) | Error API ditampilkan lewat `extractErrorMessage` (`PinSecuritySettings.jsx:12-24`) |
| PIN lemah (semua sama/urutan) | ❌ `digits:6` saja; tidak ada rule sequence/repetition | ❌ client juga hanya panjang/beda (`:99-137`) |
| Toggle tampil/sembunyi | ❌ Tidak ada kontrol toggle; semua PIN `type=password` (`:161-180`) | ❌ |
| Audit log perubahan tanpa nilai PIN | ❌ `changePin` hanya simpan wallet, tidak membuat AuditLog (`DompetPinController.php:130-136`) | — |
| Forgot PIN | ✅ Sudah tersedia, bukan hanya opsi: tombol “Lupa PIN? Atur ulang” (`PinSecuritySettings.jsx:262-266`), `POST /api/wallet/pin/reset` memverifikasi password akun (`DompetPinController.php:277-302`) | ✅ UI minta password lalu PIN baru |
| tanpa token / akses akun lain | ✅ route wallet seluruhnya dalam `auth:sanctum` (`routes/api.php:32-40`); controller selalu memilih wallet dari user login | Feature test yang baru memeriksa hash/response; belum mencakup semua skenario auth/IDOR |

PIN registrasi: akun dan dompet dibuat saat registrasi (`AuthController.php:49-80`), PIN tidak ikut dibuat; Driver membuat PIN terpisah. Panjang aktif enam digit.

### Rancangan patch (diff konseptual)

```diff
// DompetPinController::setPin/changePin/resetPin
+ Rule: enam digit AND bukan repetisi penuh AND bukan 012345/123456/654321/987654
+ audit event `ubah_pin` menyimpan actor/id wallet/waktu saja, tanpa request payload/hash/PIN
+ samakan respons salah PIN menjadi pesan generik; pertahankan counter dan lockout 3/15
// PinSecuritySettings.jsx
+ kontrol show/hide per field; error terikat ke field bila server mengirim errors
+ password reset pakai autocomplete=current-password; PIN fields tetap autocomplete=off
```

**Test baru:** `test_pin_change_hashes_values_and_responses_never_include_pin` lulus, mencakup hash dan tidak muncul di respons; test yang sama memastikan wallet show tidak memiliki `pin_transaksi`. Belum ada test baru untuk PIN lama salah, lockout 3 kali, PIN lemah, 401 tanpa token, Driver lain, log audit tanpa nilai—daftar wajib sebelum patch PIN.

**Keputusan:** usulan menolak PIN enam digit yang semuanya sama dan urutan berurutan naik/turun (termasuk wrap-around? disarankan tanpa wrap-around); apakah alur reset PIN yang sudah ada dipertahankan dengan verifikasi password atau dihapus dari UI sesuai instruksi “jangan dibangun”; berapa masa lockout/limit selain nilai aktif 3 kali/15 menit.

## 4. Kejelasan informasi port di detail station

**Status: ⚠️ Sebagian.** API sudah membawa field teknis charger/port dan satu helper konektor dipakai bersama, tetapi label ringkasan, pemetaan status, konteks jumlah, dan badge kecocokan belum konsisten.

| Layar | Label yang tampak dan field sumber | Gap |
|---|---|---|
| Daftar/peta Driver | `DriverDashboard.jsx:2064`: `{charger_tersedia}/{charger_total} port tersedia`; pada kartu station juga gabungan daftar konektor dan jumlah (`:2061-2064`). Field berasal dari `/stations` normalisasi `api/station.js` (`charger_tersedia`, `charger_total`, `tipe_konektor`). | `charger_tersedia` bernama seolah hitung charger tetapi dipresentasikan port. Konektor digabung tanpa label per unit; “2/3” tanpa teks eksplisit “dari”. |
| Detail station | `StationDetail.jsx:143`: angka `charger_tersedia/charger_total` + label “Port tersedia”; `:194-200` chip konektor dengan hitungan; `:207-215` kode perangkat—nomor port, konektor, `tipe_charging`, daya, badge “Cocok”. | Tak ada kartu per charger/jumlah port per charger. Ringkasan total memakai field station, sementara rincian dihitung flatten dari `chargers[].ports` (`:72-92`), raw count bisa tidak cocok jika API agregat berbeda. Label chip masih `2/3 tersedia`. Badge hanya “Cocok”, tidak menyebut kendaraan aktif atau alasan. |
| Pilihan charger/port | `StartCharging.jsx:314`: konektor · `tipe_charging` · daya; port berasal dari detail station (`:67`, `:310-319`). | Nama per charger/kode dan nomor port perlu dibaca berdampingan; label tipe status/pilihan berbeda dari helper yang sama. |
| Kartu sesi aktif | `DriverDashboard.jsx:1821` dan sekitar panel sesi menampilkan charger/port dan ringkasan sesi. | Belum ada bukti kartu sesi merangkum nomor/konektor dengan glosarium konsisten; rincian invoice menunjukkan keduanya. |

Konektor dipetakan oleh `api/station.js` `KONEKTOR_LABEL` (`type_2`, `ccs2`, dst.). Status hanya dipetakan lokal oleh `StationDetail.jsx:7-16`: `Out of Order` diberi label “Perawatan”, `Maintenance` juga “Perawatan”, `offline` “Offline”, sedangkan `Reserved` “Dipesan”. Ini menggabungkan gangguan dengan maintenance dan tidak memenuhi label seragam “Gangguan / Maintenance / Nonaktif”. Untuk status tak dikenal fallback menampilkan raw string (`:18`). Status charger mesin belum terlihat terpetakan konsisten ke badge port.

Field `tipe_charging` sudah ada di port (API) dan divalidasi menjadi AC/DC di `OperationsController.php:430`; UI boleh menampilkan nilai yang tersimpan tanpa mengira-ngira dari konektor. Daya maksimum, kode charger, nomor port, konektor, status, dan tarif per kWh tersedia pada field database/API. Tidak ada dasar untuk menambahkan spesifikasi baru saat ini.

### Usulan patch (diff konseptual)

```diff
// frontend/src/api/station.js
+ export portStatusLabel(status) dan chargerStatusLabel(status) sebagai satu pemetaan ID->label/tone
// StationDetail.jsx, StartCharging.jsx, kartu station/sesi DriverDashboard.jsx
- `${available}/${total} tersedia`
+ `${available} dari ${total} port tersedia`
- `konektor · AC/DC · daya`
+ per charger: `${kode} · ${daya} kW · ${arus bila tersedia} · ${n} port`
+ per port: `Port ${nomor} · konektor · status terjemahan · Rp…/kWh`
+ badge `Cocok dengan {kendaraan aktif}` / `Konektor tidak cocok: {alasan}`
```

Tarif port hanya tersedia jika API detail menyertakan tarif sesi/station; saat ini `StationDetail` menampilkan tarif station pada bagian terpisah, bukan setiap port. Satukan selector tarif aktif jika diperlukan agar tidak mengulang nilai.

**Test baru:** tidak ada test UI/helper label; tidak menjalankan browser. **Keputusan:** apakah operator tetap boleh mengatur nilai `tipe_charging` bebas (endpoint Operator lama menerima string) atau semua data diseragamkan AC/DC sebelum UI mengandalkan nilai itu.

## 5. Riwayat transaksi dan nota

**Status: ⚠️ Sebagian.** Item riwayat Driver dapat diklik untuk membuka modal nota; invoice charging cukup kaya dan nilai dasar konsisten dengan test biaya. Nota Top Up belum memuat biaya layanan snapshot, tombol salin ID tidak ada, status nota belum diberi tone merah yang jelas. Jalur gateway/top-up yang dipetakan di laporan Part 2 tetap perlu diperbaiki/dituntaskan sebelum nota bisa dijamin muncul di riwayat.

### Rantai dan konten

- Driver memuat daftar lewat `DriverDashboard.jsx:1070-1085` (`getPaymentHistory`, `GET /api/payments/history`); klik baris (`:2182`) memanggil `handleOpenInvoice` (`:1185-1204`), lalu `GET /api/payments/{id}` melalui API payments. Modal loading/error/sukses berada di `:2716-2811`; cetak/PDF tersedia (`:2803-2809`). Ini adalah item yang dapat dibuka dan ada nota modal.
- Backend invoice transaksi memakai `PaymentController::show/presentDetail` (`PaymentController.php:38-66,105-164`), dibatasi ke pembayaran sesi/topup milik user (`:51-54,69-78`). Invoice sesi alternatif ada di `ChargingSessionController::invoice/presentInvoice` (`:72-80,1034-1067`).
- **Charging:** detail saat ini membawa ID pembayaran/sesi, station, charger/port, kendaraan, energi, tarif, biaya energi/parkir, total, saldo hold dan pengembalian, metode, status, waktu mulai/selesai (`PaymentController.php:130-162`). UI menghitung durasi (`DriverDashboard.jsx:2780`), metode/status/hold/refund/total ditampilkan. Catatan “sesi dijeda”/durasi jeda tidak ada pada payload invoice yang diaudit. Label sumber pembayaran menampilkan nama metode dari Payment, bukan memastikan string “Dompet Digital” di semua transaksi. ID tampil sebagai “Nomor invoice”; tidak ada aksi salin.
- **Top Up:** backend detail hanya mengirim ID, metode, nominal sebagai `biaya_aktual`, status, referensi dan waktu (`PaymentController.php:108-123`). Field snapshot fee/biaya layanan dan total terpisah tidak ada; modal Top Up (`DriverDashboard.jsx:2759-2768`) hanya menampilkan metode, waktu, referensi, status dan total. Riwayat pembayaran memetakan Payment termasuk topup jika terhubung (`PaymentController.php:17-34,83-101`), namun alur gateway dalam temuan Part 2 perlu diuji end-to-end dan tidak boleh diasumsikan sudah membuat relasi Payment yang sama.
- Status sesi `Gagal` dipetakan label (`ChargingSessionController.php:1097-1105`); UI badge status pembayaran invoice tidak jelas memakai warna merah khusus untuk gagal/terhenti. Test biaya yang ada: `CostConsistencyVerificationTest::test_case1_normal` menegaskan 6 kWh × Rp2.500 + parkir Rp2.000 = Rp17.000; `test_case3_failed_zero` menegaskan 0 kWh = Rp2.000; `DriverManagementTest::test_h2...` membandingkan settlement, invoice, history dan laporan pendapatan.
- Ringkasan saat ini literal “N transaksi · 2 tabel, maksimal 5 per tabel” (`DriverDashboard.jsx:2078`), padahal layout membagi menjadi dua kolom/daftar, bukan dua tabel transaksi dengan makna data berbeda.

### Hak akses dan test

Test baru `test_payment_invoice_is_private_and_requires_authentication` di `DriverPart1AuditTest.php` membuktikan tanpa token 401, pemilik dapat membaca invoice Top Up, dan Driver lain mendapat 404. Test charging 17.000/2.000 sudah ada seperti di atas. Suite test hanya menguji response API dan kontrak; tidak membuktikan rendering visual browser.

### Usulan patch (diff konseptual)

```diff
// PaymentController::presentDetail(topup)
+ nominal, biaya_layanan_snapshot, total_dibayar, waktu/status topup; jangan ambil fee konfigurasi terbaru
// PaymentController::presentDetail(charging) + ChargingSessionController::presentInvoice
+ status sesi terjemahan + flag/keterangan sesi pernah dijeda dan total durasi jeda bila disimpan
+ pastikan tarif per kWh dari snapshot tarif sesi, dan metode Driver selalu `Dompet Digital`
// DriverDashboard.jsx
+ tombol salin ID transaksi yang dapat diakses keyboard
+ badge merah untuk Gagal/Terhenti
- `N transaksi · 2 tabel, maksimal 5 per tabel`
+ `N transaksi · ditampilkan dalam 2 kolom, maksimal 5 per kolom`
```

**Keputusan:** apakah nota Top Up harus menampilkan biaya layanan sebagai baris terpisah dan siapa menanggung biaya; apakah tombol bagikan PDF tetap diperlukan selain print; sumber/kebijakan durasi jeda untuk nota jika belum disimpan. Tidak mengimplementasikan transaksi tambahan atau mengubah aturan biaya.

## Perbaikan yang diprioritaskan

| Prioritas | File | Pekerjaan | Effort |
|---|---|---|---|
| 1 | `frontend/src/main.jsx`, `frontend/src/api/auth.js`, `frontend/src/app.jsx` | Hilangkan/isolasi debug identity dan bersihkan state user saat logout/ganti akun | S |
| 2 | `backend/app/Http/Controllers/Api/DompetPinController.php`, `frontend/src/PinSecuritySettings.jsx` | Tambah aturan PIN lemah, error generik, audit tanpa secret, kontrol UI dan test lockout/401/IDOR | M |
| 3 | `backend/app/Http/Controllers/Api/PaymentController.php`, `frontend/src/DriverDashboard.jsx` | Lengkapi nota Top Up/charging, status, salin ID; uji top-up gateway sesuai Part 2 | M |
| 4 | seluruh validator telepon + `frontend/src/utils/phone.js` + migrasi data | Terapkan minimum setelah keputusan dan audit data aktual; aturan 15 digit sudah berjalan | M |
| 5 | `frontend/src/api/station.js`, `StationDetail.jsx`, `StartCharging.jsx`, `DriverDashboard.jsx` | Satukan label/status dan tampilkan identitas charger/port serta kecocokan kendaraan | M |
| 6 | `frontend/src/Login.jsx`, `Registrasi.jsx` | Atur autocomplete yang tepat dan hilangkan domain Admin/Operator dari placeholder registrasi | S |

## Hasil test

- Awal audit: **68 test, 621 assertions lulus**.
- Feature test baru terpilih: **5 test, 104 assertions lulus**.
- Suite lengkap akhir: **73 test, 725 assertions lulus**.
- Test database memakai SQLite in-memory; tidak menjalankan perintah tulis pada DB development.

## Batas verifikasi

- ❓ Autofill oleh browser/password manager dan kerusakan visual: perlu reproduksi pada browser dan profil browser yang mengalami gejala. Kode menunjukkan atribut yang kurang; tidak membuktikan data yang diisi browser.
- ❓ Nomor telepon pada seluruh DB development: perlu query `SELECT` agregat panjang/format. Seed yang diperiksa lolos aturan panjang baru.
- ❓ Nota gateway Top Up di jalur UI: lihat temuan rantai Top Up pada `AUDIT_DRIVER_PART2.md`; status tidak disimpulkan dari mock atau test lama saja.

**Mohon pilih temuan mana yang ingin diperbaiki terlebih dahulu.** Kandidat keputusan: minimum dan keunikan telepon; kebijakan PIN lemah/reset; isolasi `?debug`; detail nota dan biaya layanan Top Up; atau konsistensi label port.
