import test from 'node:test';
import { readFile } from 'node:fs/promises';
import { initializeTestEnvironment, assertFails, assertSucceeds } from '@firebase/rules-unit-testing';
import { doc, setDoc, setLogLevel } from 'firebase/firestore';
setLogLevel('silent');

test('Rules enforce Bangkok November and year rollover using server time', async () => {
  const rules = await readFile('firestore.rules', 'utf8');
  const cases = [
    { name: 'oct-before', instant: "timestamp.date(2026, 10, 31) + duration.value(16, 'h') + duration.value(59, 'm')", allow: ['2026-10', '2026-11'], deny: ['2026-09', '2026-12'] },
    { name: 'nov-after', instant: "timestamp.date(2026, 10, 31) + duration.value(17, 'h')", allow: ['2026-11', '2026-12'], deny: ['2026-10', '2027-01'] },
    { name: 'jan-after', instant: "timestamp.date(2026, 12, 31) + duration.value(17, 'h')", allow: ['2027-01', '2027-02'], deny: ['2026-12', '2027-03'] },
  ];
  for (const scenario of cases) {
    // Only the clock source is replaced; the production Rules predicates run unchanged.
    const environment = await initializeTestEnvironment({ projectId: `demo-rollover-${scenario.name}`,
      firestore: { host: '127.0.0.1', port: 8089, rules: rules.replace('request.time + duration.value(7, \'h\')', `(${scenario.instant}) + duration.value(7, 'h')`) } });
    try {
      await environment.withSecurityRulesDisabled(async context => {
        const db = context.firestore();
        await setDoc(doc(db, 'users', 'manager'), { authUid: 'manager', status: 'Active', department: 'p', accessibleDepts: ['All'],
          permissions: { proj_schedule: { view: true, save: true, edit: true } } });
        await setDoc(doc(db, 'artifacts/bmg-app-prod/public/data/bmg_projects_docs/p'), { name: 'p' });
        await setDoc(doc(db, 'artifacts/bmg-app-prod/public/data/bmg_scheduleWritePolicy/current'), {
          enabled: true, verifiedScopes: ['p_2026-10'], rollingProjectIds: ['p'], rollingFromMonth: '2026-11' });
      });
      const db = environment.authenticatedContext('manager').firestore();
      for (const month of [...scenario.allow, ...scenario.deny]) {
        const write = setDoc(doc(db, `artifacts/bmg-app-prod/public/data/bmg_projectSchedules_docs/p_${month}`), {
          id: `p_${month}`, projectId: 'p', month, schemaVersion: 1, schedules: {} });
        if (scenario.allow.includes(month)) await assertSucceeds(write); else await assertFails(write);
      }
    } finally { await environment.cleanup(); }
  }
});
