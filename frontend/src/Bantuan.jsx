import { useMemo, useState } from 'react';
import { FiArrowLeft, FiSearch, FiX } from 'react-icons/fi';
import './bantuan.css';

// ---------------------------------------------------------------------------
// KONTAK BANTUAN — isi sesuai kanal dukungan aplikasimu.
// ---------------------------------------------------------------------------
const KONTAK_BANTUAN = {
    whatsapp: '089698903350',
    email: 'supportev@gmail.com',
    telepon: '089698903350',
    jamLayanan: 'Setiap hari, 08.00–21.00 WIB',
};

const KATEGORI = ['Semua', 'Akun', 'Kendaraan', 'Dompet & PIN', 'Mengisi Daya'];

const FAQ = [
    {
        id: 'akun-profil',
        kategori: 'Akun',
        q: 'Bagaimana cara mengubah data profil saya?',
        a: 'Buka Pengaturan lewat tombol ⚙️ di dashboard, lalu ketuk kartu profil di bagian atas. Kamu bisa mengubah nama, nomor telepon, tanggal lahir, alamat, dan email, kemudian simpan. Perlu diingat, mengubah email akan mereset status verifikasi email.',
    },
    {
        id: 'akun-sesi',
        kategori: 'Akun',
        q: 'Tiba-tiba kembali ke layar login, kenapa?',
        a: 'Itu tandanya sesi login kamu sudah kedaluwarsa atau tidak valid lagi. Cukup masuk kembali dengan akun yang sama; data kendaraan dan dompetmu tetap aman.',
    },
    {
        id: 'akun-password',
        kategori: 'Akun',
        q: 'Saya lupa password akun. Apa yang harus dilakukan?',
        a: 'Saat ini aplikasi belum menyediakan fitur reset password mandiri. Silakan hubungi tim dukungan lewat kontak di bagian bawah halaman ini.',
    },
    {
        id: 'kendaraan-tambah',
        kategori: 'Kendaraan',
        q: 'Bagaimana cara menambah kendaraan?',
        a: 'Buka Pengaturan → Kendaraan Saya, lalu ketuk "+ Tambah Kendaraan". Isi merek, model, nomor polisi, dan tipe konektor. Kamu juga bisa menekan "+ Tambah kendaraan" langsung dari dashboard.',
    },
    {
        id: 'kendaraan-konektor',
        kategori: 'Kendaraan',
        q: 'Tipe konektor mana yang harus saya pilih?',
        a: 'Pilih sesuai lubang pengisian di mobilmu (cek buku manual atau tanya dealer). Pilihan yang tersedia: Type 2 (AC), CCS2 (AC dan DC cepat), CHAdeMO (DC cepat), dan GB/T (AC dan DC). Pastikan konektor kendaraan cocok dengan konektor di stasiun sebelum mengisi daya.',
    },
    {
        id: 'kendaraan-plat',
        kategori: 'Kendaraan',
        q: 'Muncul pesan "Nomor polisi ini sudah terdaftar". Kenapa?',
        a: 'Setiap nomor polisi hanya bisa terdaftar satu kali. Periksa dulu apakah kamu salah ketik atau sudah pernah menambahkannya di daftar Kendaraan Saya. Kalau yakin itu kendaraanmu tetapi tetap ditolak, hubungi tim dukungan.',
    },
    {
        id: 'kendaraan-banyak',
        kategori: 'Kendaraan',
        q: 'Apakah saya bisa punya lebih dari satu kendaraan?',
        a: 'Bisa. Semua kendaraan tampil di daftar Kendaraan Saya, dan kamu dapat memilih kendaraan yang sedang aktif langsung dari dashboard.',
    },
    {
        id: 'pin-fungsi',
        kategori: 'Dompet & PIN',
        q: 'Untuk apa PIN dompet?',
        a: 'PIN 6 digit angka dipakai untuk mengonfirmasi top up dan pembayaran dari dompet, supaya saldomu tidak bisa dipakai orang lain. Atur lewat Pengaturan → Kelola PIN Dompet.',
    },
    {
        id: 'pin-salah',
        kategori: 'Dompet & PIN',
        q: 'Dompet saya terkunci karena salah PIN. Bagaimana?',
        a: 'Setelah 3 kali salah memasukkan PIN, dompet dikunci sementara selama 30 detik demi keamanan. Tunggu sampai waktu kunci berakhir, lalu coba lagi dengan PIN yang benar.',
    },
    {
        id: 'pin-lupa',
        kategori: 'Dompet & PIN',
        q: 'Saya lupa PIN dompet.',
        a: 'Mengubah atau menonaktifkan PIN mewajibkan PIN saat ini, jadi kalau PIN terlupa kamu tidak bisa melakukannya sendiri lewat aplikasi. Hubungi tim dukungan agar kami bantu memulihkan akses dompetmu.',
    },
    {
        id: 'pin-ubah',
        kategori: 'Dompet & PIN',
        q: 'Bagaimana cara mengubah atau menonaktifkan PIN?',
        a: 'Buka Pengaturan → Kelola PIN Dompet, lalu pilih "Ubah PIN" atau "Nonaktifkan PIN". Keduanya meminta PIN kamu saat ini untuk konfirmasi. PIN baru harus 6 digit angka dan berbeda dari PIN lama.',
    },
    {
        id: 'daya-mulai',
        kategori: 'Mengisi Daya',
        q: 'Bagaimana cara menemukan stasiun pengisian?',
        a: 'Di dashboard, stasiun ditampilkan di peta beserta lokasi kamu. Kamu bisa menyaring berdasarkan tipe konektor, lalu ketuk stasiun untuk melihat detailnya.',
    },
    {
        id: 'daya-lokasi',
        kategori: 'Mengisi Daya',
        q: 'Lokasi saya tidak terdeteksi di peta.',
        a: 'Pastikan izin lokasi untuk browser/aplikasi sudah diizinkan dan GPS perangkat menyala. Jika izin sebelumnya ditolak, ubah lewat pengaturan situs di browsermu lalu muat ulang halaman.',
    },
];

