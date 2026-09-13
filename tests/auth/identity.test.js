import test from 'node:test';
import assert from 'node:assert/strict';
import {
  createCurrentUser,
  normalizeUsername,
  sanitizeUsersForExport,
  stripUserSecrets,
  usernameToAuthEmail,
} from '../../src/auth/identity.js';

test('normalizes usernames without changing the visible login contract', () => {
  assert.equal(normalizeUsername('  Admin  '), 'admin');
  assert.equal(normalizeUsername('EMP-001'), 'emp-001');
});

test('maps ASCII and Thai usernames to deterministic internal emails', () => {
  assert.equal(
    usernameToAuthEmail('Admin'),
    usernameToAuthEmail(' admin '),
  );
  assert.match(usernameToAuthEmail('พนักงาน01'), /^u-[a-zA-Z0-9_-]+@auth\.bmg-connect\.local$/);
  assert.notEqual(usernameToAuthEmail('a-b'), usernameToAuthEmail('ab'));
});

test('rejects missing usernames and malformed internal domains', () => {
  assert.throws(() => usernameToAuthEmail(''), /username-required/);
  assert.throws(() => usernameToAuthEmail('admin', 'bad@example.com'), /invalid-auth-domain/);
});

test('removes password and stale session data from user profiles', () => {
  assert.deepEqual(
    stripUserSecrets({ id: 'u1', password: 'secret', sessionExpiry: 1, firstName: 'A' }),
    { id: 'u1', firstName: 'A' },
  );
});

test('creates a backward-compatible currentUser without password', () => {
  const currentUser = createCurrentUser(
    { id: 'legacy-1', authUid: 'auth-1', password: 'secret', status: 'Active' },
    { now: 0, sessionExpiry: 123 },
  );

  assert.equal(currentUser.id, 'legacy-1');
  assert.equal(currentUser.authUid, 'auth-1');
  assert.equal(currentUser.lastLogin, '1970-01-01T00:00:00.000Z');
  assert.equal(currentUser.sessionExpiry, 123);
  assert.equal('password' in currentUser, false);
});

test('removes passwords from exported user lists', () => {
  assert.deepEqual(
    sanitizeUsersForExport([{ id: 'u1', password: 'one' }, { id: 'u2' }]),
    [{ id: 'u1' }, { id: 'u2' }],
  );
});
