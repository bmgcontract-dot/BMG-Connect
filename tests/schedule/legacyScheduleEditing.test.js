import test from 'node:test';
import assert from 'node:assert/strict';
import { prepareLegacyScheduleEditing, readLegacyScheduleSnapshot } from '../../src/schedule/legacyScheduleEditing.js';
import { buildAdminLegacyScheduleFallback } from '../../src/schedule/adminLegacyScheduleFallback.js';

const args = () => ({ records: [], projectId: 'p', month: '2026-09', staffIds: ['u'], staffAliases: { u: ['old'] },
  legacySchedules: { 'old_2026-09-01': 'M3', 'old_2026-09-02': 'O', 'unknown_2026-09-01': 'N', 'old_2026-08-01': 'H' },
  actorUid: 'admin-uid', confirmed: true, importedAt: '2026-09-19T00:00:00Z' });

test('imports only selected month and matched staff, preserves source and enables the authoritative table', () => {
  const input = args(); const before = structuredClone(input);
  const result = prepareLegacyScheduleEditing(input);
  const record = result.records[0];
  assert.deepEqual(record.schedules, { 'u_2026-09-01': 'M3', 'u_2026-09-02': 'O' });
  assert.equal(result.unmatchedCells, 1);
  assert.deepEqual(input, before);
  const fallback = buildAdminLegacyScheduleFallback({ isAdmin: true, month: input.month, staffIds: input.staffIds,
    staffAliases: input.staffAliases, migratedStaffIds: record.legacyCellMigration.staffIds,
    projectSchedules: record.schedules, legacySchedules: input.legacySchedules });
  assert.equal(fallback.isReadOnlyFallback, false);
});

test('current cells including deliberate blanks win; approval, lock, note and staff order survive', () => {
  const input = args();
  const record = { id: 'p_2026-09', projectId: 'p', month: input.month, schedules: { 'u_2026-09-01': '' },
    approval: { status: 'Approved', isLocked: true }, note: 'keep', staffOrder: ['u'] };
  input.records = [record];
  const result = prepareLegacyScheduleEditing(input); const next = result.records[0];
  assert.equal(next.schedules['u_2026-09-01'], '');
  assert.equal(result.preservedConflicts, 1);
  assert.deepEqual(next.approval, record.approval);
  assert.equal(next.note, 'keep'); assert.deepEqual(next.staffOrder, ['u']);
  assert.deepEqual(next.legacyEditImports[0].previousSchedules, record.schedules);
  assert.equal(next.legacyEditImports[0].sourceCells['old_2026-09-01'], 'M3');
});

test('cleared imported cells do not return from archive and repeated import is rejected', () => {
  const input = args(); const first = prepareLegacyScheduleEditing(input).records;
  first[0].schedules = {};
  assert.throws(() => prepareLegacyScheduleEditing({ ...input, records: first }), /ไม่พบข้อมูลเดิม/);
  assert.deepEqual(buildAdminLegacyScheduleFallback({ isAdmin: true, month: input.month, staffIds: ['u'],
    migratedStaffIds: ['u'], staffAliases: input.staffAliases, projectSchedules: {}, legacySchedules: input.legacySchedules }).schedules, {});
});

test('ambiguous identity and conflicting aliases are blocked', () => {
  assert.throws(() => prepareLegacyScheduleEditing({ ...args(), staffIds: ['u', 'v'], staffAliases: { u: ['old'], v: ['old'] } }), /มากกว่าหนึ่งคน/);
  const input = args(); input.legacySchedules['u_2026-09-01'] = 'H';
  assert.throws(() => prepareLegacyScheduleEditing(input), /ขัดแย้ง/);
});

test('requires review and rejects malformed dates', () => {
  assert.throws(() => prepareLegacyScheduleEditing({ ...args(), confirmed: false }), /ยืนยัน/);
  assert.throws(() => prepareLegacyScheduleEditing({ ...args(), legacySchedules: { 'old_2026-09-31': 'M3' } }), /ไม่ถูกต้อง/);
  assert.throws(() => prepareLegacyScheduleEditing({ ...args(), legacySchedules: { 'old_2026-09-xx': 'M3' } }), /ไม่ถูกต้อง/);
  assert.throws(() => prepareLegacyScheduleEditing({ ...args(), legacySchedules: { 'unknown_2026-09-01': null } }), /ไม่ถูกต้อง/);
});

test('server archive read refuses missing chunks and changing metadata', async () => {
  await assert.rejects(readLegacyScheduleSnapshot(async type => type === 'metadata' ? { totalChunks: 1 } : undefined), /ไม่ครบ/);
  let count = 0;
  await assert.rejects(readLegacyScheduleSnapshot(async () => ({ payload: '{}', timestamp: count++ })), /เปลี่ยน/);
});

test('server archive supports complete chunks and payload without cache fallback', async () => {
  assert.deepEqual(await readLegacyScheduleSnapshot(async type => type === 'metadata' ? { totalChunks: 1 } : { chunk: '{"a":"M3"}' }), { a: 'M3' });
  assert.deepEqual(await readLegacyScheduleSnapshot(async () => ({ payload: '{}' })), {});
});
