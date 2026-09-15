import test from 'node:test';
import assert from 'node:assert/strict';
import { initializeFirebaseBrowserAuth } from '../../src/auth/firebaseBrowserAuth.js';

test('initializes Firebase Auth with durable browser persistence fallbacks', () => {
  const calls = [];
  const app = { name: 'bmg' };
  const auth = { name: 'auth' };
  const indexedDBLocalPersistence = { type: 'INDEXED_DB' };
  const browserLocalPersistence = { type: 'LOCAL' };

  const result = initializeFirebaseBrowserAuth({
    app,
    indexedDBLocalPersistence,
    browserLocalPersistence,
    initializeAuth: (receivedApp, options) => {
      calls.push({ receivedApp, options });
      return auth;
    },
  });

  assert.equal(result, auth);
  assert.deepEqual(calls, [{
    receivedApp: app,
    options: {
      persistence: [indexedDBLocalPersistence, browserLocalPersistence],
    },
  }]);
});

test('requires both durable browser persistence implementations', () => {
  assert.throws(
    () => initializeFirebaseBrowserAuth({
      app: {},
      initializeAuth: () => ({}),
      indexedDBLocalPersistence: null,
      browserLocalPersistence: {},
    }),
    /firebase-browser-auth-dependencies-required/,
  );
});
