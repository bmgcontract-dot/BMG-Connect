import { LEGACY_BUSINESS_KEYS, LEGACY_CACHE_SCHEMA_VERSION } from './legacyCacheSnapshot.js';
import { LEGACY_RECOVERY_ORIGIN } from './browserLegacyCache.js';

export const MAX_RECOVERY_SNAPSHOT_BYTES = 250 * 1024 * 1024;
export const RECOVERY_COLLECTION = 'legacyRecoverySnapshots';
export const RECOVERY_OBJECT_PREFIX = 'legacy-recovery-snapshots';

const ALLOWED_KEYS = new Set(LEGACY_BUSINESS_KEYS);
const ALLOWED_SOURCES = new Set(['localStorage', 'indexedDb']);

function invalid(code, status = 400) {
  return Object.assign(new Error(code), { status });
}

function requireString(value, code, pattern) {
  if (typeof value !== 'string' || value.length === 0 || (pattern && !pattern.test(value))) {
    throw invalid(code);
  }
  return value;
}

function requireInteger(value, code, { minimum = 0, maximum = Number.MAX_SAFE_INTEGER } = {}) {
  if (!Number.isSafeInteger(value) || value < minimum || value > maximum) {
    throw invalid(code);
  }
  return value;
}

function normalizeManifest(manifest) {
  if (!Array.isArray(manifest) || manifest.length > LEGACY_BUSINESS_KEYS.length * 2) {
    throw invalid('invalid-recovery-manifest');
  }

  const seen = new Set();
  return manifest.map(entry => {
    if (!entry || !ALLOWED_KEYS.has(entry.key) || !ALLOWED_SOURCES.has(entry.source)) {
      throw invalid('invalid-recovery-manifest-entry');
    }
    const identity = `${entry.key}:${entry.source}`;
    if (seen.has(identity)) throw invalid('duplicate-recovery-manifest-entry');
    seen.add(identity);

    return {
      key: entry.key,
      source: entry.source,
      valueKind: requireString(entry.valueKind, 'invalid-recovery-value-kind', /^(array|object|string|number|boolean)$/),
      itemCount: requireInteger(entry.itemCount, 'invalid-recovery-item-count'),
      redactedFieldCount: requireInteger(entry.redactedFieldCount, 'invalid-recovery-redaction-count'),
    };
  });
}

function receiptCode(sha256) {
  return `BMG-${sha256.slice(0, 12).toUpperCase()}`;
}

export function createRecoveryUploadPlan({ userId, body }) {
  const safeUserId = requireString(userId, 'recovery-user-required', /^[A-Za-z0-9_-]{1,128}$/);
  if (!body || body.action !== 'initiate') throw invalid('invalid-recovery-action');
  if (body.schemaVersion !== LEGACY_CACHE_SCHEMA_VERSION) {
    throw invalid('unsupported-recovery-schema');
  }
  if (body.sourceOrigin !== LEGACY_RECOVERY_ORIGIN) {
    throw invalid('invalid-recovery-origin', 403);
  }

  const sha256 = requireString(body.sha256, 'invalid-recovery-sha256', /^[a-f0-9]{64}$/);
  const deviceId = requireString(body.deviceId, 'invalid-recovery-device-id', /^[A-Za-z0-9_-]{8,100}$/);
  const contentLength = requireInteger(body.contentLength, 'invalid-recovery-size', {
    minimum: 2,
    maximum: MAX_RECOVERY_SNAPSHOT_BYTES,
  });
  const capturedAt = requireString(body.capturedAt, 'invalid-recovery-captured-at');
  if (!Number.isFinite(Date.parse(capturedAt))) throw invalid('invalid-recovery-captured-at');

  const manifest = normalizeManifest(body.manifest);
  const snapshotId = `${safeUserId}_${deviceId}_${sha256}`;

  return {
    snapshotId,
    objectPath: `${RECOVERY_OBJECT_PREFIX}/${safeUserId}/${deviceId}/${sha256}.json`,
    receiptCode: receiptCode(sha256),
    metadata: {
      schemaVersion: LEGACY_CACHE_SCHEMA_VERSION,
      userId: safeUserId,
      deviceId,
      sourceOrigin: LEGACY_RECOVERY_ORIGIN,
      capturedAt,
      sha256,
      contentLength,
      manifest,
    },
  };
}

export function validateFinalizeRequest({ userId, body, stored }) {
  if (!body || body.action !== 'finalize') throw invalid('invalid-recovery-action');
  const snapshotId = requireString(
    body.snapshotId,
    'recovery-snapshot-id-required',
    /^[A-Za-z0-9_-]{1,128}_[A-Za-z0-9_-]{8,100}_[a-f0-9]{64}$/,
  );
  if (!stored || stored.snapshotId !== snapshotId) throw invalid('recovery-snapshot-not-found', 404);
  if (stored.metadata?.userId !== userId) throw invalid('recovery-snapshot-forbidden', 403);
  return stored;
}

export function recoverySnapshotIdFromFinalizeBody(body) {
  if (!body || body.action !== 'finalize') throw invalid('invalid-recovery-action');
  return requireString(
    body.snapshotId,
    'recovery-snapshot-id-required',
    /^[A-Za-z0-9_-]{1,128}_[A-Za-z0-9_-]{8,100}_[a-f0-9]{64}$/,
  );
}

export async function hashReadable(readable, createHash) {
  const hash = createHash('sha256');
  let contentLength = 0;
  for await (const chunk of readable) {
    contentLength += chunk.length;
    hash.update(chunk);
  }
  return { sha256: hash.digest('hex'), contentLength };
}

export function verifyUploadedSnapshot({ expected, actual }) {
  if (!actual || actual.sha256 !== expected.sha256) {
    throw invalid('recovery-checksum-mismatch', 409);
  }
  if (actual.contentLength !== expected.contentLength) {
    throw invalid('recovery-size-mismatch', 409);
  }
  return {
    receiptCode: receiptCode(expected.sha256),
    sha256: actual.sha256,
    contentLength: actual.contentLength,
  };
}
