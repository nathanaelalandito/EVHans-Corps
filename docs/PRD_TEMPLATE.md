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

Pertumbuhan kendaraan listrik membuat kebutuhan platform digital charging semakin penting. Pengemudi membutuhkan informasi lokasi, tipe konektor, tarif, status ketersediaan, dan pembayaran yang mudah. Operator membutuhkan dashboard untuk memantau lokasi, unit charger, status perangkat, penggunaan charger, serta pendapatan. Admin membutuhkan kontrol terhadap akun, hak akses, audit operasional, dan konfigurasi sistem.

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
- Filter station berdasarkan tipe konektor, daya, harga, ketersediaan, dan rating.
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
- Operator hanya memiliki akses sesuai cabang/station tempat ia ditugaskan.

## 6. Aktor Sistem

| Aktor                     | Peran                                                                                                                      |
| ------------------------- | -------------------------------------------------------------------------------------------------------------------------- |
| Pengemudi EV              | Mencari lokasi, memilih charger, mengelola kendaraan, memulai sesi charging, memantau proses, dan menyelesaikan transaksi. |
| Operator Charging Station | Memantau station, konektor, unit charger, status perangkat, tarif sesuai kewenangan, dan laporan penggunaan.               |
| Admin Sistem              | Mengelola akun operator, hak akses, station, penugasan operator, konfigurasi sistem, dan audit operasional.                |
| Payment Gateway           | Memproses top up, mengirim status transaksi, dan membantu rekonsiliasi pembayaran.                                         |
| Perangkat Charger         | Mengirim status ketersediaan, energi terpakai, durasi sesi, data daya aktual, dan notifikasi gangguan.                     |

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
3. Sistem menyesuaikan station berdasarkan tipe konektor kendaraan.
4. Pengemudi memilih charging station.
5. Sistem menampilkan detail station, jarak, jumlah charger, tipe konektor, daya, tarif, dan ketersediaan.
6. Pengemudi memilih charger yang tersedia.
7. Sistem memvalidasi ketersediaan charger.

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

## 8. Kebutuhan Fungsional

