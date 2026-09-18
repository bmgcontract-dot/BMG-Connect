import test from 'node:test';
import assert from 'node:assert/strict';

import {
  LEGACY_BUSINESS_KEYS,
  captureLegacyCacheSnapshot,
} from '../../src/recovery/legacyCacheSnapshot.js';

test('captures only allowlisted business keys from both browser stores', async () => {
  const localReads = [];
  const indexedDbReads = [];
  const localValues = new Map([
    ['bmg_projects', JSON.stringify([{ id: 'project-local' }])],
    ['bmg_current_user', JSON.stringify({ id: 'must-not-be-read' })],
  ]);
  const indexedDbValues = new Map([
    ['bmg_projects', [{ id: 'project-idb' }]],
    ['firebaseLocalStorageDb', { token: 'must-not-be-read' }],
  ]);

  const snapshot = await captureLegacyCacheSnapshot({
    capturedAt: '2026-09-18T12:00:00.000Z',
    sourceOrigin: 'https://bmg-connect-6b24.vercel.app',
    readLocalStorage(key) {
      localReads.push(key);
      return localValues.get(key) ?? null;
    },
    readIndexedDb(key) {
      indexedDbReads.push(key);
      return indexedDbValues.get(key);
    },
  });

  assert.deepEqual(localReads, [...LEGACY_BUSINESS_KEYS]);
  assert.deepEqual(indexedDbReads, [...LEGACY_BUSINESS_KEYS]);
  assert.equal(localReads.includes('bmg_current_user'), false);
  assert.equal(indexedDbReads.includes('firebaseLocalStorageDb'), false);
  assert.deepEqual(snapshot.datasets.bmg_projects, {
    localStorage: [{ id: 'project-local' }],
    indexedDb: [{ id: 'project-idb' }],
  });
});

test('removes credentials recursively without mutating cached values', async () => {
  const cachedUsers = [{
    id: 'u1',
    username: 'admin',
    password: 'legacy-password',
    auth: {
      accessToken: 'access-token',
      safeNote: 'keep',
    },
    nested: [{ refresh_token: 'refresh-token', firstName: 'Admin' }],
  }];

  const snapshot = await captureLegacyCacheSnapshot({
    sourceOrigin: 'https://bmg-connect-6b24.vercel.app',
    readLocalStorage: key => key === 'bmg_users' ? JSON.stringify(cachedUsers) : null,
    readIndexedDb: async () => undefined,
  });

  assert.deepEqual(snapshot.datasets.bmg_users.localStorage, [{
    id: 'u1',
    username: 'admin',
    auth: { safeNote: 'keep' },
    nested: [{ firstName: 'Admin' }],
  }]);
  assert.equal(cachedUsers[0].password, 'legacy-password');
  assert.equal(
    snapshot.manifest.find(entry => entry.key === 'bmg_users').redactedFieldCount,
    3,
  );
  assert.equal(JSON.stringify(snapshot).includes('legacy-password'), false);
  assert.equal(JSON.stringify(snapshot).includes('access-token'), false);
  assert.equal(JSON.stringify(snapshot).includes('refresh-token'), false);
});

test('keeps Local Storage and IndexedDB copies separate for later reconciliation', async () => {
  const snapshot = await captureLegacyCacheSnapshot({
    sourceOrigin: 'https://bmg-connect-6b24.vercel.app',
    readLocalStorage: key => key === 'bmg_actionPlans'
      ? JSON.stringify([{ id: 'same', status: 'Pending' }])
      : null,
    readIndexedDb: async key => key === 'bmg_actionPlans'
      ? [{ id: 'same', status: 'Completed' }]
      : undefined,
  });

  assert.deepEqual(snapshot.datasets.bmg_actionPlans, {
    localStorage: [{ id: 'same', status: 'Pending' }],
    indexedDb: [{ id: 'same', status: 'Completed' }],
  });
});

test('records unreadable values as warnings and continues capturing', async () => {
  const snapshot = await captureLegacyCacheSnapshot({
    sourceOrigin: 'https://bmg-connect-6b24.vercel.app',
    readLocalStorage: key => {
      if (key === 'bmg_projects') return '{invalid-json';
      if (key === 'bmg_repairs') return JSON.stringify([{ id: 'repair-1' }]);
      return null;
    },
    readIndexedDb: async key => {
      if (key === 'bmg_projects') throw new Error('unavailable');
      return undefined;
    },
  });

  assert.deepEqual(snapshot.datasets.bmg_repairs.localStorage, [{ id: 'repair-1' }]);
  assert.deepEqual(snapshot.warnings, [
    { key: 'bmg_projects', source: 'localStorage', code: 'invalid-json' },
    { key: 'bmg_projects', source: 'indexedDb', code: 'read-failed' },
  ]);
});

test('requires explicit adapters and source origin', async () => {
  await assert.rejects(
    captureLegacyCacheSnapshot({
      readIndexedDb: async () => undefined,
      sourceOrigin: 'https://bmg-connect-6b24.vercel.app',
    }),
    /readLocalStorage/,
  );
  await assert.rejects(
    captureLegacyCacheSnapshot({
      readLocalStorage: () => null,
      readIndexedDb: async () => undefined,
    }),
    /sourceOrigin/,
  );
});

