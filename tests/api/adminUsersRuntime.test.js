import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

test('Vercel admin-user function uses the supported Node 22 runtime', async () => {
  const packageJson = JSON.parse(
    await readFile(new URL('../../package.json', import.meta.url), 'utf8'),
  );

  assert.equal(packageJson.engines?.node, '22.x');
  assert.equal(
    packageJson.optionalDependencies?.['@rollup/rollup-linux-x64-gnu'],
    '^4.63.1',
  );
});

test('admin-user function and Firebase Admin dependencies load in ESM mode', async () => {
  await assert.doesNotReject(() => import('../../api/admin-users.js'));
});

test('admin-user function pins the Vercel-compatible Firebase Admin dependency graph', async () => {
  const packageJson = JSON.parse(
    await readFile(new URL('../../package.json', import.meta.url), 'utf8'),
  );
  const packageLock = JSON.parse(
    await readFile(new URL('../../package-lock.json', import.meta.url), 'utf8'),
  );

  assert.equal(packageJson.dependencies?.['firebase-admin'], '14.4.0');
  assert.equal(packageJson.overrides?.jose, '5.10.0');
  assert.match(packageLock.packages?.['node_modules/jwks-rsa']?.version || '', /^4\./);
  assert.match(packageLock.packages?.['node_modules/jose']?.version || '', /^5\./);
});
