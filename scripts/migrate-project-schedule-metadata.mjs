import process from 'node:process';
import { createHash } from 'node:crypto';
import { applicationDefault, cert } from 'firebase-admin/app';

import { buildAuthoritativeProjectScheduleRecords } from '../src/schedule/legacyScheduleMigration.js';

const PROJECT_ID = 'bmg-connect-3e99a';
const DATABASE_ID = '(default)';
const APP_ID = 'bmg-app-prod';
const API_KEY = 'AIzaSyAy03rxniCLFDYT4ztY_Ry2zh0ddzdBoPE';
const DATA_ROOT = `artifacts/${APP_ID}/public/data`;
const TARGET_COLLECTION = 'bmg_projectSchedules_docs';
const MIGRATED_AT = '2026-09-16T00:00:00.000Z';
const CURRENT_MONTH = '2026-09';
const APPLY_BATCH_SIZE = 400;
const API_ROOT = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/${encodeURIComponent(DATABASE_ID)}/documents`;
const RESOURCE_ROOT = `projects/${PROJECT_ID}/databases/${DATABASE_ID}/documents`;

const credential = process.env.FIREBASE_SERVICE_ACCOUNT_JSON
  ? cert(JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_JSON))
  : applicationDefault();

let authorizationHeadersPromise;

function getAuthorizationHeaders() {
  authorizationHeadersPromise ??= credential.getAccessToken().then(({ access_token: accessToken }) => ({
    authorization: `Bearer ${accessToken}`,
  }));
  return authorizationHeadersPromise;
}

function encodePath(path) {
  return path.split('/').map(encodeURIComponent).join('/');
}

function argumentValue(name) {
  const prefix = `--${name}=`;
  return process.argv.find((value) => value.startsWith(prefix))?.slice(prefix.length);
}

function decodeValue(value) {
  if ('stringValue' in value) return value.stringValue;
  if ('integerValue' in value) return Number(value.integerValue);
  if ('doubleValue' in value) return value.doubleValue;
  if ('booleanValue' in value) return value.booleanValue;
  if ('timestampValue' in value) return value.timestampValue;
  if ('nullValue' in value) return null;
  if ('arrayValue' in value) return (value.arrayValue.values ?? []).map(decodeValue);
  if ('mapValue' in value) return decodeFields(value.mapValue.fields ?? {});
  throw new Error(`Unsupported Firestore value type: ${Object.keys(value).join(',')}`);
}

function decodeFields(fields) {
  return Object.fromEntries(Object.entries(fields ?? {}).map(([key, value]) => [key, decodeValue(value)]));
}

function encodeValue(value) {
  if (value === null) return { nullValue: null };
  if (typeof value === 'string') return { stringValue: value };
  if (typeof value === 'boolean') return { booleanValue: value };
  if (typeof value === 'number' && Number.isInteger(value)) return { integerValue: String(value) };
  if (typeof value === 'number') return { doubleValue: value };
  if (Array.isArray(value)) return { arrayValue: { values: value.map(encodeValue) } };
  if (value && typeof value === 'object') return { mapValue: { fields: encodeFields(value) } };
  throw new Error(`Unsupported JavaScript value type: ${typeof value}`);
}

function encodeFields(fields) {
  return Object.fromEntries(Object.entries(fields).map(([key, value]) => [key, encodeValue(value)]));
}

async function fetchJson(url, options) {
  const authorizationHeaders = await getAuthorizationHeaders();
  const response = await fetch(url, {
    ...options,
    headers: { ...authorizationHeaders, ...options?.headers },
    signal: AbortSignal.timeout(60_000),
  });
  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Firestore request failed (${response.status}): ${body.slice(0, 500)}`);
  }
  return response.json();
}

async function getDocument(path) {
  const url = new URL(`${API_ROOT}/${encodePath(path)}`);
  url.searchParams.set('key', API_KEY);
  return fetchJson(url);
}

async function listDocuments(collectionPath, fieldMask = []) {
  const documents = [];
  let pageToken;
  do {
    const url = new URL(`${API_ROOT}/${encodePath(collectionPath)}`);
    url.searchParams.set('pageSize', '1000');
    url.searchParams.set('key', API_KEY);
    fieldMask.forEach((field) => url.searchParams.append('mask.fieldPaths', field));
    if (pageToken) url.searchParams.set('pageToken', pageToken);
    const page = await fetchJson(url);
    documents.push(...(page.documents ?? []));
    pageToken = page.nextPageToken;
  } while (pageToken);
  return documents;
}

async function loadLegacyState(key) {
  const stateDocument = await getDocument(`${DATA_ROOT}/app_state/${key}`);
  const state = decodeFields(stateDocument.fields);
  let json = state.payload;
  if (Number.isInteger(state.totalChunks)) {
    const chunks = await Promise.all(Array.from(
      { length: state.totalChunks },
      (_, index) => getDocument(`${DATA_ROOT}/app_state_chunks/${key}_${index}`),
    ));
    json = chunks.map((document) => decodeFields(document.fields).chunk ?? '').join('');
  }
  if (typeof json !== 'string') throw new Error(`Legacy state ${key} has no readable payload.`);
  return JSON.parse(json);
}

