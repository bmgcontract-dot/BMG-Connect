import test from 'node:test';
import assert from 'node:assert/strict';

import {
  createFirestoreCollectionQueryPlan,
  filterItemsForQueryPlan,
} from '../../src/firebase/queryScope.js';

const restrictedUser = {
  username: 'restricted',
  department: 'โครงการ A',
  accessibleDepts: [],
  permissions: {
    proj_staff: { view: false },
  },
};

const managerUser = {
  username: 'manager',
  department: 'โครงการ A',
  accessibleDepts: ['โครงการ B'],
  permissions: {
    proj_staff: { view: true },
  },
};

// A QC/audit user the admin granted the global "audits" module view, but who is
// NOT given accessibleDepts:['All']. They must be able to read the site-wide
// audit score (bmg_audits) and enumerate all units (bmg_projects) read-only.
const siteAuditUser = {
  username: 'qc-audit',
  department: 'Head Office',
  accessibleDepts: ['โครงการ A'],
  permissions: {
    audits: { view: true },
    proj_staff: { view: false },
  },
};

const accessibleProjects = [
  { id: 'project-a', name: 'โครงการ A' },
  { id: 'project-b', name: 'โครงการ B' },
];

test('audits.view grants an unscoped site-wide read of bmg_audits', () => {
  assert.deepEqual(createFirestoreCollectionQueryPlan({
    collectionName: 'bmg_audits',
    currentUser: siteAuditUser,
    accessibleProjects,
  }), { kind: 'unscoped', targets: [[]] });
});

test('audits.view grants an unscoped read of bmg_projects to enumerate all units', () => {
  assert.deepEqual(createFirestoreCollectionQueryPlan({
    collectionName: 'bmg_projects',
    currentUser: siteAuditUser,
    accessibleProjects,
  }), { kind: 'unscoped', targets: [[]] });
});

test('audits.view does NOT widen other project-owned collections', () => {
  // Only audits + projects open up; repairs etc. stay scoped to accessible units.
  assert.deepEqual(createFirestoreCollectionQueryPlan({
    collectionName: 'bmg_repairs',
    currentUser: siteAuditUser,
    accessibleProjects,
  }), {
    kind: 'scoped',
    targets: [[{ field: 'projectId', operator: 'in', value: ['project-a', 'project-b'] }]],
  });
});

test('audits stays scoped for a user without audits.view', () => {
  assert.deepEqual(createFirestoreCollectionQueryPlan({
    collectionName: 'bmg_audits',
    currentUser: managerUser,
    accessibleProjects,
  }), {
    kind: 'scoped',
    targets: [[{ field: 'projectId', operator: 'in', value: ['project-a', 'project-b'] }]],
  });
});

test('an open accessible project still narrows audits to that project even with audits.view', () => {
  // When the user drills into a specific project, show just that project's audits.
  assert.deepEqual(createFirestoreCollectionQueryPlan({
    collectionName: 'bmg_audits',
    currentUser: siteAuditUser,
    selectedProject: accessibleProjects[0],
    accessibleProjects,
  }), {
    kind: 'scoped',
    targets: [[{ field: 'projectId', operator: '==', value: 'project-a' }]],
  });
});

test('restricted employees query only projects named in their business profile', () => {
  assert.deepEqual(createFirestoreCollectionQueryPlan({
    collectionName: 'bmg_projects',
    currentUser: restrictedUser,
  }), {
    kind: 'scoped',
    targets: [[{ field: 'name', operator: '==', value: 'โครงการ A' }]],
  });
});

test('project managers query project-owned collections by accessible project IDs', () => {
  assert.deepEqual(createFirestoreCollectionQueryPlan({
    collectionName: 'bmg_audits',
    currentUser: managerUser,
    accessibleProjects,
  }), {
    kind: 'scoped',
    targets: [[{
      field: 'projectId',
      operator: 'in',
      value: ['project-a', 'project-b'],
    }]],
  });
});

