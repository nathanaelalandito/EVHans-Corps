# Data Simulasi EVChargeHub

Seeder lokal menyediakan sembilan station berkode `SPKLU-0001` sampai `SPKLU-0009`, masing-masing dengan dua charger, port berkonektor CCS2, Type 2, CHAdeMO, atau GB/T, serta tarif aktif. Status station dan perangkat dibuat bervariasi agar alur pencarian Driver dan pemantauan Operator/Admin dapat dicoba. Semua station demo ditugaskan kepada Operator aktif.

Seeder dapat dijalankan ulang tanpa membuat duplikat data station, tarif berjalan, charger, port, dan penugasan Operator. Seeder akun demo memperbarui profil dan mengatur ulang kata sandi akun demo menjadi `password123`.

Jalankan dari folder `backend`:

```bash
php artisan db:seed
```

Perintah ini tidak menghapus data dan tidak menjalankan migrasi. Pastikan migrasi database sudah diterapkan sebelum menjalankannya.

| Akun simulasi | Email | Kata sandi |
| --- | --- | --- |
| Driver | `budi.driver@ac.id` | `password123` |
| Operator | `ops.lapangan@ops.ac.id` | `password123` |
| Admin | `admin.utama@admin.ac.id` | `password123` |
