import { createHash } from 'node:crypto';

import { applicationDefault, cert, getApps, initializeApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { FieldValue, getFirestore } from 'firebase-admin/firestore';
import { getStorage } from 'firebase-admin/storage';

import { LEGACY_RECOVERY_ORIGIN } from '../src/recovery/browserLegacyCache.js';
import {
  RECOVERY_COLLECTION,
  createRecoveryUploadPlan,
  hashReadable,
  recoverySnapshotIdFromFinalizeBody,
  validateFinalizeRequest,
  verifyUploadedSnapshot,
} from '../src/recovery/recoveryUpload.js';

const PROJECT_ID = process.env.BMG_FIREBASE_PROJECT_ID || 'bmg-connect-3e99a';
const RECOVERY_BUCKET = process.env.BMG_RECOVERY_BUCKET || '';

function adminApp() {
  if (getApps().length > 0) return getApps()[0];
  const rawServiceAccount = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
  const credential = rawServiceAccount
    ? cert(JSON.parse(rawServiceAccount))
    : applicationDefault();
  return initializeApp({ credential, projectId: PROJECT_ID });
}

function send(response, status, payload) {
  response.status(status).json(payload);
}

function bearerToken(request) {
  const header = request.headers.authorization || '';
  return header.startsWith('Bearer ') ? header.slice(7) : '';
}

async function requireActiveBusinessUser(request, app, db) {
  const token = bearerToken(request);
  if (!token) throw Object.assign(new Error('unauthorized'), { status: 401 });

  const decoded = await getAuth(app).verifyIdToken(token);
  if (decoded.firebase?.sign_in_provider === 'anonymous') {
    throw Object.assign(new Error('business-login-required'), { status: 403 });
  }

  const profile = await db.collection('users').doc(decoded.uid).get();
  const data = profile.data();
  if (!profile.exists || data?.status !== 'Active' || data?.authUid !== decoded.uid) {
    throw Object.assign(new Error('active-business-user-required'), { status: 403 });
  }
  return decoded;
}

function requireRecoveryOrigin(request) {
  if (request.headers.origin !== LEGACY_RECOVERY_ORIGIN) {
    throw Object.assign(new Error('invalid-recovery-origin'), { status: 403 });
  }
}

function recoveryBucket(app) {
  if (!RECOVERY_BUCKET) {
    throw Object.assign(new Error('recovery-bucket-not-configured'), { status: 503 });
  }
  return getStorage(app).bucket(RECOVERY_BUCKET);
}

async function initiate({ request, response, caller, db, bucket }) {
  const plan = createRecoveryUploadPlan({ userId: caller.uid, body: request.body });
  const document = db.collection(RECOVERY_COLLECTION).doc(plan.snapshotId);
  const existing = await document.get();
  const existingData = existing.data();

  if (existing.exists && existingData?.status === 'ready') {
    return send(response, 200, {
      snapshotId: plan.snapshotId,
      receiptCode: plan.receiptCode,
      status: 'ready',
      uploadRequired: false,
    });
  }
  if (existing.exists && existingData?.metadata?.userId !== caller.uid) {
    return send(response, 403, { error: 'recovery-snapshot-forbidden' });
  }

  const file = bucket.file(plan.objectPath);
  const [fileExists] = await file.exists();
  if (fileExists) {
    await document.set({
      snapshotId: plan.snapshotId,
      objectPath: plan.objectPath,
      receiptCode: plan.receiptCode,
      metadata: plan.metadata,
      status: 'uploaded',
      createdAt: existingData?.createdAt || FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    }, { merge: true });
    return send(response, 200, {
      snapshotId: plan.snapshotId,
      status: 'uploaded',
      uploadRequired: false,
      finalizeRequired: true,
    });
  }

  const [uploadUrl] = await file.createResumableUpload({
    origin: LEGACY_RECOVERY_ORIGIN,
    private: true,
    preconditionOpts: { ifGenerationMatch: 0 },
    metadata: {
      contentType: 'application/json',
      cacheControl: 'no-store',
      metadata: {
        recoverySnapshotId: plan.snapshotId,
        recoverySha256: plan.metadata.sha256,
        recoveryUserId: caller.uid,
      },
    },
  });

  await document.set({
    snapshotId: plan.snapshotId,
    objectPath: plan.objectPath,
    receiptCode: plan.receiptCode,
    metadata: plan.metadata,
    status: 'uploading',
    createdAt: existingData?.createdAt || FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
  }, { merge: true });

  return send(response, 201, {
    snapshotId: plan.snapshotId,
    uploadUrl,
    uploadRequired: true,
    requiredHeaders: {
      'Content-Type': 'application/json',
      'Content-Range': `bytes 0-${plan.metadata.contentLength - 1}/${plan.metadata.contentLength}`,
    },
  });
}

async function finalize({ request, response, caller, db, bucket }) {
  const requestedId = recoverySnapshotIdFromFinalizeBody(request.body);
  const document = db.collection(RECOVERY_COLLECTION).doc(requestedId);
  const storedSnapshot = await document.get();
  const stored = storedSnapshot.exists ? storedSnapshot.data() : null;
  validateFinalizeRequest({ userId: caller.uid, body: request.body, stored });

  if (stored.status === 'ready') {
    return send(response, 200, {
      snapshotId: stored.snapshotId,
      receiptCode: stored.receiptCode,
      status: 'ready',
    });
  }

  const file = bucket.file(stored.objectPath);
  const [exists] = await file.exists();
  if (!exists) return send(response, 409, { error: 'recovery-upload-incomplete' });

  const actual = await hashReadable(file.createReadStream(), createHash);
  const verified = verifyUploadedSnapshot({ expected: stored.metadata, actual });
  await document.update({
    status: 'ready',
    verified: {
      sha256: verified.sha256,
      contentLength: verified.contentLength,
      verifiedAt: FieldValue.serverTimestamp(),
    },
    updatedAt: FieldValue.serverTimestamp(),
  });

  return send(response, 200, {
    snapshotId: stored.snapshotId,
    receiptCode: verified.receiptCode,
    status: 'ready',
  });
}

export default async function handler(request, response) {
  if (request.method !== 'POST') {
    response.setHeader('Allow', 'POST');
    return send(response, 405, { error: 'method-not-allowed' });
  }

  try {
    requireRecoveryOrigin(request);
    const app = adminApp();
    const db = getFirestore(app);
    const caller = await requireActiveBusinessUser(request, app, db);
    const bucket = recoveryBucket(app);

    if (request.body?.action === 'initiate') {
      return await initiate({ request, response, caller, db, bucket });
    }
    if (request.body?.action === 'finalize') {
      return await finalize({ request, response, caller, db, bucket });
    }
    return send(response, 400, { error: 'invalid-recovery-action' });
  } catch (error) {
    console.error('Recovery snapshot operation failed:', error?.code || error?.message);
    return send(response, error.status || 500, { error: error.message || 'internal-error' });
  }
}
