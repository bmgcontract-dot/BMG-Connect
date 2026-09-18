import { webcrypto } from 'node:crypto';
import test from 'node:test';
import assert from 'node:assert/strict';

import {
  RECOVERY_DEVICE_KEY,
  getOrCreateRecoveryDeviceId,
  prepareRecoveryPayload,
  uploadRecoverySnapshot,
} from '../../src/recovery/recoveryClient.js';

function jsonResponse(payload, ok = true) {
  return { ok, json: async () => payload };
}

function snapshot() {
  return {
    schemaVersion: 1,
    capturedAt: '2026-09-18T12:00:00.000Z',
    sourceOrigin: 'https://bmg-connect-6b24.vercel.app',
    datasets: { bmg_projects: { indexedDb: [{ id: 'p1' }] } },
    manifest: [{
      key: 'bmg_projects',
      source: 'indexedDb',
      valueKind: 'array',
      itemCount: 1,
      redactedFieldCount: 0,
    }],
    warnings: [],
  };
}

test('creates and reuses a recovery device ID without reading other keys', () => {
  const values = new Map();
  const storage = {
    getItem: key => values.get(key) || null,
    setItem: (key, value) => values.set(key, value),
  };
  const first = getOrCreateRecoveryDeviceId({ storage, randomUUID: () => 'device-12345678' });
  const second = getOrCreateRecoveryDeviceId({ storage, randomUUID: () => 'different-device' });

  assert.equal(first, 'device-12345678');
  assert.equal(second, first);
  assert.equal(values.get(RECOVERY_DEVICE_KEY), first);
});

test('serializes and hashes the exact snapshot payload', async () => {
  const prepared = await prepareRecoveryPayload(snapshot(), webcrypto);
  assert.equal(prepared.contentLength, Buffer.byteLength(prepared.body));
  assert.match(prepared.sha256, /^[a-f0-9]{64}$/);
  assert.deepEqual(JSON.parse(prepared.body), snapshot());
});

test('uploads, finalizes, and returns a receipt only after server verification', async () => {
  const calls = [];
  const stages = [];
  const responses = [
    jsonResponse({
      snapshotId: 'snapshot-id',
      uploadUrl: 'https://storage.example/upload',
      uploadRequired: true,
      requiredHeaders: {
        'Content-Type': 'application/json',
        'Content-Range': 'bytes 0-100/101',
      },
    }),
    { ok: true },
    jsonResponse({ snapshotId: 'snapshot-id', receiptCode: 'BMG-RECEIPT1234', status: 'ready' }),
  ];
  const receipt = await uploadRecoverySnapshot({
    snapshot: snapshot(),
    firebaseUser: { getIdToken: async force => force ? 'fresh-token' : 'stale-token' },
    deviceId: 'device-12345678',
    cryptoApi: webcrypto,
    onStage: stage => stages.push(stage),
    fetchImpl: async (url, options) => {
      calls.push({ url, options });
      return responses.shift();
    },
  });

  assert.equal(receipt.receiptCode, 'BMG-RECEIPT1234');
  assert.deepEqual(stages, ['preparing', 'initiating', 'uploading', 'verifying', 'complete']);
  assert.equal(calls[0].url, '/api/recovery-snapshots');
  assert.equal(calls[0].options.headers.Authorization, 'Bearer fresh-token');
  assert.equal(calls[1].url, 'https://storage.example/upload');
  assert.equal(calls[2].url, '/api/recovery-snapshots');
});

test('resumes at finalization when the immutable object already exists', async () => {
  const urls = [];
  const receipt = await uploadRecoverySnapshot({
    snapshot: snapshot(),
    firebaseUser: { getIdToken: async () => 'token' },
    deviceId: 'device-12345678',
    cryptoApi: webcrypto,
    fetchImpl: async (url) => {
      urls.push(url);
      return urls.length === 1
        ? jsonResponse({ snapshotId: 'snapshot-id', status: 'uploaded', uploadRequired: false })
        : jsonResponse({ snapshotId: 'snapshot-id', receiptCode: 'BMG-READY123456', status: 'ready' });
    },
  });

  assert.equal(receipt.status, 'ready');
  assert.deepEqual(urls, ['/api/recovery-snapshots', '/api/recovery-snapshots']);
});

test('does not report success when upload or final verification fails', async () => {
  await assert.rejects(
    uploadRecoverySnapshot({
      snapshot: snapshot(),
      firebaseUser: { getIdToken: async () => 'token' },
      deviceId: 'device-12345678',
      cryptoApi: webcrypto,
      fetchImpl: async () => ({ ok: false, json: async () => ({}) }),
    }),
    /recovery-request-failed/,
  );
});