| Kode | Kebutuhan                             | Aktor                              | MoSCoW | Catatan                                                    |
| ---- | ------------------------------------- | ---------------------------------- | ------ | ---------------------------------------------------------- |
| FR01 | Registrasi Akun Pengemudi             | Pengemudi                          | MUST   | Pintu masuk penggunaan sistem.                             |
| FR02 | Login Pengemudi                       | Pengemudi                          | MUST   | Autentikasi sebelum mengakses fitur.                       |
| FR03 | Kelola Profil Pengemudi               | Pengemudi                          | SHOULD | Melihat dan memperbarui data pribadi.                      |
| FR04 | Kelola Kendaraan                      | Pengemudi                          | MUST   | Tipe konektor digunakan untuk rekomendasi charger.         |
| FR05 | Kelola PIN Keamanan                   | Pengemudi                          | MUST   | PIN digunakan sebagai verifikasi transaksi.                |
| FR06 | Kelola Dompet Digital                 | Pengemudi                          | MUST   | Setiap pengemudi memiliki wallet EVChargeHub.              |
| FR07 | Top Up Dompet Digital                 | Pengemudi, Payment Gateway         | MUST   | Top up melalui metode pembayaran tersedia.                 |
| FR08 | Melihat Saldo Dompet Digital          | Pengemudi                          | MUST   | Saldo diperlukan sebelum transaksi.                        |
| FR09 | Melihat Charging Station Terdekat     | Pengemudi                          | MUST   | Fitur inti pencarian lokasi.                               |
| FR10 | Melihat Detail Charging Station       | Pengemudi                          | MUST   | Lokasi, jarak, charger, konektor, daya, tarif, dan status. |
| FR11 | Melihat Ketersediaan Charger          | Pengemudi, Perangkat Charger       | MUST   | Status harus akurat sebelum dipilih.                       |
| FR12 | Filter Charging Station               | Pengemudi                          | SHOULD | Filter konektor, daya, harga, ketersediaan, rating.        |
| FR13 | Navigasi menuju Charging Station      | Pengemudi                          | SHOULD | Membantu menuju station yang dipilih.                      |
| FR14 | Kelola Charging Station               | Operator, Admin                    | MUST   | Sesuai kewenangan masing-masing.                           |
| FR15 | Kelola Informasi Lokasi               | Operator, Admin                    | MUST   | Alamat, koordinat, fasilitas, jam operasional, foto.       |
| FR16 | Kelola Status Charging Station        | Operator, Admin                    | MUST   | Aktif, tutup sementara, penuh, perawatan.                  |
| FR17 | Kelola Unit Charger                   | Operator, Admin                    | MUST   | Data perangkat, konektor, daya, dan status.                |
| FR18 | Monitoring Status Charger             | Operator, Admin, Perangkat Charger | MUST   | Fokus utama operator.                                      |
| FR19 | Monitoring Data Charging              | Perangkat Charger                  | MUST   | Sistem menerima daya dan data sesi.                        |
| FR20 | Validasi Pemilihan Charger            | Pengemudi, Perangkat Charger       | MUST   | Mencegah dua pengguna memakai charger sama.                |
| FR21 | Memulai Sesi Charging                 | Pengemudi, Perangkat Charger       | MUST   | Proses inti EVChargeHub.                                   |
| FR22 | Monitoring Sesi Charging              | Pengemudi, Perangkat Charger       | MUST   | Progress charging terlihat oleh pengemudi.                 |
| FR23 | Menghentikan Sesi Charging            | Pengemudi, Perangkat Charger       | MUST   | Pengemudi dapat menghentikan sesi.                         |
| FR24 | Mencatat Data Sesi Charging           | Sistem, Perangkat Charger          | MUST   | Waktu, daya aktual, durasi, biaya, status.                 |
| FR25 | Menangani Charging Terhenti/Gagal     | Sistem, Perangkat Charger          | MUST   | Biaya berdasarkan daya aktual yang digunakan.              |
| FR26 | Kelola Tarif Charging                 | Operator, Admin                    | MUST   | Detail kewenangan perlu dikunci di SRS.                    |
| FR27 | Menghitung Estimasi Biaya Charging    | Sistem                             | MUST   | Dasar hold saldo.                                          |
| FR28 | Menghitung Biaya Charging Aktual      | Sistem                             | MUST   | Berdasarkan daya aktual.                                   |
| FR29 | Menghitung Biaya Parkir               | Sistem                             | MUST   | Tarif parkir flat saat charging berlangsung.               |
| FR30 | Menghitung Total Biaya Transaksi      | Sistem                             | MUST   | Biaya charging ditambah biaya parkir.                      |
| FR31 | Memilih Sumber Pembayaran             | Pengemudi                          | MUST   | Charging menggunakan Dompet Digital.                       |
| FR32 | Validasi Saldo Dompet Digital         | Sistem                             | MUST   | Saldo harus cukup untuk estimasi.                          |
| FR33 | Hold Saldo Transaksi                  | Sistem, Dompet Digital             | MUST   | Hold berdasarkan estimasi biaya.                           |
| FR34 | Menyelesaikan Transaksi Charging      | Sistem                             | MUST   | Biaya aktual diambil dari dana hold.                       |
| FR35 | Menangani Pembayaran Gagal            | Sistem, Payment Gateway            | MUST   | Status gagal dicatat dan diinformasikan.                   |
| FR36 | Rekonsiliasi Status Transaksi         | Sistem, Payment Gateway            | SHOULD | Perlu mengikuti keputusan mekanisme hold.                  |
| FR37 | Menerbitkan Struk/Invoice Digital     | Sistem                             | MUST   | Bukti transaksi.                                           |
| FR38 | Melihat Riwayat Transaksi             | Pengemudi                          | MUST   | Riwayat charging dan pembayaran.                           |
| FR39 | Melihat Laporan Pendapatan            | Operator, Admin                    | SHOULD | Laporan per periode, lokasi, charger.                      |
| FR40 | Melihat Laporan Utilisasi Charger     | Operator, Admin                    | SHOULD | Monitoring penggunaan perangkat.                           |
| FR41 | Melihat Laporan Gangguan Perangkat    | Operator, Admin                    | SHOULD | Gangguan yang tercatat sistem.                             |
| FR42 | Notifikasi Status Charging            | Pengemudi                          | SHOULD | Selesai atau terganggu.                                    |
| FR43 | Notifikasi Pembayaran Gagal           | Pengemudi                          | SHOULD | Info kegagalan transaksi.                                  |
| FR44 | Notifikasi Gangguan Charger           | Operator, Admin, Pengemudi         | SHOULD | Info gangguan perangkat.                                   |
| FR45 | Kelola Akun Operator                  | Admin                              | MUST   | Operator tidak registrasi mandiri.                         |
| FR46 | Kelola Hak Akses Operator             | Admin                              | MUST   | Hak akses berdasarkan cabang/station.                      |
| FR47 | Kelola Station dan Penugasan Operator | Admin                              | MUST   | Admin menentukan operator station.                         |
| FR48 | Konfigurasi Sistem                    | Admin                              | SHOULD | Detail dijabarkan di SRS.                                  |
| FR49 | Audit Operasional                     | Admin                              | MUST   | Transaksi, tarif, dan status perangkat tercatat.           |

