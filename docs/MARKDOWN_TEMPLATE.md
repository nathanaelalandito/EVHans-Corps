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
- `[Perangkat Charger]`

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
- Digunakan/Charging
- Offline
- Rusak
- Maintenance

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
