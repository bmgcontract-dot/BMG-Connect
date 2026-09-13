import test from 'node:test';
import assert from 'node:assert/strict';
import { buildUserMigrationPlan } from '../../src/auth/migrationPlan.js';

test('builds stable Auth records and password-free profiles', () => {
  const source = [{
    id: 'legacy-1',
    username: ' ADMIN ',
    password: '1234',
    firstName: 'Admin',
    status: 'Active',
  }];

  const first = buildUserMigrationPlan(source);
  const second = buildUserMigrationPlan(source);

  assert.equal(first.canApply, true);
  assert.equal(first.records[0].authUid, second.records[0].authUid);
  assert.equal(first.records[0].profile.username, 'admin');
  assert.equal(first.records[0].profile.id, 'legacy-1');
  assert.equal(first.records[0].password, '1234');
  assert.equal('password' in first.records[0].profile, false);
});

test('blocks migration when normalized usernames collide', () => {
  const plan = buildUserMigrationPlan([
    { id: 'one', username: 'Admin', password: 'one' },
    { id: 'two', username: ' admin ', password: 'two' },
  ]);

  assert.equal(plan.canApply, false);
  assert.deepEqual(plan.issues, [
    {
      index: 1,
      legacyId: 'two',
      code: 'duplicate-username',
      conflictsWithIndex: 0,
      conflictsWithLegacyId: 'one',
    },
  ]);
});

test('keeps the configured canonical record when duplicate usernames are equivalent', () => {
  const plan = buildUserMigrationPlan([
    { id: 'old', username: 'Admin', password: 'same' },
    { id: 'u1', username: ' admin ', password: 'same' },
  ], { canonicalLegacyIds: { admin: 'u1' } });

  assert.equal(plan.canApply, true);
  assert.deepEqual(plan.records.map(record => record.profile.legacyId), ['u1']);
});

test('blocks incomplete legacy records without logging secrets', () => {
  const plan = buildUserMigrationPlan([{ username: '', password: '' }]);

  assert.equal(plan.canApply, false);
  assert.deepEqual(plan.issues.map(issue => issue.code), [
    'missing-id',
    'missing-username',
    'missing-password',
  ]);
  assert.equal(JSON.stringify(plan.issues).includes('password'), true);
  assert.equal(JSON.stringify(plan.issues).includes('1234'), false);
});
