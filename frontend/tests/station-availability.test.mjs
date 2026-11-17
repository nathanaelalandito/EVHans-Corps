import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { stationAvailabilityLabel } from '../src/utils/stationAvailability.js';
import { chargerStatusLabel, portStatusLabel } from '../src/utils/stationStatus.js';

const dashboard = readFileSync(new URL('../src/DriverDashboard.jsx', import.meta.url), 'utf8');
const detail = readFileSync(new URL('../src/StationDetail.jsx', import.meta.url), 'utf8');
const start = readFileSync(new URL('../src/StartCharging.jsx', import.meta.url), 'utf8');

test('station badges preserve server status and next opening time', () => {
  assert.equal(stationAvailabilityLabel({ status: 'Gangguan', can_start: false }), 'Gangguan');
  assert.equal(stationAvailabilityLabel({ status: 'Dalam Perawatan', can_start: false }), 'Dalam Perawatan');
  assert.equal(stationAvailabilityLabel({ status: 'Tutup Sementara', can_start: false, buka_berikutnya: '08:00' }), 'Buka pukul 08:00');
  assert.equal(stationAvailabilityLabel({ status: 'Tutup Sementara', can_start: false }), 'Tutup');
  assert.equal(stationAvailabilityLabel({ status: 'Aktif', can_start: true, charger_tersedia: 1 }), 'Tersedia');
});

test('closed stations are excluded from recommendations and available filter, and ports cannot start', () => {
  assert.match(dashboard, /station\.can_start && station\.port_tersedia > 0/);
  assert.match(dashboard, /\.filter\(\(station\) => station\.can_start\)/);
  assert.match(dashboard, /disabled=\{!s\.can_start \|\| chargerBadge\.tone !== "ok"\}/);
  assert.match(dashboard, /Number\(Boolean\(second\.can_start\)\) - Number\(Boolean\(first\.can_start\)\)/);
});

test('station detail reads backend operating-hours fields without device clock calculations', () => {
  assert.match(detail, /station\.is_open/);
  assert.match(detail, /station\.buka_berikutnya/);
  assert.doesNotMatch(detail, /new Date\(\)|getHours\(\)/);
});

test('port and charger status labels are Indonesian and unknown server strings stay neutral', () => {
  assert.deepEqual(portStatusLabel('Available'), { text: 'Tersedia', tone: 'ok' });
  assert.deepEqual(portStatusLabel('Charging'), { text: 'Digunakan', tone: 'warn' });
  assert.deepEqual(portStatusLabel('Out of Order'), { text: 'Gangguan', tone: 'danger' });
  assert.deepEqual(portStatusLabel('Maintenance'), { text: 'Maintenance', tone: 'warn' });
  assert.deepEqual(portStatusLabel('Offline'), { text: 'Offline', tone: 'danger' });
  assert.deepEqual(portStatusLabel('Nonaktif'), { text: 'Nonaktif', tone: 'danger' });
  assert.deepEqual(portStatusLabel('Vendor status xyz'), { text: 'Status tidak diketahui', tone: 'neutral' });
  assert.equal(chargerStatusLabel('Offline').text, 'Offline');
  assert.equal(chargerStatusLabel('Out of Order').text, 'Gangguan');
  assert.match(dashboard, /portStatusLabel\(activeSession\.status_port\)/);
  assert.match(dashboard, /chargerStatusLabel\(item\.status\)/);
  assert.match(start, /portStatusLabel\(port\.status_port\)/);
  assert.match(detail, /charger\.jumlah_port/);
  assert.match(detail, /port\.tipe_charging/);
  assert.match(detail, /port\.tarif_per_kwh/);
  assert.match(detail, /Cocok dengan \$\{vehicleName\}/);
  assert.match(detail, /Konektor tidak cocok dengan \$\{vehicleName\}/);
});
