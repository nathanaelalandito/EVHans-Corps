# PRD Template - EVChargeHub

Template ini disesuaikan dari studi kasus "Sistem Manajemen Charging EV" untuk proyek Rekayasa Perangkat Lunak 2026. Gunakan dokumen ini sebagai dasar BRD/PRD sebelum diturunkan ke SRS, SDD, diagram, backlog, dan test plan.

## 1. Informasi Dokumen

| Item          | Isi                                                           |
| ------------- | ------------------------------------------------------------- |
| Nama sistem   | EVChargeHub                                                   |
| Jenis sistem  | Sistem manajemen charging kendaraan listrik                   |
| Dokumen       | Product Requirements Document / Business Requirement Document |
| Versi         | `[v1.0]`                                                      |
| Status        | `[Draft / Review / Final]`                                    |
| Tanggal       | `[DD MMM YYYY]`                                               |
| Scrum Master  | Yohanes Wisnu Chrisandaru                                     |
| Product Owner | Argo Wibowo, S.T., M.T.; Rosa Delima, S.Kom, M.Kom            |

## 2. Ringkasan Produk

EVChargeHub adalah sistem untuk mengelola stasiun pengisian kendaraan listrik, lokasi charging station, unit charger, sesi charging, Dompet Digital, hold saldo, pembayaran, status transaksi, dan laporan operasional. Sistem menyediakan aplikasi mobile/web mobile untuk pengemudi EV dan web dashboard untuk operator serta admin.

Tujuan utama sistem adalah membantu pengemudi menemukan charging station terdekat yang sesuai dengan kendaraan, memulai sesi charging, memantau proses charging, dan menyelesaikan transaksi menggunakan Dompet Digital EVChargeHub. Di sisi operasional, sistem membantu operator dan admin memantau status station, unit charger, konektor, tarif, transaksi, dan laporan.

## 3. Latar Belakang

Pertumbuhan kendaraan listrik membuat kebutuhan platform digital charging semakin penting. Pengemudi membutuhkan informasi lokasi, tipe konektor, tarif, status ketersediaan, dan pembayaran yang mudah. Operator membutuhkan dashboard untuk memantau station yang ditugaskan, memperbarui status operasional secara manual, serta melihat penggunaan dan pendapatan. Admin membutuhkan kontrol terhadap akun, hak akses, audit operasional, dan konfigurasi sistem.

## 4. Tujuan Produk

- Memudahkan pengemudi EV menemukan charging station terdekat dan sesuai tipe konektor kendaraan.
- Memastikan pengemudi dapat memulai, memantau, menghentikan, dan menyelesaikan sesi charging.
- Menyediakan Dompet Digital EVChargeHub dengan PIN keamanan dan mekanisme hold saldo.
- Membantu operator memantau station, unit charger, konektor, tarif, dan laporan operasional.
- Membantu admin mengelola operator, hak akses, station, konfigurasi, dan audit.
- Menghasilkan dokumentasi RPL yang lengkap: BRD, SRS, SDD, use case diagram, activity diagram, ERD/class diagram, backlog, dan test plan.

## 5. Ruang Lingkup

### Termasuk

- Registrasi dan login pengemudi.
- Kelola profil pengemudi, kendaraan, PIN keamanan, dan Dompet Digital.
- Top up Dompet Digital melalui payment gateway.
- Pencarian charging station terdekat.
- Cari station berdasarkan nama, kode panggil, atau alamat; filter konektor, daya, tarif, dan ketersediaan. Filter rating hanya digunakan jika data ulasan yang sah tersedia.
- Detail station, lokasi, jarak, charger, konektor, daya, tarif, dan status ketersediaan.
- Validasi charger sebelum sesi dimulai.
- Estimasi biaya charging dan biaya parkir flat.
- Hold saldo berdasarkan estimasi total biaya.
- Memulai, memantau, dan menghentikan sesi charging.
- Pencatatan daya aktual, durasi, biaya, dan status sesi.
- Penyelesaian transaksi berdasarkan biaya aktual.
- Struk/invoice digital dan riwayat transaksi.
- Monitoring operator terhadap station, konektor, unit charger, dan laporan.
- Manajemen admin untuk operator, hak akses, station, audit, dan konfigurasi.

### Tidak Termasuk

- Booking charger.
- Sistem antrean internal.
- Refund manual sebagai fitur utama.
- Pelaporan kerusakan konektor di luar sistem.
- Registrasi mandiri operator.

### Catatan Scope

- Antrean dianggap berada pada sistem pihak ketiga atau mekanisme operasional parking system.
- Biaya parkir hanya dihitung saat proses charging berlangsung.
- Refund digantikan oleh otomasi hold saldo dan penyelesaian biaya aktual.
- Satu Operator dapat ditugaskan ke beberapa station dan satu station dapat ditangani beberapa Operator; akses Operator dibatasi pada station yang ditugaskan.
- Station boleh dibuat tanpa Operator, tetapi harus berstatus Nonaktif sampai ada Operator yang ditugaskan.

## 6. Aktor Sistem

| Aktor                     | Peran                                                                                                                      |
| ------------------------- | -------------------------------------------------------------------------------------------------------------------------- |
| Pengemudi EV              | Mencari lokasi, memilih charger, mengelola kendaraan, memulai sesi charging, memantau proses, dan menyelesaikan transaksi. |
| Operator Charging Station | Mengubah status operasional secara manual, tarif, dan laporan pada station yang ditugaskan.                                |
| Admin Sistem              | Mengelola akun operator, hak akses, station, penugasan operator, konfigurasi sistem, dan audit operasional.                |
| Payment Gateway           | Memproses top up, mengirim status transaksi, dan membantu rekonsiliasi pembayaran.                                         |
| Sistem EVChargeHub        | Menjalankan simulasi charging; status charging mengikuti sesi aktif dan diperbarui sistem saat sesi berakhir.              |

