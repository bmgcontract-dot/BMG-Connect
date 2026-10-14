import { applicationDefault, cert, getApps, initializeApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';
import { createSupplierDirectoryReader } from './directoryReader.js';

export function supplierDirectoryServer({ emulator = false } = {}) {
  if (emulator && (process.env.FIRESTORE_EMULATOR_HOST !== '127.0.0.1:8090' || process.env.FIREBASE_AUTH_EMULATOR_HOST !== '127.0.0.1:9099')) throw new Error('Local emulator hosts required');
  if (!emulator && (process.env.FIRESTORE_EMULATOR_HOST || process.env.FIREBASE_AUTH_EMULATOR_HOST)) throw new Error('Unexpected emulator configuration');
  const name = emulator ? 'supplier-directory-emulator' : 'supplier-directory';
  const app = getApps().find(app => app.name === name) || initializeApp(emulator
    ? { projectId: 'demo-bmg-browser' }
    : { projectId: process.env.BMG_FIREBASE_PROJECT_ID || 'bmg-connect-3e99a', credential: process.env.FIREBASE_SERVICE_ACCOUNT_JSON ? cert(JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_JSON)) : applicationDefault() }, name);
  const db = getFirestore(app);
  return createSupplierDirectoryReader({
    verifyToken: token => getAuth(app).verifyIdToken(token, true),
    getProfile: async uid => (await db.collection('users').doc(uid).get()).data(),
    getContracts: async () => (await db.collection('artifacts/bmg-app-prod/public/data/bmg_contracts_docs')
      .select('vendorName', 'type', 'category', 'contactPerson', 'contactPhone').get()).docs
      .map(doc => ({ ...doc.data(), id: doc.id })),
  });
}

export async function handleSupplierDirectory(request, response, reader) {
  response.setHeader('Cache-Control', 'private, no-store');
  response.setHeader('Content-Type', 'application/json');
  if (request.method !== 'GET') {
    response.setHeader('Allow', 'GET');
    response.statusCode = 405;
    return response.end(JSON.stringify({ error: 'method-not-allowed' }));
  }
  try {
    const token = /^Bearer (.+)$/.exec(request.headers.authorization || '')?.[1];
    if (!token) {
      response.statusCode = 401;
      return response.end(JSON.stringify({ error: 'unauthorized' }));
    }
    const result = await reader({ token });
    response.statusCode = 200;
    response.end(JSON.stringify(result));
  } catch (error) {
    response.statusCode = error.status || 500;
    response.end(JSON.stringify({ error: error.status ? error.message : 'supplier-directory-unavailable' }));
  }
}
