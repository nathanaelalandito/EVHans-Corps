# Style Guide Template - EVChargeHub

Template ini disesuaikan untuk EVChargeHub, yaitu sistem manajemen charging EV dengan aplikasi pengemudi dan dashboard operator/admin. Gunakan style guide ini agar UI aplikasi, dokumen, dan presentasi proyek konsisten.

## 1. Identitas Produk

| Item             | Isi                                                                              |
| ---------------- | -------------------------------------------------------------------------------- |
| Nama produk      | EVChargeHub                                                                      |
| Domain           | EV charging management                                                           |
| Platform         | Web mobile untuk pengemudi, web dashboard untuk operator dan admin               |
| Kesan utama      | Modern, aman, efisien, informatif, terpercaya                                    |
| Fokus pengalaman | Pencarian station, status charger, sesi charging, hold saldo, transaksi, laporan |

## 2. Prinsip Desain

- **Status harus jelas:** status station, charger, sesi, saldo, hold, dan transaksi harus mudah dibaca.
- **Aksi penting harus aman:** transaksi, PIN, hold saldo, dan perubahan tarif perlu konfirmasi yang jelas.
- **Operator butuh monitoring cepat:** dashboard operator harus mendukung pemindaian status perangkat dan gangguan.
- **Pengemudi butuh alur pendek:** pencarian station hingga memulai charging harus terasa sederhana.
- **Admin butuh kontrol:** hak akses, operator, station, audit, dan konfigurasi harus terlihat terstruktur.

## 3. Brand Voice

### Gaya Bahasa

- Gunakan Bahasa Indonesia yang jelas, ringkas, dan operasional.
- Hindari istilah teknis tanpa konteks.
- Gunakan kata kerja langsung seperti `Mulai Charging`, `Top Up`, `Pilih Charger`, `Lihat Invoice`.
- Untuk error transaksi, gunakan pesan yang spesifik dan menyebut langkah perbaikan.
- Untuk status charger, gunakan label yang konsisten.

### Contoh Microcopy

| Konteks                | Disarankan                                                                 | Hindari                |
| ---------------------- | -------------------------------------------------------------------------- | ---------------------- |
| Login berhasil         | `Login berhasil. Selamat datang kembali.`                                  | `Success.`             |
| Saldo kurang           | `Saldo Dompet Digital belum mencukupi untuk estimasi transaksi.`           | `Saldo error.`         |
| Hold saldo             | `Saldo sebesar Rp[total] ditahan untuk estimasi sesi charging.`            | `Pembayaran diproses.` |
| Charging dimulai       | `Sesi charging dimulai. Progress akan diperbarui otomatis.`                | `Charging on.`         |
| Charging gagal         | `Charging terhenti. Biaya dihitung berdasarkan daya yang sudah digunakan.` | `Charging failed.`     |
| Charger tidak tersedia | `Charger sudah digunakan. Pilih charger lain yang tersedia.`               | `Not available.`       |
| Invoice                | `Invoice digital telah diterbitkan dan tersimpan di riwayat transaksi.`    | `Receipt done.`        |
| Operator alert         | `Unit Charger CHG-02 offline sejak 10:24.`                                 | `Device issue.`        |

## 4. Terminologi UI

| Istilah          | Gunakan Untuk                                      | Catatan                                                           |
| ---------------- | -------------------------------------------------- | ----------------------------------------------------------------- |
| Charging Station | Lokasi/station pengisian EV                        | Konsisten, jangan berganti dengan SPKLU jika tidak didefinisikan. |
| Charger          | Unit perangkat charging                            | Satu station dapat memiliki beberapa charger.                     |
| Konektor         | Tipe konektor kendaraan/charger                    | Digunakan untuk matching kendaraan.                               |
| Dompet Digital   | Wallet internal EVChargeHub                        | Sumber pembayaran charging.                                       |
| Hold Saldo       | Dana estimasi yang ditahan sementara               | Bukan pembayaran akhir.                                           |
| Biaya Aktual     | Biaya berdasarkan daya aktual dan parkir           | Digunakan saat settlement.                                        |
| Sesi Charging    | Proses charging dari mulai sampai selesai/terhenti | Memiliki status sendiri.                                          |
| Invoice Digital  | Bukti transaksi akhir                              | Tersimpan di riwayat.                                             |

## 5. Warna

Isi nilai hex final sesuai keputusan tim. Gunakan token berikut sebagai struktur.

### Primary Palette

