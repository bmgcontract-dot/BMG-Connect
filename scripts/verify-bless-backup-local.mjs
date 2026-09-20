// Restore drill only: never accepts a cloud target or production credentials.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { createHash } from 'node:crypto';
import { initializeApp, deleteApp } from 'firebase-admin/app';
import { getFirestore, Timestamp } from 'firebase-admin/firestore';

assert.equal(process.env.FIRESTORE_EMULATOR_HOST, '127.0.0.1:8090');
const path = 'backups/bless-schedules-2026-09-19T07-40-20-181Z/backup.json';
const bytes = fs.readFileSync(path);
assert.equal(createHash('sha256').update(bytes).digest('hex'), fs.readFileSync(`${path}.sha256`, 'utf8').trim().split(/\s+/)[0]);
const backup = JSON.parse(bytes);
assert.equal(backup.operations.length, 5);
function decode(value) {
  if (Array.isArray(value)) return value.map(decode);
  if (!value || typeof value !== 'object') return value;
  if (value.__firestoreTimestamp) return new Timestamp(...value.__firestoreTimestamp);
  return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, decode(item)]));
}
function encode(value) {
  if (value instanceof Timestamp) return { __firestoreTimestamp: [value.seconds, value.nanoseconds] };
  if (Array.isArray(value)) return value.map(encode);
  if (!value || typeof value !== 'object') return value;
  return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, encode(item)]));
}
const app = initializeApp({ projectId: 'demo-bmg-restore-drill' }, 'isolated-restore-drill');
const db = getFirestore(app);
let verified = 0;
try {
  for (const [index, operation] of backup.operations.entries()) {
    for (const version of ['before', 'after']) {
      assert.ok(operation[version]);
      // Fixed, isolated namespace; never use the source project's document path.
      const ref = db.doc(`restoreDrill/${version}-${index}`);
      await ref.set(decode(operation[version]));
      assert.deepEqual(encode((await ref.get()).data()), operation[version]);
      verified += 1;
    }
  }
  console.log(JSON.stringify({ checksum: 'passed', target: 'demo-bmg-restore-drill', verifiedDocuments: verified, scope: 'Bless five months, before/after only; not full database' }));
} finally {
  await db.terminate();
  await deleteApp(app);
}
