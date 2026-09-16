import assert from 'node:assert/strict';
// This suite requires the Firestore emulator and is run through npm run test:rules.
import { readFile } from 'node:fs/promises';
import test, { after, before } from 'node:test';
import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
} from '@firebase/rules-unit-testing';
import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  query,
  setLogLevel,
  setDoc,
  updateDoc,
  where,
} from 'firebase/firestore';
import { createFirestoreCollectionQueryPlan } from '../../src/firebase/queryScope.js';

const PROJECT_ID = 'demo-bmg-connect-rules';
const APP_ID = 'bmg-app-prod';

setLogLevel('silent');

let environment;

function projectDocument(database, projectId) {
  return projectDocumentForApp(database, APP_ID, projectId);
}

function projectDocumentForApp(database, appId, projectId) {
  return doc(
    database,
    'artifacts',
    appId,
    'public',
    'data',
    'bmg_projects_docs',
    projectId,
  );
}

function userDocument(database, uid) {
  return doc(database, 'users', uid);
}

function domainCollection(database, collectionName) {
  return collection(
    database,
    'artifacts',
    APP_ID,
    'public',
    'data',
    `${collectionName}_docs`,
  );
}

function domainDocument(database, collectionName, documentId) {
  return doc(domainCollection(database, collectionName), documentId);
}

function queryFromPlan(collectionReference, plan) {
  assert.equal(plan.targets.length, 1, 'fixture expects one Firestore query target');
  return query(
    collectionReference,
    ...plan.targets[0].map((filter) => where(
      filter.field,
      filter.operator,
      filter.value,
    )),
  );
}

