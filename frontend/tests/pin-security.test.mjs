import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { isWeakPin } from '../src/utils/pin.js';

const pinUi = readFileSync(new URL('../src/PinSecuritySettings.jsx', import.meta.url), 'utf8');
const dashboard = readFileSync(new URL('../src/DriverDashboard.jsx', import.meta.url), 'utf8');

test('weak PIN helper rejects repeated and ascending/descending sequences without wrap-around', () => {
  for (const pin of ['111111', '123456', '654321', '012345']) assert.equal(isWeakPin(pin), true);
  for (const pin of ['482917', '901234', '12345', 'abcdef']) assert.equal(isWeakPin(pin), false);
});

test('PIN settings expose per-field visibility, errors, weak rule and correct autocomplete', () => {
  assert.match(pinUi, /FiEye, FiEyeOff/);
  assert.match(pinUi, /aria-label=\{`\$\{visibleFields\[field\]/);
  assert.match(pinUi, /settings-pin-field-error/);
  assert.match(pinUi, /WEAK_PIN_MESSAGE/);
  assert.match(pinUi, /autoComplete="off"/);
  assert.match(pinUi, /autoComplete="current-password"/);
  assert.match(pinUi, /apiErrors/);
  assert.match(dashboard, /settings-menu-section-title">Keamanan/);
  assert.match(dashboard, /wallet\?\.pin_sudah_diset \? "Ubah PIN" : "Buat PIN"/);
});
