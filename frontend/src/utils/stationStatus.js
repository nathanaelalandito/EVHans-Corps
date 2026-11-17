const PORT_STATUS_LABELS = {
  available: ['Tersedia', 'ok'], tersedia: ['Tersedia', 'ok'],
  charging: ['Digunakan', 'warn'], reserved: ['Digunakan', 'warn'], 'sedang digunakan': ['Digunakan', 'warn'],
  'out of order': ['Gangguan', 'danger'], out_of_order: ['Gangguan', 'danger'], gangguan: ['Gangguan', 'danger'],
  maintenance: ['Maintenance', 'warn'], nonaktif: ['Nonaktif', 'danger'], inactive: ['Nonaktif', 'danger'],
  offline: ['Offline', 'danger'],
};

/** Memetakan status teknis port ke label Indonesia; status asing tetap netral. */
export function portStatusLabel(status) {
  const normalized = String(status ?? '').trim().toLowerCase();
  const [text, tone] = PORT_STATUS_LABELS[normalized] ?? ['Status tidak diketahui', 'neutral'];
  return { text, tone };
}

/** Memetakan status perangkat charger tanpa meneruskan teks mentah dari server. */
export function chargerStatusLabel(status) {
  const normalized = String(status ?? '').trim().toLowerCase();
  if (['active', 'available', 'tersedia'].includes(normalized)) return { text: 'Tersedia', tone: 'ok' };
  if (normalized === 'maintenance') return { text: 'Maintenance', tone: 'warn' };
  if (normalized === 'offline') return { text: 'Offline', tone: 'danger' };
  if (['gangguan', 'out of order', 'out_of_order'].includes(normalized)) return { text: 'Gangguan', tone: 'danger' };
  if (['nonaktif', 'inactive'].includes(normalized)) return { text: 'Nonaktif', tone: 'danger' };
  return { text: 'Status tidak diketahui', tone: 'neutral' };
}
