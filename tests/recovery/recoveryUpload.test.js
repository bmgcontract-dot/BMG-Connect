import { createHash } from 'node:crypto';
import { Readable } from 'node:stream';
import test from 'node:test';
import assert from 'node:assert/strict';

import { LEGACY_RECOVERY_ORIGIN } from '../../src/recovery/browserLegacyCache.js';
import {
  MAX_RECOVERY_SNAPSHOT_BYTES,
  createRecoveryUploadPlan,
  hashReadable,
  recoverySnapshotIdFromFinalizeBody,
  validateFinalizeRequest,
  verifyUploadedSnapshot,
} from '../../src/recovery/recoveryUpload.js';

function validBody(overrides = {}) {
  return {
    action: 'initiate',
    schemaVersion: 1,
    sourceOrigin: LEGACY_RECOVERY_ORIGIN,
    deviceId: 'device_12345678',
    capturedAt: '2026-09-18T12:00:00.000Z',
    sha256: 'a'.repeat(64),
    contentLength: 1024,
    manifest: [{
      key: 'bmg_projects',
      source: 'indexedDb',
      valueKind: 'array',
      itemCount: 27,
      redactedFieldCount: 0,
    }],
    ...overrides,
  };
}

test('creates an immutable user-scoped upload plan', () => {
  const plan = createRecoveryUploadPlan({ userId: 'firebase_uid', body: validBody() });

  assert.equal(plan.snapshotId, `firebase_uid_device_12345678_${'a'.repeat(64)}`);
  assert.equal(plan.objectPath, `legacy-recovery-snapshots/firebase_uid/device_12345678/${'a'.repeat(64)}.json`);
  assert.equal(plan.receiptCode, 'BMG-AAAAAAAAAAAA');
  assert.equal(plan.metadata.userId, 'firebase_uid');
  assert.equal(plan.metadata.manifest[0].itemCount, 27);
});

test('rejects untrusted origins, unknown keys, duplicates, and oversized uploads', () => {
  assert.throws(
    () => createRecoveryUploadPlan({
      userId: 'uid',
      body: validBody({ sourceOrigin: 'https://bmg-connect.vercel.app' }),
    }),
    error => error.message === 'invalid-recovery-origin' && error.status === 403,
  );
  assert.throws(
    () => createRecoveryUploadPlan({
      userId: 'uid',
      body: validBody({ manifest: [{ key: 'firebaseLocalStorageDb', source: 'indexedDb' }] }),
    }),
    /invalid-recovery-manifest-entry/,
  );
  const duplicate = validBody().manifest[0];
  assert.throws(
    () => createRecoveryUploadPlan({
      userId: 'uid',
      body: validBody({ manifest: [duplicate, duplicate] }),
    }),
    /duplicate-recovery-manifest-entry/,
  );
  assert.throws(
    () => createRecoveryUploadPlan({
      userId: 'uid',
      body: validBody({ contentLength: MAX_RECOVERY_SNAPSHOT_BYTES + 1 }),
    }),
    /invalid-recovery-size/,
  );
});

test('finalization is restricted to the authenticated snapshot owner', () => {
  const stored = {
    snapshotId: `owner-uid_device_12345678_${'a'.repeat(64)}`,
    metadata: { userId: 'owner-uid' },
  };
  assert.equal(
    validateFinalizeRequest({
      userId: 'owner-uid',
      body: { action: 'finalize', snapshotId: stored.snapshotId },
      stored,
    }),
    stored,
  );
  assert.throws(
    () => validateFinalizeRequest({
      userId: 'other-uid',
      body: { action: 'finalize', snapshotId: stored.snapshotId },
      stored,
    }),
    error => error.message === 'recovery-snapshot-forbidden' && error.status === 403,
  );
});

test('rejects malformed snapshot IDs before a Firestore document lookup', () => {
  assert.throws(
    () => recoverySnapshotIdFromFinalizeBody({ action: 'finalize', snapshotId: '../other-user' }),
    /recovery-snapshot-id-required/,
  );
  assert.equal(
    recoverySnapshotIdFromFinalizeBody({
      action: 'finalize',
      snapshotId: `uid_123_device_12345678_${'a'.repeat(64)}`,
    }),
    `uid_123_device_12345678_${'a'.repeat(64)}`,
  );
});

test('hashes an uploaded stream and verifies checksum and byte length', async () => {
  const payload = Buffer.from('{"schemaVersion":1}');
  const actual = await hashReadable(Readable.from([payload.subarray(0, 5), payload.subarray(5)]), createHash);
  const expectedSha = createHash('sha256').update(payload).digest('hex');

  assert.deepEqual(actual, { sha256: expectedSha, contentLength: payload.length });
  assert.deepEqual(
    verifyUploadedSnapshot({
      expected: { sha256: expectedSha, contentLength: payload.length },
      actual,
    }),
    {
      receiptCode: `BMG-${expectedSha.slice(0, 12).toUpperCase()}`,
      sha256: expectedSha,
      contentLength: payload.length,
    },
  );
});

test('does not issue a receipt for a checksum or size mismatch', () => {
  assert.throws(
    () => verifyUploadedSnapshot({
      expected: { sha256: 'a'.repeat(64), contentLength: 10 },
      actual: { sha256: 'b'.repeat(64), contentLength: 10 },
    }),
    /recovery-checksum-mismatch/,
  );
  assert.throws(
    () => verifyUploadedSnapshot({
      expected: { sha256: 'a'.repeat(64), contentLength: 10 },
      actual: { sha256: 'a'.repeat(64), contentLength: 11 },
    }),
    /recovery-size-mismatch/,
  );
});
