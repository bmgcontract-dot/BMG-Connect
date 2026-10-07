// READ-ONLY probe of the restore-drill database for the OLD 9-char roster.
// Does NOT write anything. Does NOT touch (default). Compares against the 63
// ghost ids that own the unknown-identity schedule cells.
//
// Run:
//   gcloud auth application-default login   # (if not already)
//   node scripts/probe-restore-drill-roster.mjs
//
// Optional: override the database id if the name differs:
//   RESTORE_DB=restore-drill-20260920 node scripts/probe-restore-drill-roster.mjs

import { initializeApp, applicationDefault, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { readFileSync } from 'node:fs';

const projectId = 'bmg-connect-3e99a';
const databaseId = process.env.RESTORE_DB || 'restore-drill-20260920';

const app = initializeApp({
  projectId,
  credential: process.env.FIREBASE_SERVICE_ACCOUNT_JSON
    ? cert(JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_JSON))
    : applicationDefault(),
});
// NOTE: second arg selects the named database (NOT "(default)").
const db = getFirestore(app, databaseId);
const root = db.collection('artifacts').doc('bmg-app-prod').collection('public').doc('data');

// --- load the 63 ghost ids from the latest audit ---
const auditPath = 'migration-output/schedule-audit-2026-10-02T08-35-31-993Z/details.json';
const audit = JSON.parse(readFileSync(auditPath, 'utf8'));
const cells = new Map();
for (const r of audit.rows) {
  if (r.status === 'unknown-identity') cells.set(r.employee, (cells.get(r.employee) || 0) + 1);
}
const ghostIds = new Set(cells.keys());
console.log(`\nConnected to database: "${databaseId}"  (project ${projectId})`);
console.log(`Ghost ids to match: ${ghostIds.size}  (own ${[...cells.values()].reduce((a, b) => a + b, 0)} cells)\n`);

function coverage(label, docs, getId) {
  const idx = new Set();
  const byId = new Map();
  for (const d of docs) {
    const id = getId(d);
    if (id != null) { idx.add(String(id)); byId.set(String(id), d); }
  }
  let hit = 0, hitCells = 0;
  const samples = [];
  for (const [emp, cnt] of cells) {
    if (idx.has(emp)) {
      hit++; hitCells += cnt;
      if (samples.length < 6) samples.push([emp, cnt, byId.get(emp)]);
    }
  }
  console.log(`[${label}] docs=${docs.length}  roster-ids=${idx.size}  ->  MATCH ${hit}/${ghostIds.size} ids  (${hitCells} cells)`);
  for (const [emp, cnt, d] of samples) {
    const name = d.name || `${d.firstName || ''} ${d.lastName || ''}`.trim();
    console.log(`    ${emp} -> ${name || '(no name field)'}  emp#${d.employeeId || '-'}  dept=${d.department || '-'}  (${cnt} cells)`);
  }
  return hit;
}

async function trySource(label, fn) {
  try {
    return await fn();
  } catch (e) {
    console.log(`[${label}] ERROR: ${e.message}`);
    return 0;
  }
}

// 1) root collection: users (one doc per user)
await trySource('users (root collection)', async () => {
  const snap = await db.collection('users').get();
  const docs = snap.docs.map(d => ({ _docId: d.id, ...d.data() }));
  // try matching on doc id, id field, legacyId, username, employeeId
  coverage('users / doc-id', docs, d => d._docId);
  coverage('users / id', docs, d => d.id);
  coverage('users / legacyId', docs, d => d.legacyId);
  coverage('users / username', docs, d => d.username);
  coverage('users / employeeId', docs, d => d.employeeId);
});

// 2) artifacts/.../bmg_users_docs (per-doc)
await trySource('bmg_users_docs', async () => {
  const snap = await root.collection('bmg_users_docs').get();
  const docs = snap.docs.map(d => ({ _docId: d.id, ...d.data() }));
  coverage('bmg_users_docs / doc-id', docs, d => d._docId);
  coverage('bmg_users_docs / id', docs, d => d.id);
  coverage('bmg_users_docs / legacyId', docs, d => d.legacyId);
});

// 3) legacy blob: app_state/bmg_users (+ chunks)
await trySource('app_state/bmg_users', async () => {
  const doc = await root.collection('app_state').doc('bmg_users').get();
  if (!doc.exists) { console.log('[app_state/bmg_users] does not exist'); return; }
  const data = doc.data() || {};
  let value = data.value ?? data.data ?? data;
  // handle chunked blob
  if (data.totalChunks) {
    const parts = [];
    for (let i = 0; i < data.totalChunks; i++) {
      const c = await root.collection('app_state_chunks').doc(`bmg_users_${i}`).get();
      parts.push(c.exists ? (c.data().value ?? c.data().data ?? '') : '');
    }
    try { value = JSON.parse(parts.join('')); } catch { /* leave as-is */ }
  }
  const arr = Array.isArray(value) ? value : (value && typeof value === 'object' ? Object.values(value) : []);
  console.log(`[app_state/bmg_users] parsed ${arr.length} users (totalChunks=${data.totalChunks || 0})`);
  coverage('app_state bmg_users / id', arr, d => d && d.id);
  coverage('app_state bmg_users / legacyId', arr, d => d && d.legacyId);
  coverage('app_state bmg_users / username', arr, d => d && d.username);
});

console.log('\nDone (read-only, no writes).');
process.exit(0);
