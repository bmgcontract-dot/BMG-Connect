import test from 'node:test';
import assert from 'node:assert/strict';

import { unlockScheduleApproval } from '../../src/schedule/scheduleApprovalWorkflow.js';

test('unlocking an approved schedule requires HR approval again without losing manager approval', () => {
  const approval = {
    status: 'Approved',
    isLocked: true,
    lockedBy: 'System Admin',
    managerApprovedBy: 'Building Manager',
    hrApprovedBy: 'HR Officer',
    submittedAt: '2026-09-15T01:00:00.000Z',
    updatedAt: '2026-09-15T02:00:00.000Z',
  };

  const unlocked = unlockScheduleApproval(approval, '2026-09-20T03:00:00.000Z');

  assert.deepEqual(unlocked, {
    status: 'Pending HR',
    isLocked: false,
    lockedBy: 'System Admin',
    managerApprovedBy: 'Building Manager',
    hrApprovedBy: null,
    submittedAt: '2026-09-15T01:00:00.000Z',
    updatedAt: '2026-09-20T03:00:00.000Z',
  });
  assert.equal(approval.status, 'Approved');
  assert.equal(approval.isLocked, true);
  assert.equal(approval.hrApprovedBy, 'HR Officer');
});

test('unlocking requires a valid approval and audit timestamp', () => {
  assert.throws(() => unlockScheduleApproval(null, '2026-09-20T03:00:00.000Z'), {
    name: 'TypeError',
    message: 'currentApproval must be an object',
  });
  assert.throws(() => unlockScheduleApproval({ status: 'Approved' }, ''), {
    name: 'TypeError',
    message: 'updatedAt is required',
  });
});
