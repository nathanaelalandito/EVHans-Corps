import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const main = readFileSync(new URL('../src/main.jsx', import.meta.url), 'utf8');
const dashboard = readFileSync(new URL('../src/DriverDashboard.jsx', import.meta.url), 'utf8');

test('crash output uses textContent and debug token injection is absent', () => {
  assert.match(main, /pre\.textContent\s*=/);
  assert.doesNotMatch(main, /innerHTML|\?debug|ev_token|ev_user/);
});

test('station popup inserts server text through textContent and DOM nodes', () => {
  assert.match(dashboard, /stationName\.textContent\s*=\s*s\.nama_lokasi/);
  assert.match(dashboard, /\.bindPopup\(popup\)/);
  assert.doesNotMatch(dashboard, /bindPopup\(\s*`<strong>/);
});
