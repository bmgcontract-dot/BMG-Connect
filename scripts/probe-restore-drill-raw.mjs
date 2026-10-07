// READ-ONLY: dump the FIELD SHAPE of the restore-drill roster so we can see
// where (if anywhere) a 9-char legacy id is stored. No writes.
import { initializeApp, applicationDefault, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { readFileSync } from 'node:fs';

const projectId = 'bmg-connect-3e99a';
const databaseId = process.env.RESTORE_DB || 'restore-drill-20260920';
const app = initializeApp({
  projectId,
  credential: process.env.FIREBASE_SERVICE_ACCOUNT_JSON
    ? cert(JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_JSON)) : applicationDefault(),
});
const db = getFirestore(app, databaseId);
const root = db.collection('artifacts').doc('bmg-app-prod').collection('public').doc('data');

const audit = JSON.parse(readFileSync('migration-output/schedule-audit-2026-10-02T08-35-31-993Z/details.json', 'utf8'));
const ghost = new Set(audit.rows.filter(r => r.status === 'unknown-identity').map(r => r.employee));

function isNineChar(v) { return typeof v === 'string' && /^[a-z0-9]{9}$/.test(v); }

async function dump(label, coll) {
  const snap = await coll.get();
  console.log(`\n=== ${label}: ${snap.size} docs ===`);
  if (snap.empty) return;
  // show first 3 full docs (field names + value shapes)
  snap.docs.slice(0, 3).forEach((d, i) => {
    const data = d.data();
    console.log(`  doc[${i}] id="${d.id}" fields:`);
    for (const [k, v] of Object.entries(data)) {
      const t = typeof v;
      let show = t === 'string' ? `"${v.slice(0, 40)}"${isNineChar(v) ? '  <-- 9-char!' : ''}` : JSON.stringify(v);
      if (show && show.length > 60) show = show.slice(0, 60) + '...';
      console.log(`      ${k}: (${t}) ${show}`);
    }
  });
  // Across ALL docs: scan EVERY string field value for a 9-char id that is a ghost
  let foundGhost = 0;
  const ghostFields = {};
  for (const d of snap.docs) {
    for (const [k, v] of Object.entries(d.data())) {
      if (typeof v === 'string' && ghost.has(v)) {
        foundGhost++;
        ghostFields[k] = (ghostFields[k] || 0) + 1;
      }
    }
  }
  console.log(`  >> ghost-id values found in any field: ${foundGhost}  byField=${JSON.stringify(ghostFields)}`);
}

try { await dump('users (root)', db.collection('users')); } catch (e) { console.log('users err', e.message); }
try { await dump('bmg_users_docs', root.collection('bmg_users_docs')); } catch (e) { console.log('bmg_users_docs err', e.message); }

// Also: list ALL collections in restore-drill so we don't miss a roster store
try {
  const colls = await db.listCollections();
  console.log('\nroot-level collections in restore-drill:', colls.map(c => c.id));
  const rootDataColls = await root.listCollections();
  console.log('artifacts/bmg-app-prod/public/data sub-collections:', rootDataColls.map(c => c.id));
} catch (e) { console.log('listCollections err', e.message); }

console.log('\nDone (read-only).');
process.exit(0);
