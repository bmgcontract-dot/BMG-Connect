import test from 'node:test';
import assert from 'node:assert/strict';

import { resolvePostAuthDestination } from '../../src/auth/postAuthDestination.js';
import { createFirestoreCollectionQueryPlan, filterItemsForQueryPlan } from '../../src/firebase/queryScope.js';

test('stored department whitespace is preserved through scoped project loading and routing', () => {
  const name = 'นิติบุคคลหมู่บ้านจัดสรรแกรนดิโอ เพชรเกษม 81 ';
  const user = { department: name, accessibleDepts: [] };
  const project = { id: 'grandio', name };
  const plan = createFirestoreCollectionQueryPlan({ collectionName: 'bmg_projects', currentUser: user });
  const projects = filterItemsForQueryPlan([project, {id: 'other', name: name.trim()}], plan);
  assert.deepEqual(projects, [project]);
  assert.deepEqual(resolvePostAuthDestination({ user, projects, projectsLoaded: true }),
    { kind: 'assigned-project', project });
});

const restrictedUser = {
  department: 'โครงการทดสอบ',
};

test('an assigned user waits safely while projects are still loading', () => {
  assert.deepEqual(resolvePostAuthDestination({
    user: restrictedUser,
    projects: [],
    projectsLoaded: false,
  }), {
    kind: 'assigned-project-pending',
    department: 'โครงการทดสอบ',
  });
});

test('an assigned user is routed to the matching project after a refresh', () => {
  const project = { id: 'project-1', name: 'โครงการทดสอบ' };

  assert.deepEqual(resolvePostAuthDestination({
    user: restrictedUser,
    projects: [project],
    projectsLoaded: true,
  }), {
    kind: 'assigned-project',
    project,
  });
});

test('an assigned user never falls back to the corporate dashboard when the project is missing', () => {
  assert.deepEqual(resolvePostAuthDestination({
    user: restrictedUser,
    projects: [],
    projectsLoaded: true,
  }), {
    kind: 'assigned-project-unavailable',
    department: 'โครงการทดสอบ',
  });
});

test('head-office users keep access to the global destination', () => {
  assert.deepEqual(resolvePostAuthDestination({
    user: { department: 'Head Office' },
    projects: [],
    projectsLoaded: true,
  }), {
    kind: 'global',
  });
});
