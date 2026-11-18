# UI Bantuan — Laporan

## File yang diubah
- `frontend/src/Bantuan.jsx`: header sticky dengan status scroll, chip dengan jumlah pertanyaan, judul dinamis + jumlah hasil, akordeon dengan panel animasi, empty state dengan tombol hapus pencarian.
- `frontend/src/bantuan.css`: palet EV, max-width 720px, header sticky, chip count, panel accordion, empty button, padding bawah.

## Jawaban yang ditambahkan
- Tidak ada jawaban baru; seluruh FAQ yang ada dipertahankan.

## Lint dan build
- `npm run lint`: tidak ada error baru di `Bantuan.jsx`; 17 error lama lainnya tetap ada.
- `npm run build`: berhasil.

## Tidak terverifikasi
- Tidak diuji di browser; animasi akordeon, chip scroll, sticky header, dan responsive 375/768/1280px belum diverifikasi visual.
- Aksesibilitas keyboard/screen reader belum diuji manual.

## Skenario manual
- Cek tiga lebar layar (375, 768, 1280px): tidak ada scroll horizontal.
- Buka/tutup akordeon dengan mouse dan keyboard (Enter/Space).
- Cari "PIN", lalu pilih chip "Dompet & PIN".
- Cari kata yang tidak ada, lalu klik "Hapus pencarian".
- Hapus pencarian manual dan pastikan daftar kembali penuh.