## 7. Alur Proses Utama

### 7.1 Registrasi dan Persiapan Pengemudi

1. Pengemudi membuka aplikasi EVChargeHub.
2. Sistem menampilkan halaman login dan registrasi.
3. Pengemudi memilih registrasi jika belum memiliki akun.
4. Pengemudi mengisi data pribadi.
5. Pengemudi membuat PIN keamanan.
6. Pengemudi mengisi data kendaraan dan tipe konektor.
7. Sistem membuat Dompet Digital EVChargeHub.
8. Sistem menyimpan akun, kendaraan, PIN, dan Dompet Digital.
9. Pengemudi login dan masuk ke dashboard.

### 7.2 Dashboard dan Pencarian Charging Station

1. Sistem menampilkan dashboard berisi informasi pengguna, kendaraan aktif, saldo, lokasi, dan station sekitar.
2. Pengemudi memilih kendaraan yang akan digunakan.
3. Sistem meminta lokasi perangkat; jarak dan urutan terdekat hanya tersedia setelah GPS valid. Jika izin ditolak/tidak tersedia, station tetap ditampilkan tanpa jarak palsu dan tersedia tindakan coba lagi.
4. Sistem menyesuaikan station berdasarkan tipe konektor kendaraan.
5. Dashboard menampilkan maksimal tiga station rekomendasi yang kompatibel dengan konektor kendaraan dan diurutkan berdasarkan jarak bila GPS valid. Filter Maps hanya mengubah hasil Maps. Halaman Maps menampilkan peta dan daftar station secara bersamaan; memilih station di daftar menyorot marker terkait dan memilih marker menyorot station yang sama.
6. Pengemudi memilih charging station.
7. Sistem menampilkan detail station, jarak bila GPS valid, jumlah port, tipe konektor, daya, tarif, dan ketersediaan.
8. Pengemudi memilih charger yang tersedia.
9. Sistem memvalidasi ketersediaan charger.

### 7.3 Estimasi Biaya dan Hold Saldo

1. Pengemudi tiba di station dan menghubungkan kendaraan ke charger.
2. Pengemudi menentukan kebutuhan daya charging.
3. Sistem menghitung estimasi biaya charging.
4. Sistem menghitung biaya parkir flat selama proses charging.
5. Sistem menampilkan total estimasi biaya.
6. Pengemudi mengonfirmasi transaksi.
7. Sistem memeriksa saldo Dompet Digital.
8. Jika saldo kurang, pengemudi melakukan top up.
9. Jika saldo cukup, sistem melakukan hold saldo.

### 7.4 Memulai dan Menjalankan Sesi Charging

1. Pengemudi melakukan otorisasi memulai sesi charging.
2. Sistem memvalidasi charger yang dipilih.
3. Jika validasi berhasil, sesi charging dimulai.
4. Status charger berubah menjadi Digunakan/Charging.
5. Charger mengirim daya aktual dan durasi secara berkala.
6. Sistem mencatat data sesi.
7. Pengemudi melihat progress charging.
8. Pengemudi dapat menghentikan sesi sesuai kebutuhan.

### 7.5 Penyelesaian Sesi dan Transaksi

1. Sesi berakhir karena charging selesai atau dihentikan pengemudi.
2. Sistem menerima data akhir sesi.
3. Sistem menghitung biaya charging aktual berdasarkan daya aktual.
4. Sistem menghitung biaya parkir.
5. Sistem menentukan total biaya transaksi aktual.
6. Sistem menyelesaikan transaksi dari dana yang di-hold.
7. Sistem menyimpan status dan data transaksi.
8. Sistem menerbitkan struk/invoice digital.
9. Status charger diperbarui menjadi Tersedia jika dapat digunakan kembali.

### 7.6 Penanganan Charging Gagal atau Terhenti

1. Sistem menerima informasi gangguan atau charging terhenti.
2. Sistem mencatat daya aktual yang sudah masuk.
3. Sistem menghitung biaya berdasarkan penggunaan aktual dan biaya parkir.
4. Sistem menyelesaikan transaksi dari dana yang di-hold.
5. Sistem mencatat status Charging Gagal/Terhenti.
6. Sistem memberi informasi kepada pengemudi.
7. Sistem memperbarui invoice digital dan riwayat transaksi.
8. Status charger diperbarui sesuai kondisi akhir perangkat.

### 7.7 Penghentian Sesi dan Perubahan Status oleh Operator

1. Operator membuka ringkasan station aktif dan melihat kondisi port serta sesi yang berjalan.
2. Untuk menghentikan sesi, Operator memilih **Akhiri sesi** dan wajib mengisi alasan.
3. Sistem menyelesaikan sesi seperti penghentian normal: menghitung energi dan biaya aktual, memproses pembayaran, lalu mengembalikan sisa saldo hold.
4. Jika Operator menandai charger/port yang sedang digunakan sebagai Gangguan atau Perawatan, sistem menyelesaikan sesi aktif terlebih dahulu.
5. Setelah sesi dan saldo selesai direkonsiliasi, sistem memperbarui status charger/port.
6. Sistem mencatat aktor, station, alasan, waktu, status sebelum/sesudah, energi, biaya, dan saldo yang dikembalikan.
7. Jika penyelesaian sesi gagal, perubahan status perangkat ikut dibatalkan.

