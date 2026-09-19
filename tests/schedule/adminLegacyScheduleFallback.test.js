import test from 'node:test';
import assert from 'node:assert/strict';

import { buildAdminLegacyScheduleFallback } from '../../src/schedule/adminLegacyScheduleFallback.js';

test('a confirmed migrated employee uses authoritative cells even after editing or clearing them', () => {
  const result = buildAdminLegacyScheduleFallback({
    isAdmin: true, month: '2026-05', staffIds: ['employee-1'],
    migratedStaffIds: ['employee-1'],
    projectSchedules: { 'employee-1_2026-05-01': '' },
    legacySchedules: { 'employee-1_2026-05-01': 'M1', 'employee-1_2026-05-02': 'O' },
  });
  assert.deepEqual(result.schedules, { 'employee-1_2026-05-01': '' });
  assert.equal(result.isReadOnlyFallback, false);
  assert.equal(result.legacyCellCount, 0);
});

test('unconfirmed employees remain read-only when another employee has been migrated', () => {
  const result = buildAdminLegacyScheduleFallback({
    isAdmin: true, month: '2026-06', staffIds: ['employee-1', 'employee-2'],
    migratedStaffIds: ['employee-1'], staffAliases: { 'employee-1': ['old-1'] },
    projectSchedules: { 'employee-1_2026-06-01': 'N' },
    legacySchedules: { 'old-1_2026-06-01': 'M1', 'employee-2_2026-06-01': 'O' },
  });
  assert.deepEqual(result.schedules, { 'employee-1_2026-06-01': 'N', 'employee-2_2026-06-01': 'O' });
  assert.equal(result.isReadOnlyFallback, true);
  assert.equal(result.legacyCellCount, 1);
});

test('an administrator can read legacy schedule cells when the project-owned month is empty', () => {
  const result = buildAdminLegacyScheduleFallback({
    isAdmin: true,
    month: '2026-05',
    staffIds: ['employee-1'],
    projectSchedules: {},
    legacySchedules: {
      'employee-1_2026-05-01': 'M1',
      'employee-1_2026-05-01_act': 'M2',
    },
  });

  assert.deepEqual(result.schedules, {
    'employee-1_2026-05-01': 'M1',
    'employee-1_2026-05-01_act': 'M2',
  });
  assert.equal(result.isReadOnlyFallback, true);
  assert.equal(result.legacyCellCount, 2);
});

test('the fallback exposes only the selected staff and month while project-owned cells win', () => {
  const result = buildAdminLegacyScheduleFallback({
    isAdmin: true,
    month: '2026-05',
    staffIds: ['employee-1'],
    projectSchedules: {
      'employee-1_2026-05-01': 'NEW',
    },
    legacySchedules: {
      'employee-1_2026-05-01': 'OLD',
      'employee-1_2026-04-30': 'M1',
      'employee-2_2026-05-01': 'N',
    },
  });

  assert.deepEqual(result.schedules, {
    'employee-1_2026-05-01': 'NEW',
  });
  assert.equal(result.isReadOnlyFallback, true);
  assert.equal(result.legacyCellCount, 1);
});

test('a non-administrator never receives legacy schedule cells', () => {
  const result = buildAdminLegacyScheduleFallback({
    isAdmin: false,
    month: '2026-05',
    staffIds: ['employee-1'],
    projectSchedules: {},
    legacySchedules: {
      'employee-1_2026-05-01': 'M1',
    },
  });

  assert.deepEqual(result.schedules, {});
  assert.equal(result.isReadOnlyFallback, false);
  assert.equal(result.legacyCellCount, 0);
});

test('legacy user aliases are remapped to the current schedule row identity', () => {
  const result = buildAdminLegacyScheduleFallback({
    isAdmin: true,
    month: '2026-05',
    staffIds: ['current-auth-uid'],
    staffAliases: { 'current-auth-uid': ['legacy-user-id'] },
    projectSchedules: {},
    legacySchedules: {
      'legacy-user-id_2026-05-01': 'M1',
      'legacy-user-id_2026-05-01_act': 'M2',
    },
  });

  assert.deepEqual(result.schedules, {
    'current-auth-uid_2026-05-01': 'M1',
    'current-auth-uid_2026-05-01_act': 'M2',
  });
});
