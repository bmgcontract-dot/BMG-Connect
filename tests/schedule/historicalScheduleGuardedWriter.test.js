import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { scheduleDocumentEqual } from '../../src/schedule/scheduleDocumentEqual.js';
import { assertProtectedScheduleRowsUnchanged } from '../../src/schedule/historicalScheduleRoster.js';
const source = readFileSync(new URL('../../App.jsx', import.meta.url), 'utf8');
const start = source.indexOf('    const setPersistentValue = async'), end = source.indexOf('    return [filterItemsForQueryPlan', start);
function harness() {
  const record = { id: 'p_2026-10', projectId: 'p', month: '2026-10', schedules: { 'known_2026-10-01': 'M3', 'unknown_2026-10-01': 'M2', 'unknown_2026-10-01_act': 'V' }, note: 'Keep', approval: { status: 'Pending HR' } };
  let stored = structuredClone(record), writes = 0;
  const ref = { current: [structuredClone(record)] };
  const scope = {
    guardedScheduleWrites: true, protectedScheduleIds: { current: ['unknown'] }, assertProtectedScheduleRowsUnchanged,
    scheduleWritePending: { current: false }, dataRef: ref, filterItemsForQueryPlan: rows => rows, queryPlan: { kind: 'scoped' },
    readOnly: false, db: {}, fbUser: { uid: 'admin' }, appId: 'test', scheduleDocumentEqual,
    scheduleWriteAccess: () => ({ allowed: true }), SCHEDULE_WRITE_POLICY: {}, getDocumentReference: id => id,
    setData() {}, saveStateLocallyIDB() {}, localKey: 'test', console: { error() {} },
    runTransaction: async (_db, operation) => {
      let next;
      await operation({ get: async () => ({ exists: () => true, data: () => structuredClone(stored) }), set: (_id, data) => { next = data; }, delete: () => { next = null; } });
      if (next !== undefined) { writes++; stored = structuredClone(next); }
    },
  };
  const save = new Function(...Object.keys(scope), `${source.slice(start, end)}; return setPersistentValue;`)(...Object.values(scope));
  return { record, save, stored: () => stored, writes: () => writes };
}
test('actual guarded setter accepts known edits and retains unknown PLAN/ACT and metadata', async () => {
  const h = harness();
  assert.equal((await h.save(rows => rows.map(row => ({ ...row, schedules: { ...row.schedules, 'known_2026-10-02': 'H' } })))).ok, true);
  assert.equal(h.stored().schedules['unknown_2026-10-01'], 'M2'); assert.equal(h.stored().schedules['unknown_2026-10-01_act'], 'V');
  assert.equal(h.stored().note, 'Keep'); assert.deepEqual(h.stored().approval, h.record.approval);
});
test('actual guarded setter refuses a partial table replacing invisible unknown rows before commit', async () => {
  const h = harness();
  const result = await h.save(rows => rows.map(row => ({ ...row, schedules: { 'known_2026-10-01': 'H' } })));
  assert.equal(result.ok, false); assert.match(result.error.message, /อ่านอย่างเดียว/); assert.equal(h.writes(), 0); assert.deepEqual(h.stored(), h.record);
});
