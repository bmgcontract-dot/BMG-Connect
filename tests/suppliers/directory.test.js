import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { createSupplierDirectoryReader } from '../../src/suppliers/directoryReader.js';
import { mergeSupplierDirectory } from '../../src/suppliers/directory.js';

function fixture({ identity = {}, profile = {}, contracts = [] } = {}) {
  let reads = 0;
  const read = createSupplierDirectoryReader({
    verifyToken: async () => ({ uid: 'user', ...identity }),
    getProfile: async () => ({ authUid: 'user', status: 'Active', department: 'A', permissions: { proj_contractors: { view: true } }, ...profile }),
    getContracts: async () => { reads++; return contracts; },
  });
  return { read, reads: () => reads };
}

test('supplier-only user and admin see vendors from every project without contract details', async () => {
  const contracts = [
    { id: 'a', projectId: 'a', vendorName: 'Supplier A', type: 'Service (yearly)', category: 'Cleaning', contactPerson: 'Contact A', contactPhone: '123', amount: 90000, files: ['private'] },
    { id: 'b', projectId: 'b', vendorName: 'Supplier B', type: 'Service', projectName: 'Private project', contractStartDate: 'private' },
  ];
  const user = await fixture({ contracts }).read({ token: 'valid' });
  const admin = await fixture({ contracts, identity: { admin: true }, profile: { permissions: {} } }).read({ token: 'valid' });
  assert.deepEqual(user, admin);
  assert.deepEqual(user.suppliers.map(s => s.name), ['Supplier A', 'Supplier B']);
  assert.deepEqual(Object.keys(user.suppliers[0]).sort(), ['id', 'name', 'type', 'category', 'contact', 'phone', 'email', 'status', 'isAuto'].sort());
  assert.equal(user.suppliers[0].type, 'Service');
  assert.equal(user.suppliers[0].phone, '123');
});

test('denies absent/invalid token before data reads', async () => {
  const h = fixture();
  await assert.rejects(h.read({}), e => e.status === 401);
  assert.equal(h.reads(), 0);
  const invalid = createSupplierDirectoryReader({ verifyToken: async () => { throw new Error('private'); } });
  await assert.rejects(invalid({ token: 'invalid' }), e => e.status === 401);
});

for (const profile of [
  { status: 'Inactive' }, { authUid: 'other' }, { permissions: {} },
  { username: 'admin', permissions: {} }, { permissions: { proj_contractors: { view: false } } },
]) test(`denies unauthorized profile ${JSON.stringify(profile)}`, async () => {
  const h = fixture({ profile });
  await assert.rejects(h.read({ token: 'valid' }), e => e.status === 403);
  assert.equal(h.reads(), 0);
});

test('admin must also have an active matching profile', async () => {
  await assert.rejects(fixture({ identity: { admin: true }, profile: { status: 'Inactive' } }).read({ token: 'valid' }), e => e.status === 403);
});

test('deduplicates vendor names and tolerates missing type/contact fields', async () => {
  const result = await fixture({ contracts: [
    { id: '1', vendorName: ' ACME ' },
    { id: '2', vendorName: 'acme', contactPerson: 'Person', contactPhone: '123' },
    { id: '3', vendorName: '  ' }, { id: '4', vendorName: null },
  ] }).read({ token: 'valid' });
  assert.equal(result.suppliers.length, 1);
  assert.equal(result.suppliers[0].name, 'ACME');
  assert.equal(result.suppliers[0].type, '');
  assert.equal(result.suppliers[0].contact, 'Person');
  assert.equal(result.suppliers[0].phone, '123');
});

test('manual supplier wins duplicate and gains missing contact from directory', () => {
  const manual = [{ id: 'manual', name: 'ACME', type: 'Manual', phone: '-' }];
  const result = mergeSupplierDirectory(manual, [{ id: 'auto_1', name: 'acme', type: 'Service', phone: '123', isAuto: true }]);
  assert.equal(result.length, 1);
  assert.equal(result[0].id, 'manual');
  assert.equal(result[0].type, 'Manual');
  assert.equal(result[0].phone, '123');
  assert.equal(manual[0].phone, '-');
});

test('supplier tab consumes activated directory instead of project-scoped cached contracts', () => {
  const app = fs.readFileSync(new URL('../../App.jsx', import.meta.url), 'utf8');
  assert.ok(!app.includes('bmg_contracts_allProjects'));
  assert.match(app, /useSupplierDirectory\(/);
  assert.match(app, /projectTab === 'contractors'/);
  assert.match(app, /mergeSupplierDirectory\(contractors, supplierDirectory.suppliers\)/);
  assert.match(app, /supplierDirectory.status === 'error'/);
});
