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
| Perangkat Charger | `[Kebutuhan]` |

## 5. Requirement Terkait

| Kode Requirement | Judul | Prioritas | Catatan |
| --- | --- | --- | --- |
| `[FRxx/NFRxx]` | `[Judul requirement]` | `[MUST/SHOULD/COULD/WONT]` | `[Catatan]` |

## 6. Log Perubahan Modul

| Tanggal | Tipe | Deskripsi Perubahan | Alasan | Dampak | PIC | Status |
| --- | --- | --- | --- | --- | --- | --- |
| `[DD MMM YYYY]` | `[Create / Update / Fix / Remove / Refactor / Decision]` | `[Apa yang dibuat atau diubah]` | `[Mengapa perubahan dilakukan]` | `[Dampak ke UI/API/DB/flow/dokumen]` | `[Nama]` | `[Done/In Review/Pending]` |

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
