import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

test('Vercel admin-user function uses the supported Node 22 runtime', async () => {
  const packageJson = JSON.parse(
    await readFile(new URL('../../package.json', import.meta.url), 'utf8'),
  );

  assert.equal(packageJson.engines?.node, '22.x');
});

test('admin-user function and Firebase Admin dependencies load in ESM mode', async () => {
  await assert.doesNotReject(() => import('../../api/admin-users.js'));
});
