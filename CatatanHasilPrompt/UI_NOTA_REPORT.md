# UI Nota Charging — Perbaikan Tombol Salin & Tutup

## Akar penyebab ✕ salah posisi
- Tombol tutup memakai kelas global `.mapdash-notif-close` yang memiliki `position: absolute; right: 14px; top: 50%; transform: translateY(-50%)`.
- Induk header nota (`.settings-panel-header`) tidak `position: relative` dan tidak memakai flexbox, sehingga tombol absolut mengacu ke ancestor terdekat (panel/viewport) dan muncul di tengah-kanan isi (dekat "Alamat").
- Kelas override `.settings-panel .mapdash-notif-close` tidak berlaku pada `.invoice-detail-panel`, sehingga gaya absolut tetap aktif.

## File yang diubah
- `frontend/src/DriverDashboard.jsx`: impor `FiCheck` dan `FiAlertTriangle`; state `invoiceCopyStatus` + timer ref; efek reset/cleanup timer; efek scroll lock + Esc; handler `handleCopyInvoiceId` dengan fallback `execCommand`; header modal sticky dengan tombol `.invoice-modal-close`; baris nomor invoice memakai grup kanan; teks tombol berubah Tersalin/Gagal menyalin + `aria-live`.
- `frontend/src/driverDashboardEV.css`: header sticky, tombol ✕ bulat 36px dengan hit area 44px, tombol salin pill hijau, layout kanan rapi, state hover/fokus/aktif/disabled, target sentuh mobile.

## Tidak terverifikasi
- Tidak diuji di browser/device nyata; verifikasi hanya lint file yang diubah dan `npm run build`.
- Perilaku clipboard pada konteks tidak aman/fallback `execCommand` belum diuji manual.
- Interaksi print CSS dengan header sticky belum diuji visual.

## Skenario uji manual
- Buka nota charging dan nota Top Up di 375px dan desktop: ✕ ada di pojok kanan atas header, tetap terlihat saat scroll, tidak ada ✕ kedua.
- Klik ✕, tekan Esc, klik backdrop: modal tertutup.
- Klik "Salin ID transaksi": berubah jadi "Tersalin" lalu kembali; tempel hasilnya dan pastikan sama dengan nomor invoice.
- Navigasi keyboard: Tab ke tombol salin dan ✕, ring fokus terlihat, Enter/Space berfungsi.
