# UI Notifications Report

## Akar penyebab panel terpotong
Panel lama memakai `position: absolute` di dalam header dengan `overflow: hidden` pada induk, sehingga daftar terpotong batas header. Perbaikan: render modal lewat portal ke `document.body`, backdrop + panel centered, body scroll lock, z-index tinggi.

## File yang diubah
- `frontend/src/NotificationsBell.jsx`: portal modal, focus trap, scroll lock, filter status/kategori, filter tanggal dengan preset/rentang, grouping per tanggal, state loading/empty/error, load more.
- `frontend/src/notificationsBell.css`: styling modal responsif, chip, date popover, skeleton, group header sticky.

## Keputusan filter
- Backend `GET /notifications` tidak mendukung filter, sehingga filter dilakukan di sisi klien pada data yang sudah dimuat.
- Badge unread tetap memakai endpoint unread-count (total sebenarnya), tidak terpengaruh filter.
- Rekomendasi tambahan: tambahkan param filter di backend untuk akurasi pagination.

## Pemetaan chip ke tipe
- Charging: `charging_selesai`, `charging_gagal`
- Pembayaran: `topup_gagal`
- Gangguan: `charger_gangguan`
- Chip hanya tampil jika ada data pada tipe terkait.

## Hal yang tidak terverifikasi
- Tidak ada test frontend; tidak diuji di browser secara manual oleh agent.
- Focus trap dan scroll lock perlu verifikasi manual.
- Navigasi ke entitas terkait belum ditambahkan (tidak ada halaman tujuan yang jelas).

## Skenario uji manual
- Driver mobile 375px: modal hampir penuh, scroll daftar, Esc/backdrop menutup, scroll body terkunci.
- Driver desktop: modal centered max 520px, filter chip horizontal scroll.
- Operator dan Admin: modal tidak bentrok dengan overlay lain, z-index cukup.
- Filter tanggal: preset dan rentang valid, error inline, hapus filter.
- Tandai dibaca: optimistic update, rollback jika gagal.
- State kosong/error: tampil pesan dan tombol coba lagi/hapus filter.
