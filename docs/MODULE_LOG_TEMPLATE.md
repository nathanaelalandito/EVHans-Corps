# Module Development Log Template - EVChargeHub

Gunakan dokumen ini untuk mencatat pembuatan, perubahan, perbaikan, penghapusan, dan keputusan teknis pada setiap modul EVChargeHub. Template ini membantu tim melacak perkembangan modul dari sisi frontend, backend, database, API, dokumentasi, dan testing.

## 1. Informasi Modul

| Item | Isi |
| --- | --- |
| Nama Modul | `[Driver / Vehicle / Wallet / Payment / Station / Charger / Operator / Admin / Report / Audit]` |
| Kode Modul | `[MOD-XX]` |
| PIC | `[Nama anggota tim]` |
| Reviewer | `[Nama reviewer]` |
| Status Modul | `[Planned / In Progress / Review / Done / Blocked]` |
| Prioritas | `[MUST / SHOULD / COULD / WONT]` |
| Versi Dokumen | `[v1.0]` |
| Tanggal Dibuat | `[DD MMM YYYY]` |
| Tanggal Update Terakhir | `[DD MMM YYYY]` |

## 2. Ringkasan Modul

`[Jelaskan fungsi modul secara singkat. Sebutkan aktor yang menggunakan modul, masalah yang diselesaikan, dan output utama modul.]`

Contoh:

`Modul Wallet digunakan oleh pengemudi EV untuk melihat saldo, melakukan top up, dan melakukan hold saldo sebelum sesi charging dimulai. Modul ini terhubung dengan Payment Gateway dan Charging Session.`

## 3. Scope Modul

### Termasuk

- `[Fitur yang termasuk dalam modul]`
- `[Proses bisnis yang ditangani]`
- `[Data yang dikelola]`

### Tidak Termasuk

- `[Fitur yang tidak termasuk]`
- `[Proses yang ditangani modul lain]`

## 4. Aktor Terkait

| Aktor | Kebutuhan dalam Modul |
| --- | --- |
| Pengemudi EV | `[Kebutuhan]` |
| Operator Charging Station | `[Kebutuhan]` |
| Admin Sistem | `[Kebutuhan]` |
| Payment Gateway | `[Kebutuhan]` |
| Sistem EVChargeHub (simulasi) | `[Kebutuhan]` |

## 5. Requirement Terkait

| Kode Requirement | Judul | Prioritas | Catatan |
| --- | --- | --- | --- |
| `[FRxx/NFRxx]` | `[Judul requirement]` | `[MUST/SHOULD/COULD/WONT]` | `[Catatan]` |

## 6. Log Perubahan Modul

| Tanggal | Tipe | Deskripsi Perubahan | Alasan | Dampak | PIC | Status |
| --- | --- | --- | --- | --- | --- | --- |
| `[DD MMM YYYY]` | `[Create / Update / Fix / Remove / Refactor / Decision]` | `[Apa yang dibuat atau diubah]` | `[Mengapa perubahan dilakukan]` | `[Dampak ke UI/API/DB/flow/dokumen]` | `[Nama]` | `[Done/In Review/Pending]` |

Contoh catatan untuk modul Pembayaran: `11 Nov 2026 | Update | Nota untuk transaksi charging dan Top Up dapat dicetak atau dibagikan sebagai PDF | Driver memerlukan bukti transaksi yang mudah disimpan dan dibagikan | Riwayat transaksi, detail pembayaran API, dan tampilan cetak; tanpa perubahan skema | Tim EVChargeHub | Done`.

Contoh catatan untuk Konfigurasi Sistem: `11 Nov 2026 | Fix | Driver membaca status Arrival Check dan radius dari konfigurasi backend | Tombol Mulai Charging sebelumnya memakai radius hard-coded sehingga tetap meminta Driver berada dekat station walau mode uji jarak jauh aktif | Tambah endpoint konfigurasi kedatangan untuk Driver dan samakan perilaku tombol dengan validasi server | Tim EVChargeHub | Done`.

Contoh catatan untuk direktori Operator: `11 Nov 2026 | Fix | Tampilkan notifikasi pembuatan Operator di dekat form dan perbarui daftar tanpa menutup halaman | Admin perlu konfirmasi langsung setelah akun berhasil dibuat | Tambah status sukses/gagal yang dapat diakses pembaca layar dan indikator proses submit | Tim EVChargeHub | Done`.

## 7. File Terkait

| Area | File/Path | Perubahan | Catatan |
| --- | --- | --- | --- |
| Frontend | `[frontend/src/...]` | `[Create/Update/Delete]` | `[Catatan]` |
| Backend | `[backend/app/...]` | `[Create/Update/Delete]` | `[Catatan]` |
| Routes/API | `[backend/routes/api.php]` | `[Create/Update/Delete]` | `[Catatan]` |
| Database | `[migration/model/seeder]` | `[Create/Update/Delete]` | `[Catatan]` |
| Dokumentasi | `[docs/...]` | `[Create/Update/Delete]` | `[Catatan]` |

