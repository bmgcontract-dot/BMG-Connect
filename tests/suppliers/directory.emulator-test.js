import test from 'node:test';
import assert from 'node:assert/strict';
import { initializeApp, deleteApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';
import { supplierDirectoryServer, handleSupplierDirectory } from '../../src/suppliers/directoryServer.js';

test('real Auth + Firestore directory returns foreign-project suppliers while raw contracts remain denied', async () => {
  assert.equal(process.env.FIRESTORE_EMULATOR_HOST, '127.0.0.1:8090');
  assert.equal(process.env.FIREBASE_AUTH_EMULATOR_HOST, '127.0.0.1:9099');
  const app = initializeApp({ projectId: 'demo-bmg-browser' }, 'supplier-acceptance');
  const db = getFirestore(app);
  const auth = getAuth(app);
  const root = db.doc('artifacts/bmg-app-prod/public/data');
  const uid = 'supplier-acceptance-user';
  const contractIds = ['supplier-acceptance-a', 'supplier-acceptance-b'];
  const projectIds = ['supplier-acceptance-project-a', 'supplier-acceptance-project-b'];
  try {
    await auth.createUser({ uid, email: 'supplier-acceptance@example.test', password: 'LocalOnly-2026!' });
    await db.collection('users').doc(uid).set({ authUid: uid, status: 'Active', department: 'A', accessibleDepts: [], permissions: { proj_contractors: { view: true } } });
    for (const [index, name] of ['A', 'B'].entries()) {
      await root.collection('bmg_projects_docs').doc(projectIds[index]).set({ id: projectIds[index], name });
      await root.collection('bmg_contracts_docs').doc(contractIds[index]).set({
        id: contractIds[index], projectId: projectIds[index], vendorName: `Acceptance Supplier ${name}`,
        type: 'Service', contactPerson: 'Local contact', amount: 123456, file: 'private-file',
      });
    }
    const login = await fetch('http://127.0.0.1:9099/identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=demo-key', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'supplier-acceptance@example.test', password: 'LocalOnly-2026!', returnSecureToken: true }),
    });
    assert.equal(login.status, 200);
    const { idToken } = await login.json();
    const result = { headers: {}, setHeader(k, v) { this.headers[k] = v; }, end(body) { this.body = JSON.parse(body); } };
    await handleSupplierDirectory({ method: 'GET', headers: { authorization: `Bearer ${idToken}` } }, result,
      args => supplierDirectoryServer({ emulator: true })(args));
    assert.equal(result.statusCode, 200);
    const matching = result.body.suppliers.filter(s => s.name.startsWith('Acceptance Supplier'));
    assert.deepEqual(matching.map(s => s.name).sort(), ['Acceptance Supplier A', 'Acceptance Supplier B']);
    assert.ok(matching.every(s => !('amount' in s) && !('file' in s) && !('projectId' in s)));
    const raw = await fetch(`http://127.0.0.1:8090/v1/projects/demo-bmg-browser/databases/(default)/documents/artifacts/bmg-app-prod/public/data/bmg_contracts_docs/${contractIds[1]}`, { headers: { Authorization: `Bearer ${idToken}` } });
    assert.equal(raw.status, 403);
    await db.collection('users').doc(uid).update({ 'permissions.proj_contractors.view': false });
    await assert.rejects(supplierDirectoryServer({ emulator: true })({ token: idToken }), e => e.status === 403);
  } finally {
    await Promise.all([
      db.collection('users').doc(uid).delete(),
      ...contractIds.map(id => root.collection('bmg_contracts_docs').doc(id).delete()),
      ...projectIds.map(id => root.collection('bmg_projects_docs').doc(id).delete()),
    ]);
    await auth.deleteUser(uid).catch(() => {});
    await deleteApp(app);
  }
});
