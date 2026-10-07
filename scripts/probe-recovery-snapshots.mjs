// READ-ONLY: inspect legacyRecoverySnapshots — our best remaining lead for an
// old-id -> identity map. Also deep-scans every doc for any of the 63 ghost ids.
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

const audit = JSON.parse(readFileSync('migration-output/schedule-audit-2026-10-02T08-35-31-993Z/details.json', 'utf8'));
const ghost = new Set(audit.rows.filter(r => r.status === 'unknown-identity').map(r => r.employee));

// recursively collect every string value found in an object, tagged by path
function collectStrings(obj, path, out) {
  if (obj == null) return;
  if (typeof obj === 'string') { out.push([path, obj]); return; }
  if (Array.isArray(obj)) { obj.forEach((v, i) => collectStrings(v, `${path}[${i}]`, out)); return; }
  if (typeof obj === 'object') { for (const k of Object.keys(obj)) collectStrings(obj[k], `${path}.${k}`, out); }
}

const coll = db.collection('legacyRecoverySnapshots');
const snap = await coll.get();
console.log(`\nlegacyRecoverySnapshots: ${snap.size} docs\n`);

let anyGhostHit = 0;
const ghostByField = {};
for (const d of snap.docs) {
  const data = d.data();
  const topKeys = Object.keys(data);
  // estimate size
  const size = JSON.stringify(data).length;
  console.log(`doc "${d.id}"  topFields=[${topKeys.join(', ')}]  ~${size} bytes`);

  // deep scan this doc for ghost ids
  const strings = [];
  collectStrings(data, d.id, strings);
  const hits = strings.filter(([, v]) => ghost.has(v));
  if (hits.length) {
    anyGhostHit += hits.length;
    for (const [p, v] of hits.slice(0, 8)) {
      console.log(`    GHOST ${v} at ${p}`);
      const field = p.replace(/\[\d+\]/g, '[]');
      ghostByField[field] = (ghostByField[field] || 0) + 1;
    }
    // Show sibling context: find the object that contained the ghost to see a name nearby
  }

  // list sub-collections of this doc (snapshots often store rows as subcoll)
  const subs = await d.ref.listCollections();
  if (subs.length) console.log(`    sub-collections: [${subs.map(c => c.id).join(', ')}]`);
}

console.log(`\n>> total ghost-id occurrences in legacyRecoverySnapshots docs: ${anyGhostHit}`);
console.log(`>> by field path: ${JSON.stringify(ghostByField, null, 1)}`);

// If any doc has a sub-collection, peek the first one for ghost ids + names
for (const d of snap.docs) {
  const subs = await d.ref.listCollections();
  for (const sc of subs) {
    const ss = await sc.limit(500).get();
    console.log(`\nsub "${d.id}/${sc.id}": ${ss.size} docs (showing up to 3 with ghost match)`);
    let shown = 0;
    for (const sd of ss.docs) {
      const strings = [];
      collectStrings(sd.data(), sd.id, strings);
      if (strings.some(([, v]) => ghost.has(v)) && shown < 3) {
        console.log(`    doc ${sd.id}:`, JSON.stringify(sd.data()).slice(0, 300));
        shown++;
      }
    }
  }
}

console.log('\nDone (read-only).');
process.exit(0);
