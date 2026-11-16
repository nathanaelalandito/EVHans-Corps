/** Mengubah nilai laporan menjadi teks aman untuk font PDF bawaan. */
function toPdfText(value) {
  return String(value ?? "-")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[–—]/g, "-")
    .replace(/[·•]/g, "-")
    .replace(/[^\x20-\x7E]/g, "?");
}

/** Membungkus baris panjang agar tetap berada di dalam lebar halaman PDF. */
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

/** Memformat tanggal laporan agar mudah dibaca pada dokumen cetak. */
function formatPdfDate(value) {
  if (!value) return "Tidak tersedia";
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime())
    ? String(value)
    : parsed.toLocaleString("id-ID", { dateStyle: "medium", timeStyle: "short" });
}

/** Membuat file PDF satu halaman dari rincian laporan gangguan perangkat. */
export function createMalfunctionPdf(log) {
  const reportNumber = `LPG-${String(log?.id_log ?? "-").padStart(6, "0")}`;
  const charger = log?.kode_perangkat ?? "Tidak tersedia";
  const chargerModel = log?.merek_model ? ` (${log.merek_model})` : "";
  const session = log?.id_session ? `SES-${log.id_session}` : "Tidak tersedia";

  const lines = [
    "EVCHARGE HUB | LAPORAN GANGGUAN PERANGKAT",
    "==============================================",
    `Nomor laporan: ${reportNumber}`,
    `Waktu kejadian: ${formatPdfDate(log?.waktu_terjadi)}`,
    `Status penanganan: ${log?.status_tanganan ?? "Menunggu"}`,
    "----------------------------------------------",
    `Station: ${log?.nama_lokasi ?? "Tidak tersedia"}`,
    `Alamat: ${log?.alamat ?? "Tidak tersedia"}`,
    `Charger: ${charger}${chargerModel}`,
    `Sesi terkait: ${session}`,
    `Jenis gangguan: ${log?.jenis_error ?? "Tidak tersedia"}`,
    `Pelapor: ${log?.nama_pelapor ?? "Sistem / Sensor"}`,
    ...(log?.email_pelapor ? [`Email pelapor: ${log.email_pelapor}`] : []),
    "----------------------------------------------",
    "Deskripsi gangguan:",
    log?.deskripsi || "Tidak ada deskripsi.",
    "----------------------------------------------",
    `Dibuat: ${formatPdfDate(log?.created_at)}`,
    `Diperbarui: ${formatPdfDate(log?.updated_at)}`,
    "",
    "Dokumen laporan gangguan EVCharge Hub.",
  ];

  const normalizedLines = lines.flatMap((line) =>
    String(line)
      .split(/\r?\n/)
      .flatMap((part) => wrapPdfLine(part)),
  );
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

/** Menghasilkan nama file PDF laporan yang aman untuk dibagikan. */
export function malfunctionPdfName(log) {
  return `laporan-gangguan-${String(log?.id_log ?? "perangkat").replace(/[^a-zA-Z0-9_-]/g, "")}.pdf`;
}
