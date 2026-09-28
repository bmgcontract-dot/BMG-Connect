import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { scheduleDocumentEqual } from '../../src/schedule/scheduleDocumentEqual.js';

const source = readFileSync(new URL('../../App.jsx', import.meta.url), 'utf8');
const start = source.indexOf('    const setPersistentValue = async');
const end = source.indexOf('    return [filterItemsForQueryPlan', start);
const initial = { id: 'p_2026-09', projectId: 'p', month: '2026-09', schedules: { a: 'M3', b: 'O' } };
const clone = value => structuredClone(value);

function harness() {
  const store = new Map([[initial.id, clone(initial)]]);
  let fail = false;
  let onRetry;
  const batch = () => {
    const writes = [];
    return {
      get: async id => ({ exists: () => store.has(id), data: () => clone(store.get(id)) }),
      set: (id, value) => writes.push(() => store.set(id, clone(value))),
      delete: id => writes.push(() => store.delete(id)),
      commit: async () => { if (fail) throw new Error('permission-denied'); writes.forEach(write => write()); },
    };
  };
  function client() {
    const ref = { current: [clone(initial)] };
    const scope = {
      dataRef: ref, filterItemsForQueryPlan: items => items, queryPlan: { kind: 'unscoped' },
      setData() {}, saveStateLocallyIDB() {}, localKey: 'test',
      readOnly: false, db: {}, fbUser: { uid: 'test' }, appId: 'test',
      documentIdField: 'id', collectionName: 'bmg_projectSchedules',
      getDocumentReference: id => id, writeBatch: batch,
      guardedScheduleWrites: true, scheduleWritePending: { current: false },
      scheduleDocumentEqual,
      runTransaction: async (_db, operation) => {
        let tx = batch(); await operation(tx);
        if (onRetry) {
          const mutate = onRetry; onRetry = undefined; mutate(store);
          tx = batch(); await operation(tx);
        }
        await tx.commit();
      },
      console: { error() {}, warn() {} },
    };
    const save = new Function(...Object.keys(scope), `${source.slice(start, end)}; return setPersistentValue;`)(...Object.values(scope));
    return { save, ref };
  }
  return { store, client, failWrites: value => { fail = value; }, retryOnce: mutate => { onRetry = mutate; } };
}

test('a stale second client cannot overwrite a different cell saved by the first client', async () => {
  const h = harness(); const a = h.client(); const b = h.client();
  assert.equal((await a.save(records => records.map(r => ({ ...r, schedules: { ...r.schedules, a: 'O' } })))).ok, true);
  const result = await b.save(records => records.map(r => ({ ...r, schedules: { ...r.schedules, b: 'M3' } })));
  assert.equal(result.ok, false);
  assert.equal(result.error.code, 'schedule/conflict');
  assert.deepEqual(h.store.get(initial.id).schedules, { a: 'O', b: 'O' });
});

test('same-cell conflict preserves the first write and does not change the rejected client cache', async () => {
  const h = harness(); const a = h.client(); const b = h.client();
  await a.save([{ ...initial, schedules: { a: 'H', b: 'O' } }]);
  const result = await b.save([{ ...initial, schedules: { a: 'V', b: 'O' } }]);
  assert.equal(result.error.code, 'schedule/conflict');
  assert.equal(h.store.get(initial.id).schedules.a, 'H');
  assert.deepEqual(b.ref.current, [initial]);
});

test('failed commit does not advance the baseline and retry really writes', async () => {
  const h = harness(); const a = h.client();
  const next = [{ ...initial, note: 'new note' }];
  h.failWrites(true);
  assert.equal((await a.save(next)).ok, false);
  assert.deepEqual(a.ref.current, [initial]);
  h.failWrites(false);
  assert.equal((await a.save(next)).ok, true);
  assert.equal(h.store.get(initial.id).note, 'new note');
});

test('transaction retry rechecks the original baseline instead of accepting a concurrent change', async () => {
  const h = harness(); const a = h.client();
  h.retryOnce(store => store.set(initial.id, { ...initial, note: 'another user' }));
  const result = await a.save([{ ...initial, note: 'my note' }]);
  assert.equal(result.error.code, 'schedule/conflict');
  assert.equal(h.store.get(initial.id).note, 'another user');
});

test('a concurrent lock rejects a stale cell edit', async () => {
  const h = harness(); const a = h.client();
  h.store.set(initial.id, { ...initial, approval: { isLocked: true } });
  const result = await a.save([{ ...initial, schedules: { a: 'H' } }]);
  assert.equal(result.error.code, 'schedule/conflict');
  assert.equal(h.store.get(initial.id).approval.isLocked, true);
});

test('map field ordering does not cause a false conflict', async () => {
  const h = harness(); const a = h.client();
  h.store.set(initial.id, { schedules: { b: 'O', a: 'M3' }, month: initial.month, projectId: 'p', id: initial.id });
  assert.equal((await a.save([{ ...initial, note: 'ok' }])).ok, true);
});

test('two clients creating the same month cannot overwrite one another', async () => {
  const h = harness(); const a = h.client(); const b = h.client();
  h.store.clear(); a.ref.current = []; b.ref.current = [];
  assert.equal((await a.save([initial])).ok, true);
  assert.equal((await b.save([{ ...initial, note: 'second' }])).error.code, 'schedule/conflict');
});

test('restore cannot bypass schedule conflict protection', async () => {
  const h = harness(); const a = h.client();
  assert.equal((await a.save([{ ...initial, note: 'restore' }], true)).ok, false);
  assert.deepEqual(h.store.get(initial.id), initial);
});

test('a newer listener snapshot is not replaced after the transaction completes', async () => {
  const h = harness(); const a = h.client();
  const pending = a.save([{ ...initial, note: 'mine' }]);
  a.ref.current = [{ ...initial, note: 'newer listener' }];
  assert.equal((await pending).ok, true);
  assert.equal(a.ref.current[0].note, 'newer listener');
});

test('rapid second edits are rejected explicitly rather than silently dropped', async () => {
  const h = harness(); const a = h.client();
  const pending = a.save([{ ...initial, note: 'first' }]);
  assert.equal((await a.save([{ ...initial, note: 'second' }])).ok, false);
  assert.equal((await pending).ok, true);
  assert.equal(h.store.get(initial.id).note, 'first');
});
