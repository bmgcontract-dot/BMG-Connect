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

test('production expansion is limited to twenty reviewed projects with preserved unknown gaps', () => {
  assert.deepEqual(VERIFIED_SCHEDULE_SCOPES, [
  {
    "projectId": "r7n92q0md",
    "month": "2026-10"
  },
  {
    "projectId": "nasqxexpr",
    "month": "2026-10"
  },
  {
    "projectId": "vg0zs4rlr",
    "month": "2026-10"
  },
  {
    "projectId": "063hu1m48",
    "month": "2026-10"
  },
  {
    "projectId": "0hk7hi6gv",
    "month": "2026-10"
  },
  {
    "projectId": "4j2oss0xy",
    "month": "2026-10"
  },
  {
    "projectId": "8xyoxaz5g",
    "month": "2026-10"
  },
  {
    "projectId": "bwzljr0j8",
    "month": "2026-10"
  },
  {
    "projectId": "flco5wcsi",
    "month": "2026-10"
  },
  {
    "projectId": "iiyoz3luw",
    "month": "2026-10"
  },
  {
    "projectId": "jm8gbol9b",
    "month": "2026-10"
  },
  {
    "projectId": "o7unooeq8",
    "month": "2026-10"
  },
  {
    "projectId": "t22w7g8jc",
    "month": "2026-10"
  },
  {
    "projectId": "tmpkcdb86",
    "month": "2026-10"
  },
  {
    "projectId": "x39fybz83",
    "month": "2026-10"
  },
  {
    "projectId": "xdkpztgl6",
    "month": "2026-10"
  },
  {
    "projectId": "z9laf9hrh",
    "month": "2026-10"
  },
  {
    "projectId": "e0uggx84s",
    "month": "2026-10"
  },
  {
    "projectId": "endmmc2ms",
    "month": "2026-10"
  },
  {
    "projectId": "vx1tm89oi",
    "month": "2026-10"
  }
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

test('all twenty projects allow November while the four identity-held projects remain closed', () => {
  for (const scope of VERIFIED_SCHEDULE_SCOPES) {
    assert.equal(scheduleWriteAccess({ projectId: scope.projectId, month: '2026-11', currentMonth: '2026-10', emergencyLocked: false }).allowed, true);
  }
  for (const projectId of ['ioblbvq9p', 'vivwmaynf', 'vzdknz8j1', 'z8z448en8']) {
    assert.equal(scheduleWriteAccess({ projectId, month: '2026-10', currentMonth: '2026-10', emergencyLocked: false }).allowed, false);
    assert.equal(scheduleWriteAccess({ projectId, month: '2026-11', currentMonth: '2026-10', emergencyLocked: false }).allowed, false);
  }
});
