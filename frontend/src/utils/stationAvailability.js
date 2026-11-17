/** Label station yang konsisten, termasuk jam WIB yang dihitung backend. */
export function stationAvailabilityLabel(station) {
  if (station?.status === 'Maintenance' || station?.status === 'Dalam Perawatan') return 'Dalam Perawatan';
  if (station?.status === 'Gangguan') return 'Gangguan';
  if (station?.status === 'Tutup Sementara' || station?.is_open === false) {
    return station?.buka_berikutnya ? `Buka pukul ${station.buka_berikutnya}` : 'Tutup';
  }
  if (station?.status === 'Penuh' || Number(station?.charger_tersedia ?? 0) === 0) return 'Penuh';
  return 'Tersedia';
}
