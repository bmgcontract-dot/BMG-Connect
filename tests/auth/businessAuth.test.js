import test from 'node:test';
import assert from 'node:assert/strict';
import { createBusinessAuth, BusinessAuthError } from '../../src/auth/businessAuth.js';

function makeAuth(overrides = {}) {
  const calls = { signIn: [], signOut: 0, loadProfile: [] };
  const auth = createBusinessAuth({
    authDomain: 'auth.example.test',
    getSessionExpiry: () => 999,
    now: () => 0,
    signInWithEmail: async (email, password) => {
      calls.signIn.push({ email, password });
      return { user: { uid: 'firebase-1' } };
    },
    signOut: async () => { calls.signOut += 1; },
    loadProfile: async (uid) => {
      calls.loadProfile.push(uid);
      return { id: 'legacy-1', firstName: 'Admin', status: 'Active' };
    },
    ...overrides,
  });
  return { auth, calls };
}

test('signs in through the adapter and returns the legacy-compatible profile', async () => {
  const { auth, calls } = makeAuth();
  const result = await auth.signIn(' ADMIN ', 'secret');

  assert.equal(calls.signIn[0].email, 'u-YWRtaW4@auth.example.test');
  assert.equal(calls.signIn[0].password, 'secret');
  assert.deepEqual(calls.loadProfile, ['firebase-1']);
  assert.equal(result.currentUser.id, 'legacy-1');
  assert.equal(result.currentUser.authUid, 'firebase-1');
  assert.equal('password' in result.currentUser, false);
});

test('signs Firebase out when the profile is missing', async () => {
  const { auth, calls } = makeAuth({ loadProfile: async () => null });

  await assert.rejects(
    auth.signIn('admin', 'secret'),
    (error) => error instanceof BusinessAuthError && error.code === 'profile-not-found',
  );
  assert.equal(calls.signOut, 1);
});

test('rejects inactive profiles and signs Firebase out', async () => {
  const { auth, calls } = makeAuth({
    loadProfile: async () => ({ authUid: 'firebase-1', status: 'Inactive' }),
  });

  await assert.rejects(
    auth.signIn('admin', 'secret'),
    (error) => error.code === 'account-inactive',
  );
  assert.equal(calls.signOut, 1);
});

test('maps Firebase credential failures to a stable error', async () => {
  const { auth } = makeAuth({
    signInWithEmail: async () => {
      const error = new Error('firebase detail');
      error.code = 'auth/invalid-credential';
      throw error;
    },
  });

  await assert.rejects(
    auth.signIn('admin', 'wrong'),
    (error) => error.code === 'invalid-credentials',
  );
});
