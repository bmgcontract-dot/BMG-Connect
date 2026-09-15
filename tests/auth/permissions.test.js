import test from 'node:test';
import assert from 'node:assert/strict';

import { hasUserPermission } from '../../src/auth/permissions.js';

test('a restricted project user cannot print when the project-tab permission is false', () => {
  const user = {
    username: 'restricted-user',
    permissions: {
      proj_overview: { view: true, print: false },
    },
  };

  assert.equal(hasUserPermission(user, 'proj_overview', 'print'), false);
});

test('project export is available only when print permission is granted', () => {
  const user = {
    username: 'project-manager',
    permissions: {
      proj_overview: { view: true, print: true },
    },
  };

  assert.equal(hasUserPermission(user, 'proj_overview', 'print'), true);
});

test('admin keeps access to every action', () => {
  assert.equal(hasUserPermission({ username: 'admin' }, 'proj_overview', 'print'), true);
});

test('legacy project-tab profiles keep view access but do not gain print access', () => {
  const user = { username: 'legacy-user', permissions: {} };

  assert.equal(hasUserPermission(user, 'proj_overview', 'view'), true);
  assert.equal(hasUserPermission(user, 'proj_overview', 'print'), false);
});