## 8. API Terkait

| Method | Endpoint | Fungsi | Status | Catatan |
| --- | --- | --- | --- | --- |
| `GET` | `/api/...` | `[Fungsi endpoint]` | `[New/Changed/Deprecated/Removed]` | `[Catatan]` |
| `POST` | `/api/...` | `[Fungsi endpoint]` | `[New/Changed/Deprecated/Removed]` | `[Catatan]` |
| `PUT/PATCH` | `/api/...` | `[Fungsi endpoint]` | `[New/Changed/Deprecated/Removed]` | `[Catatan]` |
| `DELETE` | `/api/...` | `[Fungsi endpoint]` | `[New/Changed/Deprecated/Removed]` | `[Catatan]` |

## 9. Database Terkait

| Tabel/Entitas | Perubahan | Field/Relasi | Catatan |
| --- | --- | --- | --- |
| `[nama_tabel]` | `[Create table / Add field / Update field / Add relation / Remove field]` | `[field atau relasi]` | `[Catatan]` |

## 10. Alur Modul

1. `[Langkah 1]`
2. `[Langkah 2]`
3. `[Langkah 3]`
4. `[Langkah 4]`

## 11. Aturan Bisnis Modul

- `[Aturan bisnis 1]`
- `[Aturan bisnis 2]`
- `[Aturan bisnis 3]`

Contoh aturan untuk EVChargeHub:

- Charging tidak dapat dimulai jika saldo Dompet Digital kurang dari estimasi biaya.
- Charger harus divalidasi ulang sebelum sesi charging dimulai.
- Biaya akhir dihitung berdasarkan daya aktual dan biaya parkir flat.
- Operator hanya dapat mengakses station sesuai penugasan admin.
- Satu Operator dapat ditugaskan ke beberapa station.
- Satu station dapat ditangani beberapa Operator; station tanpa Operator harus Nonaktif sampai ditugaskan.
- Admin dan Operator yang ditugaskan boleh mengubah tarif secara langsung atau menjadwalkan perubahan.
- Sesi aktif mempertahankan tarif pada saat sesi dimulai; jadwal tarif yang belum berlaku dapat diubah atau dibatalkan.
- Operator mengatur status operasional secara manual; status charging mengikuti sesi aktif melalui sistem.
- Operator dapat menghentikan sesi dengan alasan wajib; sistem menghitung biaya aktual, menyelesaikan pembayaran, dan mengembalikan sisa saldo hold.
- Perubahan status charger/port menjadi Gangguan atau Perawatan menghentikan sesi aktif dan menyelesaikan transaksi sebelum status perangkat diperbarui.
- Admin dan Operator dapat mengubah data teknis charger/port; Operator hanya pada station tugas dan wajib mengisi alasan.
- Admin dan Operator yang ditugaskan sama-sama dapat membuat charger/port, mengedit data teknis, dan mengubah status. Perubahan dicatat dengan alasan; Admin memiliki cakupan semua station.
- Status Sedang Mengisi ditentukan sistem. Perubahan status perangkat yang masih memiliki sesi aktif menyelesaikan sesi dan merekonsiliasi hold terlebih dahulu.
- Perubahan status station tidak menghentikan sesi aktif, tetapi station Nonaktif/Maintenance menolak sesi baru.
- Tindakan penghentian sesi, perubahan data teknis, dan perubahan status mencatat aktor, station, waktu, alasan, dan nilai sebelum/sesudah.
- Admin dapat mengubah konfigurasi operasional serta simulasi; laporan Admin mendukung filter periode, station, dan charger.
- Halaman awal Admin menampilkan ringkasan lintas station dan daftar perhatian dengan akses cepat ke modul terkait.
- Perubahan penugasan Operator menggunakan pilihan yang dapat ditinjau sebelum disimpan; perubahan status meminta alasan melalui konfirmasi.
- Penugasan dikelola dari detail station dalam satu perubahan batch dengan pencarian Operator aktif, pratinjau jumlah penambahan/pelepasan, dan umpan balik setelah simpan. Direktori Operator menjadi tampilan informasi/jalan pintas ke station.
- Direktori Operator dapat dicari berdasarkan nama, email, nomor telepon, atau station tugas dan difilter menurut status akun serta station; kartu memakai tata letak responsif dua/tiga/satu kolom.
- Penggantian daftar petugas hanya memengaruhi station yang sedang dibuka. Station aktif tidak dapat disimpan tanpa Operator aktif; Admin dapat menonaktifkan station melalui konfirmasi status sebelum mengosongkan penugasan.
- Perubahan penting mencatat aktor, waktu, dan nilai sebelum/sesudah.

