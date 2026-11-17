import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const auth = readFileSync(new URL('../src/api/auth.js', import.meta.url), 'utf8');
const login = readFileSync(new URL('../src/Login.jsx', import.meta.url), 'utf8');
const welcome = readFileSync(new URL('../src/Welcome.jsx', import.meta.url), 'utf8');
const registration = readFileSync(new URL('../src/Registrasi.jsx', import.meta.url), 'utf8');
const app = readFileSync(new URL('../src/app.jsx', import.meta.url), 'utf8');

test('login and registration fields advertise correct browser autofill purposes', () => {
  for (const source of [login, welcome]) {
    assert.match(source, /name="email"\s+autoComplete="email"/);
    assert.match(source, /name="password"\s+autoComplete="current-password"/);
  }
  assert.match(registration, /name="email"[\s\S]*?autoComplete="email"/);
  assert.match(registration, /name="password"\s+autoComplete="new-password"/);
  assert.match(registration, /placeholder="nama@email\.com"/);
  assert.doesNotMatch(registration, /admin\.ac\.id|ops\.ac\.id/);
});

test('login and logout clear user-scoped storage while retaining hide-balance preference', () => {
  assert.match(auth, /clearUserScopedStorage\(\)/);
  assert.match(auth, /ev_active_vehicle/);
  assert.match(auth, /ev_active_station_id/);
  assert.match(auth, /ev_operator_notifications_seen_/);
  assert.match(auth, /await api\.post\('\/logout'\)[\s\S]*?clearUserScopedStorage\(\)/);
  assert.doesNotMatch(auth, /ev_hide_saldo/);
  assert.match(app, /setSelectedCharger\(null\)/);
  assert.match(app, /setResumeChargingContext\(null\)/);
});