### 7.8 Perubahan Status Station

1. Admin atau Operator yang ditugaskan memilih status baru untuk station.
2. Perubahan status station tidak menghentikan sesi yang sedang berjalan.
3. Station berstatus Nonaktif atau Maintenance menolak sesi charging baru, tetapi sesi aktif tetap diselesaikan seperti biasa.
4. Perubahan status wajib disertai alasan dan dicatat bersama aktor, waktu, serta status sebelum/sesudah.

### 7.9 Pengelolaan Data Teknis Charger

1. Admin dapat mengelola data teknis charger dan port pada seluruh station.
2. Operator dapat mengelola data teknis charger dan port hanya pada station tugasnya.
3. Setiap perubahan data teknis wajib menyertakan alasan.
4. Sistem mencatat aktor, waktu, alasan, dan nilai sebelum/sesudah pada audit operasional.

### 7.10 Workspace Station dan Charger

1. Operator melihat station sesuai penugasannya; Admin dapat mencari seluruh station.
2. Pengguna dapat mencari station berdasarkan nama/alamat dan memfilter berdasarkan status operasional.
3. Daftar membedakan jumlah unit charger yang berstatus operasional dari jumlah port yang tersedia.
4. Ringkasan detail station menampilkan status lokasi, jumlah unit operasional, port tersedia, jam operasional, dan status penugasan Operator untuk Admin.
5. Detail dikelompokkan menjadi Ringkasan, Charger & Port, dan Tarif agar data operasional dan pengaturan mudah dipindai.
6. Form tarif menampilkan tarif berjalan, tarif yang akan disimpan, waktu berlaku, dan penjelasan bahwa sesi aktif mempertahankan tarif saat sesi dimulai.
7. Konfirmasi perubahan status menjelaskan dampak dan prasyarat sesuai aturan perubahan status pada bagian 7.7 dan 7.8.

### 7.11 Penambahan Station oleh Admin

1. Admin membuka halaman khusus Tambah Station dengan tahapan Informasi, Operator, Tarif awal, dan Tinjau & simpan.
2. Station baru selalu dibuat dengan status Nonaktif.
3. Admin boleh menyimpan station sebagai Nonaktif tanpa Operator dan tanpa tarif awal; jika tarif mulai diisi, semua nilai tarif wajib lengkap.
4. Untuk memilih Simpan & Aktifkan, Admin wajib memilih sekurangnya satu Operator aktif atau membuat akun Operator baru serta mengisi alasan aktivasi. Tarif awal dapat diatur dalam wizard atau setelah station dibuat.
5. Pembuatan akun Operator dari alur ini sekaligus menugaskan Operator tersebut ke station baru.
6. Penambahan station ke Operator yang sudah ada mempertahankan penugasan Operator pada station lain.
7. Jika proses lanjutan gagal setelah station tercipta, station tetap Nonaktif dan Admin dapat melanjutkan proses tanpa membuat station duplikat.
8. Sistem membuat kode panggil unik seperti `SPKLU-0007`, terpisah dari ID database dan nama station. Nama station tidak menyimpan awalan nama produk.
9. Pencarian titik lokasi menerima pencarian alamat yang dikirim secara eksplisit, pemilihan hasil, serta pemilihan manual pada peta.
10. Email akun Operator memakai domain tetap `@ops.ac.id`; Admin hanya mengisi bagian nama email.

Aturan tarif minimum:

- Harga per kWh dan biaya parkir merupakan komponen tarif utama.
- Biaya minimum charging bersifat opsional dan default Rp0. Jika nilainya Rp0, sistem hanya menghitung energi berdasarkan harga per kWh.
- Jika biaya minimum diisi lebih dari Rp0, nilai tersebut menjadi batas bawah biaya energi; biaya parkir tetap dihitung terpisah.

## 8. Kebutuhan Fungsional