Aturan UX dan fungsi Driver:

- GPS pengguna adalah sumber perhitungan jarak. Jika lokasi belum valid, daftar station tetap dapat dibuka tetapi tidak menampilkan jarak/urutan terdekat seolah-olah lokasi nyata; sediakan status dan tindakan coba lagi.
- Dashboard Station Sekitar menampilkan maksimal tiga rekomendasi kompatibel dengan kendaraan aktif dan mengurutkannya berdasarkan GPS bila valid. Filter Maps tidak mengubah rekomendasi dashboard; Maps selalu menampilkan peta dan daftar hasil secara bersamaan. Rating hanya boleh diaktifkan jika data ulasan nyata tersedia.
- Status sesi aktif disinkronkan berkala dengan server. Jika server menyatakan sesi berakhir, UI segera menghapus panel sesi aktif dan memperbarui saldo, station, serta riwayat. Kegagalan sinkronisasi harus terlihat.
- Rincian estimasi biaya memisahkan energi, parkir, total, dan dana hold; UI menjelaskan bahwa biaya aktual direkonsiliasi setelah sesi berakhir.
- Di Maps, tombol Kembali dan judul menjadi kontrol terpisah pada bagian atas Card Pencarian. Pencarian, dropdown konektor, filter lanjutan, jumlah hasil, dan hasil station tinggal dalam panel yang sama dan dapat diperluas. Tombol Filter menunjukkan jumlah filter aktif dan menyediakan Hapus pencarian dan filter.
- Maps tidak memiliki toggle Peta/Daftar. Desktop memakai Card Pencarian mengambang selebar sekitar 380px dengan radius pada semua sudut; mobile menampilkan peta di atas dan daftar yang discroll di panel bawah.
- Memilih kartu station menyorot marker terkait; memilih marker memilih kartu station yang sama. Dropdown konektor menyediakan Semua sebagai nilai awal.
- Beranda memprioritaskan sapaan/kendaraan, saldo dan saldo tertahan, satu CTA pencarian, sesi aktif jika ada, dan tiga rekomendasi station. Station Sekitar mengisi sekitar 30% lebar konten desktop; Riwayat Transaksi mengisi sekitar 70%.
- Judul Riwayat Transaksi, Periode, dan Cari Transaksi ditata sebaris pada desktop, tepat di atas dua tabel berdampingan. Masing-masing tabel menampilkan maksimal lima transaksi; hasil satu halaman dibagi seimbang, dengan navigasi Sebelumnya/Berikutnya dan tanggal Custom yang muncul saat dipilih.
- Riwayat membedakan arus dana secara konsisten: Top Up memakai panah naik hijau dan nominal positif; pembayaran memakai panah turun merah dan nominal negatif. Status pembayaran ditampilkan terpisah dari arah dana.
- Header Driver menata card sapaan/kendaraan aktif, saldo, dan Cari Charging Station dalam satu baris pada desktop lebar. Pada tablet, pencarian turun ke baris berikutnya; pada layar ponsel card ditumpuk. Tombol Tambah Kendaraan berada di samping label Kendaraan Aktif; Notifikasi dan Pengaturan berada di sisi sapaan.
- Sesi aktif ditampilkan sekali pada beranda, tanpa notifikasi duplikat.
- Layout desktop memakai dua kolom konten yang proporsional; layar kecil menjadi satu kolom dengan urutan informasi yang sama.
- Saat GPS tidak tersedia, satu pesan lokasi ditampilkan dan jarak di kartu disembunyikan agar tidak berulang.
- Ikon memakai sistem ikon aplikasi; emoji tidak digunakan sebagai ikon kontrol atau status.

Aturan UX dashboard Operator:

- Nama station aktif selalu terlihat; pemilih hanya diperlukan jika Operator memiliki beberapa station tugas.
- Dashboard mengutamakan station aktif dan ringkasan kondisi port. Gangguan dibuka dan ditangani di Kelola Charger.
- Penghentian sesi memerlukan konfirmasi dan alasan; navigasi utama tetap tersedia di layar kecil.
- Sidebar Dashboard Operator, Kelola Charger, dan Laporan menggunakan pola visual card Admin, tanpa menyamakan tautan atau hak akses kedua peran.
- Sidebar menampilkan label pada desktop/tablet dan menjadi navigasi bawah pada layar kecil.
- Metrik memakai placeholder saat pemuatan awal; station kosong dibedakan dari kegagalan jaringan. Badge notifikasi hanya menghitung alert dari endpoint.
- Sesi aktif berubah menjadi kartu responsif pada layar kecil agar informasi dan tombol Akhiri Sesi mudah digunakan.

