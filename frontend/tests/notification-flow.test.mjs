import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { findUnseenNotificationIds, hasUnreadCountIncreased } from '../src/utils/notificationPolling.js';

const bell = readFileSync(new URL('../src/NotificationsBell.jsx', import.meta.url), 'utf8');
const client = readFileSync(new URL('../src/api/client.js', import.meta.url), 'utf8');
const app = readFileSync(new URL('../src/app.jsx', import.meta.url), 'utf8');
const dashboard = readFileSync(new URL('../src/DriverDashboard.jsx', import.meta.url), 'utf8');
const opsDashboard = readFileSync(new URL('../src/OpsDashboard.jsx', import.meta.url), 'utf8');
const opsReport = readFileSync(new URL('../src/OpsReport.jsx', import.meta.url), 'utf8');
const opsChargerMonitor = readFileSync(new URL('../src/ChargerMonitor.jsx', import.meta.url), 'utf8');
const opsChargerDetail = readFileSync(new URL('../src/ChargerDetail.jsx', import.meta.url), 'utf8');
const operatorNotificationsApi = readFileSync(new URL('../src/api/operatorNotifications.js', import.meta.url), 'utf8');

test('notification count detects a new unread item without treating a lower count as new', () => {
  assert.equal(hasUnreadCountIncreased(2, 3), true);
  assert.equal(hasUnreadCountIncreased(2, 2), false);
  assert.equal(hasUnreadCountIncreased(3, 2), false);
});

test('unread polling exposes stale state and refreshes an open list without changing filters', () => {
  const fetchUnreadBlock = bell.match(/const fetchUnread = useCallback\([\s\S]*?\}, \[fetchList, pollRecentNotifications, toastOnNew\]\);/)?.[0] ?? '';
  assert.notEqual(fetchUnreadBlock, '');
  assert.match(bell, /catch\s*\{\s*setUnreadPollError\(true\);/);
  assert.match(fetchUnreadBlock, /if\s*\(hasNewNotifications\s*&&\s*panelOpenRef\.current\)\s*\{\s*fetchList\(1, false\);/);
  assert.match(bell, /notifbell-poll-error/);
  assert.doesNotMatch(fetchUnreadBlock, /setStatusFilter/);
});

test('new notification toast ignores the initial list and only identifies unseen ids', () => {
  const known = new Set(['10']);
  const unseen = findUnseenNotificationIds([
    { id_notifikasi: 10, judul: 'lama' },
    { id_notifikasi: 11, judul: 'baru' },
  ], known);
  assert.deepEqual(unseen.map((item) => item.id_notifikasi), [11]);
  assert.match(bell, /if \(knownNotificationIdsRef\.current === null \|\| seedOnly\)/);
  assert.match(bell, /newNotificationToast/);
});

test('Operator views use the shared database notification bell and no local read timestamp', () => {
  for (const source of [opsDashboard, opsReport, opsChargerMonitor, opsChargerDetail]) {
    assert.match(source, /<NotificationsBell toastOnNew/);
    assert.doesNotMatch(source, /NotificationOverlay|openNotifications/);
  }
  assert.doesNotMatch(operatorNotificationsApi, /localStorage/);
  assert.doesNotMatch(operatorNotificationsApi, /getOperatorNotifications/);
  assert.match(opsReport, /issueRows\.map/);
  assert.match(opsReport, /items\.filter/);
});

test('401 clears auth and notifies App to return to welcome without a logout request', () => {
  assert.match(client, /localStorage\.removeItem\('ev_token'\)/);
  assert.match(client, /window\.dispatchEvent\(new Event\(AUTH_EXPIRED_EVENT\)\)/);
  assert.match(app, /window\.addEventListener\(AUTH_EXPIRED_EVENT, handleAuthExpired\)/);
  assert.match(app, /setCurrentPage\('welcome'\)/);
});

test('active charging banner is identified as session status rather than a second bell', () => {
  assert.match(dashboard, /aria-label="Tampilkan status sesi aktif"/);
  assert.match(dashboard, /className="mapdash-notif mapdash-session-status" role="status"/);
  assert.match(dashboard, /<strong>Sesi aktif<\/strong>/);
  assert.doesNotMatch(dashboard, /className="mapdash-round-btn"\s+aria-label="Notifikasi"/);
});
