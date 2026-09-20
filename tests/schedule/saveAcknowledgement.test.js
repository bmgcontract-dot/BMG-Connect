import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { upsertProjectSchedule } from '../../src/schedule/projectScheduleState.js';
import { scheduleDocumentEqual } from '../../src/schedule/scheduleDocumentEqual.js';

// Exercise the actual UI handler until it can be extracted from the monolithic component.
const source = readFileSync(new URL('../../App.jsx', import.meta.url), 'utf8');
const start = source.indexOf('  const handleSaveSchedule = ');
const end = source.indexOf('  // --- NEW: Handle Schedule Approval', start);
function screen(persist, overrides = {}) {
  const messages = [];
  const busy = [];
  const scope = {
    scheduleSaveInFlight: { current: false }, setIsSavingSchedule: value => busy.push(value),
    isLegacyScheduleReadOnly: false, selectedProject: { id: 'p' }, currentMonth: '2026-09',
    schedulesRef: { current: { 'u_2026-09-01': 'M3', 'u_2026-08-01': 'O' } },
    scheduleNote: 'note', scheduleApprovals: {},
    scheduleDraftRef: { current: null }, setScheduleDraft() {},
    currentUser: { username: 'admin', firstName: 'Test', lastName: 'Admin', position: 'Admin' },
    setProjectScheduleRecords: persist, upsertProjectSchedule, GOOGLE_SCRIPT_CONFIG: {},
    projectScheduleRecords: [], scheduleDocumentEqual,
    alert: message => messages.push(message), console: { error() {} },
    ...overrides,
  };
  const save = new Function(...Object.keys(scope), `${source.slice(start, end)}; return handleSaveSchedule;`)(...Object.values(scope));
  return { save, messages, busy };
}

test('schedule submission waits for acknowledgement, writes one month atomically and blocks double-click', async () => {
  let release;
  let calls = 0;
  const ui = screen(async (update, restore, forceIds) => {
    calls++;
    assert.equal(restore, false);
    assert.deepEqual(forceIds, ['p_2026-09']);
    const [record] = update([]);
    assert.deepEqual(record.schedules, { 'u_2026-09-01': 'M3' });
    assert.equal(record.note, 'note');
    assert.equal(record.approval.status, 'Pending HR');
    return new Promise(resolve => { release = resolve; });
  });
  const pending = ui.save();
  await ui.save();
  assert.equal(calls, 1);
  assert.deepEqual(ui.messages, []);
  release({ ok: true });
  await pending;
  assert.equal(ui.messages.length, 1);
  assert.match(ui.messages[0], /สำเร็จ/);
  assert.deepEqual(ui.busy, [true, false]);
});

test('editing a schedule cell stays in a local draft until Save', () => {
  const updateStart = source.indexOf('  const updateSchedule = ');
  const updateEnd = source.indexOf('\n\n  // ... (View Components)', updateStart);
  let draft;
  const update = new Function(
    'isLegacyScheduleReadOnly', 'scheduleSaveInFlight', 'setScheduleDraftCells',
    `${source.slice(updateStart, updateEnd)}; return updateSchedule;`,
  )(false, { current: false }, updater => { draft = updater({ 'u_2026-09-01': 'M3' }); });
  update('u', '2026-09-01', 'H');
  assert.deepEqual(draft, { 'u_2026-09-01': 'H' });
});

test('editing is ignored while a schedule save is awaiting acknowledgement', () => {
  const updateStart = source.indexOf('  const updateSchedule = ');
  const updateEnd = source.indexOf('\n\n  // ... (View Components)', updateStart);
  let calls = 0;
  const update = new Function(
    'isLegacyScheduleReadOnly', 'scheduleSaveInFlight', 'setScheduleDraftCells',
    `${source.slice(updateStart, updateEnd)}; return updateSchedule;`,
  )(false, { current: true }, () => { calls++; });
  update('u', '2026-09-01', 'H');
  assert.equal(calls, 0);
});

for (const result of [{ ok: false, error: new Error('permission-denied') }, undefined]) {
  test(`schedule submission does not report success without acknowledgement (${result?.ok})`, async () => {
    const ui = screen(async () => result);
    await ui.save();
    assert.equal(ui.messages.length, 1);
    assert.doesNotMatch(ui.messages[0], /สำเร็จ/);
    assert.match(ui.messages[0], /ผิดพลาด/);
    assert.deepEqual(ui.busy, [true, false]);
  });
}

test('schedule submission can retry after a rejected request', async () => {
  let attempts = 0;
  const ui = screen(async () => {
    if (++attempts === 1) throw new Error('unavailable');
    return { ok: true };
  });
  await ui.save();
  await ui.save();
  assert.equal(attempts, 2);
  assert.doesNotMatch(ui.messages[0], /สำเร็จ/);
  assert.match(ui.messages[1], /สำเร็จ/);
});

test('a save from a stale render cannot overwrite a newly received record', async () => {
  let written = false;
  const ui = screen(async update => {
    update([{ id: 'p_2026-09', projectId: 'p', month: '2026-09', note: 'new server record' }]);
    written = true;
    return { ok: true };
  });
  await ui.save();
  assert.equal(written, false);
  assert.doesNotMatch(ui.messages[0], /สำเร็จ/);
});

test('a draft for an absent month cannot overwrite a record created concurrently', async () => {
  const newlyCreated = { id: 'p_2026-09', projectId: 'p', month: '2026-09', note: 'new server record' };
  let written = false;
  const ui = screen(async update => {
    update([newlyCreated]);
    written = true;
    return { ok: true };
  }, {
    scheduleDraftRef: {
      current: {
        scope: 'p_2026-09',
        cells: { 'u_2026-09-01': 'M3' },
        baseline: undefined,
      },
    },
    projectScheduleRecords: [newlyCreated],
  });
  await ui.save();
  assert.equal(written, false);
  assert.doesNotMatch(ui.messages[0], /สำเร็จ/);
});
