import { applicationDefault, cert, getApps, initializeApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';
import { createScheduleRosterReader } from './rosterReader.js';

export function scheduleRosterServer({ emulator = false } = {}) {
  if (emulator && (process.env.FIRESTORE_EMULATOR_HOST !== '127.0.0.1:8090' || process.env.FIREBASE_AUTH_EMULATOR_HOST !== '127.0.0.1:9099')) throw new Error('Local emulator hosts required');
  if (!emulator && (process.env.FIRESTORE_EMULATOR_HOST || process.env.FIREBASE_AUTH_EMULATOR_HOST)) throw new Error('Unexpected emulator configuration');
  const name = emulator ? 'schedule-roster-emulator' : 'schedule-roster';
  const app = getApps().find(app => app.name === name) || initializeApp(emulator
    ? { projectId: 'demo-bmg-browser' }
    : { projectId: process.env.BMG_FIREBASE_PROJECT_ID || 'bmg-connect-3e99a', credential: process.env.FIREBASE_SERVICE_ACCOUNT_JSON ? cert(JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_JSON)) : applicationDefault() }, name);
  const db = getFirestore(app);
  return createScheduleRosterReader({
    verifyToken: token => getAuth(app).verifyIdToken(token, true),
    getProfile: async uid => (await db.collection('users').doc(uid).get()).data(),
    getProject: async id => (await db.doc(`artifacts/bmg-app-prod/public/data/bmg_projects_docs/${id}`).get()).data(),
    getStaff: async department => (await db.collection('users').where('department', '==', department)
      .select('id', 'employeeId', 'firstName', 'lastName', 'position').limit(501).get()).docs
      .map(doc => ({ ...doc.data(), id: doc.data().id || doc.id })),
  });
}

export async function handleScheduleRoster(request, response, reader) {
  response.setHeader('Cache-Control', 'private, no-store');
  response.setHeader('Content-Type', 'application/json');
  if (request.method !== 'GET') {
    response.setHeader('Allow', 'GET'); response.statusCode = 405;
    return response.end(JSON.stringify({ error: 'method-not-allowed' }));
  }
  try {
    const token = /^Bearer (.+)$/.exec(request.headers.authorization || '')?.[1];
    const projectId = new URL(request.url, 'http://localhost').searchParams.get('projectId');
    const result = await reader({ token, projectId });
    response.statusCode = 200; response.end(JSON.stringify(result));
  } catch (error) {
    response.statusCode = error.status || 500;
    response.end(JSON.stringify({ error: error.status ? error.message : 'roster-unavailable' }));
  }
}
