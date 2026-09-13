import { applicationDefault, cert, getApps, initializeApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { FieldValue, getFirestore } from 'firebase-admin/firestore';
import { normalizeUsername, stripUserSecrets, usernameToAuthEmail } from '../src/auth/identity.js';

const PROJECT_ID = process.env.BMG_FIREBASE_PROJECT_ID || 'bmg-connect-3e99a';
const AUTH_DOMAIN = process.env.BMG_INTERNAL_AUTH_DOMAIN || 'auth.bmg-connect.local';

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

async function requireAdmin(request) {
  const token = bearerToken(request);
  if (!token) throw Object.assign(new Error('unauthorized'), { status: 401 });

  const app = adminApp();
  const decoded = await getAuth(app).verifyIdToken(token);
  if (decoded.admin !== true) {
    throw Object.assign(new Error('admin-required'), { status: 403 });
  }
  return decoded;
}

function safeProfile(input, authUid, authEmail) {
  const profile = stripUserSecrets(input || {});
  return {
    ...profile,
    id: profile.id || authUid,
    legacyId: profile.legacyId || profile.id || null,
    authUid,
    authEmail,
    username: normalizeUsername(profile.username),
    schemaVersion: 2,
  };
}

async function ensureUniqueUsername(db, username, ignoredUid) {
  const snapshot = await db.collection('users').where('username', '==', username).limit(2).get();
  const conflict = snapshot.docs.find(item => item.id !== ignoredUid);
  if (conflict) throw Object.assign(new Error('username-already-exists'), { status: 409 });
}

export default async function handler(request, response) {
  if (!['POST', 'PATCH', 'DELETE'].includes(request.method)) {
    response.setHeader('Allow', 'POST, PATCH, DELETE');
    return send(response, 405, { error: 'method-not-allowed' });
  }

  try {
    const caller = await requireAdmin(request);
    const app = adminApp();
    const auth = getAuth(app);
    const db = getFirestore(app);

    if (request.method === 'POST') {
      const { profile: inputProfile, password } = request.body || {};
      const username = normalizeUsername(inputProfile?.username);
      if (!username) return send(response, 400, { error: 'username-required' });
      if (typeof password !== 'string' || password.length < 6) {
        return send(response, 400, { error: 'password-minimum-6' });
      }
      await ensureUniqueUsername(db, username);

      const authEmail = usernameToAuthEmail(username, AUTH_DOMAIN);
      const userRecord = await auth.createUser({
        email: authEmail,
        emailVerified: true,
        password,
        disabled: inputProfile?.status !== 'Active',
        displayName: `${inputProfile?.firstName || ''} ${inputProfile?.lastName || ''}`.trim(),
      });
      const profile = safeProfile(inputProfile, userRecord.uid, authEmail);
      try {
        await db.collection('users').doc(userRecord.uid).set({
          ...profile,
          createdAt: FieldValue.serverTimestamp(),
          updatedAt: FieldValue.serverTimestamp(),
          updatedBy: caller.uid,
        });
      } catch (error) {
        await auth.deleteUser(userRecord.uid).catch(() => {});
        throw error;
      }
      return send(response, 201, { profile });
    }

    const authUid = request.body?.authUid || request.body?.profile?.authUid;
    if (!authUid) return send(response, 400, { error: 'auth-uid-required' });

    if (request.method === 'DELETE') {
      if (authUid === caller.uid) return send(response, 400, { error: 'cannot-delete-current-user' });
      await auth.deleteUser(authUid);
      await db.collection('users').doc(authUid).delete();
      return send(response, 200, { removed: true });
    }

    const { profile: inputProfile, password } = request.body || {};
    const username = normalizeUsername(inputProfile?.username);
    if (!username) return send(response, 400, { error: 'username-required' });
    if (password && password.length < 6) {
      return send(response, 400, { error: 'password-minimum-6' });
    }
    await ensureUniqueUsername(db, username, authUid);
    const authEmail = usernameToAuthEmail(username, AUTH_DOMAIN);
    const update = {
      email: authEmail,
      disabled: inputProfile?.status !== 'Active',
      displayName: `${inputProfile?.firstName || ''} ${inputProfile?.lastName || ''}`.trim(),
    };
    if (password) update.password = password;
    await auth.updateUser(authUid, update);

    const profile = safeProfile(inputProfile, authUid, authEmail);
    await db.collection('users').doc(authUid).set({
      ...profile,
      updatedAt: FieldValue.serverTimestamp(),
      updatedBy: caller.uid,
    }, { merge: true });
    return send(response, 200, { profile });
  } catch (error) {
    console.error('Admin user operation failed:', error?.code || error?.message);
    return send(response, error.status || 500, { error: error.message || 'internal-error' });
  }
}
