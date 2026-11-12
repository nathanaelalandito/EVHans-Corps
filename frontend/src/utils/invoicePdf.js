/** Mengubah nilai invoice menjadi teks aman untuk font PDF bawaan. */
function toPdfText(value) {
  return String(value ?? "-")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[–—]/g, "-")
    .replace(/[·•]/g, "-")
    .replace(/[^\x20-\x7E]/g, "?");
}

/** Membungkus baris panjang agar tetap berada di dalam lebar nota PDF. */
function wrapPdfLine(value, maximumLength = 78) {
  const words = toPdfText(value).split(/\s+/);
  const wrappedLines = [];
  let currentLine = "";

  words.forEach((word) => {
    const nextLine = currentLine ? `${currentLine} ${word}` : word;
    if (nextLine.length > maximumLength && currentLine) {
      wrappedLines.push(currentLine);
      currentLine = word;
    } else {
      currentLine = nextLine;
    }
  });

  if (currentLine) wrappedLines.push(currentLine);
  return wrappedLines;
}

/** Membuat file PDF satu halaman dari rincian transaksi tersimpan. */
export function createInvoicePdf(invoice) {
  const isTopup = invoice?.jenis_pembayaran === "topup";
  const transactionId = invoice?.id_payment ?? invoice?.id_session ?? "-";
  const invoiceNumber = `INV-${String(transactionId).padStart(6, "0")}`;
  const amount = (value) =>
    value == null ? "Tidak tersedia" : `Rp${Number(value).toLocaleString("id-ID")}`;
  const date = (value) => {
    if (!value) return "Tidak tersedia";
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime())
      ? String(value)
      : parsed.toLocaleString("id-ID", { dateStyle: "medium", timeStyle: "short" });
  };
  const duration = () => {
    if (!invoice?.waktu_mulai || !invoice?.waktu_selesai) return "Tidak tersedia";
    const seconds = Math.max(
      0,
      Math.floor(
        (new Date(invoice.waktu_selesai).getTime() -
          new Date(invoice.waktu_mulai).getTime()) /
          1000,
      ),
    );
    return `${Math.floor(seconds / 3600)} jam ${Math.floor((seconds % 3600) / 60)} menit`;
  };

  const lines = [
    "EVCHARGE HUB | NOTA TRANSAKSI",
    "==============================================",
    `Nomor invoice: ${invoiceNumber}`,
    `Jenis transaksi: ${isTopup ? "Top Up Dompet Digital" : "Pengisian daya kendaraan"}`,
    `Tanggal pembayaran: ${date(invoice?.waktu_pembayaran)}`,
    `Status pembayaran: ${invoice?.status ?? "Tidak tersedia"}`,
    `Metode pembayaran: ${invoice?.metode_pembayaran ?? "Tidak tersedia"}`,
  ];

  if (isTopup) {
    lines.push(
      `Referensi pembayaran: ${invoice?.referensi_gateway ?? "Tidak tersedia"}`,
      "----------------------------------------------",
      `Total Top Up: ${amount(invoice?.biaya_aktual)}`,
    );
  } else {
    lines.push(
      "----------------------------------------------",
      `Station: ${invoice?.nama_lokasi ?? "Tidak tersedia"}${invoice?.kode_station ? ` (${invoice.kode_station})` : ""}`,
      `Alamat: ${invoice?.alamat ?? "Tidak tersedia"}`,
      `Charger: ${invoice?.kode_charger ?? "Tidak tersedia"}`,
      `Port: ${invoice?.nomor_port ?? "Tidak tersedia"} (${invoice?.tipe_konektor_port ?? "jenis konektor tidak tersedia"})`,
      `Kendaraan: ${invoice?.kendaraan?.nama ?? "Tidak tersedia"}`,
      `Nomor polisi: ${invoice?.kendaraan?.nomor_polisi ?? "Tidak tersedia"}`,
      `Waktu mulai: ${date(invoice?.waktu_mulai)}`,
      `Waktu selesai: ${date(invoice?.waktu_selesai)}`,
      `Durasi: ${duration()}`,
      `Energi terpakai: ${invoice?.energi_kwh == null ? "Tidak tersedia" : `${invoice.energi_kwh} kWh`}`,
      `Tarif energi: ${invoice?.tarif_per_kwh == null ? "Tidak tersedia" : `${amount(invoice.tarif_per_kwh)}/kWh`}`,
      `Biaya charging: ${amount(invoice?.biaya_charging)}`,
      `Biaya parkir: ${amount(invoice?.biaya_parkir)}`,
      `Dana hold: ${amount(invoice?.jumlah_hold)}`,
      `Saldo dikembalikan: ${amount(invoice?.selisih_dikembalikan)}`,
      "----------------------------------------------",
      `Total dibayar: ${amount(invoice?.biaya_aktual)}`,
    );
  }

  lines.push("", "Terima kasih telah menggunakan EVCharge Hub.");

  const normalizedLines = lines.flatMap((line) => wrapPdfLine(line));
  const textCommands = normalizedLines
    .map((line, index) => {
      const y = 790 - index * 19;
      const fontSize = index === 0 ? 15 : 10;
      return `BT /F1 ${fontSize} Tf 48 ${y} Td (${toPdfText(line).replace(/[\\()]/g, "\\$&")}) Tj ET`;
    })
    .join("\n");
  const stream = `${textCommands}\n`;
  const objects = [
    "<< /Type /Catalog /Pages 2 0 R >>",
    "<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
    "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 842] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>",
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>",
    `<< /Length ${stream.length} >>\nstream\n${stream}endstream`,
  ];

  let pdf = "%PDF-1.4\n";
  const offsets = [0];
  objects.forEach((object, index) => {
    offsets.push(pdf.length);
    pdf += `${index + 1} 0 obj\n${object}\nendobj\n`;
  });
  const crossReferenceOffset = pdf.length;
  pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  offsets.slice(1).forEach((offset) => {
    pdf += `${String(offset).padStart(10, "0")} 00000 n \n`;
  });
  pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${crossReferenceOffset}\n%%EOF`;

  return new Blob([pdf], { type: "application/pdf" });
}

/** Menghasilkan nama file yang aman untuk diunduh atau dibagikan. */
export function invoicePdfName(invoice) {
  const transactionId = invoice?.id_payment ?? invoice?.id_session ?? "transaksi";
  return `invoice-evcharge-${String(transactionId).replace(/[^a-zA-Z0-9_-]/g, "")}.pdf`;
}
