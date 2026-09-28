import test from 'node:test';
import assert from 'node:assert/strict';
import { createScheduleRosterReader } from '../../src/schedule/rosterReader.js';

function fixture(overrides = {}) {
  let reads = 0;
  const reader = createScheduleRosterReader({
    verifyToken: async () => ({ uid: 'reader', ...overrides.token }),
    getProfile: async () => ({ authUid: 'reader', status: 'Active', department: 'A', permissions: { proj_schedule: { view: true } }, ...overrides.profile }),
    getProject: async () => ({ name: 'A', ...overrides.project }),
    getStaff: async name => { reads++; assert.equal(name, 'A'); return overrides.staff || [{ id: 'legacy-id', employeeId: '001', firstName: 'Test', lastName: 'Person', position: 'Staff', department: 'A', password: 'secret', salary: 90000, phone: 'private', permissions: {} }]; },
  });
  return { reader, reads: () => reads };
}
test('schedule-only reader gets minimal roster without needing personnel permission', async () => {
  const { reader, reads } = fixture();
  assert.deepEqual(await reader({ token: 'valid', projectId: 'p' }), { projectId: 'p', staff: [{ id: 'legacy-id', employeeId: '001', firstName: 'Test', lastName: 'Person', position: 'Staff' }] });
  assert.equal(reads(), 1);
});
test('numeric legacy identifiers are preserved without returning unrelated fields', async () => {
  const result = await fixture({ staff: [{ id: 123, employeeId: 456, email: 'private', bankAccount: 'private' }] }).reader({ token: 'valid', projectId: 'p' });
  assert.deepEqual(result.staff, [{ id: '123', employeeId: '456', firstName: '', lastName: '', position: '' }]);
});
test('duplicate or missing identifiers and oversized roster fail instead of hiding rows', async () => {
  for (const staff of [[{ id: 'a' }, { id: 'a' }], [{}], Array.from({ length: 501 }, (_, i) => ({ id: String(i) }))]) {
    await assert.rejects(fixture({ staff }).reader({ token: 'valid', projectId: 'p' }), e => e.status === 422);
  }
});
test('real admin claim bypasses project permission but never the active-profile check', async () => {
  assert.equal((await fixture({ token: { admin: true }, profile: { department: 'B', permissions: {} } }).reader({ token: 'valid', projectId: 'p' })).staff.length, 1);
  await assert.rejects(fixture({ token: { admin: true }, profile: { status: 'Inactive' } }).reader({ token: 'valid', projectId: 'p' }), e => e.status === 403);
});
for (const [label, overrides] of [
  ['inactive', { profile: { status: 'Inactive' } }],
  ['identity mismatch', { profile: { authUid: 'other' } }],
  ['foreign project', { project: { name: 'B' } }],
  ['no schedule permission', { profile: { permissions: {} } }],
  ['fake admin display name', { profile: { username: 'admin', department: 'B', permissions: {} } }],
]) test(`denies ${label} before querying staff`, async () => {
  const h = fixture(overrides);
  await assert.rejects(h.reader({ token: 'valid', projectId: 'p' }), e => e.status === 403);
  assert.equal(h.reads(), 0);
});
test('rejects missing token and path injection', async () => {
  const h = fixture();
  await assert.rejects(h.reader({ projectId: 'p' }), e => e.status === 401);
  await assert.rejects(h.reader({ token: 'valid', projectId: '../users' }), e => e.status === 400);
});
test('allows assigned additional department but not a comma-string wildcard', async () => {
  const h = fixture({ profile: { department: 'B', accessibleDepts: ['A'] } });
  assert.equal((await h.reader({ token: 'valid', projectId: 'p' })).staff.length, 1);
  await assert.rejects(fixture({ profile: { department: 'B', accessibleDepts: 'All' } }).reader({ token: 'valid', projectId: 'p' }));
});
