# Markdown Documentation Template - EVChargeHub

Gunakan template ini untuk membuat dokumen fitur, SRS per modul, backlog card, test case, atau catatan desain teknis EVChargeHub.

## Judul Dokumen

`[Contoh: Spesifikasi Fitur Hold Saldo Dompet Digital]`

## Metadata

| Item | Isi |
| --- | --- |
| Nama sistem | EVChargeHub |
| Modul | `[Driver / Station / Charger / Wallet / Payment / Operator / Admin / Report]` |
| Penulis | `[Nama]` |
| Tanggal | `[DD MMM YYYY]` |
| Versi | `[v1.0]` |
| Status | `[Draft / Review / Final]` |
| Referensi | `[BRD/SRS/SDD/Diagram/Backlog]` |

## Ringkasan

`[Jelaskan isi dokumen dalam 1-3 paragraf. Sebutkan masalah, solusi, aktor yang terlibat, dan output yang diharapkan.]`

## Aktor Terkait

- `[Pengemudi EV]`
- `[Operator Charging Station]`
- `[Admin Sistem]`
- `[Payment Gateway]`
- `[Sistem EVChargeHub (simulasi proses charger)]`

## Tujuan

- `[Tujuan 1]`
- `[Tujuan 2]`
- `[Tujuan 3]`

## Scope

### Termasuk

- `[Fungsi yang dibahas/dibangun]`
- `[Data yang diproses]`
- `[Aktor yang terlibat]`

### Tidak Termasuk

- `[Hal yang tidak dibahas/dibangun]`
- `[Contoh: booking charger, sistem antrean, refund manual]`

## Istilah Penting

| Istilah | Definisi |
| --- | --- |
| Charging Station | Lokasi pengisian kendaraan listrik. |
| Charger | Unit perangkat charging pada station. |
| Konektor | Tipe konektor yang digunakan kendaraan dan charger. |
| Dompet Digital | Wallet internal EVChargeHub untuk transaksi charging. |
| Hold Saldo | Dana estimasi yang ditahan sebelum sesi charging selesai. |
| Biaya Aktual | Biaya akhir berdasarkan daya aktual dan biaya parkir. |
| Sesi Charging | Proses charging dari mulai sampai selesai, gagal, atau terhenti. |

## User Story

Sebagai `[aktor]`, saya ingin `[aksi/kebutuhan]`, sehingga `[manfaat/tujuan]`.

## Kebutuhan Fungsional Terkait

| Kode | Kebutuhan | MoSCoW | Catatan |
| --- | --- | --- | --- |
| `[FRxx]` | `[Nama kebutuhan]` | `[MUST/SHOULD/COULD/WONT]` | `[Catatan]` |

## Alur Utama

1. `[Langkah 1]`
2. `[Langkah 2]`
3. `[Langkah 3]`
4. `[Langkah 4]`
5. `[Langkah 5]`

## Alur Alternatif

### `[Nama Kondisi Alternatif]`

1. `[Langkah alternatif 1]`
2. `[Langkah alternatif 2]`
3. `[Hasil akhir]`

## Aturan Bisnis

- `[Aturan validasi atau transaksi]`
- `[Aturan status charger/station]`
- `[Aturan hold saldo/payment]`
- `[Aturan hak akses operator/admin]`

Aturan bisnis Admin/Operator EVChargeHub:

