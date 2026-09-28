import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test, { after, before } from 'node:test';
import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
} from '@firebase/rules-unit-testing';
import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  setLogLevel,
} from 'firebase/firestore';

const PROJECT_ID = 'demo-bmg-connect-emergency-auth';
const APP_ID = 'bmg-app-prod';

setLogLevel('silent');

let environment;

function businessDocument(database, appId = APP_ID) {
  return doc(database, 'artifacts', appId, 'public', 'data', 'bmg_projects_docs', 'project-a');
}

function userDocument(database, uid) {
  return doc(database, 'users', uid);
}

before(async () => {
  environment = await initializeTestEnvironment({
    projectId: PROJECT_ID,
    firestore: {
      host: '127.0.0.1',
      port: 8089,
      rules: await readFile('firestore.emergency-auth.rules', 'utf8'),
    },
  });

  await environment.withSecurityRulesDisabled(async (context) => {
    await setDoc(userDocument(context.firestore(), 'active-user'), {
      authUid: 'active-user',
      status: 'Active',
      username: 'employee',
    });
    await setDoc(userDocument(context.firestore(), 'inactive-user'), {
      authUid: 'inactive-user',
      status: 'Inactive',
      username: 'inactive',
    });
    await setDoc(businessDocument(context.firestore()), {
      id: 'project-a',
      name: 'โครงการ A',
    });
    await setDoc(businessDocument(context.firestore(), 'unrelated-app'), {
      id: 'project-a',
      name: 'โครงการ A',
    });
  });
});

after(async () => {
  await environment?.cleanup();
});

test('an anonymous burst cannot read BMG business data', async () => {
  const anonymousDatabase = environment.unauthenticatedContext().firestore();
  const attempts = await Promise.all(Array.from({ length: 25 }, async () => {
    try {
      await getDoc(businessDocument(anonymousDatabase));
      return 'allowed';
    } catch {
      return 'denied';
    }
  }));

  assert.equal(attempts.filter((result) => result === 'allowed').length, 0);
  assert.equal(attempts.filter((result) => result === 'denied').length, 25);
});

test('Firebase anonymous and authenticated users without profiles cannot access business data', async () => {
  const anonymousAuthDatabase = environment.authenticatedContext('anonymous-auth', {
    firebase: { sign_in_provider: 'anonymous' },
  }).firestore();
  const noProfileDatabase = environment.authenticatedContext('no-profile-user').firestore();

  await assertFails(getDoc(businessDocument(anonymousAuthDatabase)));
  await assertFails(getDoc(businessDocument(noProfileDatabase)));
});

test('inactive users can read their own profile for rejection but cannot access business data', async () => {
  const database = environment.authenticatedContext('inactive-user').firestore();

  await assertSucceeds(getDoc(userDocument(database, 'inactive-user')));
  await assertFails(getDoc(businessDocument(database)));
});

test('active BMG users retain legacy reads and writes during the emergency gate', async () => {
  const database = environment.authenticatedContext('active-user').firestore();

  await assertSucceeds(getDoc(userDocument(database, 'active-user')));
  await assertSucceeds(getDocs(collection(database, 'users')));
  await assertSucceeds(getDoc(businessDocument(database)));
  await assertSucceeds(setDoc(
    doc(database, 'artifacts', APP_ID, 'public', 'data', 'app_state', 'legacy-state'),
    { payload: '{}' },
  ));
});

test('the emergency gate denies other app namespaces and direct profile writes', async () => {
  const database = environment.authenticatedContext('active-user').firestore();

  await assertFails(getDoc(businessDocument(database, 'unrelated-app')));
  await assertFails(setDoc(userDocument(database, 'active-user'), {
    authUid: 'active-user',
    status: 'Active',
    username: 'escalated',
  }));
});
