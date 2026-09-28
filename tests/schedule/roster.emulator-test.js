import test from 'node:test';
import assert from 'node:assert/strict';
import { usernameToAuthEmail } from '../../src/auth/identity.js';

// Explicit, fixed localhost-only acceptance against the seeded demo project.
test('Restricted HTTP roster works while full personnel profiles remain denied', async () => {
  const auth = await fetch('http://127.0.0.1:9099/identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=demo-key', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: usernameToAuthEmail('qa-restricted'), password: 'LocalOnly-2026!', returnSecureToken: true }),
  });
  assert.equal(auth.status, 200);
  const { idToken } = await auth.json();
  const headers = { Authorization: `Bearer ${idToken}` };
  const response = await fetch('http://127.0.0.1:5175/api/schedule-roster?projectId=qa-project', { headers });
  assert.equal(response.status, 200);
  assert.equal(response.headers.get('cache-control'), 'private, no-store');
  const result = await response.json();
  assert.equal(result.projectId, 'qa-project');
  assert.equal(result.staff.length, 2);
  for (const person of result.staff) assert.deepEqual(Object.keys(person).sort(), ['employeeId', 'firstName', 'id', 'lastName', 'position']);
  const denied = await fetch('http://127.0.0.1:8090/v1/projects/demo-bmg-browser/databases/(default)/documents/users/qa-manager', { headers });
  assert.equal(denied.status, 403);
  const anonymous = await fetch('http://127.0.0.1:5175/api/schedule-roster?projectId=qa-project');
  assert.equal(anonymous.status, 401);
});
