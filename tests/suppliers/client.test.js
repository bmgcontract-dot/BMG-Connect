import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

// Drive the actual hook with a small deterministic React-effect harness.
function harness(fetchImpl) {
  let slots = [], cursor = 0, previous = [], cleanups = [], pending = [];
  const useState = initial => {
    const index = cursor++;
    if (!(index in slots)) slots[index] = initial;
    return [slots[index], next => { slots[index] = typeof next === 'function' ? next(slots[index]) : next; }];
  };
  const useEffect = (effect, deps) => {
    const index = cursor++;
    if (!previous[index] || deps.some((dep, i) => dep !== previous[index][i])) {
      previous[index] = deps;
      pending.push(() => { cleanups[index]?.(); cleanups[index] = effect(); });
    }
  };
  const source = fs.readFileSync(new URL('../../src/suppliers/useSupplierDirectory.js', import.meta.url), 'utf8')
    .replace(/^import[^\n]+\n/, '').replace('export function', 'function');
  const hook = new Function('useState', 'useEffect', 'fetch', `${source}; return useSupplierDirectory;`)(useState, useEffect, fetchImpl);
  return {
    render(props) { cursor = 0; const result = hook(props); const effects = pending; pending = []; effects.forEach(effect => effect()); return result; },
    unmount() { cleanups.forEach(cleanup => cleanup?.()); },
  };
}
const flush = () => new Promise(resolve => setImmediate(resolve));
const user = { uid: 'u1', getIdToken: async () => 'token' };

test('fresh supplier activation requests directory without a prior Contracts visit', async () => {
  const calls = [];
  const h = harness(async (url, options) => {
    calls.push({ url, options });
    return { ok: true, json: async () => ({ suppliers: [{ name: 'Foreign supplier' }] }) };
  });
  const props = { auth: { currentUser: user }, user, enabled: true };
  assert.equal(h.render(props).status, 'loading');
  await flush();
  assert.equal(h.render(props).status, 'ready');
  assert.deepEqual(h.render(props).suppliers, [{ name: 'Foreign supplier' }]);
  assert.equal(calls.length, 1);
  assert.equal(calls[0].url, '/api/supplier-directory');
  assert.equal(calls[0].options.cache, 'no-store');
  assert.equal(calls[0].options.headers.Authorization, 'Bearer token');
  h.render({ ...props, enabled: false });
  assert.deepEqual(h.render({ ...props, enabled: false }).suppliers, []);
  h.render(props);
  await flush();
  assert.equal(calls.length, 2);
  h.unmount();
});

test('failed load is explicit and retry fetches fresh data', async () => {
  let calls = 0;
  const h = harness(async () => ({ ok: ++calls > 1, json: async () => ({ suppliers: [{ name: 'A' }] }) }));
  const props = { auth: { currentUser: user }, user, enabled: true };
  h.render(props); await flush();
  const failed = h.render(props);
  assert.equal(failed.status, 'error');
  assert.deepEqual(failed.suppliers, []);
  failed.retry(); h.render(props); await flush();
  assert.equal(h.render(props).status, 'ready');
  h.unmount();
});

test('account change aborts previous request and never renders its late response', async () => {
  const pending = [];
  const h = harness((url, options) => new Promise(resolve => pending.push({ resolve, options })));
  const auth = { currentUser: user };
  const props = { auth, user, enabled: true };
  h.render(props); await flush();
  const nextUser = { uid: 'u2', getIdToken: async () => 'other' };
  auth.currentUser = nextUser;
  const next = { auth, user: nextUser, enabled: true };
  assert.deepEqual(h.render(next).suppliers, []); await flush();
  assert.equal(pending[0].options.signal.aborted, true);
  pending[0].resolve({ ok: true, json: async () => ({ suppliers: [{ name: 'Old user data' }] }) });
  await flush();
  assert.deepEqual(h.render(next).suppliers, []);
  pending[1].resolve({ ok: true, json: async () => ({ suppliers: [{ name: 'New user data' }] }) });
  await flush();
  assert.deepEqual(h.render(next).suppliers, [{ name: 'New user data' }]);
  h.unmount();
});
