import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import {
  MAX_TOPUP_POLL_FAILURES,
  shouldShowTopupPollRetry,
} from '../src/utils/topupPolling.js';

const topupSource = readFileSync(new URL('../src/Topup.jsx', import.meta.url), 'utf8');

test('Top Up polling shows retry after three consecutive failures', () => {
  assert.equal(MAX_TOPUP_POLL_FAILURES, 3);
  assert.equal(shouldShowTopupPollRetry(2), false);
  assert.equal(shouldShowTopupPollRetry(3), true);
  assert.equal(shouldShowTopupPollRetry(4), true);
});

test('Top Up exposes retry action, clears failures after a successful poll, and disables simulate while loading', () => {
  assert.match(topupSource, /pollFailuresRef\.current\s*=\s*0/);
  assert.match(topupSource, /pollRetryRef\.current\s*=\s*poll/);
  assert.match(topupSource, /pollRetryRef\.current\?\.\(\)/);
  assert.match(topupSource, /Coba lagi/);
  assert.match(topupSource, /onClick=\{handleSimulate\}\s+disabled=\{loading\}/);
});
