import test from 'node:test';
import assert from 'node:assert/strict';

import {
  createMonthScope,
  reconcileCollectionSnapshot,
} from '../../src/firebase/collectionSnapshot.js';

test('createMonthScope returns deterministic start and exclusive end boundaries', () => {
  assert.deepEqual(
    createMonthScope('date', '2026-09'),
    { field: 'date', start: '2026-09-01', endExclusive: '2026-10-01' },
  );
});

test('unscoped reconciliation does not serialize a production-sized snapshot', () => {
  const itemThatMustNotBeSerialized = {
    id: 'current-report',
    photo: 'data:image/jpeg;base64,large-payload',
    toJSON() {
      throw new RangeError('Invalid string length');
    },
  };

  const serverItems = [itemThatMustNotBeSerialized];
  assert.equal(
    reconcileCollectionSnapshot({ currentItems: [], serverItems }),
    serverItems,
  );
});

test('scoped reconciliation preserves history and replaces the active window', () => {
  const currentItems = [
    { id: 'old', date: '2026-08-20', value: 'keep' },
    { id: 'removed', date: '2026-09-02', value: 'remove' },
    { id: 'updated', date: '2026-09-03', value: 'stale' },
    { id: 'future', date: '2026-10-02', value: 'keep' },
    { id: 'undated', value: 'keep' },
  ];
  const serverItems = [
    { id: 'updated', date: '2026-09-03', value: 'fresh' },
    { id: 'new', date: '2026-09-04', value: 'new' },
  ];

  assert.deepEqual(
    reconcileCollectionSnapshot({
      currentItems,
      serverItems,
      scope: { field: 'date', start: '2026-09-01', endExclusive: '2026-10-01' },
    }),
    [
      { id: 'old', date: '2026-08-20', value: 'keep' },
      { id: 'future', date: '2026-10-02', value: 'keep' },
      { id: 'undated', value: 'keep' },
      { id: 'updated', date: '2026-09-03', value: 'fresh' },
      { id: 'new', date: '2026-09-04', value: 'new' },
    ],
  );
});

test('scoped reconciliation avoids duplicate IDs when an undated cached item is returned by the query', () => {
  assert.deepEqual(
    reconcileCollectionSnapshot({
      currentItems: [{ id: 'same', value: 'cached without date' }],
      serverItems: [{ id: 'same', date: '2026-09-10', value: 'server' }],
      scope: { field: 'date', start: '2026-09-01', endExclusive: '2026-10-01' },
    }),
    [{ id: 'same', date: '2026-09-10', value: 'server' }],
  );
});
