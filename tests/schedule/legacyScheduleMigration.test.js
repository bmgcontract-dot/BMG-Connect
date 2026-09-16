import test from 'node:test';
import assert from 'node:assert/strict';

import { buildAuthoritativeProjectScheduleRecords } from '../../src/schedule/legacyScheduleMigration.js';

test('legacy migration includes only project-keyed schedule metadata', () => {
  const result = buildAuthoritativeProjectScheduleRecords({
    notes: {
      'project-a_2026-08': 'หมายเหตุเดือนสิงหาคม',
      'missing-project_2026-08': 'ต้องไม่ถูกย้าย',
    },
    approvals: {
      'project-a_2026-08': { status: 'Approved' },
      malformed: { status: 'Pending HR' },
    },
    staffOrder: {
      'project-a': ['user-2', 'user-1'],
      'missing-project': ['unknown-user'],
    },
    projectIds: ['project-a'],
    currentMonth: '2026-09',
    migratedAt: '2026-09-16T00:00:00.000Z',
  });

  assert.deepEqual(result.records, [
    {
      id: 'project-a_2026-08',
      projectId: 'project-a',
      month: '2026-08',
      schemaVersion: 1,
      schedules: {},
      note: 'หมายเหตุเดือนสิงหาคม',
      approval: { status: 'Approved' },
      staffOrder: [],
      legacyMigration: {
        source: 'project-keyed-metadata',
        migratedAt: '2026-09-16T00:00:00.000Z',
      },
    },
    {
      id: 'project-a_2026-09',
      projectId: 'project-a',
      month: '2026-09',
      schemaVersion: 1,
      schedules: {},
      note: '',
      approval: {},
      staffOrder: ['user-2', 'user-1'],
      legacyMigration: {
        source: 'project-keyed-metadata',
        migratedAt: '2026-09-16T00:00:00.000Z',
      },
    },
  ]);
  assert.deepEqual(result.report, {
    recordCount: 2,
    migratedNotes: 1,
    migratedApprovals: 1,
    migratedStaffOrders: 1,
    skippedScheduleCells: true,
    unresolved: {
      noteKeys: ['missing-project_2026-08'],
      approvalKeys: ['malformed'],
      staffOrderProjectIds: ['missing-project'],
    },
  });
});

test('legacy migration validates its month instead of inventing a target', () => {
  assert.throws(() => buildAuthoritativeProjectScheduleRecords({
    notes: {},
    approvals: {},
    staffOrder: { 'project-a': ['user-1'] },
    projectIds: ['project-a'],
    currentMonth: 'September',
    migratedAt: '2026-09-16T00:00:00.000Z',
  }), /currentMonth/);
});