| Kode | Kebutuhan                             | Aktor                              | MoSCoW | Catatan                                                    |
| ---- | ------------------------------------- | ---------------------------------- | ------ | ---------------------------------------------------------- |
| FR01 | Registrasi Akun Pengemudi             | Pengemudi                          | MUST   | Pintu masuk penggunaan sistem.                             |
| FR02 | Login Pengemudi                       | Pengemudi                          | MUST   | Autentikasi sebelum mengakses fitur.                       |
| FR03 | Kelola Profil Pengemudi               | Pengemudi                          | SHOULD | Melihat dan memperbarui data pribadi; nomor telepon hanya angka, maksimal 15 digit. |
| FR04 | Kelola Kendaraan                      | Pengemudi                          | MUST   | Tipe konektor digunakan untuk rekomendasi charger.         |
| FR05 | Kelola PIN Keamanan                   | Pengemudi                          | MUST   | PIN 6 digit digunakan sebagai verifikasi transaksi. Pengemudi membuat, mengubah, dan mengatur ulang PIN (dengan password akun) dari menu Pengaturan; status PIN dan status dompet terkunci terlihat di layar yang sama. |
| FR06 | Kelola Dompet Digital                 | Pengemudi                          | MUST   | Setiap pengemudi memiliki wallet EVChargeHub.              |
| FR07 | Top Up Dompet Digital                 | Pengemudi, Payment Gateway         | MUST   | Top up melalui metode pembayaran tersedia.                 |
| FR08 | Melihat Saldo Dompet Digital          | Pengemudi                          | MUST   | Saldo diperlukan sebelum transaksi.                        |
| FR09 | Melihat Charging Station Terdekat     | Pengemudi                          | MUST   | Dashboard merekomendasikan maksimal tiga station kompatibel; jarak hanya ditampilkan bila GPS valid. Filter Maps tidak mengubah rekomendasi dashboard. |
| FR10 | Melihat Detail Charging Station       | Pengemudi                          | MUST   | Lokasi, jarak bila GPS valid, jumlah port, konektor, daya, tarif, dan status. |
| FR11 | Melihat Ketersediaan Charger          | Pengemudi, Sistem                  | MUST   | Status operasional diubah Operator; status charging mengikuti sesi. |
| FR12 | Cari dan Filter Charging Station      | Pengemudi                          | SHOULD | Pencarian nama/kode/alamat, dropdown konektor, daya, tarif, dan ketersediaan berlaku pada satu panel hasil Maps. Peta dan daftar tampil bersamaan dan pilihan station saling tersinkron. Rating hanya bila tersedia dari ulasan nyata. |
| FR13 | Navigasi menuju Charging Station      | Pengemudi                          | SHOULD | Membantu menuju station yang dipilih.                      |
| FR14 | Kelola Charging Station               | Operator, Admin                    | MUST   | Operator mengubah status operasional sesuai penugasan; Admin mengelola data utama. |
| FR15 | Kelola Informasi Lokasi               | Admin                              | MUST   | Data master lokasi dikelola Admin.                         |
| FR16 | Kelola Status Charging Station        | Operator, Admin                    | MUST   | Operator pada station tugasnya; Admin pada seluruh station. Alasan wajib; perubahan station tidak menghentikan sesi aktif tetapi mencegah sesi baru saat Nonaktif/Maintenance. |
| FR17 | Kelola Unit Charger                   | Admin, Operator                    | MUST   | Keduanya mengelola data teknis charger/port; Operator dibatasi station tugas. Perubahan data teknis/status wajib disertai alasan dan dicatat di audit. Perubahan status charger/port aktif menuntaskan sesi dan hold lebih dulu. |
| FR18 | Monitoring Status Charger             | Operator, Admin                    | MUST   | Status operasional diubah manual oleh Operator; Admin memantau seluruh station. |
| FR19 | Monitoring Data Charging              | Sistem                             | MUST   | Progres dan status berasal dari sesi aktif di server; dashboard menyinkronkan ulang dan tidak mempertahankan sesi yang sudah tidak aktif. |
| FR20 | Validasi Pemilihan Charger            | Pengemudi, Sistem                  | MUST   | Mencegah dua pengguna memakai port yang sama.               |
| FR21 | Memulai Sesi Charging                 | Pengemudi, Sistem                  | MUST   | Proses inti tanpa aktor perangkat charger. Arrival Check harus mengikuti konfigurasi Admin dan radius aktual backend; jika nonaktif, Driver dapat memulai simulasi jarak jauh. |
| FR22 | Monitoring Sesi Charging              | Pengemudi, Sistem                  | MUST   | Progres, estimasi biaya, dan status sinkron dengan server; kegagalan sinkronisasi ditampilkan kepada pengemudi. |
| FR23 | Menghentikan Sesi Charging            | Pengemudi, Operator, Sistem        | MUST   | Operator wajib memberi alasan; biaya aktual dihitung dan sisa hold dikembalikan. |
| FR24 | Mencatat Data Sesi Charging           | Sistem                             | MUST   | Waktu, energi simulasi, durasi, biaya, dan status.         |
| FR25 | Menangani Charging Terhenti/Gagal     | Operator, Sistem                   | MUST   | Penghentian operasional menyelesaikan sesi dan hold sebelum status unit berubah. |
| FR26 | Kelola Tarif Charging                 | Operator, Admin                    | MUST   | Keduanya dapat mengubah tarif; Operator dibatasi station tugas. Langsung atau terjadwal. |
| FR27 | Menghitung Estimasi Biaya Charging    | Sistem                             | MUST   | Dasar hold saldo.                                          |
| FR28 | Menghitung Biaya Charging Aktual      | Sistem                             | MUST   | Berdasarkan daya aktual.                                   |
| FR29 | Menghitung Biaya Parkir               | Sistem                             | MUST   | Tarif parkir flat saat charging berlangsung.               |
| FR30 | Menghitung Total Biaya Transaksi      | Sistem                             | MUST   | Biaya charging ditambah biaya parkir.                      |
| FR31 | Memilih Sumber Pembayaran             | Pengemudi                          | MUST   | Charging menggunakan Dompet Digital.                       |
| FR32 | Validasi Saldo Dompet Digital         | Sistem                             | MUST   | Saldo harus cukup untuk estimasi.                          |
| FR33 | Hold Saldo Transaksi                  | Sistem, Dompet Digital             | MUST   | Hold berdasarkan estimasi biaya.                           |
| FR34 | Menyelesaikan Transaksi Charging      | Sistem                             | MUST   | Biaya aktual diambil dari dana hold.                       |
| FR35 | Menangani Pembayaran Gagal            | Sistem, Payment Gateway            | MUST   | Status gagal dicatat dan diinformasikan.                   |
| FR36 | Rekonsiliasi Status Transaksi         | Sistem, Payment Gateway            | SHOULD | Status pembayaran mengikuti hasil settlement biaya aktual dan hold. |
| FR37 | Menerbitkan Struk/Invoice Digital     | Sistem, Pengemudi                  | MUST   | Pengemudi membuka nota dari Riwayat Transaksi untuk sesi charging maupun Top Up. Nota memuat rincian yang tersimpan, dapat dicetak, dan dapat dibagikan sebagai PDF; unduh PDF menjadi fallback bila berbagi file tidak didukung. Data yang tidak tersedia ditandai dengan jelas dan tidak dihitung ulang dari tarif terkini. |
| FR38 | Melihat Riwayat Transaksi             | Pengemudi                          | MUST   | Riwayat charging dan top up, difilter menurut periode/kata kunci; ditampilkan dalam dua tabel, maksimal lima transaksi per tabel. Top Up memakai panah ke atas dan warna hijau dengan nominal positif; pembayaran memakai panah ke bawah dan warna merah dengan nominal negatif. Status tetap ditampilkan terpisah.
| FR39 | Melihat Laporan Pendapatan            | Operator, Admin                    | SHOULD | Admin melihat lintas station dengan filter periode, station, dan charger; Operator hanya station tugas. |
| FR40 | Melihat Laporan Utilisasi Charger     | Operator, Admin                    | SHOULD | Filter periode, station, dan charger; cakupan data mengikuti hak akses. |
| FR41 | Melihat Laporan Gangguan Perangkat    | Operator, Admin                    | SHOULD | Gangguan tercatat; cakupan data mengikuti hak akses.       |
| FR42 | Notifikasi Status Charging            | Pengemudi                          | SHOULD | Selesai atau terganggu.                                    |
| FR43 | Notifikasi Pembayaran Gagal           | Pengemudi                          | SHOULD | Info kegagalan transaksi.                                  |
| FR44 | Notifikasi Gangguan Charger           | Operator, Admin, Pengemudi         | SHOULD | Info gangguan perangkat.                                   |
| FR45 | Kelola Akun Operator                  | Admin                              | MUST   | Admin dapat membuat dan mengelola akun Operator; direktori menyediakan pencarian nama/email/telepon serta filter status akun dan station tugas. Keberhasilan atau kegagalan pembuatan akun ditampilkan jelas pada form; daftar diperbarui setelah akun berhasil dibuat. |
| FR46 | Kelola Hak Akses Operator             | Admin                              | MUST   | Operator dapat memiliki beberapa station tugas dan satu station dapat memiliki beberapa Operator. Admin mengelola daftar petugas dari detail station, memilih beberapa Operator aktif, meninjau ringkasan perubahan, lalu menyimpan sekaligus; perubahan satu station tidak mengubah penugasan di station lain. |
| FR47 | Kelola Station dan Penugasan Operator | Admin                              | MUST   | Station aktif wajib memiliki minimal satu Operator aktif. Admin tidak dapat menyimpan perubahan yang mengosongkan petugas station aktif; station harus dinonaktifkan terlebih dahulu atau diberi Operator pengganti. |
| FR48 | Konfigurasi Sistem                    | Admin                              | SHOULD | Admin dapat mengubah konfigurasi operasional dan simulasi proyek; Arrival Check dan radius berlaku konsisten pada UI Driver serta validasi server, dan perubahan diaudit. |
| FR49 | Audit Operasional                     | Admin                              | MUST   | Perubahan data teknis, status station/charger/port, tarif, penugasan, dan penghentian sesi dicatat dengan aktor, alasan jika diwajibkan, waktu, dan nilai sebelum/sesudah. |
| FR50 | Ringkasan Dashboard Admin             | Admin                              | MUST   | Halaman awal merangkum kondisi lintas station, sesi berjalan, pendapatan, serta station yang perlu perhatian dan menyediakan akses cepat ke pengelolaan. |
| FR51 | Pencarian dan Ringkasan Station       | Operator, Admin                    | SHOULD | Cari nama/alamat dan filter status; pisahkan jumlah unit operasional dari port tersedia; detail dikelompokkan menjadi Ringkasan, Charger & Port, dan Tarif. |
| FR52 | Wizard Penambahan Station             | Admin                              | MUST   | Halaman bertahap untuk informasi, Operator, tarif awal, dan tinjauan; boleh simpan Nonaktif tanpa Operator, tetapi aktivasi mewajibkan minimal satu Operator aktif dan alasan. |
| FR53 | Kode Panggil Station                  | Sistem, Admin, Operator, Pengemudi | SHOULD | Kode unik `SPKLU-####` berbeda dari ID database dan dapat digunakan untuk mengenali/mencari station. |
| FR54 | Pencarian Lokasi Station              | Admin                              | SHOULD | Cari alamat secara eksplisit, pilih hasil untuk mengisi koordinat, atau tentukan titik manual pada peta. |
| FR55 | Email Akun Operator                   | Admin                              | MUST   | Admin mengisi nama email saja; sistem melengkapi domain tetap `@ops.ac.id`, mencegah autofill email akun Admin pada kolom nama email, dan memvalidasi keunikan alamat lengkap. Nomor telepon Operator hanya menerima angka, 1–15 digit. |
| FR56 | Kelola Charger dan Port               | Admin, Operator                    | MUST   | Admin dapat mengelola semua station; Operator hanya station yang ditugaskan. Keduanya dapat membuat dan mengubah data teknis serta status charger/port. Alasan perubahan dicatat dalam audit; status Sedang Mengisi mengikuti sesi sistem dan tidak dapat diatur manual. Jika status perangkat diubah saat sesi aktif, sistem menyelesaikan sesi berdasarkan energi aktual dan merekonsiliasi hold sebelum menerapkan status baru. |