## 9. Kebutuhan Nonfungsional

| Kode  | Kebutuhan                 | Kategori     | MoSCoW | Catatan                                                                                  |
| ----- | ------------------------- | ------------ | ------ | ---------------------------------------------------------------------------------------- |
| NFR01 | Keamanan Sistem           | Security     | MUST   | Data pembayaran dan kredensial dilindungi dengan enkripsi dan autentikasi kuat.          |
| NFR02 | Ketersediaan Sistem       | Availability | MUST   | Informasi station tetap tampil meskipun beberapa charger offline.                        |
| NFR03 | Kinerja Pencarian Station | Performance  | MUST   | Response time perlu didefinisikan ulang; sumber menyebut "24 jam" dan perlu klarifikasi. |
| NFR04 | Skalabilitas Sistem       | Scalability  | SHOULD | Mendukung penambahan banyak lokasi dan charger.                                          |
| NFR05 | Auditabilitas Sistem      | Auditability | MUST   | Transaksi, perubahan tarif, dan status perangkat tercatat.                               |
| NFR06 | Kemudahan Penggunaan      | Usability    | MUST   | Web/mobile mudah digunakan saat pengemudi berada di lokasi charging.                     |

## 10. Entitas Data Awal

| Entitas          | Atribut Utama                                                                                     | Catatan                                              |
| ---------------- | ------------------------------------------------------------------------------------------------- | ---------------------------------------------------- |
| User             | `id_user`, `nama`, `email`, `nomor_telepon`, `peran`, `status_akun`                               | Pengemudi, operator, admin.                          |
| Vehicle          | `id_vehicle`, `id_user`, `merek`, `model`, `nomor_polisi`, `tipe_konektor`                        | Kendaraan milik pengemudi.                           |
| Location         | `id_location`, `nama_lokasi`, `alamat`, `latitude`, `longitude`, `jam_operasional`, `status`      | Data station/lokasi.                                 |
| Charger          | `id_charger`, `id_location`, `kode_perangkat`, `tipe_konektor`, `daya_kw`, `status`               | Unit charger di station.                             |
| Charging Session | `id_session`, `id_user`, `id_charger`, `waktu_mulai`, `waktu_selesai`, `energi_kwh`, `status`     | Data sesi charging.                                  |
| Tariff           | `id_tariff`, `id_location`, `harga_per_kwh`, `biaya_minimum`, `biaya_parkir`, `periode_berlaku`   | Tarif charging dan parkir.                           |
| Payment          | `id_payment`, `id_session`, `metode`, `jumlah`, `status`, `waktu_pembayaran`, `referensi_gateway` | Pembayaran dan status transaksi.                     |
| Wallet           | `[id_wallet]`, `id_user`, `[saldo]`, `[status]`                                                   | Perlu ditambahkan karena requirement Dompet Digital. |
| Wallet Hold      | `[id_hold]`, `[id_wallet]`, `[id_session]`, `[jumlah_hold]`, `[status_hold]`                      | Perlu ditambahkan untuk mekanisme hold saldo.        |
| Audit Log        | `[id_audit]`, `[aktor]`, `[aksi]`, `[data_sebelum]`, `[data_sesudah]`, `[timestamp]`              | Mendukung audit operasional.                         |

## 11. Use Case Utama

