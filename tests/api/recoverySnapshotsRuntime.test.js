import test from 'node:test';
import assert from 'node:assert/strict';

test('recovery snapshot function and Storage dependencies load in ESM mode', async () => {
  await assert.doesNotReject(() => import('../../api/recovery-snapshots.js'));
});

