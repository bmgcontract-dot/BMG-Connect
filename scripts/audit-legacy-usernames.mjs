#!/usr/bin/env node

import { createHash } from 'node:crypto';
import { applicationDefault, cert, getApps, initializeApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

const PROJECT_ID = process.env.BMG_FIREBASE_PROJECT_ID || 'bmg-connect-3e99a';
const APP_ID = process.env.BMG_FIRESTORE_APP_ID || 'bmg-app-prod';

function credentialFromEnvironment() {
  const serviceAccountJson = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
  return serviceAccountJson
    ? cert(JSON.parse(serviceAccountJson))
    : applicationDefault();
}

const adminApp = getApps()[0] || initializeApp({
  credential: credentialFromEnvironment(),
  projectId: PROJECT_ID,
});
const db = getFirestore(adminApp);
const dataDocument = db
  .collection('artifacts')
  .doc(APP_ID)
  .collection('public')
  .doc('data');

const snapshot = await dataDocument.collection('bmg_users_docs').get();

const byUsername = new Map();
for (const document of snapshot.docs) {
  const user = document.data();
  const username = String(user.username || '').trim().toLowerCase();
  if (!username) continue;
  const entries = byUsername.get(username) || [];
  entries.push({
    documentId: document.id,
    legacyId: user.id || null,
    username: user.username || null,
    firstName: user.firstName || null,
    lastName: user.lastName || null,
    position: user.position || null,
    department: user.department || null,
    status: user.status || null,
  });
  byUsername.set(username, entries);
}

const duplicates = [...byUsername.entries()]
  .filter(([, entries]) => entries.length > 1)
  .map(([normalizedUsername, entries]) => {
    const sourceUsers = snapshot.docs
      .map(document => document.data())
      .filter(user => String(user.username || '').trim().toLowerCase() === normalizedUsername);
    const passwordFingerprints = new Set(sourceUsers.map(user =>
      createHash('sha256').update(String(user.password || '')).digest('hex')
    ));
    return {
      normalizedUsername,
      allPasswordsMatch: passwordFingerprints.size === 1,
      entries,
    };
  });

const duplicateIds = new Set(duplicates.flatMap(group =>
  group.entries.flatMap(entry => [entry.documentId, entry.legacyId]).filter(Boolean)
));

function findReferences(value, path = '') {
  if (typeof value === 'string' && duplicateIds.has(value)) return [path || '<root>'];
  if (!value || typeof value !== 'object') return [];
  return Object.entries(value).flatMap(([key, nested]) =>
    findReferences(nested, path ? `${path}.${key}` : key)
  );
}

const collectionNames = [
  'bmg_projects', 'bmg_contracts', 'bmg_audits', 'bmg_dailyReports', 'bmg_repairs',
  'bmg_contractors', 'bmg_assets', 'bmg_tools', 'bmg_machines', 'bmg_pmPlans',
  'bmg_pmHistoryList', 'bmg_meters', 'bmg_utilityReadings', 'bmg_actionPlans',
  'bmg_othersData', 'bmg_forms_list', 'bmg_meetings', 'bmg_announcements',
  'bmg_deposits', 'bmg_inventory', 'bmg_inventory_transactions',
  'bmg_meeting_gantt_plans', 'bmg_meeting_invitations', 'bmg_meeting_proxies',
  'bmg_meeting_ballots', 'bmg_meeting_attendances', 'bmg_meeting_agendas',
  'bmg_project_events',
].map(name => `${name}_docs`);

const references = (await Promise.all(collectionNames.map(async collectionName => {
  const documents = await dataDocument.collection(collectionName).get();
  return documents.docs.flatMap(document => {
    const paths = findReferences(document.data());
    return paths.length > 0
      ? [{ collection: collectionName, documentId: document.id, paths }]
      : [];
  });
}))).flat();

console.log(JSON.stringify({
  userCount: snapshot.size,
  duplicateGroupCount: duplicates.length,
  duplicates,
  references,
}, null, 2));
