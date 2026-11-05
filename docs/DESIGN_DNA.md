# EVHUB Design DNA

> Sistem visual untuk EVHUB: antarmuka kendaraan listrik yang tenang, jelas,
> dan terasa premium tanpa menjadi dingin atau ramai.

## 1. Karakter

EVHUB adalah **soft enterprise UI**: dashboard dan alur transaksi yang terasa
ringan, rapi, dan dapat dipercaya. Informasi teknis (status charger, tarif,
port, pembayaran) harus mudah dipindai, sementara aksi penting selalu tampak
jelas.

Kata kunci: **tenang, modern, lapang, presisi, ramah, dapat diandalkan**.

## 2. Prinsip keputusan desain

1. **Satu layar, satu tujuan utama.** Aksi utama harus menjadi elemen paling
   mudah ditemukan pada layar.
2. **Utamakan informasi sebelum dekorasi.** Setiap warna, ikon, garis, dan
   kartu harus membantu pemahaman atau tindakan pengguna.
3. **Ruang kosong adalah struktur.** Jangan memadatkan kartu hanya agar lebih
   banyak informasi masuk. Kelompokkan informasi dan beri jarak yang tegas.
4. **Konsistensi membangun kepercayaan.** Status, tombol, kartu, dan angka
   penting harus tampil dengan pola yang sama di seluruh aplikasi.
5. **Progres harus terasa jelas.** Saat mencari stasiun, mengisi daya, atau
   membayar, tampilkan status saat ini, langkah berikutnya, dan hasilnya.

## 3. Tata letak dan hirarki

- Gunakan latar `--ev-bg` dengan surface/kartu putih sebagai area informasi.
- Selaraskan konten pada grid; hindari elemen yang "mengambang" tanpa alasan.
- Dashboard desktop menggunakan sidebar tipis dan area konten yang lapang.
- Pada mobile, prioritaskan konten dan aksi utama; navigasi bawah hanya untuk
  tujuan inti.
- Satu kartu menyampaikan satu topik: ringkasan saldo, charger, sesi pengisian,
  atau aktivitas terbaru. Pisahkan topik yang tidak saling bergantung.
- Judul halaman menjelaskan konteks; subteks hanya dipakai jika membantu
  keputusan pengguna.

## 4. Warna

Palet didominasi netral hangat/kebiruan. Hijau EV adalah aksen identitas dan
dipakai untuk tindakan utama serta kondisi siap/berhasil. Warna status tidak
boleh dipakai sebagai dekorasi.

| Peran | Token | Penggunaan |
| --- | --- | --- |
| Latar aplikasi | `--ev-bg` | Area di luar kartu dan halaman dashboard |
| Surface | `--ev-surface` | Kartu, modal, input, dan panel |
| Aksi utama | `--ev-primary` | CTA utama, state aktif, indikator charging |
| Aksen lembut | `--ev-primary-soft` | Latar badge dan state terpilih |
| Sukses | `--ev-success` | Selesai, tersedia, pembayaran berhasil |
| Peringatan | `--ev-warning` | Perlu perhatian atau ketersediaan terbatas |
| Bahaya | `--ev-danger` | Gagal, berhenti, atau aksi destruktif |

Aturan: satu layar cukup memiliki satu warna aksen utama. Jangan menggunakan
gradient dekoratif, dan jangan hanya mengandalkan warna untuk menyampaikan
status—selalu sertakan label atau ikon yang bermakna.

## 5. Tipografi

- Gunakan `Plus Jakarta Sans` untuk UI; gunakan `Outfit` terbatas pada angka
  penting atau heading dashboard apabila diperlukan.
- Warna judul memakai `--ev-ink`; teks pendukung memakai `--ev-text-muted`.
- Maksimal tiga tingkat teks utama per area: heading, body, dan supporting text.
- Jangan menggunakan `font-weight` di atas 700 atau seluruh teks huruf kapital
  untuk isi antarmuka.
- Angka kritis (tarif, daya, saldo, durasi) diberi ruang dan kontras lebih,
  bukan warna ramai.

## 6. Komponen

### Kartu

- Putih, radius `--ev-radius-lg`, border tipis `--ev-border`, bayangan halus.
- Padding minimum 16px pada mobile dan 24px pada desktop.
- Hindari kartu di dalam kartu kecuali ada perbedaan konteks yang jelas.

### Tombol

- Satu CTA primer per kelompok aksi; sisanya gunakan secondary atau text button.
- Tinggi minimum `--ev-touch-target` (44px).
- Tombol primer memakai hijau EV dan teks putih; jangan memakai shadow berat.

### Input dan filter

- Border netral, fokus hijau dengan focus ring yang jelas.
- Label tetap terlihat; placeholder bukan pengganti label.

### Status

- Gunakan pill/badge kecil dengan teks: `Tersedia`, `Mengisi daya`,
  `Terisi penuh`, `Gangguan`, dan seterusnya.
- Ikon dan warna mendukung label; teks tetap menjadi sumber makna utama.

## 7. Spacing, radius, dan elevasi

- Gunakan skala 4px/8px: `--ev-space-1` sampai `--ev-space-10`.
- Radius kecil untuk kontrol, medium untuk panel, besar untuk kartu utama.
- Gunakan border lebih dulu; bayangan hanya untuk memisahkan level permukaan.
- Jangan mencampur lebih dari dua level elevasi dalam satu layar.

## 8. Aksesibilitas dan responsif

- Semua kontrol interaktif memiliki target sentuh minimum 44 × 44px.
- Fokus keyboard harus terlihat.
- Kontras teks harus terbaca pada cahaya terang; teks pendukung tidak boleh
  terlalu pucat.
- Layar harus nyaman pada lebar mulai 320px; informasi penting tidak tersembunyi
  hanya karena ukuran layar.
- Jangan mengunci tinggi konten yang dapat bertambah karena data, bahasa, atau
  ukuran font pengguna.

## 9. Checklist kritik UI/UX

Sebelum merilis atau merevisi halaman, tanyakan:

1. Apa aksi atau informasi utama pada layar ini, dan apakah terlihat dalam tiga
   detik pertama?
2. Apakah urutan visualnya jelas: konteks → informasi → aksi?
3. Apakah ada kartu, warna, teks, atau ikon yang tidak menambah makna?
4. Apakah pola status, tombol, spacing, dan radius konsisten dengan token EVHUB?
5. Apakah desain tetap mudah dipakai pada mobile dan dengan keyboard?

## 10. Larangan visual

- Gradient sebagai hiasan, shadow gelap, atau border bertumpuk.
- Lebih dari satu CTA primer pada area yang sama.
- Terlalu banyak warna aksen dalam satu layar.
- Kartu padat yang mencampur beberapa tujuan.
- Ikon tanpa label untuk tindakan ambigu.
- Teks abu-abu pucat yang mengorbankan keterbacaan.
