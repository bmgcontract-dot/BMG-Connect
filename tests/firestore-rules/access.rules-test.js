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
    await setDoc(domainDocument(context.firestore(), 'bmg_contractors', 'contractor-1'), {
      id: 'contractor-1',
      name: 'ผู้รับเหมาส่วนกลาง',
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