before(async () => {
  environment = await initializeTestEnvironment({
    projectId: PROJECT_ID,
    firestore: {
      host: '127.0.0.1',
      port: 8089,
      rules: await readFile('firestore.rules', 'utf8'),
    },
  });

  await environment.withSecurityRulesDisabled(async (context) => {
    await setDoc(projectDocument(context.firestore(), 'project-a'), {
      id: 'project-a',
      name: 'โครงการ A',
      status: 'Active',
    });
    await setDoc(projectDocument(context.firestore(), 'project-b'), {
      id: 'project-b',
      name: 'โครงการ B',
      status: 'Active',
    });
    await setDoc(projectDocument(context.firestore(), 'project-c'), {
      id: 'project-c',
      name: 'โครงการ C',
      status: 'Active',
    });
    await setDoc(projectDocumentForApp(context.firestore(), 'unrelated-app', 'project-a'), {
      id: 'project-a',
      name: 'โครงการ A',
      status: 'Active',
    });
    await setDoc(userDocument(context.firestore(), 'restricted-user'), {
      authUid: 'restricted-user',
      username: 'restricted',
      status: 'Active',
      department: 'โครงการ A',
      accessibleDepts: [],
      permissions: {
        projects: { view: true, save: false, edit: false, delete: false },
        proj_overview: { view: true, save: false, edit: false, delete: false },
      },
    });
    await setDoc(userDocument(context.firestore(), 'manager-user'), {
      authUid: 'manager-user',
      username: 'manager',
      status: 'Active',
      department: 'โครงการ A',
      accessibleDepts: ['โครงการ A', 'โครงการ B'],
      permissions: {
        projects: { view: true, save: false, edit: false, delete: false },
        proj_audit: { view: true, save: true, edit: true, delete: true },
        proj_contractors: { view: true, save: false, edit: false, delete: false },
        proj_staff: { view: true, save: false, edit: false, delete: false },
        proj_utilities: { view: true, save: true, edit: true, delete: true },
        proj_centralfee: { view: true, save: true, edit: true, delete: true },
        proj_schedule: { view: true, save: true, edit: true, delete: true },
        announcements: { view: true, save: false, edit: false, delete: false },
      },
    });
    await setDoc(userDocument(context.firestore(), 'admin-user'), {
      authUid: 'admin-user',
      username: 'admin',
      status: 'Active',
      department: '',
      accessibleDepts: ['All'],
      permissions: {},
    });
    await setDoc(userDocument(context.firestore(), 'inactive-user'), {
      authUid: 'inactive-user',
      username: 'inactive',
      status: 'Inactive',
      department: 'โครงการ A',
      accessibleDepts: [],
      permissions: { projects: { view: true } },
    });
    await setDoc(userDocument(context.firestore(), 'project-b-staff'), {
      authUid: 'project-b-staff',
      username: 'project-b-staff',
      status: 'Active',
      department: 'โครงการ B',
      accessibleDepts: [],
      permissions: {},
    });
    await setDoc(domainDocument(context.firestore(), 'bmg_audits', 'audit-a'), {
      id: 'audit-a',
      projectId: 'project-a',
      score: 92,
    });
    await setDoc(domainDocument(context.firestore(), 'bmg_audits', 'audit-b'), {
      id: 'audit-b',
      projectId: 'project-b',
      score: 88,
    });
    await setDoc(domainDocument(context.firestore(), 'bmg_meters', 'meter-a'), {
      id: 'meter-a',
      projectId: 'project-a',
      name: 'มิเตอร์ A',
    });
    await setDoc(domainDocument(context.firestore(), 'bmg_meters', 'meter-c'), {
      id: 'meter-c',
      projectId: 'project-c',
      name: 'มิเตอร์ C',
    });
    await setDoc(domainDocument(context.firestore(), 'bmg_meters', 'meter-b'), {
      id: 'meter-b',
      projectId: 'project-b',
      name: 'มิเตอร์ B',
    });
    await setDoc(domainDocument(context.firestore(), 'bmg_utilityReadings', 'reading-a'), {
      id: 'reading-a',
      meterId: 'meter-a',
      currentValue: 120,
    });
    await setDoc(domainDocument(context.firestore(), 'bmg_utilityReadings', 'reading-c'), {
      id: 'reading-c',
      meterId: 'meter-c',
      currentValue: 240,
    });
    await setDoc(domainDocument(context.firestore(), 'bmg_utilityReadings', 'reading-b'), {
      id: 'reading-b',
      meterId: 'meter-b',
      currentValue: 180,
    });
    await setDoc(domainDocument(context.firestore(), 'bmg_contractors', 'contractor-1'), {
      id: 'contractor-1',
      name: 'ผู้รับเหมาส่วนกลาง',
    });
    await setDoc(domainDocument(context.firestore(), 'bmg_announcements', 'announcement-all'), {
      id: 'announcement-all',
      projectId: 'All',
      title: 'ประกาศส่วนกลาง',
    });
    await setDoc(domainDocument(context.firestore(), 'bmg_announcements', 'announcement-a'), {
      id: 'announcement-a',
      projectId: 'project-a',
      title: 'ประกาศโครงการ A',
    });
    await setDoc(domainDocument(context.firestore(), 'bmg_announcements', 'announcement-c'), {
      id: 'announcement-c',
      projectId: 'project-c',
      title: 'ประกาศโครงการ C',
    });
    await setDoc(domainDocument(context.firestore(), 'bmg_projectSchedules', 'project-a_2026-09'), {
      id: 'project-a_2026-09',
      projectId: 'project-a',
      month: '2026-09',
      schemaVersion: 1,
      schedules: {},
    });
    await setDoc(domainDocument(context.firestore(), 'bmg_projectSchedules', 'project-c_2026-09'), {
      id: 'project-c_2026-09',
      projectId: 'project-c',
      month: '2026-09',
      schemaVersion: 1,
      schedules: {},
    });
    await setDoc(doc(
      context.firestore(),
      'artifacts', APP_ID, 'public', 'data', 'house_statuses_project-a', 'house-1',
    ), {
      houseNo: '1/1',
      projectId: 'project-a',
      status: 'ติดตาม',
    });
    await setDoc(doc(
      context.firestore(),
      'artifacts', APP_ID, 'public', 'data', 'house_statuses_project-c', 'house-2',
    ), {
      houseNo: '2/1',
      projectId: 'project-c',
      status: 'ติดตาม',
    });
    await setDoc(doc(
      context.firestore(),
      'artifacts', APP_ID, 'public', 'data', 'app_state', 'central_fee_raw_project-a',
    ), {
      projectId: 'project-a',
      menuId: 'proj_centralfee',
      totalChunks: 1,
    });
    await setDoc(doc(
      context.firestore(),
      'artifacts', APP_ID, 'public', 'data', 'app_state_chunks', 'central_fee_raw_project-a_0',
    ), {
      projectId: 'project-a',
      menuId: 'proj_centralfee',
      chunk: '{}',
    });
  });
});

after(async () => {
  await environment?.cleanup();
});

test('anonymous clients cannot read BMG project data', async () => {
  const anonymousDatabase = environment.unauthenticatedContext().firestore();

  await assertFails(getDoc(projectDocument(anonymousDatabase, 'project-a')));
  assert.ok(true);
});

