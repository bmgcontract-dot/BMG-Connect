import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { filterItemsForQueryPlan } from '../../src/firebase/queryScope.js';
import { shouldApplyCollectionSnapshot, reconcileCollectionSnapshot } from '../../src/firebase/collectionSnapshot.js';

const app = readFileSync(new URL('../../App.jsx', import.meta.url), 'utf8');
const hookSource = app.slice(app.indexOf('function usePersistentCollection('), app.indexOf('const CentralFeeManagerTab'));
function screen() {
  const slots = []; let cursor = 0; let effects = []; let next; let error;
  const scope = {
    useState(initial) { const i = cursor++; if (!(i in slots)) slots[i] = typeof initial === 'function' ? initial() : initial; return [slots[i], v => { slots[i] = v; }]; },
    useRef(initial) { const i = cursor++; return slots[i] ??= { current: initial }; },
    useEffect(fn) { effects.push(fn); },
    db: {}, appId: 'demo', collection: () => ({}), doc: () => ({}),
    query: () => ({}), where: () => ({}),
    loadStateLocallyIDB: async () => [], saveStateLocallyIDB() {},
    onSnapshot(...args) { next = args.at(-2); error = args.at(-1); return () => {}; },
    filterItemsForQueryPlan, shouldApplyCollectionSnapshot, reconcileCollectionSnapshot,
    console: { warn() {} },
  };
  const hook = new Function(...Object.keys(scope), `${hookSource}; return usePersistentCollection;`)(...Object.values(scope));
  return {
    render(plan = { kind: 'unscoped', targets: [[]] }, uid = 'a') { cursor = 0; effects = []; return hook('bmg_projectSchedules', [], { uid }, { queryPlan: plan }); },
    async mount() { effects.forEach(fn => fn()); await new Promise(resolve => setImmediate(resolve)); },
    snapshot(fromCache = false) { next({ metadata: { fromCache, hasPendingWrites: false }, forEach() {} }); },
    fail() { error(new Error('permission-denied')); },
  };
}
test('schedule stays loading until a server snapshot, including a valid empty result', async () => {
  const h = screen(); assert.equal(h.render()[4]?.status, 'loading'); await h.mount();
  h.snapshot(true); assert.equal(h.render()[4].status, 'loading');
  h.snapshot(); assert.equal(h.render()[4].status, 'ready');
});
test('read errors never masquerade as ready empty schedules', async () => {
  const h = screen(); h.render(); await h.mount(); h.fail();
  assert.equal(h.render()[4]?.status, 'error');
});
test('blocked roster is explicit, and changing account cannot reuse readiness', async () => {
  const h = screen(); h.render(); await h.mount(); h.snapshot();
  assert.equal(h.render(undefined, 'another')[4]?.status, 'loading');
  assert.equal(h.render({ kind: 'blocked', targets: [] })[4]?.status, 'blocked');
});
test('switching query scope cannot show the previous project as ready', async () => {
  const h = screen(); h.render(); await h.mount(); h.snapshot();
  assert.equal(h.render({ kind: 'scoped', targets: [[{ field: 'projectId', operator: '==', value: 'other' }]] })[4].status, 'loading');
});