| Token         | Hex      | Penggunaan                                              |
| ------------- | -------- | ------------------------------------------------------- |
| Primary       | `#[HEX]` | Tombol utama, navigasi aktif, aksi mulai charging.      |
| Secondary     | `#[HEX]` | Elemen pendukung, filter, tab, chip aktif.              |
| Energy Accent | `#[HEX]` | Progress charging, indikator energi, highlight station. |

### Neutral Palette

| Token          | Hex      | Penggunaan                            |
| -------------- | -------- | ------------------------------------- |
| Text Primary   | `#[HEX]` | Heading, angka saldo, status penting. |
| Text Secondary | `#[HEX]` | Metadata, deskripsi, alamat, waktu.   |
| Border         | `#[HEX]` | Input, tabel, divider, card item.     |
| Background     | `#[HEX]` | Latar halaman.                        |
| Surface        | `#[HEX]` | Panel dashboard, modal, form, card.   |

### Semantic Colors

| Token       | Hex      | Penggunaan                                        |
| ----------- | -------- | ------------------------------------------------- |
| Available   | `#[HEX]` | Charger tersedia, station aktif.                  |
| Charging    | `#[HEX]` | Sesi sedang berjalan.                             |
| Warning     | `#[HEX]` | Saldo rendah, sinkronisasi lambat, station penuh. |
| Danger      | `#[HEX]` | Charger rusak, payment gagal, validasi gagal.     |
| Offline     | `#[HEX]` | Charger offline atau station tutup sementara.     |
| Maintenance | `#[HEX]` | Station/unit dalam perawatan.                     |

## 6. Tipografi

| Elemen           | Ukuran     | Berat      | Penggunaan                                   |
| ---------------- | ---------- | ---------- | -------------------------------------------- |
| Page Title       | `[px/rem]` | `[weight]` | Judul dashboard atau halaman utama.          |
| Section Title    | `[px/rem]` | `[weight]` | Judul panel, form, dan section.              |
| Body             | `[px/rem]` | `[weight]` | Isi utama.                                   |
| Caption          | `[px/rem]` | `[weight]` | Metadata seperti jarak, waktu, ID perangkat. |
| Numeric Emphasis | `[px/rem]` | `[weight]` | Saldo, tarif, kWh, total biaya.              |
| Button           | `[px/rem]` | `[weight]` | Aksi utama dan sekunder.                     |

## 7. Status Sistem

### Status Charging Station

| Status          | Arti                             | Aksi Pengguna                   |
| --------------- | -------------------------------- | ------------------------------- |
| Aktif           | Station beroperasi               | Station dapat dipilih.          |
| Penuh           | Semua charger sedang digunakan   | Pengemudi memilih station lain. |
| Tutup Sementara | Station tidak menerima sesi baru | Tampilkan alasan jika ada.      |
| Dalam Perawatan | Station sedang maintenance       | Tidak dapat dipilih.            |

### Status Charger

| Status             | Arti                       | Aksi Pengguna/Operator                 |
| ------------------ | -------------------------- | -------------------------------------- |
| Tersedia           | Charger siap digunakan     | Pengemudi dapat memilih.               |
| Digunakan/Charging | Charger sedang dipakai     | Tampilkan progress untuk pemilik sesi. |
| Offline            | Perangkat tidak tersambung | Operator perlu memantau.               |
| Rusak              | Charger bermasalah         | Tidak dapat dipilih.                   |
| Maintenance        | Charger sedang perawatan   | Tidak dapat dipilih.                   |

### Status Transaksi

| Status   | Arti                                                   |
| -------- | ------------------------------------------------------ |
| Estimasi | Biaya masih perkiraan.                                 |
| Hold     | Saldo ditahan untuk sesi charging.                     |
| Berjalan | Sesi charging sedang berlangsung.                      |
| Selesai  | Transaksi sudah diselesaikan berdasarkan biaya aktual. |
| Gagal    | Pembayaran atau charging gagal.                        |
| Terhenti | Charging berhenti sebelum selesai.                     |

## 8. Komponen UI

### Dashboard Pengemudi

Elemen minimal:

- Ringkasan profil dan kendaraan aktif.
- Saldo Dompet Digital.
- Lokasi pengemudi.
- Daftar charging station sekitar.
- Status charger terpilih.
- Riwayat transaksi terbaru.
- Notifikasi charging/pembayaran.

### Card Charging Station

Informasi minimal:

- Nama station.
- Alamat singkat dan jarak.
- Status station.
- Jumlah charger tersedia.
- Tipe konektor.
- Daya charger.
- Tarif charging.
- Rating jika digunakan.
- Aksi `Lihat Detail`.