## 9. Kebutuhan Nonfungsional

| Kode  | Kebutuhan                 | Kategori     | MoSCoW | Catatan                                                                                  |
| ----- | ------------------------- | ------------ | ------ | ---------------------------------------------------------------------------------------- |
| NFR01 | Keamanan Sistem           | Security     | MUST   | Data pembayaran dan kredensial dilindungi dengan enkripsi dan autentikasi kuat.          |
| NFR02 | Ketersediaan Sistem       | Availability | MUST   | Informasi station tetap tampil meskipun beberapa charger offline.                        |
| NFR03 | Kinerja Pencarian Station | Performance  | MUST   | Response time perlu didefinisikan ulang; sumber menyebut "24 jam" dan perlu klarifikasi. |
| NFR04 | Skalabilitas Sistem       | Scalability  | SHOULD | Mendukung penambahan banyak lokasi dan charger.                                          |
| NFR05 | Auditabilitas Sistem      | Auditability | MUST   | Transaksi, perubahan tarif/status operasional, dan penugasan Operator tercatat dengan aktor dan waktu. |
| NFR06 | Kemudahan Penggunaan      | Usability    | MUST   | Navigasi Dashboard Operator, Kelola Charger, dan Laporan konsisten dengan pola visual sidebar Admin, tetap menampilkan label pada desktop/tablet, dan beralih menjadi navigasi bawah pada mobile. Status loading, station kosong, dan kegagalan memuat harus dibedakan; sesi aktif disajikan dalam format yang mudah digunakan di layar kecil. |
| NFR07 | Keakuratan Lokasi Driver  | Accuracy     | MUST   | Sistem tidak menyajikan koordinat contoh sebagai GPS pengguna; jarak dikosongkan sampai lokasi valid. |
| NFR08 | Konsistensi Status Sesi   | Reliability  | MUST   | Status sesi Driver direkonsiliasi dengan server dan kegagalan sinkronisasi diberi umpan balik. |
| NFR09 | Hirarki Dashboard Driver  | Usability    | MUST   | Header responsif; konten desktop menempatkan Station Sekitar di kolom sekitar 30% dan Riwayat Transaksi sekitar 70%. Judul riwayat, Periode, dan Cari Transaksi berada sebaris pada desktop; dua tabel riwayat berdampingan menampilkan maksimal lima transaksi masing-masing. |

