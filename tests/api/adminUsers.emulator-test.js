import test, { after, before } from 'node:test';
import assert from 'node:assert/strict';
import { getApps, initializeApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';

const PROJECT_ID = process.env.BMG_FIREBASE_PROJECT_ID || 'demo-bmg-admin-api';
const ADMIN_UID = 'admin-api-smoke-admin';
const ADMIN_EMAIL = 'admin-api-smoke@example.test';
const ADMIN_PASSWORD = 'LocalOnly-2026!';

let handler;
let adminApp;
let adminToken;
let createdUid;

function createResponse() {
  const result = { status: 200, payload: null, headers: {} };
  return {
    result,
    setHeader(name, value) {
      result.headers[name] = value;
    },
    status(status) {
      result.status = status;
      return this;
    },
    json(payload) {
      result.payload = payload;
      return this;
    },
  };
}

async function callAdminApi(method, body) {
  const response = createResponse();
  await handler({
    method,
    body,
    headers: { authorization: `Bearer ${adminToken}` },
  }, response);
  return response.result;
}

before(async () => {
  assert.ok(process.env.FIREBASE_AUTH_EMULATOR_HOST, 'Auth emulator is required');
  assert.ok(process.env.FIRESTORE_EMULATOR_HOST, 'Firestore emulator is required');

  adminApp = getApps()[0] || initializeApp({ projectId: PROJECT_ID });
  const auth = getAuth(adminApp);
  const database = getFirestore(adminApp);

  await auth.createUser({
    uid: ADMIN_UID,
    email: ADMIN_EMAIL,
    emailVerified: true,
    password: ADMIN_PASSWORD,
  });
  await auth.setCustomUserClaims(ADMIN_UID, { admin: true });
  await database.collection('users').doc(ADMIN_UID).set({
    authUid: ADMIN_UID,
    username: 'admin-api-smoke',
    status: 'Active',
  });

  const signInResponse = await fetch(
    `http://${process.env.FIREBASE_AUTH_EMULATOR_HOST}/identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=fake-api-key`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: ADMIN_EMAIL,
        password: ADMIN_PASSWORD,
        returnSecureToken: true,
      }),
    },
  );
  const signInResult = await signInResponse.json();
  assert.equal(signInResponse.ok, true, JSON.stringify(signInResult));
  adminToken = signInResult.idToken;
  handler = (await import('../../api/admin-users.js')).default;
});

after(async () => {
  const auth = getAuth(adminApp);
  const database = getFirestore(adminApp);
  if (createdUid) await auth.deleteUser(createdUid).catch(() => {});
  await auth.deleteUser(ADMIN_UID).catch(() => {});
  await database.collection('users').doc(ADMIN_UID).delete().catch(() => {});
});

test('admin-user API creates, updates, and removes a Personnel identity against emulators', async () => {
  const created = await callAdminApi('POST', {
    profile: {
      username: 'qa-personnel-smoke',
      firstName: 'QA',
      lastName: 'Personnel',
      status: 'Active',
      department: 'โครงการทดสอบ LOCAL เท่านั้น',
      phone: '0800000000',
    },
    password: 'LocalOnly-User-2026!',
  });

  assert.equal(created.status, 201);
  createdUid = created.payload.profile.authUid;
  assert.ok(createdUid);
  assert.equal(created.payload.profile.username, 'qa-personnel-smoke');

  const createdProfile = await getFirestore(adminApp).collection('users').doc(createdUid).get();
  assert.equal(createdProfile.data().phone, '0800000000');
  assert.equal((await getAuth(adminApp).getUser(createdUid)).disabled, false);

  const updated = await callAdminApi('PATCH', {
    authUid: createdUid,
    profile: {
      ...created.payload.profile,
      phone: '0800000001',
    },
  });
  assert.equal(updated.status, 200);
  assert.equal(updated.payload.profile.phone, '0800000001');
  assert.equal(
    (await getFirestore(adminApp).collection('users').doc(createdUid).get()).data().phone,
    '0800000001',
  );

  const removed = await callAdminApi('DELETE', { authUid: createdUid });
  assert.deepEqual(removed, {
    status: 200,
    payload: { removed: true },
    headers: {},
  });
  await assert.rejects(getAuth(adminApp).getUser(createdUid), /no user record/i);
  assert.equal((await getFirestore(adminApp).collection('users').doc(createdUid).get()).exists, false);
  createdUid = null;
});
