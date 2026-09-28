import process from 'node:process';
import { createHash } from 'node:crypto';

const PROJECT_ID = 'bmg-connect-3e99a';
const DATABASE_ID = '(default)';
const APP_ID = 'bmg-app-prod';
const API_KEY = 'AIzaSyAy03rxniCLFDYT4ztY_Ry2zh0ddzdBoPE';
const DATA_ROOT = `artifacts/${APP_ID}/public/data`;
const CENTRAL_FEE_MENU_ID = 'proj_centralfee';
const LEGACY_PROJECT_SCOPING_BLOCKERS = [
  'bmg_schedules_v2',
  'bmg_scheduleNotes',
  'bmg_scheduleApprovals',
  'bmg_projectStaffOrder',
  'bmg_meeting_land_docs',
];

const API_ROOT = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/${encodeURIComponent(DATABASE_ID)}/documents`;
const RESOURCE_ROOT = `projects/${PROJECT_ID}/databases/${DATABASE_ID}/documents`;
const APPLY_BATCH_SIZE = 400;

function encodePath(path) {
  return path.split('/').map(encodeURIComponent).join('/');
}

function documentId(document) {
  return document.name.split('/').at(-1);
}

function fieldValue(document, fieldName) {
  const value = document.fields?.[fieldName];
  if (!value) return undefined;
  return value.stringValue
    ?? value.integerValue
    ?? value.doubleValue
    ?? value.booleanValue
    ?? value.timestampValue
    ?? null;
}

async function listDocuments(collectionPath, fieldMask) {
  const documents = [];
  let pageToken;

  do {
    const url = new URL(`${API_ROOT}/${encodePath(collectionPath)}`);
    url.searchParams.set('pageSize', '1000');
    url.searchParams.set('key', API_KEY);
    for (const field of fieldMask) url.searchParams.append('mask.fieldPaths', field);
    if (pageToken) url.searchParams.set('pageToken', pageToken);

    const response = await fetch(url, { signal: AbortSignal.timeout(30_000) });
    if (!response.ok) {
      const body = await response.text();
      throw new Error(`Firestore read failed (${response.status}) for ${collectionPath}: ${body.slice(0, 500)}`);
    }

    const page = await response.json();
    documents.push(...(page.documents ?? []));
    pageToken = page.nextPageToken;
  } while (pageToken);

  return documents;
}

function ownershipStatus(document, expectedProjectId) {
  const projectId = fieldValue(document, 'projectId');
  const menuId = fieldValue(document, 'menuId');
  return {
    projectId: projectId === expectedProjectId ? 'ok' : projectId === undefined ? 'missing' : 'mismatch',
    menuId: menuId === CENTRAL_FEE_MENU_ID ? 'ok' : menuId === undefined ? 'missing' : 'mismatch',
  };
}

function increment(summary, status) {
  summary.total += 1;
  summary.projectId[status.projectId] += 1;
  summary.menuId[status.menuId] += 1;
}

function emptyOwnershipSummary() {
  return {
    total: 0,
    projectId: { ok: 0, missing: 0, mismatch: 0 },
    menuId: { ok: 0, missing: 0, mismatch: 0 },
  };
}

function argumentValue(name) {
  const prefix = `--${name}=`;
  const argument = process.argv.find((value) => value.startsWith(prefix));
  return argument?.slice(prefix.length);
}

function encodedDocumentName(documentName) {
  return documentName.split('/').map(encodeURIComponent).join('/');
}

function firestoreFields(fields) {
  return Object.fromEntries(
    Object.entries(fields).map(([name, value]) => [name, { stringValue: value }]),
  );
}

async function applyBackfill(operations, manifestSha256, safeToApply) {
  const expectedManifestSha256 = argumentValue('expected-manifest-sha256');
  const expectedWrites = Number(argumentValue('expected-writes'));
  const confirmedProject = argumentValue('confirm-project');

  if (confirmedProject !== PROJECT_ID) {
    throw new Error(`Apply blocked: --confirm-project must equal ${PROJECT_ID}.`);
  }
  if (!Number.isSafeInteger(expectedWrites) || expectedWrites !== operations.length) {
    throw new Error(`Apply blocked: expected ${operations.length} writes but received ${argumentValue('expected-writes') ?? 'no count'}.`);
  }
  if (expectedManifestSha256 !== manifestSha256) {
    throw new Error('Apply blocked: manifest SHA-256 does not match the current read-only plan.');
  }
  if (!safeToApply) {
    throw new Error('Apply blocked: ownership mismatch or unresolved project ID detected.');
  }

  let applied = 0;
  for (let offset = 0; offset < operations.length; offset += APPLY_BATCH_SIZE) {
    const batch = operations.slice(offset, offset + APPLY_BATCH_SIZE);
    const writes = batch.map((operation) => ({
      update: {
        name: operation.name,
        fields: firestoreFields(operation.fields),
      },
      updateMask: { fieldPaths: Object.keys(operation.fields).sort() },
      currentDocument: { updateTime: operation.updateTime },
    }));
    const url = new URL(`https://firestore.googleapis.com/v1/${encodedDocumentName(RESOURCE_ROOT)}:commit`);
    url.searchParams.set('key', API_KEY);
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ writes }),
      signal: AbortSignal.timeout(60_000),
    });
    if (!response.ok) {
      const body = await response.text();
      throw new Error(`Backfill batch failed (${response.status}) after ${applied} writes: ${body.slice(0, 1000)}`);
    }
    const result = await response.json();
    if ((result.writeResults?.length ?? 0) !== batch.length) {
      throw new Error(`Backfill batch returned ${result.writeResults?.length ?? 0} results for ${batch.length} writes.`);
    }
    applied += batch.length;
    process.stdout.write(`Applied ownership metadata: ${applied}/${operations.length}\n`);
  }

  return applied;
}

