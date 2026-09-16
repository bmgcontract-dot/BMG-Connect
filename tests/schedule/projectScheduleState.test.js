import test from 'node:test';
import assert from 'node:assert/strict';

import {
  deriveProjectScheduleViews,
  upsertProjectSchedule,
} from '../../src/schedule/projectScheduleState.js';

test('a project-month schedule is stored as one project-owned document', () => {
  const records = upsertProjectSchedule([], {
    projectId: 'project-a',
    month: '2026-09',
    update: {
      schedules: { 'user-1_2026-09-16': 'D' },
      note: 'ตรวจเวรกลางคืน',
    },
  });

  assert.deepEqual(records, [{
    id: 'project-a_2026-09',
    projectId: 'project-a',
    month: '2026-09',
    schemaVersion: 1,
    schedules: { 'user-1_2026-09-16': 'D' },
    note: 'ตรวจเวรกลางคืน',
    approval: {},
    staffOrder: [],
  }]);
});

test('project schedule records expose the legacy-shaped views used by the screen', () => {
  const views = deriveProjectScheduleViews([
    {
      id: 'project-a_2026-08',
      projectId: 'project-a',
      month: '2026-08',
      schedules: { 'user-1_2026-08-31': 'D' },
      note: 'สิงหาคม',
      approval: { status: 'Approved' },
      staffOrder: ['user-2', 'user-1'],
    },
    {
      id: 'project-a_2026-09',
      projectId: 'project-a',
      month: '2026-09',
      schedules: { 'user-1_2026-09-01': 'N' },
      note: 'กันยายน',
      approval: { status: 'Pending HR' },
      staffOrder: ['user-1', 'user-2'],
    },
    {
      id: 'project-b_2026-09',
      projectId: 'project-b',
      month: '2026-09',
      schedules: { 'user-3_2026-09-01': 'D' },
    },
  ], 'project-a');

  assert.deepEqual(views, {
    schedules: {
      'user-1_2026-08-31': 'D',
      'user-1_2026-09-01': 'N',
    },
    scheduleNotes: {
      'project-a_2026-08': 'สิงหาคม',
      'project-a_2026-09': 'กันยายน',
    },
    scheduleApprovals: {
      'project-a_2026-08': { status: 'Approved' },
      'project-a_2026-09': { status: 'Pending HR' },
    },
    projectStaffOrder: {
      'project-a': ['user-1', 'user-2'],
    },
  });
});

test('an overview can derive approval and staff-order views for every loaded project', () => {
  const views = deriveProjectScheduleViews([
    {
      id: 'project-a_2026-09',
      projectId: 'project-a',
      month: '2026-09',
      approval: { status: 'Approved' },
      staffOrder: ['user-1'],
    },
    {
      id: 'project-b_2026-09',
      projectId: 'project-b',
      month: '2026-09',
      approval: { status: 'Pending Manager' },
      staffOrder: ['user-2'],
    },
  ]);

  assert.deepEqual(views.scheduleApprovals, {
    'project-a_2026-09': { status: 'Approved' },
    'project-b_2026-09': { status: 'Pending Manager' },
  });
  assert.deepEqual(views.projectStaffOrder, {
    'project-a': ['user-1'],
    'project-b': ['user-2'],
  });
});

test('a new month carries forward the latest staff order for the same project', () => {
  const records = upsertProjectSchedule([{
    id: 'project-a_2026-08',
    projectId: 'project-a',
    month: '2026-08',
    schemaVersion: 1,
    schedules: {},
    note: '',
    approval: {},
    staffOrder: ['user-2', 'user-1'],
  }], {
    projectId: 'project-a',
    month: '2026-09',
    update: { note: 'เดือนใหม่' },
  });

  assert.deepEqual(records[1].staffOrder, ['user-2', 'user-1']);
});
