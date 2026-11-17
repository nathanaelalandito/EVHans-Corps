import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { PHONE_MAX_DIGITS, PHONE_MIN_DIGITS, PHONE_PATTERN, PHONE_VALIDATION_MESSAGE, normalizePhone } from '../src/utils/phone.js';

test('shared phone utility strips pasted non-digits and caps input at 15 digits', () => {
  assert.equal(PHONE_MIN_DIGITS, 8);
  assert.equal(PHONE_MAX_DIGITS, 15);
  assert.equal(PHONE_PATTERN, '[0-9]{8,15}');
  assert.equal(normalizePhone('+62 (812) ABC-3456 7890 1234'), '628123456789012');
  assert.equal(PHONE_VALIDATION_MESSAGE, 'Nomor telepon 8 sampai 15 digit angka.');
});

test('all phone form surfaces use the shared pattern, normalization, and clear hint', () => {
  const sources = [
    readFileSync(new URL('../src/Registrasi.jsx', import.meta.url), 'utf8'),
    readFileSync(new URL('../src/DriverDashboard.jsx', import.meta.url), 'utf8'),
    readFileSync(new URL('../src/OperatorAdminDashboard.jsx', import.meta.url), 'utf8'),
    readFileSync(new URL('../src/OperatorSettingsModal.jsx', import.meta.url), 'utf8'),
  ];
  for (const source of sources) {
    assert.match(source, /PHONE_PATTERN/);
    assert.match(source, /PHONE_VALIDATION_MESSAGE/);
  }
  assert.match(sources[0], /normalizePhone\(e\.target\.value\)/);
  assert.match(sources[1], /normalizePhone\(e\.target\.value\)/);
  assert.match(sources[2], /normalizeOperatorPhone\(event\.target\.value\)/);
  assert.match(sources[3], /normalizePhone\(event\.target\.value\)/);
});
