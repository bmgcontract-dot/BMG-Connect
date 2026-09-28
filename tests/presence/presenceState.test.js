import test from 'node:test';
import assert from 'node:assert/strict';

import {
  buildPresenceDoc,
  isOnline,
  mergePresenceIntoUsers,
  shouldWriteHeartbeat,
  PRESENCE_ONLINE_WINDOW_MS,
  PRESENCE_HEARTBEAT_MS,
} from '../../src/presence/presenceState.js';

const NOW = Date.parse('2026-09-22T10:00:00.000Z');
const iso = (msAgo) => new Date(NOW - msAgo).toISOString();

test('presence doc carries only authUid + lastActive (no personal data)', () => {
  const d = buildPresenceDoc('uid-1', '2026-09-22T10:00:00.000Z');
  assert.deepEqual(d, { id: 'uid-1', authUid: 'uid-1', lastActive: '2026-09-22T10:00:00.000Z' });
});

test('isOnline: within 15 min = online, older = offline', () => {
  assert.equal(isOnline(iso(60_000), NOW), true);                       // 1 min ago
  assert.equal(isOnline(iso(PRESENCE_ONLINE_WINDOW_MS - 1), NOW), true);
  assert.equal(isOnline(iso(PRESENCE_ONLINE_WINDOW_MS + 60_000), NOW), false);
  assert.equal(isOnline('', NOW), false);
  assert.equal(isOnline(null, NOW), false);
});

test('shouldWriteHeartbeat: only after the throttle window', () => {
  assert.equal(shouldWriteHeartbeat(iso(0), NOW), false);                 // just wrote
  assert.equal(shouldWriteHeartbeat(iso(PRESENCE_HEARTBEAT_MS - 1), NOW), false);
  assert.equal(shouldWriteHeartbeat(iso(PRESENCE_HEARTBEAT_MS + 1), NOW), true);
  assert.equal(shouldWriteHeartbeat('', NOW), true);                      // never written
  assert.equal(shouldWriteHeartbeat(null, NOW), true);
});

test('mergePresenceIntoUsers: newer presence overrides lastLogin', () => {
  const users = [
    { authUid: 'a', lastLogin: iso(60 * 60_000) },   // 1h ago
    { authUid: 'b', lastLogin: iso(2 * 60_000) },    // 2 min ago
    { authUid: 'c' },                                 // no lastLogin
  ];
  const presence = [
    { authUid: 'a', lastActive: iso(60_000) },        // 1 min ago (newer → wins)
    { authUid: 'b', lastActive: iso(30 * 60_000) },   // 30 min ago (older → keep user's)
    { authUid: 'c', lastActive: iso(5 * 60_000) },    // fills in
  ];
  const merged = mergePresenceIntoUsers(users, presence);
  assert.equal(merged[0].lastLogin, iso(60_000));      // a: presence wins
  assert.equal(merged[1].lastLogin, iso(2 * 60_000));  // b: user's own kept
  assert.equal(merged[2].lastLogin, iso(5 * 60_000));  // c: filled from presence
});

test('mergePresenceIntoUsers: no presence → users unchanged, no mutation', () => {
  const users = [{ authUid: 'a', lastLogin: 'x' }];
  const merged = mergePresenceIntoUsers(users, []);
  assert.deepEqual(merged, users);
  assert.notEqual(merged, users); // new array
});

test('mergePresenceIntoUsers: tolerates junk input', () => {
  assert.deepEqual(mergePresenceIntoUsers(null, null), []);
  assert.deepEqual(mergePresenceIntoUsers([{ authUid: 'a' }], [{}, null]), [{ authUid: 'a' }]);
});