test('authenticated clients without an active BMG profile cannot read project data', async () => {
  const unprofiledDatabase = environment.authenticatedContext('unprofiled-user').firestore();

  await assertFails(getDoc(projectDocument(unprofiledDatabase, 'project-a')));
});

test('inactive users can load their own profile for rejection but cannot read business data', async () => {
  const inactiveDatabase = environment.authenticatedContext('inactive-user').firestore();

  await assertSucceeds(getDoc(userDocument(inactiveDatabase, 'inactive-user')));
  await assertFails(getDoc(projectDocument(inactiveDatabase, 'project-a')));
});

test('restricted employees can read their own profile and assigned project only', async () => {
  const restrictedDatabase = environment.authenticatedContext('restricted-user').firestore();

  await assertSucceeds(getDoc(userDocument(restrictedDatabase, 'restricted-user')));
  await assertSucceeds(getDoc(projectDocument(restrictedDatabase, 'project-a')));
  await assertFails(getDoc(projectDocument(restrictedDatabase, 'project-b')));
});

test('business users cannot cross into another artifact application namespace', async () => {
  const restrictedDatabase = environment.authenticatedContext('restricted-user').firestore();

  await assertFails(getDoc(projectDocumentForApp(
    restrictedDatabase,
    'unrelated-app',
    'project-a',
  )));
});

test('restricted employees cannot grant themselves stronger permissions', async () => {
  const restrictedDatabase = environment.authenticatedContext('restricted-user').firestore();

  await assertFails(updateDoc(userDocument(restrictedDatabase, 'restricted-user'), {
    'permissions.users.view': true,
  }));
});

test('restricted employees can query assigned project records but cannot read across projects', async () => {
  const restrictedDatabase = environment.authenticatedContext('restricted-user').firestore();
  const audits = domainCollection(restrictedDatabase, 'bmg_audits');

  await assertSucceeds(getDocs(query(audits, where('projectId', '==', 'project-a'))));
  await assertFails(getDoc(domainDocument(restrictedDatabase, 'bmg_audits', 'audit-b')));
  await assertFails(getDocs(audits));
});

test('restricted employees cannot create, update, or delete project records', async () => {
  const restrictedDatabase = environment.authenticatedContext('restricted-user').firestore();

  await assertFails(setDoc(domainDocument(restrictedDatabase, 'bmg_audits', 'new-audit'), {
    id: 'new-audit',
    projectId: 'project-a',
  }));
  await assertFails(updateDoc(domainDocument(restrictedDatabase, 'bmg_audits', 'audit-a'), {
    score: 100,
  }));
  await assertFails(deleteDoc(domainDocument(restrictedDatabase, 'bmg_audits', 'audit-a')));
});

test('project managers can mutate permitted records only inside accessible projects', async () => {
  const managerDatabase = environment.authenticatedContext('manager-user').firestore();

  await assertSucceeds(setDoc(domainDocument(managerDatabase, 'bmg_audits', 'manager-audit'), {
    id: 'manager-audit',
    projectId: 'project-b',
  }));
  await assertSucceeds(updateDoc(domainDocument(managerDatabase, 'bmg_audits', 'manager-audit'), {
    score: 95,
  }));
  await assertFails(updateDoc(domainDocument(managerDatabase, 'bmg_audits', 'manager-audit'), {
    projectId: 'project-c',
  }));
  await assertFails(setDoc(domainDocument(managerDatabase, 'bmg_audits', 'foreign-audit'), {
    id: 'foreign-audit',
    projectId: 'project-c',
  }));
  await assertSucceeds(deleteDoc(domainDocument(managerDatabase, 'bmg_audits', 'manager-audit')));
});

test('admin claims can access every project while direct profile writes stay server-only', async () => {
  const adminDatabase = environment.authenticatedContext('admin-user', { admin: true }).firestore();

  await assertSucceeds(getDoc(projectDocument(adminDatabase, 'project-c')));
  await assertSucceeds(getDoc(domainDocument(adminDatabase, 'bmg_audits', 'audit-b')));
  await assertFails(updateDoc(userDocument(adminDatabase, 'manager-user'), { status: 'Inactive' }));
});

