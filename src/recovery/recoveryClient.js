import { MAX_RECOVERY_SNAPSHOT_BYTES } from './recoveryUpload.js';

export const RECOVERY_DEVICE_KEY = 'bmg_recovery_device_id';
export const PRODUCTION_URL = 'https://bmg-connect.vercel.app/';

function bytesToHex(bytes) {
  return [...new Uint8Array(bytes)]
    .map(value => value.toString(16).padStart(2, '0'))
    .join('');
}

async function parseResponse(response) {
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(payload.error || 'recovery-request-failed');
  }
  return payload;
}

export function getOrCreateRecoveryDeviceId({ storage, randomUUID }) {
  const existing = storage.getItem(RECOVERY_DEVICE_KEY);
  if (existing && /^[A-Za-z0-9_-]{8,100}$/.test(existing)) return existing;

  const created = randomUUID().replace(/[^A-Za-z0-9_-]/g, '_');
  storage.setItem(RECOVERY_DEVICE_KEY, created);
  return created;
}

export async function prepareRecoveryPayload(snapshot, cryptoApi = crypto) {
  const serialized = JSON.stringify(snapshot);
  const bytes = new TextEncoder().encode(serialized);
  if (bytes.byteLength > MAX_RECOVERY_SNAPSHOT_BYTES) {
    throw new Error('recovery-snapshot-too-large');
  }
  const digest = await cryptoApi.subtle.digest('SHA-256', bytes);
  return {
    body: serialized,
    contentLength: bytes.byteLength,
    sha256: bytesToHex(digest),
  };
}

export async function uploadRecoverySnapshot({
  snapshot,
  firebaseUser,
  deviceId,
  fetchImpl = fetch,
  cryptoApi = crypto,
  onStage = () => {},
}) {
  if (!firebaseUser || typeof firebaseUser.getIdToken !== 'function') {
    throw new Error('recovery-login-required');
  }

  onStage('preparing');
  const prepared = await prepareRecoveryPayload(snapshot, cryptoApi);
  const token = await firebaseUser.getIdToken(true);
  const authorization = { Authorization: `Bearer ${token}` };

  onStage('initiating');
  const initiation = await parseResponse(await fetchImpl('/api/recovery-snapshots', {
    method: 'POST',
    headers: { ...authorization, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      action: 'initiate',
      schemaVersion: snapshot.schemaVersion,
      sourceOrigin: snapshot.sourceOrigin,
      deviceId,
      capturedAt: snapshot.capturedAt,
      sha256: prepared.sha256,
      contentLength: prepared.contentLength,
      manifest: snapshot.manifest,
    }),
  }));

  if (initiation.status === 'ready') {
    onStage('complete');
    return initiation;
  }

  if (initiation.uploadRequired) {
    onStage('uploading');
    const uploadResponse = await fetchImpl(initiation.uploadUrl, {
      method: 'PUT',
      headers: initiation.requiredHeaders,
      body: prepared.body,
    });
    if (!uploadResponse.ok) throw new Error('recovery-upload-failed');
  }

  onStage('verifying');
  const receipt = await parseResponse(await fetchImpl('/api/recovery-snapshots', {
    method: 'POST',
    headers: { ...authorization, 'Content-Type': 'application/json' },
    body: JSON.stringify({ action: 'finalize', snapshotId: initiation.snapshotId }),
  }));
  if (receipt.status !== 'ready' || !receipt.receiptCode) {
    throw new Error('recovery-receipt-not-ready');
  }
  onStage('complete');
  return receipt;
}