## 10. Entitas Data Awal

| Entitas          | Atribut Utama                                                                                     | Catatan                                              |
| ---------------- | ------------------------------------------------------------------------------------------------- | ---------------------------------------------------- |
| User             | `id_user`, `nama`, `email`, `nomor_telepon`, `peran`, `status_akun`                               | Pengemudi, operator, admin; `nomor_telepon` 1–15 digit angka. |
| Vehicle          | `id_vehicle`, `id_user`, `merek`, `model`, `nomor_polisi`, `tipe_konektor`                        | Kendaraan milik pengemudi.                           |
| Location         | `id_location`, `kode_station`, `nama_lokasi`, `alamat`, `latitude`, `longitude`, `jam_operasional`, `status` | Kode panggil unik terpisah dari ID database.         |
| Charger          | `id_charger`, `id_location`, `kode_perangkat`, `tipe_konektor`, `daya_kw`, `status`               | Unit charger di station.                             |
| Charging Session | `id_session`, `id_user`, `id_charger`, `waktu_mulai`, `waktu_selesai`, `energi_kwh`, `status`     | Data sesi charging.                                  |
| Tariff           | `id_tariff`, `id_location`, `harga_per_kwh`, `biaya_minimum (opsional, default 0)`, `biaya_parkir`, `periode_berlaku` | Minimum adalah batas bawah biaya energi jika diaktifkan. |
| Payment          | `id_payment`, `id_session`, `metode`, `jumlah`, `status`, `waktu_pembayaran`, `referensi_gateway` | Pembayaran dan status transaksi.                     |
| Wallet           | `[id_wallet]`, `id_user`, `[saldo]`, `[status]`                                                   | Perlu ditambahkan karena requirement Dompet Digital. |
| Wallet Hold      | `[id_hold]`, `[id_wallet]`, `[id_session]`, `[jumlah_hold]`, `[status_hold]`                      | Perlu ditambahkan untuk mekanisme hold saldo.        |
| Audit Log        | `[id_audit]`, `[aktor]`, `[aksi]`, `[data_sebelum]`, `[data_sesudah]`, `[timestamp]`              | Mendukung audit operasional.                         |

## 11. Use Case Utama

| Use Case                         | Aktor                              | Deskripsi                                                                        |
| -------------------------------- | ---------------------------------- | -------------------------------------------------------------------------------- |
| Registrasi dan Login Pengemudi   | Pengemudi EV                       | Pengemudi membuat akun, PIN, kendaraan, Dompet Digital, lalu login.              |
| Mencari Charging Station         | Pengemudi EV                       | Pengemudi mencari station berdasarkan lokasi, konektor, tarif, dan ketersediaan. |
| Memulai Sesi Charging            | Pengemudi EV, Sistem               | Pengemudi memilih port, sistem memvalidasi dan memulai simulasi sesi.             |
| Menyelesaikan Transaksi          | Pengemudi EV, Payment Gateway      | Sistem menyelesaikan biaya aktual dari dana hold dan menerbitkan invoice.        |
| Mengelola Station dan Charger    | Operator, Admin                    | Station, lokasi, charger, status, dan tarif dikelola sesuai hak akses.           |
| Monitoring Charger               | Operator, Admin                    | Operator mengubah status manual pada station tugas; sistem menandai port charging dari sesi aktif. |
| Melihat Laporan                  | Operator, Admin                    | Laporan pendapatan, utilisasi, dan gangguan perangkat.                           |
| Mengelola Operator dan Hak Akses | Admin                              | Admin membuat akun dan menetapkan satu atau beberapa station untuk Operator.     |