- Satu Operator dapat ditugaskan ke beberapa station; akses tetap dibatasi pada station penugasan.
- Satu station dapat ditangani beberapa Operator. Station tanpa Operator harus berstatus Nonaktif sampai penugasan dibuat.
- Admin mengatur petugas dari detail station melalui tab Petugas: pencarian, pilihan banyak Operator aktif, pratinjau jumlah yang ditambah/dilepas, dan satu kali penyimpanan. Perubahan penugasan station tidak mengganti penugasan Operator di station lain.
- Station aktif wajib memiliki minimal satu Operator aktif. Admin harus menambahkan pengganti atau menonaktifkan station sebelum melepas petugas terakhir.
- Direktori Operator menampilkan penugasan sebagai informasi dan menyediakan jalan pintas ke station; perubahan penugasan dilakukan dari detail station.
- Direktori Operator menyediakan pencarian nama, email, nomor telepon, dan station tugas serta filter status akun dan station. Kartu disusun dua kolom pada desktop, tiga kolom pada layar lebar, dan satu kolom pada layar kecil.
- Admin dan Operator yang ditugaskan dapat mengubah tarif secara langsung atau terjadwal.
- Sesi aktif tetap memakai tarif yang tersimpan saat sesi dimulai.
- Jadwal tarif yang belum berlaku dapat diubah atau dibatalkan oleh staf yang berwenang; jadwal yang bertabrakan ditolak.
- Operator dapat menghentikan sesi dengan alasan wajib; sistem menghitung biaya aktual, menyelesaikan pembayaran, dan mengembalikan sisa saldo hold.
- Jika Operator menandai charger/port aktif sebagai Gangguan atau Perawatan, sistem menghentikan sesi aktif dan menyelesaikan transaksi sebelum mengubah status perangkat.
- Admin dan Operator yang ditugaskan dapat mengelola data teknis charger/port; setiap perubahan data teknis wajib disertai alasan.
- Admin dan Operator yang ditugaskan memiliki wewenang yang sama untuk membuat charger/port dan mengubah spesifikasi maupun statusnya. Admin mencakup semua station; Operator hanya station tugas.
- Status Sedang Mengisi ditentukan sistem dari sesi aktif, bukan pilihan manual. Jika perangkat yang memiliki sesi aktif diubah statusnya, sistem menyelesaikan sesi berdasarkan energi aktual dan merekonsiliasi hold sebelum menerapkan status; alasan tetap dicatat di audit.
- Perubahan status station tidak menghentikan sesi aktif, tetapi station Nonaktif/Maintenance tidak menerima sesi baru.
- Tindakan penghentian sesi, perubahan data teknis, dan perubahan status dicatat dengan aktor, station, waktu, alasan, serta nilai sebelum/sesudah.
- Perubahan penting dicatat dengan aktor, waktu, dan nilai sebelum/sesudah.
- Admin dapat mengubah konfigurasi operasional dan simulasi proyek; perubahan konfigurasi masuk audit.
- Laporan Admin dapat difilter berdasarkan periode, station, dan charger; Operator hanya melihat data station tugas.
- Halaman awal Admin merangkum station aktif, unit charger, sesi berjalan, pendapatan, serta station yang perlu perhatian.
- Navigasi Admin desktop memakai sidebar ringkas; pada layar kecil navigasi tetap mudah dijangkau tanpa menumpuk statistik menjadi satu kolom panjang.

Aturan UX Dashboard Driver:

- Beranda menampilkan kendaraan aktif, saldo dan saldo tertahan, satu CTA Cari Charging Station, sesi aktif bila ada, serta maksimal tiga rekomendasi station. Di konten desktop, Station Sekitar mengambil sekitar 30% lebar dan Riwayat Transaksi sekitar 70%.
- Header menata sapaan/kendaraan aktif, saldo, dan Cari Charging Station dalam satu baris pada desktop lebar. Pada tablet, card pencarian turun ke baris berikutnya; di ponsel semua card ditumpuk. Tombol Tambah Kendaraan berada di samping label Kendaraan Aktif; Notifikasi dan Pengaturan tersedia di area sapaan.
- Menu Pengaturan Driver memuat PIN Keamanan untuk membuat, mengubah, dan mengatur ulang PIN 6 digit serta menampilkan status dompet terkunci.
- Rekomendasi Station Sekitar hanya memakai kecocokan konektor kendaraan serta jarak GPS bila valid. Filter Maps tidak mengubah daftar rekomendasi beranda. Maps selalu menampilkan peta dan daftar hasil secara bersamaan.
- Di Maps, tombol Kembali dan judul Cari Charging Station terpisah sebagai kontrol, tetapi berada bersama di bagian atas Card Pencarian. Pencarian, dropdown konektor, Filter lanjutan, jumlah hasil, dan daftar station tetap dalam panel yang sama.
- Maps tidak memakai toggle Peta/Daftar. Desktop menampilkan Card Pencarian mengambang selebar sekitar 380px, bersudut membulat dan berjarak dari tepi; mobile menampilkan peta di atas dan daftar station yang discroll di panel bawah.
- Memilih kartu station menyorot marker terkait dan memilih marker menyorot kartu yang sama. Dropdown konektor menyediakan opsi Semua sebagai nilai awal.
- Judul Riwayat Transaksi, Periode, dan pencarian tampil sebaris pada desktop, di atas dua tabel berdampingan. Tampilkan maksimal lima transaksi di tiap tabel; bagi hasil halaman secara seimbang dan sediakan Sebelumnya/Berikutnya. Filter tanggal tampil hanya untuk periode Custom.
- Riwayat memakai panah naik hijau dan nominal positif untuk Top Up, serta panah turun merah dan nominal negatif untuk pembayaran. Status transaksi tetap ditampilkan sebagai informasi terpisah.
- Memilih transaksi pada Riwayat Transaksi membuka nota sesuai jenisnya: Top Up atau sesi charging. Nota menampilkan nomor invoice, waktu, status, metode pembayaran, serta rincian transaksi yang tersedia; informasi yang tidak tersimpan diberi label Tidak tersedia.
- Nota charging menampilkan station, kode panggil jika tersedia, charger/port, konektor, kendaraan, energi, tarif, rincian biaya, hold, pengembalian, dan total. Nota Top Up menampilkan nominal, metode, waktu, status, dan referensi pembayaran.
- Nota memiliki tindakan Cetak dan Bagikan PDF. Cetak memakai tata letak nota pada kertas; jika browser/perangkat tidak mendukung berbagi file, Bagikan PDF mengunduh file sebagai fallback.
- Invoice mengambil nilai dari transaksi tersimpan dan tidak menghitung ulang biaya memakai tarif station terbaru. Akses detail invoice dibatasi pada transaksi milik pengemudi yang sedang login.
- Jangan menampilkan notifikasi sesi aktif yang mengulang isi kartu sesi. Desktop menggunakan dua kolom konten yang seimbang; mobile menggunakan satu kolom dengan urutan yang sama.
- Saat GPS tidak tersedia, tampilkan satu pesan lokasi dan sembunyikan jarak pada kartu station.
- Tombol Mulai Charging mengikuti status Arrival Check dan radius yang dikirim backend. Saat Arrival Check nonaktif, Driver dapat membuka alur charging dari jarak jauh untuk simulasi; saat aktif, Driver harus mengaktifkan lokasi dan berada dalam radius yang dikonfigurasi. Server tetap menjadi pemeriksa akhir.