| Use Case                         | Aktor                              | Deskripsi                                                                        |
| -------------------------------- | ---------------------------------- | -------------------------------------------------------------------------------- |
| Registrasi dan Login Pengemudi   | Pengemudi EV                       | Pengemudi membuat akun, PIN, kendaraan, Dompet Digital, lalu login.              |
| Mencari Charging Station         | Pengemudi EV                       | Pengemudi mencari station berdasarkan lokasi, konektor, tarif, dan ketersediaan. |
| Memulai Sesi Charging            | Pengemudi EV, Perangkat Charger    | Pengemudi memilih charger, sistem validasi, lalu sesi dimulai.                   |
| Menyelesaikan Transaksi          | Pengemudi EV, Payment Gateway      | Sistem menyelesaikan biaya aktual dari dana hold dan menerbitkan invoice.        |
| Mengelola Station dan Charger    | Operator, Admin                    | Station, lokasi, charger, status, dan tarif dikelola sesuai hak akses.           |
| Monitoring Charger               | Operator, Admin, Perangkat Charger | Operator memantau status dan gangguan unit charger.                              |
| Melihat Laporan                  | Operator, Admin                    | Laporan pendapatan, utilisasi, dan gangguan perangkat.                           |
| Mengelola Operator dan Hak Akses | Admin                              | Admin membuat akun operator dan menentukan cabang/station yang dapat diakses.    |

## 12. Risiko dan Keputusan

| Risiko/Pertanyaan                      | Keputusan Sementara                                                                                        | Tindak Lanjut                                         |
| -------------------------------------- | ---------------------------------------------------------------------------------------------------------- | ----------------------------------------------------- |
| Charger offline saat sesi berlangsung  | Biaya dihitung berdasarkan daya aktual dan status dicatat sebagai gagal/terhenti.                          | Detail status akhir charger perlu dipastikan di SRS.  |
| Dua pengguna memilih charger yang sama | Sistem melakukan validasi ketersediaan saat pemilihan dan sebelum sesi dimulai.                            | Definisikan locking/atomic update di SDD.             |
| Selisih hold saldo dan biaya aktual    | Pembayaran akhir menggunakan biaya aktual dari dana hold.                                                  | Mekanisme pengembalian sisa hold masih perlu dikunci. |
| Perubahan tarif saat charger digunakan | Perubahan dapat dilakukan saat ini atau terjadwal, tetapi diterapkan ketika charger tidak digunakan.       | Definisikan aturan versi tarif.                       |
| Akurasi ketersediaan charger           | Charger melakukan sinkronisasi status saat sedang tidak digunakan dan mengirim data saat sesi berlangsung. | Definisikan interval sinkronisasi.                    |
| Hak akses operator                     | Operator hanya melihat/memantau cabang yang ditugaskan admin.                                              | Detail permission matrix diperlukan.                  |

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
| DOC11 | Dokumentasi Arsitektur Sistem                         | SHOULD | Aplikasi, charger, payment, dan integrasi.             |
| DOC12 | Dokumentasi UI/UX                                     | SHOULD | Interface aplikasi pengemudi dan dashboard.            |

## 14. Acceptance Criteria Umum

- `[ ]` Pengemudi dapat registrasi, membuat PIN, menambahkan kendaraan, dan memiliki Dompet Digital.
- `[ ]` Pengemudi dapat melihat station terdekat sesuai tipe konektor kendaraan.
- `[ ]` Sistem dapat memvalidasi charger sebelum sesi charging dimulai.
- `[ ]` Sistem dapat menghitung estimasi biaya dan melakukan hold saldo.
- `[ ]` Sistem dapat mencatat daya aktual dan menghitung biaya akhir.
- `[ ]` Sistem dapat menangani charging gagal/terhenti dengan status transaksi yang jelas.
- `[ ]` Operator dapat memantau status charger sesuai cabang/station yang ditugaskan.
- `[ ]` Admin dapat mengelola operator, hak akses, station, konfigurasi, dan audit.

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

- Bagaimana detail mekanisme pengembalian sisa hold saldo jika biaya aktual lebih kecil dari estimasi?
  Pengembalian saldo dilakukan ketika Stop Charging, bisa dengan kondisi permintaan dari Driver atau ketika Unit Charger bermasalah.
- Apakah operator boleh mengubah tarif, atau hanya admin yang memiliki kewenangan final?
  operator dan admin memiliki kewenangan final untuk mengubah harga.
- Berapa interval sinkronisasi status charger yang dianggap cukup akurat?
- Apa standar response time yang benar untuk pencarian station terdekat?
- Bagaimana struktur audit log untuk perubahan tarif, status charger, dan transaksi?
- Bagaimana detail permission matrix admin dan operator?
