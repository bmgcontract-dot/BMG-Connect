import test from 'node:test';
import assert from 'node:assert/strict';

import {
  canManageStaffAccounts,
  isActiveStaffManager,
  isSuperAdminClaim,
} from '../../src/auth/staffManagement.js';

const staffManager = {
  status: 'Active',
  accessibleDepts: ['All'],
  permissions: { proj_staff: { view: true, save: true, edit: true } },
};

test('super admin claim can always manage staff', () => {
  assert.equal(canManageStaffAccounts({ admin: true }, null), true);
  assert.equal(isSuperAdminClaim({ admin: true }), true);
  assert.equal(isSuperAdminClaim({ admin: false }), false);
});

test('an Active All-access user with proj_staff save can manage staff', () => {
  assert.equal(canManageStaffAccounts({ admin: false }, staffManager), true);
  assert.equal(isActiveStaffManager(staffManager), true);
});

test('proj_staff edit-only (no save) is also enough', () => {
  const editOnly = { ...staffManager, permissions: { proj_staff: { save: false, edit: true } } };
  assert.equal(isActiveStaffManager(editOnly), true);
});

test('proj_staff view-only is NOT enough (must be able to write)', () => {
  const viewOnly = { ...staffManager, permissions: { proj_staff: { view: true, save: false, edit: false } } };
  assert.equal(isActiveStaffManager(viewOnly), false);
  assert.equal(canManageStaffAccounts({ admin: false }, viewOnly), false);
});

test('staff write without All department access is NOT enough', () => {
  const oneDept = { ...staffManager, accessibleDepts: ['โครงการ A'] };
  assert.equal(isActiveStaffManager(oneDept), false);
});

test('inactive user cannot manage staff even with the permission', () => {
  const inactive = { ...staffManager, status: 'Inactive' };
  assert.equal(isActiveStaffManager(inactive), false);
});

test('accessibleDepts as a comma string is honored', () => {
  const stringDeps = { ...staffManager, accessibleDepts: 'All, โครงการ A' };
  assert.equal(isActiveStaffManager(stringDeps), true);
});

test('no profile / no permission → denied', () => {
  assert.equal(canManageStaffAccounts({ admin: false }, null), false);
  assert.equal(canManageStaffAccounts({ admin: false }, { status: 'Active', permissions: {} }), false);
});
