import { initializeApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';
import { usernameToAuthEmail } from '../src/auth/identity.js';

// Never use ADC or a configurable project here. Refuse all non-local emulator hosts.
if (process.env.FIRESTORE_EMULATOR_HOST !== '127.0.0.1:8090'
    || process.env.FIREBASE_AUTH_EMULATOR_HOST !== '127.0.0.1:9099') {
  throw new Error('Set both exact localhost emulator hosts before seeding. No cloud fallback.');
}
initializeApp({ projectId: 'demo-bmg-browser' });
const auth = getAuth(); const db = getFirestore();
const root = db.collection('artifacts').doc('bmg-app-prod').collection('public').doc('data');
const name = 'โครงการทดสอบ LOCAL เท่านั้น';
const project = { id: 'qa-project', name, code: 'QA-LOCAL', type: 'Village', status: 'Active', address: 'ข้อมูลจำลอง', startDate: '2026-01-01', endDate: '2027-12-31' };
await root.collection('bmg_projects_docs').doc(project.id).set(project);
const full = { view: true, save: true, edit: true, delete: false, print: true };
for (const [uid, username, position, permissions] of [
  ['qa-admin', 'admin', 'Super Admin', {}],
  ['qa-manager', 'qa-manager', 'ผู้จัดการหมู่บ้าน', { projects: full, proj_overview: full, proj_staff: full, proj_schedule: full }],
  ['qa-restricted', 'qa-restricted', 'พนักงานทดสอบ', { projects: { view: true }, proj_overview: { view: true }, proj_schedule: { view: true, save: false, edit: false } }],
]) {
  const account = { email: usernameToAuthEmail(username), password: 'LocalOnly-2026!', disabled: false };
  try { await auth.getUser(uid); await auth.updateUser(uid, account); }
  catch (error) { if (error.code !== 'auth/user-not-found') throw error; await auth.createUser({ uid, ...account }); }
  await auth.setCustomUserClaims(uid, uid === 'qa-admin' ? { admin: true } : {});
  await db.collection('users').doc(uid).set({ id: uid, authUid: uid, username, firstName: username,
    lastName: 'ข้อมูลจำลอง', position, status: 'Active', department: uid === 'qa-admin' ? 'Head Office' : name,
    accessibleDepts: uid === 'qa-admin' ? ['All'] : [name], permissions });
}
const legacy = {};
for (const month of ['2026-08', '2026-09']) {
  for (const uid of ['qa-manager', 'qa-restricted']) {
    legacy[`${uid}_${month}-01`] = 'M3';
    legacy[`${uid}_${month}-02`] = 'O';
  }
  await root.collection('bmg_projectSchedules_docs').doc(`qa-project_${month}`).set({
    id: `qa-project_${month}`, projectId: 'qa-project', month, schemaVersion: 1,
    schedules: {}, note: '', approval: {}, staffOrder: ['qa-manager', 'qa-restricted'],
  });
}
await root.collection('app_state').doc('bmg_schedules_v2').set({ payload: JSON.stringify(legacy), timestamp: 1 });
console.log('Seeded isolated demo-bmg-browser only. Accounts: admin / qa-manager / qa-restricted. Local-only password: LocalOnly-2026!');