test('an open project narrows project-owned listeners to that project', () => {
  assert.deepEqual(createFirestoreCollectionQueryPlan({
    collectionName: 'bmg_tools',
    currentUser: managerUser,
    selectedProject: accessibleProjects[1],
    accessibleProjects,
  }), {
    kind: 'scoped',
    targets: [[{ field: 'projectId', operator: '==', value: 'project-b' }]],
  });
});

test('project schedule listeners are scoped to accessible project IDs', () => {
  assert.deepEqual(createFirestoreCollectionQueryPlan({
    collectionName: 'bmg_projectSchedules',
    currentUser: managerUser,
    accessibleProjects,
  }), {
    kind: 'scoped',
    targets: [[{
      field: 'projectId',
      operator: 'in',
      value: ['project-a', 'project-b'],
    }]],
  });
});

test('staff directory access is blocked without permission and department-scoped for managers', () => {
  assert.deepEqual(createFirestoreCollectionQueryPlan({
    collectionName: 'users',
    currentUser: restrictedUser,
  }), { kind: 'blocked', targets: [] });

  assert.deepEqual(createFirestoreCollectionQueryPlan({
    collectionName: 'users',
    currentUser: managerUser,
  }), {
    kind: 'scoped',
    targets: [[{
      field: 'department',
      operator: 'in',
      value: ['โครงการ A', 'โครงการ B'],
    }]],
  });
});

test('utility readings are queried only through meters already scoped to accessible projects', () => {
  assert.deepEqual(createFirestoreCollectionQueryPlan({
    collectionName: 'bmg_utilityReadings',
    currentUser: managerUser,
    selectedProject: accessibleProjects[0],
    accessibleProjects,
    meters: [
      { id: 'meter-a', projectId: 'project-a' },
      { id: 'meter-b', projectId: 'project-b' },
    ],
  }), {
    kind: 'scoped',
    targets: [[{ field: 'meterId', operator: '==', value: 'meter-a' }]],
  });
});

test('global announcements include All plus accessible project IDs', () => {
  assert.deepEqual(createFirestoreCollectionQueryPlan({
    collectionName: 'bmg_announcements',
    currentUser: managerUser,
    accessibleProjects,
  }), {
    kind: 'scoped',
    targets: [[{
      field: 'projectId',
      operator: 'in',
      value: ['All', 'project-a', 'project-b'],
    }]],
  });
});

test('query targets are split at the Firestore in-query limit', () => {
  const projects = Array.from({ length: 31 }, (_, index) => ({
    id: `project-${index + 1}`,
    name: `Project ${index + 1}`,
  }));
  const plan = createFirestoreCollectionQueryPlan({
    collectionName: 'bmg_assets',
    currentUser: managerUser,
    accessibleProjects: projects,
  });

  assert.equal(plan.targets.length, 2);
  assert.equal(plan.targets[0][0].value.length, 30);
  assert.deepEqual(plan.targets[1][0], {
    field: 'projectId',
    operator: '==',
    value: 'project-31',
  });
});

test('global collections and administrators can use an unscoped listener', () => {
  assert.deepEqual(createFirestoreCollectionQueryPlan({
    collectionName: 'bmg_forms_list',
    currentUser: managerUser,
  }), { kind: 'unscoped', targets: [[]] });

  assert.deepEqual(createFirestoreCollectionQueryPlan({
    collectionName: 'bmg_projects',
    currentUser: { username: 'admin', accessibleDepts: ['All'] },
  }), { kind: 'unscoped', targets: [[]] });
});

test('cached data is filtered synchronously with the same plan used by Firestore', () => {
  const plan = createFirestoreCollectionQueryPlan({
    collectionName: 'bmg_audits',
    currentUser: managerUser,
    selectedProject: accessibleProjects[0],
    accessibleProjects,
  });

  assert.deepEqual(filterItemsForQueryPlan([
    { id: 'allowed', projectId: 'project-a' },
    { id: 'hidden', projectId: 'project-b' },
  ], plan), [{ id: 'allowed', projectId: 'project-a' }]);
  assert.deepEqual(filterItemsForQueryPlan([{ id: 'cached' }], {
    kind: 'blocked',
    targets: [],
  }), []);
});
