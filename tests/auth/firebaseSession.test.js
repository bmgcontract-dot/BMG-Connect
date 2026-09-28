import test from 'node:test';
import assert from 'node:assert/strict';

import { startLegacyFirebaseSession } from '../../src/auth/firebaseSession.js';

test('legacy startup without a trusted token stays local and does not create or restore a Firebase user', async () => {
  const observedUsers = [];
  let customTokenSignIns = 0;

  const session = startLegacyFirebaseSession({
    auth: { name: 'firebase-auth' },
    customToken: null,
    observeAuth: (_auth, onUser) => {
      observedUsers.push(onUser);
      return () => {};
    },
    signInWithCustomToken: async () => {
      customTokenSignIns += 1;
    },
    onUser: () => {},
  });

  assert.equal(await session.ready, 'local-only');
  assert.equal(customTokenSignIns, 0);
  assert.equal(observedUsers.length, 0);
});