const normalisasi = (s) => String(s || '').toLowerCase();

export default function Bantuan({ onBack }) {
    const [query, setQuery] = useState('');
    const [kategori, setKategori] = useState('Semua');
    const [openId, setOpenId] = useState(null);

    const hasil = useMemo(() => {
        const kata = normalisasi(query).trim();
        return FAQ.filter((item) => {
            if (kategori !== 'Semua' && item.kategori !== kategori) return false;
            if (!kata) return true;
            return normalisasi(item.q).includes(kata) || normalisasi(item.a).includes(kata);
        });
    }, [query, kategori]);

    const { whatsapp, email, telepon, jamLayanan } = KONTAK_BANTUAN;
    const kanal = [
        whatsapp && {
            key: 'wa',
            icon: '💬',
            label: 'WhatsApp',
            value: 'Chat dengan kami',
            href: `https://wa.me/${whatsapp.replace(/\D/g, '')}`,
            external: true,
        },
        email && {
            key: 'email',
            icon: '✉️',
            label: 'Email',
            value: email,
            href: `mailto:${email}?subject=${encodeURIComponent('Bantuan aplikasi EV')}`,
        },
        telepon && {
            key: 'tel',
            icon: '📞',
            label: 'Telepon',
            value: telepon,
            href: `tel:${telepon.replace(/[^\d+]/g, '')}`,
        },
    ].filter(Boolean);

    return (
        <div className="bantuan-page">
            <header className="bantuan-header">
                <div className="bantuan-header-inner">
                    <button className="bantuan-back-btn" onClick={onBack} aria-label="Kembali">
                        <FiArrowLeft aria-hidden="true" />
                    </button>
                    <div className="bantuan-header-text">
                        <h1 className="bantuan-title">Bantuan</h1>
                        <p className="bantuan-subtitle">Ada yang bisa kami bantu?</p>
                    </div>
                </div>
            </header>

            <main className="bantuan-content">
                <div className="bantuan-search">
                    <span className="bantuan-search-icon" aria-hidden="true">
                        <FiSearch />
                    </span>
                    <input
                        type="search"
                        className="bantuan-search-input"
                        placeholder="Cari pertanyaan, mis. PIN, konektor..."
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        aria-label="Cari bantuan"
                    />
                    {query && (
                        <button
                            className="bantuan-search-clear"
                            onClick={() => setQuery('')}
                            aria-label="Hapus pencarian"
                        >
                            <FiX aria-hidden="true" />
                        </button>
                    )}
                </div>

                <div className="bantuan-chips" role="tablist" aria-label="Kategori bantuan">
                    {KATEGORI.map((k) => (
                        <button
                            key={k}
                            role="tab"
                            aria-selected={kategori === k}
                            className={`bantuan-chip${kategori === k ? ' bantuan-chip-active' : ''}`}
                            onClick={() => setKategori(k)}
                        >
                            {k}
                        </button>
                    ))}
                </div>

                <section className="bantuan-faq-section" aria-label="Pertanyaan yang sering diajukan">
                    <h2 className="bantuan-section-title">Pertanyaan Umum</h2>

                    {hasil.length === 0 ? (
                        <div className="bantuan-empty">
                            <p className="bantuan-empty-title">Pertanyaan tidak ditemukan</p>
                            <p className="bantuan-empty-text">Coba kata kunci lain.</p>
                            <button
                                type="button"
                                className="bantuan-empty-clear"
                                onClick={() => {
                                    setQuery('');
                                    setKategori('Semua');
                                }}
                            >
                                Hapus pencarian
                            </button>
                        </div>
                    ) : (
                        <ul className="bantuan-faq-list">
                            {hasil.map((item) => {
                                const open = openId === item.id;
                                return (
                                    <li key={item.id} className={`bantuan-faq-item${open ? ' bantuan-faq-open' : ''}`}>
                                        <button
                                            type="button"
                                            className="bantuan-faq-question"
                                            onClick={() => setOpenId(open ? null : item.id)}
                                            aria-expanded={open}
                                            aria-controls={`bantuan-a-${item.id}`}
                                        >
                                            <span>{item.q}</span>
                                            <span className="bantuan-faq-caret" aria-hidden="true">›</span>
                                        </button>
                                        <div
                                            className="bantuan-faq-panel"
                                            id={`bantuan-a-${item.id}`}
                                            role="region"
                                            aria-hidden={!open}
                                        >
                                            <div className="bantuan-faq-panel-inner">
                                                <p>{item.a}</p>
                                            </div>
                                        </div>
                                    </li>
                                );
                            })}
                        </ul>
                    )}
                </section>

                <section className="bantuan-contact" aria-label="Hubungi kami">
                    <h2 className="bantuan-section-title">Masih butuh bantuan?</h2>
                    {kanal.length > 0 ? (
                        <>
                            <div className="bantuan-contact-list">
                                {kanal.map((c) => (
                                    <a
                                        key={c.key}
                                        className="bantuan-contact-card"
                                        href={c.href}
                                        {...(c.external ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
                                    >
                                        <span className="bantuan-contact-icon" aria-hidden="true">{c.icon}</span>
                                        <span className="bantuan-contact-info">
                                            <span className="bantuan-contact-label">{c.label}</span>
                                            <span className="bantuan-contact-value">{c.value}</span>
                                        </span>
                                        <span className="bantuan-faq-caret" aria-hidden="true">›</span>
                                    </a>
                                ))}
                            </div>
                            {jamLayanan && <p className="bantuan-contact-hours">🕐 {jamLayanan}</p>}
                        </>
                    ) : (
                        <p className="bantuan-empty-text">Kontak dukungan belum tersedia.</p>
                    )}
                </section>
            </main>
        </div>
    );
}