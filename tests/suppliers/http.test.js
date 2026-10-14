import test from 'node:test';
import assert from 'node:assert/strict';
import { handleSupplierDirectory } from '../../src/suppliers/directoryServer.js';

function response() {
  return { headers: {}, setHeader(key, value) { this.headers[key] = value; }, end(body) { this.body = JSON.parse(body); } };
}

test('HTTP endpoint is read-only and denies absent credentials before server initialization', async () => {
  for (const [method, expected] of [['GET', 401], ['POST', 405], ['DELETE', 405]]) {
    const res = response();
    await handleSupplierDirectory({ method, headers: {} }, res, () => assert.fail('must not read'));
    assert.equal(res.statusCode, expected);
    assert.equal(res.headers['Cache-Control'], 'private, no-store');
  }
});

test('HTTP endpoint returns authorized directory and hides internal errors', async () => {
  const req = { method: 'GET', headers: { authorization: 'Bearer test-token' } };
  const res = response();
  await handleSupplierDirectory(req, res, async ({ token }) => {
    assert.equal(token, 'test-token'); return { suppliers: [{ name: 'A' }] };
  });
  assert.equal(res.statusCode, 200);
  assert.deepEqual(res.body, { suppliers: [{ name: 'A' }] });
  const failed = response();
  await handleSupplierDirectory(req, failed, () => { throw new Error('private credentials'); });
  assert.equal(failed.statusCode, 500);
  assert.deepEqual(failed.body, { error: 'supplier-directory-unavailable' });
  const denied = response();
  await handleSupplierDirectory(req, denied, () => { throw Object.assign(new Error('forbidden'), { status: 403 }); });
  assert.equal(denied.statusCode, 403);
});