Aturan UX modul Station & Charger:

- Daftar station mendukung pencarian nama/alamat dan filter status operasional sesuai cakupan hak akses.
- Jumlah unit berstatus operasional dan jumlah port tersedia ditampilkan sebagai metrik terpisah.
- Detail station disusun dalam bagian Ringkasan, Charger & Port, dan Tarif.
- Ringkasan Admin menunjukkan apakah station sudah memiliki Operator yang ditugaskan; station tanpa Operator tetap Nonaktif.
- Pengguna melihat tarif berjalan, tarif baru, waktu efektif, dan dampak perubahan terhadap sesi aktif sebelum menyimpan.
- Perubahan status meminta alasan dan menjelaskan konsekuensi terhadap sesi aktif.

Aturan alur penambahan station:

- Form penambahan berada pada halaman wizard Informasi, Operator, Tarif awal, dan Tinjau & simpan.
- Station selalu dibuat Nonaktif; tanpa Operator station hanya dapat disimpan sebagai draft Nonaktif.
- Aktivasi wajib memiliki sekurangnya satu Operator aktif dan alasan aktivasi. Tarif dapat diatur di wizard atau setelah station dibuat; isian tarif yang dimulai harus lengkap.
- Form Tambah Operator di dalam wizard membuat akun sekaligus penugasan ke station baru.
- Penugasan Operator lama dipertahankan saat ditambahkan pada station baru.
- Jika tahapan lanjutan gagal, station yang sudah tercipta tetap Nonaktif dan dapat dilanjutkan tanpa duplikasi.
- Kode `SPKLU-####` unik disimpan sebagai kode panggil terpisah dari ID database; awalan `EVCharge Hub` tidak disimpan pada nama station.
- Pemilih titik lokasi menyediakan pencarian alamat eksplisit, pilihan hasil, peta lebih besar, dan pemilihan manual.
- Form email Operator hanya menerima nama email, mencegah autofill email akun Admin, menambahkan `@ops.ac.id`, dan memvalidasi keunikan email lengkap.
- Nomor telepon Operator hanya menerima angka dengan panjang 1–13 digit; pembatasan diterapkan pada form dan API.
- Biaya minimum bersifat opsional dengan default Rp0; bila diberi nilai positif, ia menjadi batas minimum biaya energi.

## 12. Dampak Perubahan

| Area Terdampak | Dampak | Tindakan Lanjutan |
| --- | --- | --- |
| UI | `[Dampak]` | `[Tindakan]` |
| API | `[Dampak]` | `[Tindakan]` |
| Database | `[Dampak]` | `[Tindakan]` |
| Authorization | `[Dampak]` | `[Tindakan]` |
| Testing | `[Dampak]` | `[Tindakan]` |
| Dokumentasi | `[Dampak]` | `[Tindakan]` |

## 13. Risiko dan Kendala

| Risiko/Kendala | Dampak | Solusi/Mitigasi | Status |
| --- | --- | --- | --- |
| `[Risiko atau kendala]` | `[Dampak]` | `[Solusi]` | `[Open/Resolved]` |

## 14. Keputusan Teknis

| Tanggal | Keputusan | Alasan | Diputuskan Oleh |
| --- | --- | --- | --- |
| `[DD MMM YYYY]` | `[Keputusan teknis]` | `[Alasan]` | `[Nama]` |

## 15. Checklist Implementasi

- `[ ]` Requirement modul sudah jelas.
- `[ ]` UI sudah dibuat atau diperbarui.
- `[ ]` API sudah dibuat atau diperbarui.
- `[ ]` Database/migration/model sudah dibuat atau diperbarui.
- `[ ]` Validasi input sudah dibuat.
- `[ ]` Authentication dan authorization sudah sesuai.
- `[ ]` Loading, empty, error, dan success state sudah dibuat.
- `[ ]` Audit log dibuat jika modul mengubah data penting.
- `[ ]` Manual test sudah dilakukan.
- `[ ]` Test case sudah dicatat.
- `[ ]` Dokumentasi modul sudah diperbarui.
- `[ ]` Perubahan sudah direview.

## 16. Catatan Testing

| ID Test | Skenario | Data Uji | Hasil Diharapkan | Status | Catatan |
| --- | --- | --- | --- | --- | --- |
| `[TC-XX]` | `[Skenario]` | `[Data uji]` | `[Hasil yang diharapkan]` | `[Pass/Fail/Blocked]` | `[Catatan]` |

## 17. Riwayat Versi Dokumen

| Versi | Tanggal | Perubahan | Penulis |
| --- | --- | --- | --- |
| `v1.0` | `[DD MMM YYYY]` | `Dokumen awal dibuat.` | `[Nama]` |
