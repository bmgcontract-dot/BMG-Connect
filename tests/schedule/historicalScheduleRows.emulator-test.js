import test from 'node:test';
import assert from 'node:assert/strict';
import { initializeApp, deleteApp } from 'firebase/app';
import { getFirestore, connectFirestoreEmulator, runTransaction, doc, getDoc, setDoc, updateDoc, deleteDoc, terminate } from 'firebase/firestore';
import { initializeApp as initAdmin, deleteApp as deleteAdmin } from 'firebase-admin/app';
import { getFirestore as adminFirestore } from 'firebase-admin/firestore';
import { assertProtectedScheduleRowsUnchanged } from '../../src/schedule/historicalScheduleRoster.js';

test('historical rows survive real transaction saves; unknown row changes/deletion are rejected; roster config has no client access', async () => {
  assert.equal(process.env.FIRESTORE_EMULATOR_HOST, '127.0.0.1:8090');
  const projectId = 'demo-bmg-browser', admin = initAdmin({ projectId }, 'historical-row-fixtures'), db = adminFirestore(admin);
  const root = 'artifacts/bmg-app-prod/public/data', month = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Bangkok', year: 'numeric', month: '2-digit' }).format(new Date());
  const id = `history-qa_${month}`, uid = 'history-qa-admin';
  const ref = db.doc(`${root}/bmg_projectSchedules_docs/${id}`), policy = db.doc(`${root}/bmg_scheduleWritePolicy/current`), oldPolicy = await policy.get();
  const app = initializeApp({ projectId, apiKey: 'fake-local-key' }, uid), firestore = getFirestore(app);
  connectFirestoreEmulator(firestore, '127.0.0.1', 8090, { mockUserToken: { sub: uid, admin: true } });
  const original = { id, projectId: 'history-qa', month, schedules: { [`known_${month}-01`]: 'M3', [`archived_${month}-01`]: 'H', [`unknown_${month}-01`]: 'M2', [`unknown_${month}-02_act`]: 'V' }, note: 'Keep note', staffOrder: ['unknown', 'archived', 'known'], approval: { status: 'Pending HR', isLocked: false } };
  try {
    await db.collection('users').doc(uid).set({ authUid: uid, status: 'Active' });
    await policy.set({ enabled: true, verifiedScopes: [id] }); await ref.set(original);
    await db.doc(`${root}/bmg_scheduleHistoricalRoster/${id}`).set({ protectedCellKeys: [`unknown_${month}-01`, `unknown_${month}-02_act`, `unknown_${month}-03`] });
    const clientRef = doc(firestore, `${root}/bmg_projectSchedules_docs/${id}`);
    const commit = mutate => runTransaction(firestore, async tx => {
      const snapshot = await tx.get(clientRef), before = snapshot.data(), after = structuredClone(before);
      mutate(after); assertProtectedScheduleRowsUnchanged(before, after, ['unknown']); tx.set(clientRef, after);
    });
    await commit(after => { after.schedules[`known_${month}-02`] = 'O'; after.schedules[`archived_${month}-02`] = 'M3'; });
    let persisted = (await ref.get()).data();
    assert.equal(persisted.schedules[`unknown_${month}-01`], 'M2'); assert.equal(persisted.schedules[`unknown_${month}-02_act`], 'V');
    for (const key of ['note', 'staffOrder', 'approval']) assert.deepEqual(persisted[key], original[key]);
    const unchanged = JSON.stringify(persisted);
    await assert.rejects(commit(after => { delete after.schedules[`unknown_${month}-01`]; }), /อ่านอย่างเดียว/);
    await assert.rejects(commit(after => { after.schedules[`unknown_${month}-02_act`] = 'H'; }), /อ่านอย่างเดียว/);
    persisted = (await ref.get()).data(); assert.equal(JSON.stringify(persisted), unchanged);
    await assert.rejects(updateDoc(clientRef, { [`schedules.unknown_${month}-01`]: 'H' }), e => e.code === 'permission-denied');
    await assert.rejects(updateDoc(clientRef, { [`schedules.unknown_${month}-03`]: 'H' }), e => e.code === 'permission-denied');
    await assert.rejects(deleteDoc(clientRef), e => e.code === 'permission-denied');
    const config = doc(firestore, `${root}/bmg_scheduleHistoricalRoster/${id}`);
    await assert.rejects(setDoc(config, { status: 'reviewed' }), e => e.code === 'permission-denied');
    await assert.rejects(getDoc(config), e => e.code === 'permission-denied');
  } finally {
    await db.doc(`${root}/bmg_scheduleHistoricalRoster/${id}`).delete();
    await ref.delete(); await db.collection('users').doc(uid).delete();
    if (oldPolicy.exists) await policy.set(oldPolicy.data()); else await policy.delete();
    await terminate(firestore); await deleteApp(app); await deleteAdmin(admin);
  }
});
