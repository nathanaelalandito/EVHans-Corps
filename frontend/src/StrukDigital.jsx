import React, { useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import './StrukDigital.css';

const rupiah = (v) => {
    if (v == null) return '-';
    const n = Number(v);
    if (!Number.isFinite(n)) return '-';
    return 'Rp' + n.toLocaleString('id-ID');
};

const toDate = (iso) => {
    if (!iso) return null;
    const d = new Date(iso);
    return Number.isNaN(d.getTime()) ? null : d;
};

const fmtDate = (iso) =>
    toDate(iso)?.toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' }) ?? '-';

const fmtTime = (iso) =>
    toDate(iso)?.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' }) ?? '-';

// Kertas struk: dipakai untuk pratinjau kecil, struk lengkap, dan sumber PDF.
function ReceiptPaper({ r, compact = false, paperRef = null }) {
    const rows = compact
        ? [
              ['Tanggal', r.tanggal],
              ['No. Transaksi', r.noTransaksi],
              ['Waktu', r.waktu],
              ['Durasi', r.durasi],
              ['Pembayaran', r.metode],
              ['Total', r.total, true],
          ]
        : [
              ['Tanggal', r.tanggal],
              ['No. Transaksi', r.noTransaksi],
              ['Lokasi', r.lokasi],
              ['Charger', r.charger],
              ['Kendaraan', r.kendaraan],
              ['Waktu Mulai', r.mulai],
              ['Waktu Selesai', r.selesai],
              ['Durasi', r.durasi],
              ['Energi Terisi', r.energi],
              ['Tarif', r.tarif],
              ['Biaya Charging', r.biayaCharging],
              ['Biaya Parkir', r.biayaParkir],
              ['Pembayaran', r.metode],
              ['Total Bayar', r.total, true],
          ];

    return (
        <div className={`receipt-paper ${compact ? 'compact' : ''}`} ref={paperRef}>
            <div className="receipt-head">
                <span className="receipt-logo">⚡</span>
                <div>
                    <div className="receipt-title">Detail Struk Digital</div>
                    <div className="receipt-sub">Cetak struk transaksi</div>
                </div>
            </div>
            <div className="receipt-rows">
                {rows.map(([label, value, bold]) => (
                    <div className={`receipt-row ${bold ? 'bold' : ''}`} key={label}>
                        <span>{label}</span>
                        <span>{value}</span>
                    </div>
                ))}
            </div>
            <div className="receipt-foot">Struk ini merupakan bukti transaksi yang sah.</div>
        </div>
    );
}

// Ditampilkan INLINE tepat di bawah tombol sesi charging.
export default function StrukDigital({ data }) {
    const [loading, setLoading] = useState(false);
    const [fullOpen, setFullOpen] = useState(false);
    const pdfRef = useRef(null);

    if (!data) return null;

    const durasiMenit =
        data.durasi_menit != null
            ? data.durasi_menit
            : data.durasi_detik != null
              ? Math.round(data.durasi_detik / 60)
              : null;

    const r = {
        tanggal: fmtDate(data.waktu_selesai || data.waktu_mulai),
        noTransaksi: `#${data.id_session ?? '-'}`,
        waktu: fmtTime(data.waktu_selesai || data.waktu_mulai),
        lokasi: data.nama_lokasi || '-',
        charger: data.kode_charger || '-',
        kendaraan: data.kendaraan?.model
            ? `${data.kendaraan.model}${data.kendaraan.nomor_polisi ? ` · ${data.kendaraan.nomor_polisi}` : ''}`
            : '-',
        mulai: `${fmtDate(data.waktu_mulai)} ${fmtTime(data.waktu_mulai)}`,
        selesai: `${fmtDate(data.waktu_selesai)} ${fmtTime(data.waktu_selesai)}`,
        durasi: durasiMenit != null ? `${durasiMenit} menit` : '-',
        energi: data.energi_kwh != null ? `${data.energi_kwh} kWh` : '-',
        tarif: data.tarif_per_kwh != null ? `${rupiah(data.tarif_per_kwh)}/kWh` : '-',
        biayaCharging: rupiah(data.biaya_charging_aktual),
        biayaParkir: rupiah(data.biaya_parkir_aktual),
        metode: data.metode_pembayaran || 'Saldo Dompet',
        total: rupiah(data.total_bayar),
    };

    const generatePdf = async () => {
        if (!pdfRef.current || loading) return;
        setLoading(true);
        try {
            const canvas = await html2canvas(pdfRef.current, {
                scale: 2,
                useCORS: true,
                backgroundColor: '#ffffff',
                logging: false,
            });
            const imgData = canvas.toDataURL('image/png');
            const pageW = 80; // mm, gaya struk
            const pageH = (canvas.height * pageW) / canvas.width;
            const pdf = new jsPDF({ unit: 'mm', format: [pageW, pageH] });
            pdf.addImage(imgData, 'PNG', 0, 0, pageW, pageH);
            pdf.save(`struk-EV-${data.id_session || 'invoice'}.pdf`);
        } catch (err) {
            console.error('Gagal membuat PDF:', err);
            alert('Gagal mengunduh PDF. Coba lagi.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="struk-inline">
            <div className="struk-preview-layout">
                <ReceiptPaper r={r} compact />
                <div className="struk-preview-side">
                    <h3 className="struk-preview-heading">Pratinjau Struk Digital</h3>
                    <button className="struk-btn-secondary" type="button" onClick={() => setFullOpen(true)}>
                        📄 Lihat Struk Lengkap
                    </button>
                    <button className="struk-btn-primary" type="button" onClick={generatePdf} disabled={loading}>
                        {loading ? 'Membuat PDF…' : '⬇️ Unduh Invoice PDF'}
                    </button>
                </div>
            </div>

            {/* Modal & salinan PDF di-portal ke <body> supaya tidak terpotong sheet peta */}
            {fullOpen &&
                createPortal(
                    <div className="struk-full-overlay" onClick={() => setFullOpen(false)}>
                        <div className="struk-full" onClick={(e) => e.stopPropagation()}>
                            <div className="struk-full-header">
                                <h3>Struk Lengkap</h3>
                                <button onClick={() => setFullOpen(false)} aria-label="Tutup">✕</button>
                            </div>
                            <div className="struk-full-body">
                                <ReceiptPaper r={r} />
                            </div>
                            <div className="struk-full-actions">
                                <button className="struk-btn-primary" type="button" onClick={generatePdf} disabled={loading}>
                                    {loading ? 'Membuat PDF…' : '⬇️ Unduh Invoice PDF'}
                                </button>
                            </div>
                        </div>
                    </div>,
                    document.body
                )}

            {createPortal(
                <div className="struk-offscreen" aria-hidden="true">
                    <ReceiptPaper r={r} paperRef={pdfRef} />
                </div>,
                document.body
            )}
        </div>
    );
}