### Detail Charger

Informasi minimal:

- Kode perangkat.
- Tipe konektor.
- Daya kW.
- Status.
- Tarif.
- Estimasi biaya.
- Aksi `Pilih Charger`.

### Dompet Digital

Informasi minimal:

- Saldo tersedia.
- Saldo sedang di-hold jika ada.
- Tombol top up.
- Riwayat transaksi wallet.
- Status pembayaran terakhir.

### Dashboard Operator

Elemen minimal:

- Station/cabang yang ditugaskan.
- Status charger per station.
- Alert offline/rusak/maintenance.
- Utilisasi charger.
- Laporan pendapatan.
- Laporan gangguan perangkat.

### Dashboard Admin

Elemen minimal:

- Manajemen operator.
- Hak akses operator.
- Station dan penugasan operator.
- Konfigurasi sistem.
- Audit operasional.
- Ringkasan laporan seluruh station.

## 9. Button dan Aksi

| Aksi                  | Jenis Button      | Catatan                                |
| --------------------- | ----------------- | -------------------------------------- |
| Mulai Charging        | Primary           | Perlu validasi charger dan saldo.      |
| Konfirmasi Hold Saldo | Primary           | Perlu ringkasan estimasi biaya.        |
| Top Up                | Primary/Secondary | Tergantung konteks.                    |
| Hentikan Charging     | Danger/Warning    | Perlu konfirmasi.                      |
| Lihat Invoice         | Secondary         | Setelah transaksi selesai.             |
| Ubah Tarif            | Secondary         | Untuk operator/admin sesuai hak akses. |
| Nonaktifkan Charger   | Danger            | Untuk operator/admin sesuai hak akses. |

## 10. Form dan Validasi

- Label harus selalu terlihat.
- Placeholder hanya memberi contoh, bukan pengganti label.
- Error message muncul dekat field yang bermasalah.
- Field nominal uang harus menampilkan format rupiah.
- Field daya menggunakan satuan `kWh` atau `kW` sesuai konteks.
- Field koordinat harus divalidasi sebagai latitude/longitude.
- PIN tidak ditampilkan sebagai teks biasa.

## 11. Empty, Loading, dan Error State

### Empty State

| Halaman           | Pesan                                                                           |
| ----------------- | ------------------------------------------------------------------------------- |
| Kendaraan         | `Belum ada kendaraan. Tambahkan kendaraan untuk menemukan charger yang sesuai.` |
| Station sekitar   | `Belum ada charging station di sekitar lokasi ini.`                             |
| Riwayat transaksi | `Belum ada transaksi charging.`                                                 |
| Laporan operator  | `Belum ada data penggunaan pada periode ini.`                                   |

### Loading State

- Gunakan loading saat mengambil lokasi, daftar station, detail charger, saldo, dan status transaksi.
- Untuk dashboard, skeleton lebih baik daripada layar kosong.
- Untuk pembayaran/hold saldo, tampilkan status proses dan cegah klik ganda.

### Error State

| Kondisi                | Pesan                                                                           |
| ---------------------- | ------------------------------------------------------------------------------- |
| Saldo kurang           | `Saldo belum mencukupi. Silakan top up untuk melanjutkan.`                      |
| Charger berubah status | `Charger tidak lagi tersedia. Pilih charger lain.`                              |
| Payment gagal          | `Pembayaran gagal diproses. Coba lagi atau gunakan metode lain untuk top up.`   |
| Charger offline        | `Charger offline. Status akan diperbarui setelah perangkat tersambung kembali.` |
| Sinkronisasi gagal     | `Data status belum dapat diperbarui. Coba lagi beberapa saat.`                  |

## 12. Aksesibilitas

- Jangan hanya mengandalkan warna untuk status; gunakan teks status juga.
- Semua tombol penting harus memiliki label yang jelas.
- Kontras teks minimal memenuhi WCAG AA.
- Form dapat digunakan dengan keyboard.
- Error harus spesifik dan memberi langkah perbaikan.
- Angka penting seperti saldo, biaya, daya, dan durasi harus mudah terbaca.

## 13. Dokumentasi Visual yang Perlu Dibuat

- Wireframe dashboard pengemudi.
- Wireframe detail charging station.
- Wireframe estimasi biaya dan hold saldo.
- Wireframe sesi charging berjalan.
- Wireframe invoice/riwayat transaksi.
- Wireframe dashboard operator.
- Wireframe dashboard admin.
- Permission matrix admin/operator.
