#!/usr/bin/env node

import { createHmac, randomBytes } from 'node:crypto';
import { applicationDefault, cert, getApps, initializeApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { FieldValue, getFirestore } from 'firebase-admin/firestore';
import { buildUserMigrationPlan } from '../src/auth/migrationPlan.js';

const PROJECT_ID = process.env.BMG_FIREBASE_PROJECT_ID || 'bmg-connect-3e99a';
const APP_ID = process.env.BMG_FIRESTORE_APP_ID || 'bmg-app-prod';
const AUTH_DOMAIN = process.env.BMG_INTERNAL_AUTH_DOMAIN || 'auth.bmg-connect.local';
const SHOULD_APPLY = process.argv.includes('--apply');

function credentialFromEnvironment() {
  const serviceAccountJson = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
  if (!serviceAccountJson) return applicationDefault();
  return cert(JSON.parse(serviceAccountJson));
}

function initializeAdmin() {
  if (getApps().length > 0) return getApps()[0];
  return initializeApp({
    credential: credentialFromEnvironment(),
    projectId: PROJECT_ID,
  });
}

async function authUserExists(auth, uid) {
  try {
    await auth.getUser(uid);
    return true;
  } catch (error) {
    if (error?.code === 'auth/user-not-found') return false;
    throw error;
  }
}

async function run() {
  if (SHOULD_APPLY && process.env.BMG_CONFIRM_PROJECT_ID !== PROJECT_ID) {
    throw new Error(`Set BMG_CONFIRM_PROJECT_ID=${PROJECT_ID} before using --apply.`);
  }

  const adminApp = initializeAdmin();
  const db = getFirestore(adminApp);
  const auth = getAuth(adminApp);
  const legacySnapshot = await db
    .collection('artifacts')
    .doc(APP_ID)
    .collection('public')
    .doc('data')
    .collection('bmg_users_docs')
    .get();
  const legacyUsers = legacySnapshot.docs.map(snapshot => snapshot.data());
  const plan = buildUserMigrationPlan(legacyUsers, { authDomain: AUTH_DOMAIN });

  console.log(JSON.stringify({
    mode: SHOULD_APPLY ? 'apply' : 'dry-run',
    projectId: PROJECT_ID,
    sourceCount: plan.sourceCount,
    plannedCount: plan.records.length,
    issueCount: plan.issues.length,
    issues: plan.issues,
  }, null, 2));

  if (!plan.canApply) {
    throw new Error('Migration validation failed. Resolve every reported issue first.');
  }
  if (!SHOULD_APPLY) {
    console.log('Dry-run complete. No Firebase Auth users or Firestore profiles were written.');
    return;
  }

  const pendingRecords = [];
  for (const record of plan.records) {
    if (!(await authUserExists(auth, record.authUid))) pendingRecords.push(record);
  }

  if (pendingRecords.length > 0) {
    const hmacKey = randomBytes(32);
    const importRecords = pendingRecords.map(record => ({
      uid: record.authUid,
      email: record.authEmail,
      emailVerified: true,
      disabled: record.profile.status !== 'Active',
      displayName: `${record.profile.firstName || ''} ${record.profile.lastName || ''}`.trim(),
      customClaims: record.profile.position === 'Super Admin' ? { admin: true } : undefined,
      passwordHash: createHmac('sha256', hmacKey).update(record.password).digest(),
    }));

    const result = await auth.importUsers(importRecords, {
      hash: { algorithm: 'HMAC_SHA256', key: hmacKey },
    });
    if (result.failureCount > 0) {
      const failedIndexes = result.errors.map(item => item.index);
      throw new Error(`Firebase Auth import failed for ${result.failureCount} record(s) at indexes: ${failedIndexes.join(', ')}`);
    }
  }

  for (let offset = 0; offset < plan.records.length; offset += 400) {
    const batch = db.batch();
    const chunk = plan.records.slice(offset, offset + 400);
    for (const record of chunk) {
      batch.set(db.collection('users').doc(record.authUid), {
        ...record.profile,
        migratedAt: FieldValue.serverTimestamp(),
      }, { merge: true });
    }
    await batch.commit();
  }

  for (const record of plan.records) {
    if (record.profile.position !== 'Super Admin') continue;
    const existingUser = await auth.getUser(record.authUid);
    await auth.setCustomUserClaims(record.authUid, {
      ...(existingUser.customClaims || {}),
      admin: true,
    });
  }

  console.log(JSON.stringify({
    importedAuthUsers: pendingRecords.length,
    writtenProfiles: plan.records.length,
  }, null, 2));
  console.log('Legacy password fields were intentionally retained. Remove them only after cutover verification.');
}

run().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
