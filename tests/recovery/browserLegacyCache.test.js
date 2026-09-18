import test from 'node:test';
import assert from 'node:assert/strict';

import {
  LEGACY_RECOVERY_ORIGIN,
  captureBrowserLegacyCacheSnapshot,
  summarizeLegacySnapshot,
} from '../../src/recovery/browserLegacyCache.js';

function createFakeIndexedDb(values = new Map()) {
  const transactionModes = [];
  let closeCount = 0;
  const database = {
    objectStoreNames: { contains: name => name === 'state' },
    transaction(storeName, mode) {
      assert.equal(storeName, 'state');
      transactionModes.push(mode);
      return {
        objectStore() {
          return {
            get(key) {
              const request = {};
              queueMicrotask(() => {
                request.result = values.get(key);
                request.onsuccess?.();
              });
              return request;
            },
          };
        },
      };
    },
    close() {
      closeCount += 1;
    },
  };

  return {
    indexedDb: {
      async databases() {
        return [{ name: 'BMG_AppState_DB' }];
      },
      open() {
        const request = {};
        queueMicrotask(() => {
          request.result = database;
          request.onsuccess?.();
        });
        return request;
      },
    },
    transactionModes,
    get closeCount() {
      return closeCount;
    },
  };
}

test('browser capture reads the legacy origin with readonly IndexedDB transactions', async () => {
  const fakeIndexedDb = createFakeIndexedDb(new Map([
    ['bmg_projects', [{ id: 'project-idb' }]],
  ]));
  const browserWindow = {
    location: { origin: LEGACY_RECOVERY_ORIGIN },
    localStorage: {
      getItem(key) {
        return key === 'bmg_projects' ? JSON.stringify([{ id: 'project-local' }]) : null;
      },
    },
    indexedDB: fakeIndexedDb.indexedDb,
  };

  const snapshot = await captureBrowserLegacyCacheSnapshot({
    browserWindow,
    capturedAt: '2026-09-18T12:00:00.000Z',
  });

  assert.deepEqual(snapshot.datasets.bmg_projects, {
    localStorage: [{ id: 'project-local' }],
    indexedDb: [{ id: 'project-idb' }],
  });
  assert.equal(fakeIndexedDb.transactionModes.length > 0, true);
  assert.equal(fakeIndexedDb.transactionModes.every(mode => mode === 'readonly'), true);
  assert.equal(fakeIndexedDb.closeCount, 1);
});

test('browser capture refuses to scan a different origin', async () => {
  let storageWasRead = false;
  await assert.rejects(
    captureBrowserLegacyCacheSnapshot({
      browserWindow: {
        location: { origin: 'https://bmg-connect.vercel.app' },
        localStorage: {
          getItem() {
            storageWasRead = true;
            return null;
          },
        },
        indexedDB: {},
      },
    }),
    /legacy-recovery-origin-required/,
  );
  assert.equal(storageWasRead, false);
});

test('browser capture does not create an IndexedDB database when none exists', async () => {
  let openCount = 0;
  const snapshot = await captureBrowserLegacyCacheSnapshot({
    browserWindow: {
      location: { origin: LEGACY_RECOVERY_ORIGIN },
      localStorage: { getItem: () => null },
      indexedDB: {
        async databases() {
          return [];
        },
        open() {
          openCount += 1;
        },
      },
    },
  });

  assert.equal(openCount, 0);
  assert.deepEqual(snapshot.datasets, {});
});

test('snapshot summary reports both storage copies without exposing values', () => {
  const summary = summarizeLegacySnapshot({
    manifest: [
      { key: 'bmg_projects', source: 'localStorage', itemCount: 25, redactedFieldCount: 0 },
      { key: 'bmg_projects', source: 'indexedDb', itemCount: 27, redactedFieldCount: 0 },
      { key: 'bmg_users', source: 'indexedDb', itemCount: 64, redactedFieldCount: 64 },
    ],
    warnings: [{ code: 'invalid-json' }],
  });

  assert.equal(summary.foundKeyCount, 2);
  assert.equal(summary.sourceCopyCount, 3);
  assert.equal(summary.redactedFieldCount, 64);
  assert.equal(summary.warningCount, 1);
  assert.deepEqual(summary.datasets, [
    {
      key: 'bmg_projects',
      localStorageCount: 25,
      indexedDbCount: 27,
      redactedFieldCount: 0,
    },
    {
      key: 'bmg_users',
      localStorageCount: null,
      indexedDbCount: 64,
      redactedFieldCount: 64,
    },
  ]);
});

