import test from 'node:test';
import assert from 'node:assert/strict';
import { scheduleWriteAccess, VERIFIED_SCHEDULE_SCOPES } from '../../src/schedule/scheduleWritePolicy.js';
import { createClock } from '../../src/platform/clock.js';

const verifiedScopes = [{ projectId: 'p', month: '2026-10' }];
const access = overrides => scheduleWriteAccess({ projectId: 'p', month: '2026-10',
  emergencyLocked: false, currentMonth: '2026-10', verifiedScopes, ...overrides });

test('only the explicitly verified project in the current month can write', () => {
  assert.equal(access({}).allowed, true);
  for (const overrides of [
    { emergencyLocked: true }, { verifiedScopes: [] }, { projectId: 'other' },
    { month: '2026-09' }, { month: '2026-11' }, { month: '2026-13' },
    { month: undefined }, { projectId: undefined }, { currentMonth: '2026-11' },
  ]) assert.equal(access(overrides).allowed, false);
});

test('production expansion is limited to three reviewed October scopes', () => {
  assert.deepEqual(VERIFIED_SCHEDULE_SCOPES, [
    { projectId: 'r7n92q0md', month: '2026-10' },
    { projectId: 'nasqxexpr', month: '2026-10' },
    { projectId: 'vg0zs4rlr', month: '2026-10' },
  ]);
  for (const projectId of ['nasqxexpr', 'vg0zs4rlr']) {
    assert.equal(scheduleWriteAccess({ projectId, month: '2026-10', emergencyLocked: false, currentMonth: '2026-10' }).allowed, true);
    assert.equal(scheduleWriteAccess({ projectId, month: '2026-10', emergencyLocked: false, currentMonth: '2026-11' }).allowed, false);
  }
  assert.equal(scheduleWriteAccess({ projectId: 'r7n92q0md', month: '2026-10', emergencyLocked: false, currentMonth: '2026-10' }).allowed, true);
  assert.equal(scheduleWriteAccess({ projectId: 'r7n92q0md', month: '2026-10', emergencyLocked: false, currentMonth: '2026-11' }).allowed, false);
  assert.equal(scheduleWriteAccess({ projectId: 'p', month: '2026-10' }).allowed, false);
  assert.equal(scheduleWriteAccess({ projectId: 'p', month: '2026-10', emergencyLocked: false, currentMonth: '2026-10' }).allowed, false);
});

test('Bangkok month rollover closes the previous verified month', () => {
  const before = createClock({ now: () => Date.parse('2026-10-31T16:59:59Z') });
  const after = createClock({ now: () => Date.parse('2026-10-31T17:00:00Z') });
  assert.equal(access({ currentMonth: before.thisMonth() }).allowed, true);
  assert.equal(access({ currentMonth: after.thisMonth() }).allowed, false);
});

test('reviewed projects can plan next month and roll across November and year end', () => {
  const allowed = (month, currentMonth, projectId = 'r7n92q0md') => scheduleWriteAccess({
    projectId, month, currentMonth, emergencyLocked: false }).allowed;
  assert.equal(allowed('2026-11', '2026-10'), true);
  assert.equal(allowed('2026-11', '2026-11'), true);
  assert.equal(allowed('2026-12', '2026-11'), true);
  assert.equal(allowed('2027-01', '2026-12'), true);
  assert.equal(allowed('2027-02', '2026-12'), false);
  assert.equal(allowed('2026-10', '2026-11'), false);
  assert.equal(allowed('2026-11', '2026-10', 'unreviewed'), false);
  assert.equal(scheduleWriteAccess({ projectId: 'r7n92q0md', month: '2026-11', currentMonth: '2026-10' }).allowed, false);
});