Aturan UX dashboard Operator:

- Nama station aktif selalu terlihat, termasuk saat Operator hanya ditugaskan ke satu station.
- Dashboard memprioritaskan station aktif dan ringkasan jumlah port sedang mengisi, siap, serta perlu perhatian.
- Gangguan tampil sebagai ringkasan dashboard; Operator membuka Kelola Charger untuk menanganinya.
- Daftar sesi aktif menyediakan tindakan Akhiri Sesi dengan alasan wajib dan penjelasan penyelesaian biaya/hold.
- Sidebar Dashboard Operator, Kelola Charger, dan Laporan memakai gaya card navigasi yang sama dengan Admin: permukaan putih, border dan radius konsisten, serta menu aktif beraksen hijau. Isi menu dan izin tetap khusus Operator.
- Sidebar tetap menampilkan ikon dan label pada desktop/tablet; pada ponsel berubah menjadi navigasi bawah dengan status aktif yang jelas.
- Metrik menampilkan placeholder selama pemuatan awal, bukan angka nol yang dapat disalahartikan sebagai nilai aktual. Station tanpa penugasan, kegagalan memuat, dan pemuatan awal memiliki status yang berbeda.
- Badge Pusat Notifikasi menghitung alert yang benar-benar disediakan endpoint dashboard. Daftar sesi aktif beralih ke kartu ringkas pada layar kecil agar aksi Akhiri Sesi mudah dijangkau.

Aturan UX Station & Charger:

- Admin dapat mencari seluruh station; Operator hanya melihat station yang ditugaskan kepadanya.
- Pencarian station mencocokkan nama dan alamat; filter status memakai status operasional station.
- Daftar station membedakan jumlah unit operasional dari jumlah port yang tersedia. Port tersedia dihitung dari port `Available` pada unit berstatus `Active`.
- Detail station dikelompokkan menjadi Ringkasan, Charger & Port, dan Tarif.
- Ringkasan menunjukkan status station, unit operasional, port tersedia, jam operasional, serta status penugasan Operator bagi Admin.
- Perubahan status menjelaskan pengaruhnya pada sesi aktif sebelum pengguna mengisi alasan dan menyimpan.
- Ringkasan tarif menunjukkan nilai saat ini, nilai baru, waktu efektif, dan bahwa sesi aktif tetap menggunakan tarif saat sesi dimulai.

Aturan proses Tambah Station:

- Penambahan station menggunakan halaman bertahap: Informasi, Operator, Tarif awal, dan Tinjau & simpan.
- Station baru selalu dibuat Nonaktif. Admin boleh menyimpannya tanpa Operator; station tanpa Operator tidak boleh diaktifkan.
- Aktivasi mensyaratkan sekurangnya satu Operator aktif dan alasan aktivasi. Tarif awal dapat diatur dalam wizard atau setelah station dibuat; jika mulai diisi pada wizard, semua kolom tarif harus lengkap.
- Admin dapat memilih Operator yang sudah ada atau membuka form Tambah Operator di dalam alur tanpa kehilangan draft station.
- Penugasan Operator yang sudah ada ditambahkan bersama penugasan sebelumnya, bukan menggantikannya.
- Jika proses lanjutan gagal setelah station tercipta, draft tetap Nonaktif dan alur dapat dilanjutkan tanpa membuat station kedua.
- Kode panggil `SPKLU-####` tersimpan terpisah dari nama station dan ID database; pencarian station staf juga mencocokkan kode ini.
- Nama station hanya berisi nama lokasi, tanpa awalan `EVCharge Hub`.
- Peta mendukung pencarian alamat dengan tindakan Cari Lokasi, pemilihan salah satu hasil, dan penentuan manual di peta.
- Email Operator dibentuk dari nama email yang diisi Admin ditambah domain tetap `@ops.ac.id`; field nama email mencegah browser mengisi email akun Admin.
- Nomor telepon hanya menerima angka dan dibatasi maksimal 15 digit pada form, API, dan kolom database.
- Setelah pembuatan akun Operator, Admin menerima umpan balik sukses atau gagal di dekat form; daftar akun diperbarui tanpa menghilangkan konteks halaman.
- Biaya minimum tidak wajib; nilai kosong menjadi Rp0. Nilai positif menjadi batas bawah biaya energi, sementara parkir tetap dihitung terpisah.

