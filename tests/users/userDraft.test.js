import test from 'node:test';
import assert from 'node:assert/strict';

import { createNewUserDraft } from '../../src/users/userDraft.js';

test('a new user draft is active before it reaches the Admin API', () => {
  const permissions = {
    dashboard: { view: true },
  };

  const draft = createNewUserDraft({
    position: 'ช่างประจำอาคาร (Technician)',
    department: 'โครงการทดสอบ',
    permissions,
  });

  assert.equal(draft.status, 'Active');
  assert.equal(draft.position, 'ช่างประจำอาคาร (Technician)');
  assert.equal(draft.department, 'โครงการทดสอบ');
  assert.deepEqual(draft.permissions, permissions);
});
