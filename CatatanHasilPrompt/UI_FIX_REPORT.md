# UI Fix Dashboard Driver — Laporan

## Akar penyebab
- ✕ nota: tombol memakai `.mapdash-notif-close` (`position: absolute; top: 50%`) tanpa induk `relative`; header nota tidak flex, sehingga ✕ melayang ke tengah-kanan isi.
- Kotak kosong: `.home-history-period-select` memakai `width: 1%; min-width: 0`, sehingga select menciut hampir nol; kontainer pencarian juga `min-width: 0`.

## File yang diubah
- `frontend/src/DriverDashboard.jsx`: judul kartu dompet menjadi "Dompet Digital"; tombol salin/✕ nota tetap satu gaya untuk charging dan Top Up.
- `frontend/src/driverDashboardEV.css`: header nota sticky, ✕ bulat 36px/hit area 44px, tombol salin pill, flex-wrap bar filter, min-width pencarian ≥180px, select min-width 120px, judul dompet, caption overflow-wrap.

## Lint dan build
- `npm run lint`: 31 error lama pada file lain; tidak ada error baru dari perubahan ini.
- `npm run build`: berhasil.

## Tidak terverifikasi
- Tidak diuji di browser/device nyata; hanya lint dan build.
- Perilaku flex-wrap dan overflow horizontal pada 375/768/1280px belum diverifikasi visual.
- Status clipboard fallback belum diuji manual.

## Skenario uji manual
1. Nota charging dan Top Up di 375px dan desktop: ✕ di pojok kanan atas header, tetap terlihat saat scroll, tidak ada ✕ kedua; Esc dan backdrop menutup.
2. Klik "Salin ID transaksi": menjadi "Tersalin", lalu kembali; tempel dan cocokkan dengan nomor invoice.
3. Tab ke tombol salin dan ✕: ring fokus terlihat, Enter/Space berfungsi.
4. Dashboard di 375, 768, 1280px: judul "Dompet Digital" tampil, kolom pencarian tidak menciut, tidak ada scroll horizontal.
