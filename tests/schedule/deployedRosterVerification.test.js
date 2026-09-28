import test from 'node:test';
import assert from 'node:assert/strict';

import { validateDeployedRoster } from '../../src/schedule/deployedRosterVerification.js';

const validPerson = {
  id: 'staff-1',
  employeeId: 'EMP-1',
  firstName: 'Test',
  lastName: 'Person',
  position: 'Technician',
};

test('deployed roster verifier accepts only the minimal private response', () => {
  assert.deepEqual(validateDeployedRoster({
    status: 200,
    cacheControl: 'private, no-store',
    projectId: 'project-a',
    payload: { projectId: 'project-a', staff: [validPerson] },
    expectedStaffIds: ['staff-1'],
  }), { projectId: 'project-a', staffCount: 1, expectedStaffCount: 1 });
});
test('deployed roster verifier rejects missing endpoints, cache leaks, and profile fields', () => {
  assert.throws(() => validateDeployedRoster({
    status: 404,
    cacheControl: 'public',
    projectId: 'project-a',
    payload: {},
  }), /roster-http-404/);
  assert.throws(() => validateDeployedRoster({
    status: 200,
    cacheControl: 'public, max-age=60',
    projectId: 'project-a',
    payload: { projectId: 'project-a', staff: [validPerson] },
  }), /cache-control/);
  assert.throws(() => validateDeployedRoster({
    status: 200,
    cacheControl: 'private, no-store',
    projectId: 'project-a',
    payload: { projectId: 'project-a', staff: [{ ...validPerson, phone: 'private' }] },
    expectedStaffIds: ['staff-1'],
  }), /fields-invalid/);
  assert.throws(() => validateDeployedRoster({
    status: 200,
    cacheControl: 'private, no-store',
    projectId: 'project-a',
    payload: { projectId: 'project-a', staff: [] },
  }), /expected-staff-required/);
  assert.throws(() => validateDeployedRoster({
    status: 200,
    cacheControl: 'private, no-store',
    projectId: 'project-a',
    payload: { projectId: 'project-a', staff: [] },
    expectedStaffIds: ['staff-1'],
  }), /expected-staff-missing:staff-1/);
});