async function main() {
  const proposedOperations = [];
  const projectDocuments = await listDocuments(
    `${DATA_ROOT}/bmg_projects_docs`,
    ['name'],
  );
  const projects = projectDocuments.map((document) => ({
    id: documentId(document),
    name: fieldValue(document, 'name') ?? '',
  }));
  const projectIdsByLength = projects.map(({ id }) => id).sort((a, b) => b.length - a.length);

  const houseStatuses = [];
  for (const project of projects) {
    const documents = await listDocuments(
      `${DATA_ROOT}/house_statuses_${project.id}`,
      ['projectId'],
    );
    const summary = { projectId: project.id, projectName: project.name, total: documents.length, ok: 0, missing: 0, mismatch: 0 };
    for (const document of documents) {
      const actualProjectId = fieldValue(document, 'projectId');
      if (actualProjectId === project.id) summary.ok += 1;
      else if (actualProjectId === undefined) {
        summary.missing += 1;
        proposedOperations.push({
          name: document.name,
          updateTime: document.updateTime,
          fields: { projectId: project.id },
        });
      }
      else summary.mismatch += 1;
    }
    if (summary.total > 0) houseStatuses.push(summary);
  }

  const appStateDocuments = await listDocuments(
    `${DATA_ROOT}/app_state`,
    ['projectId', 'menuId', 'totalChunks'],
  );
  const appStateChunkDocuments = await listDocuments(
    `${DATA_ROOT}/app_state_chunks`,
    ['projectId', 'menuId'],
  );

  const centralFeeState = emptyOwnershipSummary();
  const centralFeeChunks = emptyOwnershipSummary();
  const unresolvedCentralFeeStateIds = [];
  const unresolvedCentralFeeChunkIds = [];
  const legacyStateIds = [];

  for (const document of appStateDocuments) {
    const id = documentId(document);
    if (!id.startsWith('central_fee_raw_')) {
      legacyStateIds.push(id);
      continue;
    }
    const expectedProjectId = projectIdsByLength.find((projectId) => id === `central_fee_raw_${projectId}`);
    if (!expectedProjectId) {
      unresolvedCentralFeeStateIds.push(id);
      continue;
    }
    const status = ownershipStatus(document, expectedProjectId);
    increment(centralFeeState, status);
    const fields = {};
    if (status.projectId === 'missing') fields.projectId = expectedProjectId;
    if (status.menuId === 'missing') fields.menuId = CENTRAL_FEE_MENU_ID;
    if (Object.keys(fields).length > 0) {
      proposedOperations.push({ name: document.name, updateTime: document.updateTime, fields });
    }
  }

  for (const document of appStateChunkDocuments) {
    const id = documentId(document);
    if (!id.startsWith('central_fee_raw_')) continue;
    const expectedProjectId = projectIdsByLength.find((projectId) => id.startsWith(`central_fee_raw_${projectId}_`));
    if (!expectedProjectId) {
      unresolvedCentralFeeChunkIds.push(id);
      continue;
    }
    const status = ownershipStatus(document, expectedProjectId);
    increment(centralFeeChunks, status);
    const fields = {};
    if (status.projectId === 'missing') fields.projectId = expectedProjectId;
    if (status.menuId === 'missing') fields.menuId = CENTRAL_FEE_MENU_ID;
    if (Object.keys(fields).length > 0) {
      proposedOperations.push({ name: document.name, updateTime: document.updateTime, fields });
    }
  }

  const legacyProjectScopingBlockers = LEGACY_PROJECT_SCOPING_BLOCKERS.map((id) => ({
    id,
    stateDocumentExists: legacyStateIds.includes(id),
    chunkDocuments: appStateChunkDocuments.filter((document) => documentId(document).startsWith(`${id}_`)).length,
  }));
  proposedOperations.sort((a, b) => a.name.localeCompare(b.name));
  const manifestSha256 = createHash('sha256')
    .update(JSON.stringify(proposedOperations))
    .digest('hex');
  const hasOwnershipMismatch = [centralFeeState, centralFeeChunks]
    .some((summary) => summary.projectId.mismatch > 0 || summary.menuId.mismatch > 0)
    || houseStatuses.some((summary) => summary.mismatch > 0);

  const safeToApply = !hasOwnershipMismatch
    && unresolvedCentralFeeStateIds.length === 0
    && unresolvedCentralFeeChunkIds.length === 0;
  const report = {
    mode: 'read-only-dry-run',
    generatedAt: new Date().toISOString(),
    firestoreProject: PROJECT_ID,
    appId: APP_ID,
    privacy: 'Field masks were used. No payload, chunk content, house number, or resident data was requested.',
    projectsFound: projects.length,
    houseStatuses,
    centralFeeState,
    centralFeeChunks,
    unresolvedCentralFeeStateIds,
    unresolvedCentralFeeChunkIds,
    backfillPlan: {
      proposedWrites: proposedOperations.length,
      manifestSha256,
      safeToApply,
      safeguards: [
        'merge/update-mask writes only',
        'existing-document updateTime precondition',
        'abort on ownership mismatch or unresolved project ID',
      ],
    },
    legacyStateDocuments: {
      total: legacyStateIds.length,
      projectScopingBlockers: legacyProjectScopingBlockers,
      note: 'Per-user and unrelated legacy document IDs are intentionally omitted.',
    },
  };

  if (process.argv.includes('--apply')) {
    process.stdout.write(`${JSON.stringify({
      mode: 'apply-preflight',
      firestoreProject: PROJECT_ID,
      proposedWrites: proposedOperations.length,
      manifestSha256,
      safeToApply,
    }, null, 2)}\n`);
    const applied = await applyBackfill(proposedOperations, manifestSha256, safeToApply);
    process.stdout.write(`${JSON.stringify({ mode: 'apply-complete', applied }, null, 2)}\n`);
    return;
  }

  process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
}

main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
