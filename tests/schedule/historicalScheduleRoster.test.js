import test from 'node:test';
import assert from 'node:assert/strict';
import { buildHistoricalScheduleRoster, assertProtectedScheduleRowsUnchanged } from '../../src/schedule/historicalScheduleRoster.js';
const projectId = 'vivwmaynf', month = '2026-10';
const config = { projectId, month, status: 'reviewed', rows: [{ id: 'archived', employeeId: 'local-only', firstName: 'Local', lastName: 'Archived', position: 'Staff', confirmedMonth: month, password: 'must-not-return' }] };
const schedule = { projectId, month, schedules: { 'current_2026-10-01': 'M3', 'archived_2026-10-01': 'O', 'unknown_2026-10-01': 'M2', 'unknown_2026-10-02_act': 'V' }, note: 'Keep', approval: { status: 'Pending HR' }, staffOrder: ['unknown', 'archived'] };
const args = () => ({ projectId, month, currentStaff: [{ id: 'current', firstName: 'Local', salary: 'private' }], config: structuredClone(config), schedule: structuredClone(schedule) });
test('current and confirmed archived rows are visible without creating accounts; unknown owner is read-only', () => {
  const a = args(), before = JSON.stringify(a), staff = buildHistoricalScheduleRoster(a);
  assert.deepEqual(staff.map(r => r.id), ['current', 'archived', 'unknown']);
  assert.equal(staff[1].scheduleHistorical, true); assert.equal(staff[1].scheduleReadOnly, false); assert.equal(staff[2].scheduleReadOnly, true);
  assert.equal(staff[0].salary, undefined); assert.equal(staff[1].password, undefined);
  assert.equal(JSON.stringify(a), before);
});
for (const mutate of [a => { a.config = null; }, a => { a.config.month = '2026-09'; }, a => { a.month = '2026-11'; }, a => { a.config.rows[0].confirmedMonth = '2026-09'; }, a => { a.config.rows.push(a.config.rows[0]); }]) {
  test('missing/unreviewed/ambiguous historical context fails closed', () => { const a = args(); mutate(a); assert.throws(() => buildHistoricalScheduleRoster(a)); });
}
test('saving editable rows preserves unknown cells, notes, approval and order exactly', () => {
  const next = structuredClone(schedule); next.schedules['current_2026-10-02'] = 'M3'; next.schedules['archived_2026-10-02'] = 'H';
  assert.doesNotThrow(() => assertProtectedScheduleRowsUnchanged(schedule, next, ['unknown']));
  for (const key of ['note', 'approval', 'staffOrder']) assert.deepEqual(next[key], schedule[key]);
  for (const operation of ['edit', 'delete', 'delete-row', 'act']) {
    const changed = structuredClone(next);
    if (operation === 'delete') delete changed.schedules['unknown_2026-10-01'];
    else if (operation === 'delete-row') changed.schedules = {};
    else changed.schedules[operation === 'act' ? 'unknown_2026-10-02_act' : 'unknown_2026-10-01'] = 'H';
    assert.throws(() => assertProtectedScheduleRowsUnchanged(schedule, changed, ['unknown']), /อ่านอย่างเดียว/);
  }
});
test('Aspire can preserve an entirely unidentified row with no guessed archived mapping', () => {
  const a = args(); a.projectId = 'ioblbvq9p'; a.config.projectId = a.projectId; a.schedule.projectId = a.projectId; a.config.rows = [];
  const staff = buildHistoricalScheduleRoster(a); assert.equal(staff.find(r => r.id === 'archived').scheduleReadOnly, true);
});
