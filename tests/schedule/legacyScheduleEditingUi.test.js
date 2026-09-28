import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { prepareLegacyScheduleEditing, readLegacyScheduleSnapshot } from '../../src/schedule/legacyScheduleEditing.js';
import { scheduleDocumentEqual } from '../../src/schedule/scheduleDocumentEqual.js';
import { buildAdminLegacyScheduleFallback } from '../../src/schedule/adminLegacyScheduleFallback.js';

const source = readFileSync(new URL('../../App.jsx', import.meta.url), 'utf8');
const start = source.indexOf('  const handleEnableLegacyScheduleEditing = ');
const end = source.indexOf('  useEffect(() => {\n      schedulesRef.current', start);
function ui({ ok = true, admin = true, visible = 'M3' } = {}) {
  let archive = { 'u_2026-09-01': 'M3' };
  let confirm;
  let writes = 0;
  let records = [];
  const messages = [];
  const context = { projectId: 'p', month: '2026-09', actorUid: 'admin', staffIds: ['u'], staffAliases: {}, isAdmin: admin };
  const contextRef = { current: context };
  const scope = {
    legacyEditInFlight: { current: false }, isLegacyScheduleArchiveAdmin: admin,
    selectedProject: { id: 'p', name: 'Project' }, fbUser: { uid: 'admin' },
    setIsImportingLegacySchedule() {}, legacyEditContext: context, legacyEditContextRef: contextRef,
    projectScheduleRecords: [], readLegacyScheduleSnapshot, prepareLegacyScheduleEditing,
    scheduleDocumentEqual, buildAdminLegacyScheduleFallback,
    schedules: { 'u_2026-09-01': visible }, scheduleViews: { schedules: {} },
    db: {}, appId: 'test', doc: (...path) => path.join('/'),
    getDocFromServer: async () => ({ exists: () => true, data: () => ({ payload: JSON.stringify(archive) }) }),
    showConfirm: (_title, _message, callback) => { confirm = callback; },
    setProjectScheduleRecords: async update => {
      const next = update(records); writes++;
      if (ok) records = next;
      return ok ? { ok: true } : { ok: false, error: new Error('permission-denied') };
    },
    alert: message => messages.push(message),
  };
  const begin = new Function(...Object.keys(scope), `${source.slice(start, end)}; return handleEnableLegacyScheduleEditing;`)(...Object.values(scope));
  return { begin, confirm: () => confirm?.(), messages, contextRef,
    get writes() { return writes; }, get records() { return records; },
    changeArchive: () => { archive = { 'u_2026-09-01': 'H' }; },
    changeTarget: () => { records = [{ id: 'p_2026-09', projectId: 'p', month: '2026-09', schedules: { 'u_2026-09-01': 'O' } }]; },
  };
}

test('enabling legacy edits makes no write until Admin confirms and stores the backup with cells', async () => {
  const screen = ui(); await screen.begin();
  assert.equal(screen.writes, 0); assert.deepEqual(screen.messages, []);
  await screen.confirm();
  assert.equal(screen.writes, 1);
  assert.equal(screen.records[0].schedules['u_2026-09-01'], 'M3');
  assert.equal(screen.records[0].legacyEditImports[0].sourceCells['u_2026-09-01'], 'M3');
  assert.match(screen.messages[0], /สำเร็จ/);
});

test('failed persistence cannot report successful import', async () => {
  const screen = ui({ ok: false }); await screen.begin(); await screen.confirm();
  assert.deepEqual(screen.records, []);
  assert.doesNotMatch(screen.messages[0], /สำเร็จ/);
});

for (const change of ['changeArchive', 'changeTarget']) {
  test(`confirmation rejects ${change} rather than importing the old preview`, async () => {
    const screen = ui(); await screen.begin(); screen[change](); await screen.confirm();
    assert.equal(screen.writes, 0);
    assert.doesNotMatch(screen.messages[0], /สำเร็จ/);
  });
}

test('switching project while confirmation is open cancels import', async () => {
  const screen = ui(); await screen.begin();
  screen.contextRef.current = { ...screen.contextRef.current, projectId: 'other' };
  await screen.confirm();
  assert.equal(screen.writes, 0);
  assert.match(screen.messages[0], /เริ่มใหม่/);
});

test('a stale displayed archive cannot be confirmed and a non-admin cannot start import', async () => {
  const stale = ui({ visible: 'H' }); await stale.begin(); await stale.confirm();
  assert.equal(stale.writes, 0); assert.match(stale.messages[0], /ไม่ตรง/);
  const restricted = ui({ admin: false }); await restricted.begin(); await restricted.confirm();
  assert.equal(restricted.writes, 0);
});