## Kebutuhan UI

| Komponen | Fungsi | Data yang Ditampilkan | Catatan |
| --- | --- | --- | --- |
| `[Komponen]` | `[Fungsi]` | `[Data]` | `[Catatan]` |

## Kebutuhan API

| Method | Endpoint | Fungsi | Request | Response | Auth |
| --- | --- | --- | --- | --- | --- |
| `GET` | `/api/...` | `[Fungsi]` | `[Query/body]` | `[Response]` | `[Yes/No]` |
| `POST` | `/api/...` | `[Fungsi]` | `[Body]` | `[Response]` | `[Yes/No]` |

## Kebutuhan Database

| Entitas/Tabel | Field | Tipe | Catatan |
| --- | --- | --- | --- |
| `[table]` | `[field]` | `[type]` | `[Catatan]` |

## Status yang Digunakan

### Status Station

- Aktif
- Penuh
- Tutup Sementara
- Dalam Perawatan

### Status Charger

- Tersedia
- Sedang Mengisi Daya (ditentukan sistem dari sesi aktif)
- Gangguan
- Perawatan

Operator mengubah status operasional secara manual pada station yang ditugaskan. Status Sedang Mengisi Daya hanya berubah mengikuti sesi charging oleh sistem.

### Status Sesi/Transaksi

- Estimasi
- Hold
- Berjalan
- Selesai
- Gagal
- Terhenti

## Edge Cases

| Kondisi | Perilaku Sistem |
| --- | --- |
| Saldo Dompet Digital tidak cukup | Sistem meminta pengemudi melakukan top up. |
| Charger berubah menjadi tidak tersedia | Sistem membatalkan pemilihan dan meminta pengguna memilih charger lain. |
| Charging gagal sebelum selesai | Sistem menghitung biaya berdasarkan daya aktual dan memperbarui status transaksi. |
| Payment gateway gagal saat top up | Sistem mencatat status gagal dan menampilkan pesan kepada pengemudi. |
| Operator tidak berwenang atas station | Sistem menolak akses dan mencatat audit jika diperlukan. |

## Acceptance Criteria

- `[ ]` Given `[kondisi]`, when `[aksi]`, then `[hasil]`.
- `[ ]` Given `[kondisi]`, when `[aksi]`, then `[hasil]`.
- `[ ]` Given `[kondisi]`, when `[aksi]`, then `[hasil]`.

## Checklist Implementasi

- `[ ]` UI selesai.
- `[ ]` Validasi input selesai.
- `[ ]` Integrasi API selesai.
- `[ ]` Database/migration selesai.
- `[ ]` Authorization selesai.
- `[ ]` Loading, empty, error, dan success state selesai.
- `[ ]` Audit log dibuat jika fitur mengubah data penting.
- `[ ]` Manual test selesai.
- `[ ]` Dokumentasi diperbarui.

## Test Case

| ID | Skenario | Langkah | Data Uji | Hasil Diharapkan | Status |
| --- | --- | --- | --- | --- | --- |
| TC-01 | `[Skenario]` | `[Langkah]` | `[Data]` | `[Hasil]` | `[Pass/Fail]` |

## Risiko dan Mitigasi

| Risiko | Dampak | Mitigasi |
| --- | --- | --- |
| `[Risiko]` | `[Dampak]` | `[Mitigasi]` |

## Keputusan dan Pertanyaan Terbuka

| Tanggal | Topik | Keputusan/Pertanyaan | PIC |
| --- | --- | --- | --- |
| `[DD MMM YYYY]` | `[Topik]` | `[Keputusan atau pertanyaan]` | `[Nama]` |

## Referensi

- Studi Kasus EV Charging.docx
- PRD/BRD EVChargeHub
- SRS EVChargeHub
- SDD EVChargeHub
- Backlog MoSCoW EVChargeHub