## 12. Risiko dan Keputusan

| Risiko/Pertanyaan                      | Keputusan Sementara                                                                                        | Tindak Lanjut                                         |
| -------------------------------------- | ---------------------------------------------------------------------------------------------------------- | ----------------------------------------------------- |
| Operator menandai unit yang sedang dipakai sebagai gangguan | Sistem menyelesaikan sesi dan saldo dari energi aktual, lalu menerapkan status gangguan/perawatan dalam satu transaksi. | Gagal settlement membatalkan perubahan status. |
| Dua pengguna memilih charger yang sama | Sistem melakukan validasi ketersediaan saat pemilihan dan sebelum sesi dimulai.                            | Definisikan locking/atomic update di SDD.             |
| Selisih hold saldo dan biaya aktual    | Pembayaran akhir menggunakan biaya aktual; sisa hold dikembalikan otomatis.                                 | Nilai tercatat pada transaksi dan audit tindakan Operator. |
| Perubahan tarif saat charger digunakan | Tarif langsung berlaku untuk sesi baru atau terjadwal berlaku pada waktu pilihan; sesi aktif tetap memakai tarif awal. | Jadwal bertabrakan ditolak; jadwal mendatang dapat diubah/dibatalkan oleh staf berwenang. |
| Status charger tanpa perangkat fisik   | Operator mengatur status operasional manual; status Sedang Mengisi Daya diturunkan sistem dari sesi aktif. | Audit mencatat aktor, waktu, dan nilai sebelum/sesudah. |
| Hak akses operator                     | Operator dapat ditugaskan ke beberapa station; satu station dapat ditangani beberapa Operator. Station tanpa Operator harus Nonaktif sampai penugasan dibuat. | Pemeriksaan otorisasi wajib diterapkan pada API dan UI. |
| Penghentian sesi oleh Operator         | Operator menghentikan sesi dengan alasan; sistem menghitung biaya aktual dan mengembalikan sisa hold.        | Alasan dan nilai sebelum/sesudah masuk audit operasional. |
| Status perangkat saat sesi aktif       | Perubahan ke Gangguan/Perawatan menyelesaikan sesi lebih dulu.                                              | Settlement dan perubahan status berjalan atomik. |
| Status station saat sesi aktif         | Perubahan status station tidak menghentikan sesi yang sudah berjalan, tetapi station Nonaktif/Maintenance menolak sesi baru. | Terapkan validasi saat pemilihan dan mulai sesi; alasan perubahan wajib masuk audit. |
| Pengelolaan data teknis charger/port   | Admin dan Operator dapat mengubah data teknis; Operator hanya pada station tugas dan wajib mengisi alasan. | Catat nilai sebelum/sesudah, aktor, waktu, serta alasan pada audit. |
| Konfigurasi dan laporan Admin         | Admin dapat mengubah konfigurasi operasional dan simulasi serta memfilter laporan lintas station berdasarkan periode, station, dan charger. | Batasi Operator pada station tugas; catat perubahan konfigurasi di audit. |

### 12.1 Aturan UX Dashboard Operator

- Nama station aktif selalu terlihat, termasuk saat Operator hanya mempunyai satu penugasan.
- Informasi utama adalah station aktif dan kondisi port: sedang mengisi, siap, serta perlu perhatian.
- Dashboard merangkum gangguan; Operator masuk ke Kelola Charger untuk menanganinya.
- Akhiri Sesi meminta alasan dan menjelaskan perhitungan biaya aktual serta pengembalian sisa hold.
- Sidebar Dashboard, Kelola Charger, dan Laporan mengikuti gaya card navigasi Admin; tautan dan otorisasi tetap mengikuti peran Operator.
- Sidebar mempertahankan ikon dan label pada desktop/tablet, lalu berubah menjadi navigasi bawah pada layar kecil.
- Metrik menampilkan placeholder selama pemuatan awal; station kosong dan kegagalan memuat ditampilkan dengan pesan yang berbeda.
- Sesi aktif tampil sebagai kartu pada layar kecil agar detail dan tindakan Akhiri Sesi tetap terbaca dan mudah dijangkau.
- Badge notifikasi harus mencerminkan daftar alert yang benar-benar dikirim API.

### 12.2 Aturan UX Maps Driver

- Tombol Kembali dan judul Cari Charging Station tetap menjadi kontrol terpisah, tetapi diletakkan bersama di bagian atas Card Pencarian.
- Pencarian nama/kode/alamat, dropdown Jenis konektor, Filter lanjutan, jumlah hasil, dan daftar station berada dalam satu panel hasil yang sama.
- Peta dan daftar station tampil bersamaan tanpa toggle mode. Memilih kartu station menyorot marker terkait; memilih marker memilih kartu yang sama.
- Desktop menampilkan peta dengan Card Pencarian mengambang yang lebih ramping, berjarak dari tepi, dan bersudut membulat; mobile menampilkan peta di area atas dan panel hasil yang dapat discroll di bagian bawah.
- Filter konektor menggunakan dropdown dengan pilihan Semua sebagai nilai awal. Filter daya, tarif, dan ketersediaan tetap tersedia melalui tombol Filter.

### 12.3 Aturan UX Pengaturan Driver