test('utility reading access inherits project scope from its meter', async () => {
  const restrictedDatabase = environment.authenticatedContext('restricted-user').firestore();
  const managerDatabase = environment.authenticatedContext('manager-user').firestore();

  await assertFails(getDoc(domainDocument(restrictedDatabase, 'bmg_utilityReadings', 'reading-a')));
  await assertSucceeds(getDoc(domainDocument(managerDatabase, 'bmg_utilityReadings', 'reading-a')));
  await assertFails(getDoc(domainDocument(managerDatabase, 'bmg_utilityReadings', 'reading-c')));
  await assertSucceeds(updateDoc(domainDocument(managerDatabase, 'bmg_utilityReadings', 'reading-a'), {
    currentValue: 121,
  }));
});

test('global contractor data requires its explicit menu permission', async () => {
  const restrictedDatabase = environment.authenticatedContext('restricted-user').firestore();
  const managerDatabase = environment.authenticatedContext('manager-user').firestore();

  await assertFails(getDoc(domainDocument(restrictedDatabase, 'bmg_contractors', 'contractor-1')));
  await assertSucceeds(getDoc(domainDocument(managerDatabase, 'bmg_contractors', 'contractor-1')));
});

test('staff directory queries must be constrained to an accessible department', async () => {
  const managerDatabase = environment.authenticatedContext('manager-user').firestore();
  const users = collection(managerDatabase, 'users');

  await assertSucceeds(getDocs(query(users, where('department', '==', 'โครงการ A'))));
  await assertFails(getDocs(users));
});

test('application query plans are accepted for restricted, manager, and admin roles', async () => {
  const restrictedDatabase = environment.authenticatedContext('restricted-user').firestore();
  const restrictedProjectsPlan = createFirestoreCollectionQueryPlan({
    collectionName: 'bmg_projects',
    currentUser: {
      username: 'restricted',
      department: 'โครงการ A',
      accessibleDepts: [],
    },
  });
  const restrictedProjects = await assertSucceeds(getDocs(queryFromPlan(
    domainCollection(restrictedDatabase, 'bmg_projects'),
    restrictedProjectsPlan,
  )));
  assert.equal(restrictedProjects.size, 1);

  const managerDatabase = environment.authenticatedContext('manager-user').firestore();
  const managerAuditsPlan = createFirestoreCollectionQueryPlan({
    collectionName: 'bmg_audits',
    currentUser: {
      username: 'manager',
      department: 'โครงการ A',
      accessibleDepts: ['โครงการ B'],
    },
    accessibleProjects: [
      { id: 'project-a', name: 'โครงการ A' },
      { id: 'project-b', name: 'โครงการ B' },
    ],
  });
  const managerAudits = await assertSucceeds(getDocs(queryFromPlan(
    domainCollection(managerDatabase, 'bmg_audits'),
    managerAuditsPlan,
  )));
  assert.equal(managerAudits.size, 2);

  const managerSchedulePlan = createFirestoreCollectionQueryPlan({
    collectionName: 'bmg_projectSchedules',
    currentUser: {
      username: 'manager',
      department: 'โครงการ A',
      accessibleDepts: ['โครงการ B'],
    },
    accessibleProjects: [
      { id: 'project-a', name: 'โครงการ A' },
      { id: 'project-b', name: 'โครงการ B' },
    ],
  });
  const managerSchedules = await assertSucceeds(getDocs(queryFromPlan(
    domainCollection(managerDatabase, 'bmg_projectSchedules'),
    managerSchedulePlan,
  )));
  assert.equal(managerSchedules.size, 1);

  const managerUsersPlan = createFirestoreCollectionQueryPlan({
    collectionName: 'users',
    currentUser: {
      username: 'manager',
      department: 'โครงการ A',
      accessibleDepts: ['โครงการ B'],
      permissions: { proj_staff: { view: true } },
    },
  });
  const managerUsers = await assertSucceeds(getDocs(queryFromPlan(
    collection(managerDatabase, 'users'),
    managerUsersPlan,
  )));
  assert.equal(managerUsers.size, 4);

  const adminDatabase = environment.authenticatedContext('admin-user', { admin: true }).firestore();
  const adminProjectsPlan = createFirestoreCollectionQueryPlan({
    collectionName: 'bmg_projects',
    currentUser: { username: 'admin', accessibleDepts: ['All'] },
  });
  const adminProjects = await assertSucceeds(getDocs(
    adminProjectsPlan.kind === 'unscoped'
      ? domainCollection(adminDatabase, 'bmg_projects')
      : queryFromPlan(domainCollection(adminDatabase, 'bmg_projects'), adminProjectsPlan),
  ));
  assert.equal(adminProjects.size, 3);
});