function stable(value) {
  if (Array.isArray(value)) return value.map(stable);
  if (!value || typeof value !== 'object') return value;
  return Object.fromEntries(Object.keys(value).sort().map((key) => [key, stable(value[key])]));
}

function encodedResourceName(name) {
  return name.split('/').map(encodeURIComponent).join('/');
}

async function applyCreates(operations, manifestSha256) {
  if (argumentValue('confirm-project') !== PROJECT_ID) {
    throw new Error(`Apply blocked: --confirm-project must equal ${PROJECT_ID}.`);
  }
  if (Number(argumentValue('expected-writes')) !== operations.length) {
    throw new Error(`Apply blocked: --expected-writes must equal ${operations.length}.`);
  }
  if (argumentValue('expected-manifest-sha256') !== manifestSha256) {
    throw new Error('Apply blocked: manifest SHA-256 does not match the current production read.');
  }

  let applied = 0;
  for (let offset = 0; offset < operations.length; offset += APPLY_BATCH_SIZE) {
    const batch = operations.slice(offset, offset + APPLY_BATCH_SIZE);
    const writes = batch.map(({ name, record }) => ({
      update: { name, fields: encodeFields(record) },
      currentDocument: { exists: false },
    }));
    const url = new URL(`https://firestore.googleapis.com/v1/${encodedResourceName(RESOURCE_ROOT)}:commit`);
    url.searchParams.set('key', API_KEY);
    const result = await fetchJson(url, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ writes }),
    });
    if ((result.writeResults?.length ?? 0) !== batch.length) {
      throw new Error(`Expected ${batch.length} write results but received ${result.writeResults?.length ?? 0}.`);
    }
    applied += batch.length;
    process.stdout.write(`Created project schedule metadata: ${applied}/${operations.length}\n`);
  }
}

async function main() {
  const [projectDocuments, notes, approvals, staffOrder, targetDocuments] = await Promise.all([
    listDocuments(`${DATA_ROOT}/bmg_projects_docs`, ['name']),
    loadLegacyState('bmg_scheduleNotes'),
    loadLegacyState('bmg_scheduleApprovals'),
    loadLegacyState('bmg_projectStaffOrder'),
    listDocuments(`${DATA_ROOT}/${TARGET_COLLECTION}`),
  ]);
  const projectIds = projectDocuments.map((document) => document.name.split('/').at(-1));
  const plan = buildAuthoritativeProjectScheduleRecords({
    notes,
    approvals,
    staffOrder,
    projectIds,
    currentMonth: CURRENT_MONTH,
    migratedAt: MIGRATED_AT,
  });
  const existingById = new Map(targetDocuments.map((document) => [
    document.name.split('/').at(-1),
    decodeFields(document.fields),
  ]));
  const collisions = [];
  const alreadyPresent = [];
  const operations = [];

  for (const record of plan.records) {
    const existing = existingById.get(record.id);
    if (!existing) {
      operations.push({
        name: `${RESOURCE_ROOT}/${DATA_ROOT}/${TARGET_COLLECTION}/${record.id}`,
        record,
      });
    } else if (JSON.stringify(stable(existing)) === JSON.stringify(stable(record))) {
      alreadyPresent.push(record.id);
    } else {
      collisions.push(record.id);
    }
  }

  const manifest = {
    operations,
    unresolved: plan.report.unresolved,
    collisions,
    alreadyPresent,
  };
  const manifestSha256 = createHash('sha256').update(JSON.stringify(stable(manifest))).digest('hex');
  const safeToApply = collisions.length === 0;
  const report = {
    mode: process.argv.includes('--apply') ? 'apply-preflight' : 'read-only-dry-run',
    generatedAt: new Date().toISOString(),
    firestoreProject: PROJECT_ID,
    appId: APP_ID,
    targetCollection: TARGET_COLLECTION,
    sourcePolicy: 'Only project-keyed notes, approvals, and current staff order are included. Legacy schedule cells are excluded.',
    privacy: 'No employee IDs, names, notes, approvals, or schedule cell contents are printed.',
    projectCount: projectIds.length,
    ...plan.report,
    unresolved: {
      noteKeys: plan.report.unresolved.noteKeys.length,
      approvalKeys: plan.report.unresolved.approvalKeys.length,
      staffOrderProjectIds: plan.report.unresolved.staffOrderProjectIds.length,
    },
    existingTargets: targetDocuments.length,
    alreadyPresent: alreadyPresent.length,
    collisions: collisions.length,
    proposedWrites: operations.length,
    manifestSha256,
    safeToApply,
    safeguards: [
      'create-only writes with exists=false preconditions',
      'abort when a target document exists with different content',
      'explicit production project, write-count, and manifest-hash confirmation',
      'legacy schedule cells remain untouched',
    ],
  };
  process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);

  if (process.argv.includes('--apply')) {
    if (!safeToApply) throw new Error('Apply blocked: target collisions detected.');
    await applyCreates(operations, manifestSha256);
    process.stdout.write(`${JSON.stringify({ mode: 'apply-complete', applied: operations.length }, null, 2)}\n`);
  }
}

main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
