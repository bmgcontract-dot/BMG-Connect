import test, { before, after } from 'node:test';
import { readFile } from 'node:fs/promises';
import { initializeTestEnvironment, assertFails, assertSucceeds } from '@firebase/rules-unit-testing';
import { doc, setDoc, getDoc, updateDoc, deleteDoc, setLogLevel } from 'firebase/firestore';
import { clock } from '../../src/platform/clock.js';

let environment;
const month = clock.thisMonth();
const parts = month.split('-').map(Number);
const adjacent = offset => {
  const date = new Date(Date.UTC(parts[0], parts[1] - 1 + offset, 1));
  return date.toISOString().slice(0, 7);
};
const path = (database, collection, id) => doc(database, 'artifacts', 'bmg-app-prod', 'public', 'data', collection, id);
const policy = database => path(database, 'bmg_scheduleWritePolicy', 'current');
const record = (projectId = 'p', selectedMonth = month) => ({
  id: `${projectId}_${selectedMonth}`, projectId, month: selectedMonth,
  schemaVersion: 1, schedules: { [`u_${selectedMonth}-01`]: 'O' },
});
const clients = () => ['manager', 'admin'].map(uid => environment.authenticatedContext(uid, uid === 'admin' ? { admin: true } : {}).firestore());
async function setPolicy(value) {
  await environment.withSecurityRulesDisabled(context => value === null
    ? deleteDoc(policy(context.firestore())) : setDoc(policy(context.firestore()), value));
}
setLogLevel('silent');
before(async () => {
  environment = await initializeTestEnvironment({ projectId: 'demo-bmg-schedule-policy',
    firestore: { host: '127.0.0.1', port: 8089, rules: await readFile('firestore.rules', 'utf8') } });
  await environment.withSecurityRulesDisabled(async context => {
    const database = context.firestore();
    for (const projectId of ['p', 'other']) await setDoc(path(database, 'bmg_projects_docs', projectId), { name: projectId });
    for (const uid of ['manager', 'admin', 'readonly']) await setDoc(doc(database, 'users', uid), {
      authUid: uid, status: 'Active', department: 'p', accessibleDepts: ['All'],
      permissions: { proj_schedule: { view: true, save: uid !== 'readonly', edit: uid !== 'readonly', delete: uid !== 'readonly' } },
    });
    for (const selectedMonth of [adjacent(-1), month, adjacent(1)]) {
      const value = record('p', selectedMonth);
      await setDoc(path(database, 'bmg_projectSchedules_docs', value.id), value);
    }
  });
});
after(async () => environment?.cleanup());

test('missing, disabled and malformed policy denies SDK writes even for admin', async () => {
  for (const value of [null, {}, { enabled: false, verifiedScopes: [`p_${month}`] },
    { enabled: true }, { enabled: true, verifiedScopes: 'not-a-list' }]) {
    await setPolicy(value);
    for (const database of clients()) {
      const target = path(database, 'bmg_projectSchedules_docs', `p_${month}`);
      await assertSucceeds(getDoc(target));
      await assertFails(updateDoc(target, { note: 'must not write' }));
      await assertFails(deleteDoc(target));
    }
  }
});

test('server time blocks past/future scopes even if mistakenly allowlisted', async () => {
  await setPolicy({ enabled: true, verifiedScopes: [adjacent(-1), month, adjacent(1)].map(value => `p_${value}`) });
  for (const database of clients()) {
    for (const selectedMonth of [adjacent(-1), adjacent(1)]) {
      const target = path(database, 'bmg_projectSchedules_docs', `p_${selectedMonth}`);
      await assertSucceeds(getDoc(target));
      await assertFails(setDoc(target, record('p', selectedMonth)));
      await assertFails(updateDoc(target, { approval: { status: 'Approved' } }));
      await assertFails(deleteDoc(target));
    }
  }
});