test('application utility-reading query supports multiple accessible meter IDs', async () => {
  const managerDatabase = environment.authenticatedContext('manager-user').firestore();
  const plan = createFirestoreCollectionQueryPlan({
    collectionName: 'bmg_utilityReadings',
    currentUser: {
      username: 'manager',
      department: 'โครงการ A',
      accessibleDepts: ['โครงการ B'],
    },
    accessibleProjects: [
      { id: 'project-a', name: 'โครงการ A' },
      { id: 'project-b', name: 'โครงการ B' },
    ],
    meters: [
      { id: 'meter-a', projectId: 'project-a' },
      { id: 'meter-b', projectId: 'project-b' },
      { id: 'meter-c', projectId: 'project-c' },
    ],
  });

  const readings = await assertSucceeds(getDocs(queryFromPlan(
    domainCollection(managerDatabase, 'bmg_utilityReadings'),
    plan,
  )));
  assert.equal(readings.size, 2);
});

test('global announcements plus accessible project announcements use one rules-safe query', async () => {
  const managerDatabase = environment.authenticatedContext('manager-user').firestore();
  const plan = createFirestoreCollectionQueryPlan({
    collectionName: 'bmg_announcements',
    currentUser: {
      username: 'manager',
      department: 'โครงการ A',
      accessibleDepts: ['โครงการ B'],
    },
    accessibleProjects: [
      { id: 'project-a', name: 'โครงการ A' },
      { id: 'project-b', name: 'โครงการ B' },
    ],
  });

  const announcements = await assertSucceeds(getDocs(queryFromPlan(
    domainCollection(managerDatabase, 'bmg_announcements'),
    plan,
  )));
  assert.equal(announcements.size, 2);
});

test('central-fee documents require project scope and explicit menu permission', async () => {
  const restrictedDatabase = environment.authenticatedContext('restricted-user').firestore();
  const managerDatabase = environment.authenticatedContext('manager-user').firestore();
  const managerStatuses = collection(
    managerDatabase,
    'artifacts', APP_ID, 'public', 'data', 'house_statuses_project-a',
  );

  await assertFails(getDocs(query(
    collection(
      restrictedDatabase,
      'artifacts', APP_ID, 'public', 'data', 'house_statuses_project-a',
    ),
    where('projectId', '==', 'project-a'),
  )));
  const statuses = await assertSucceeds(getDocs(query(
    managerStatuses,
    where('projectId', '==', 'project-a'),
  )));
  assert.equal(statuses.size, 1);
  await assertFails(getDoc(doc(
    managerDatabase,
    'artifacts', APP_ID, 'public', 'data', 'house_statuses_project-c', 'house-2',
  )));

  await assertSucceeds(getDoc(doc(
    managerDatabase,
    'artifacts', APP_ID, 'public', 'data', 'app_state', 'central_fee_raw_project-a',
  )));
  await assertSucceeds(getDoc(doc(
    managerDatabase,
    'artifacts', APP_ID, 'public', 'data', 'app_state_chunks', 'central_fee_raw_project-a_0',
  )));
  await assertFails(getDoc(doc(
    restrictedDatabase,
    'artifacts', APP_ID, 'public', 'data', 'app_state', 'central_fee_raw_project-a',
  )));
});

test('project schedule documents require schedule permission and an accessible project', async () => {
  const managerDatabase = environment.authenticatedContext('manager-user').firestore();
  const restrictedDatabase = environment.authenticatedContext('restricted-user').firestore();

  await assertSucceeds(getDoc(domainDocument(
    managerDatabase,
    'bmg_projectSchedules',
    'project-a_2026-09',
  )));
  await assertFails(getDoc(domainDocument(
    managerDatabase,
    'bmg_projectSchedules',
    'project-c_2026-09',
  )));
  await assertFails(getDoc(domainDocument(
    restrictedDatabase,
    'bmg_projectSchedules',
    'project-a_2026-09',
  )));

  await assertSucceeds(setDoc(domainDocument(
    managerDatabase,
    'bmg_projectSchedules',
    'project-b_2026-09',
  ), {
    id: 'project-b_2026-09',
    projectId: 'project-b',
    month: '2026-09',
    schemaVersion: 1,
    schedules: {},
  }));
  await assertFails(setDoc(domainDocument(
    managerDatabase,
    'bmg_projectSchedules',
    'project-c_2026-10',
  ), {
    id: 'project-c_2026-10',
    projectId: 'project-c',
    month: '2026-10',
    schemaVersion: 1,
    schedules: {},
  }));
});