- Menu Pengaturan memuat Profil, Kendaraan Saya, PIN Keamanan, dan Bantuan. PIN Keamanan menampilkan badge Belum dibuat selama Pengemudi belum memiliki PIN.
- Layar PIN Keamanan menampilkan status PIN dan status dompet terkunci (beserta batas waktunya), dengan aksi Buat PIN, Ubah PIN, dan Lupa PIN.
- Buat PIN dan Ubah PIN meminta konfirmasi PIN baru; Ubah PIN juga meminta PIN lama dan menolak PIN baru yang sama dengan PIN lama. Lupa PIN memverifikasi password akun.
- Input PIN hanya menerima 6 digit angka dan disamarkan. Dompet terkunci 15 menit setelah 3 kali PIN salah.
- Menonaktifkan PIN tidak ditampilkan di antarmuka karena PIN wajib untuk memulai charging.
- Input nomor telepon pada Registrasi dan Edit Profil hanya menerima angka maksimal 15 digit; karakter lain dibuang otomatis dan API menolak nilai di luar aturan tersebut.

## 13. Backlog Dokumen

| Kode  | Dokumen                                               | MoSCoW | Catatan                                                |
| ----- | ----------------------------------------------------- | ------ | ------------------------------------------------------ |
| DOC01 | Business Requirement Document                         | MUST   | Kebutuhan bisnis dan tujuan EVChargeHub.               |
| DOC02 | Software Requirements Specification                   | MUST   | Spesifikasi FR dan NFR.                                |
| DOC03 | Software Design Document                              | MUST   | Desain sistem setelah requirement baseline.            |
| DOC04 | Alur Proses Utama / FAD EVChargeHub                   | MUST   | Menggunakan alur terbaru hasil klarifikasi.            |
| DOC05 | Use Case Diagram                                      | MUST   | Minimal lima use case utama.                           |
| DOC06 | Activity Diagram Memulai Sesi Charging dan Pembayaran | MUST   | Fokus proses inti charging dan hold saldo.             |
| DOC07 | Data Flow Diagram                                     | SHOULD | Aliran data antar proses dan data store.               |
| DOC08 | Entity Relationship Diagram                           | MUST   | Berdasarkan entitas data awal dan requirement terbaru. |
| DOC09 | Prioritas Product Backlog                             | MUST   | Menggunakan MoSCoW.                                    |
| DOC10 | Test Plan dan Test Case                               | MUST   | Search station, charging session, payment.             |
| DOC11 | Dokumentasi Arsitektur Sistem                         | SHOULD | Aplikasi, simulasi charging, payment, dan integrasi.   |
| DOC12 | Dokumentasi UI/UX                                     | SHOULD | Interface aplikasi pengemudi dan dashboard.            |

## 14. Acceptance Criteria Umum

- `[ ]` Pengemudi dapat registrasi, membuat PIN, menambahkan kendaraan, dan memiliki Dompet Digital.
- `[ ]` Nomor telepon hanya menerima angka maksimal 15 digit pada form dan API; nilai 16 digit atau berisi huruf ditolak.
- `[ ]` Pengemudi dapat membuat, mengubah, dan mengatur ulang PIN dari menu Pengaturan.
- `[ ]` Pengemudi dapat melihat station terdekat sesuai tipe konektor kendaraan.
- `[ ]` Sistem dapat memvalidasi charger sebelum sesi charging dimulai.
- `[ ]` Sistem dapat menghitung estimasi biaya dan melakukan hold saldo.
- `[ ]` Sistem dapat mencatat daya aktual dan menghitung biaya akhir.
- `[ ]` Sistem dapat menangani charging gagal/terhenti dengan status transaksi yang jelas.
- `[ ]` Operator dapat memantau status charger sesuai cabang/station yang ditugaskan.
- `[ ]` Admin dapat mengelola operator, hak akses, station, konfigurasi, dan audit.
- `[ ]` Admin langsung melihat ringkasan lintas station dan daftar kondisi yang perlu ditindaklanjuti.

## 15. Timeline Proyek

| Waktu         | Phase                | Milestone            | Output                           |
| ------------- | -------------------- | -------------------- | -------------------------------- |
| 15-16 Sep     | Setup                | Requirement kickoff  | Requirement v0.1                 |
| 17-22 Sep     | Requirement          | Requirement baseline | BRD, SRS, user story, backlog    |
| 23-29 Sep     | Planning/Design      | Architecture         | Architecture dan SDD draft       |
| 30 Sep-6 Okt  | Design               | Behaviour model      | Use case dan activity diagram    |
| 7-13 Okt      | Design               | Data dan interaction | Class diagram, sequence, DFD     |
| 14 Okt        | Implementation Start | Sprint 1             | Project structure dan fitur awal |
| 14-21 Okt     | Sprint 1             | MVP development      | Working MVP                      |
| 21 Okt        | UTS Checkpoint       | MVP review           | MVP dan docs                     |
| 22-28 Okt     | Sprint 1 Review      | Code review          | PR dan merged code               |
| 29 Okt-11 Nov | Sprint 2             | Feature completion   | Core features                    |
| 4-18 Nov      | Deployment           | Containerization     | Docker deployment                |
| 18-25 Nov     | Testing              | Test implementation  | Unit dan functional test         |
| 25 Nov-2 Des  | QA                   | Bug fixing           | Test report dan bug fixes        |
| 2 Des         | Feature Freeze       | Release candidate    | RC                               |
| 2-8 Des       | Documentation        | Documentation freeze | BRD, SRS, SDD, Test, README      |
| 9 Des         | Final Demo           | Project presentation | Final presentation               |
| 10-15 Des     | Buffer               | Emergency fixes      | Final package                    |
| 16 Des        | Final Submission/UAS | Project complete     | Final system dan documents       |

## 16. Pertanyaan Terbuka

- Apa standar response time yang benar untuk pencarian station terdekat?