test('verified current month allows writes while unverified projects and identity changes fail', async () => {
  await setPolicy({ enabled: true, verifiedScopes: [`p_${month}`] });
  for (const database of clients()) {
    const value = record();
    const target = path(database, 'bmg_projectSchedules_docs', value.id);
    await assertSucceeds(setDoc(target, value));
    await assertSucceeds(updateDoc(target, { note: 'allowed', staffOrder: ['u'] }));
    await assertFails(updateDoc(target, { projectId: 'other' }));
    await assertFails(updateDoc(target, { month: adjacent(-1) }));
    await assertFails(updateDoc(target, { id: 'forged' }));
    await assertFails(setDoc(path(database, 'bmg_projectSchedules_docs', `other_${month}`), record('other')));
    await assertFails(setDoc(path(database, 'bmg_projectSchedules_docs', 'invalid-id'), value));
  }
  const readonly = environment.authenticatedContext('readonly').firestore();
  await assertFails(updateDoc(path(readonly, 'bmg_projectSchedules_docs', `p_${month}`), { note: 'denied' }));
});

test('no browser client including admin can enable or remove the server policy', async () => {
  for (const database of clients()) {
    await assertFails(setDoc(policy(database), { enabled: true, verifiedScopes: ['anything'] }));
    await assertFails(deleteDoc(policy(database)));
  }
});

test('revoking a scope immediately denies already authenticated clients', async () => {
  const [database] = clients();
  const target = path(database, 'bmg_projectSchedules_docs', `p_${month}`);
  await setPolicy({ enabled: true, verifiedScopes: [`p_${month}`] });
  await assertSucceeds(updateDoc(target, { note: 'before revoke' }));
  await setPolicy({ enabled: false, verifiedScopes: [] });
  await assertFails(updateDoc(target, { note: 'after revoke' }));
});

test('rolling policy allows current and next month only for reviewed projects', async () => {
  await setPolicy({ enabled: true, verifiedScopes: [], rollingProjectIds: ['p'], rollingFromMonth: '2026-01' });
  const [manager, admin] = clients();
  for (const database of [manager, admin]) {
    await assertSucceeds(updateDoc(path(database, 'bmg_projectSchedules_docs', `p_${month}`), { note: 'rolling current' }));
    await assertSucceeds(updateDoc(path(database, 'bmg_projectSchedules_docs', `p_${adjacent(1)}`), { note: 'rolling next' }));
    await assertFails(updateDoc(path(database, 'bmg_projectSchedules_docs', `p_${adjacent(-1)}`), { note: 'past denied' }));
    await assertFails(setDoc(path(database, 'bmg_projectSchedules_docs', `p_${adjacent(2)}`), record('p', adjacent(2))));
    await assertFails(setDoc(path(database, 'bmg_projectSchedules_docs', `other_${adjacent(1)}`), record('other', adjacent(1))));
  }
  const readonly = environment.authenticatedContext('readonly').firestore();
  await assertFails(updateDoc(path(readonly, 'bmg_projectSchedules_docs', `p_${adjacent(1)}`), { note: 'no save permission' }));
  await setPolicy({ enabled: false, verifiedScopes: [], rollingProjectIds: ['p'], rollingFromMonth: '2026-01' });
  await assertFails(updateDoc(path(manager, 'bmg_projectSchedules_docs', `p_${adjacent(1)}`), { note: 'disabled denied' }));
});

test('rolling activation start and malformed policy close future writes', async () => {
  const [database] = clients();
  for (const values of [{ rollingFromMonth: 'invalid', rollingProjectIds: ['p'] },
    { rollingFromMonth: '2026-01', rollingProjectIds: 'p' },
    { rollingFromMonth: adjacent(2), rollingProjectIds: ['p'] }]) {
    await setPolicy({ enabled: true, verifiedScopes: [], ...values });
    await assertFails(updateDoc(path(database, 'bmg_projectSchedules_docs', `p_${adjacent(1)}`), { note: 'must deny' }));
  }
});
