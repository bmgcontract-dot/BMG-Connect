import test from 'node:test';
import assert from 'node:assert/strict';

import { createFirestoreSubscriptionPolicy } from '../../src/firebase/subscriptionPolicy.js';

test('signed-out users do not open Firestore collection subscriptions', () => {
  const policy = createFirestoreSubscriptionPolicy({
    firebaseUser: null,
    currentUser: null,
    activeMenu: 'dashboard',
    selectedProject: null,
    projectTab: 'overview',
  });

  assert.equal(policy.userFor('bmg_projects'), null);
  assert.equal(policy.userFor('bmg_audits'), null);
});

test('dashboard opens only the collections used by the dashboard', () => {
  const firebaseUser = { uid: 'auth-123', isAnonymous: false };
  const policy = createFirestoreSubscriptionPolicy({
    firebaseUser,
    currentUser: {
      authUid: 'auth-123',
      status: 'Active',
      permissions: { proj_schedule: { view: true } },
    },
    activeMenu: 'dashboard',
    selectedProject: null,
    projectTab: 'overview',
  });

  assert.equal(policy.userFor('bmg_projects'), firebaseUser);
  assert.equal(policy.userFor('bmg_audits'), firebaseUser);
  assert.equal(policy.userFor('bmg_projectSchedules'), firebaseUser);
  assert.equal(policy.userFor('bmg_inventory'), null);
});

test('dashboard does not subscribe to schedule data without schedule permission', () => {
  const firebaseUser = { uid: 'auth-123', isAnonymous: false };
  const policy = createFirestoreSubscriptionPolicy({
    firebaseUser,
    currentUser: { authUid: 'auth-123', status: 'Active', permissions: {} },
    activeMenu: 'dashboard',
    selectedProject: null,
    projectTab: 'overview',
  });

  assert.equal(policy.userFor('bmg_projectSchedules'), null);
});

test('a project tools tab subscribes to tools and core project data only', () => {
  const firebaseUser = { uid: 'auth-123', isAnonymous: false };
  const policy = createFirestoreSubscriptionPolicy({
    firebaseUser,
    currentUser: {
      authUid: 'auth-123',
      status: 'Active',
      permissions: { proj_schedule: { view: true } },
    },
    activeMenu: 'projects',
    selectedProject: { id: 'project-1' },
    projectTab: 'tools',
  });

  assert.equal(policy.userFor('bmg_projects'), firebaseUser);
  assert.equal(policy.userFor('bmg_tools'), firebaseUser);
  assert.equal(policy.userFor('bmg_audits'), null);
  assert.equal(policy.userFor('bmg_inventory'), null);
});

test('Firestore access requires a non-anonymous user and an active profile with the same Auth UID', () => {
  const firebaseUser = { uid: 'auth-123', isAnonymous: false };
  const context = {
    firebaseUser,
    activeMenu: 'dashboard',
    selectedProject: null,
    projectTab: 'overview',
  };

  assert.equal(createFirestoreSubscriptionPolicy({
    ...context,
    currentUser: { status: 'Active' },
  }).userFor('bmg_projects'), null);
  assert.equal(createFirestoreSubscriptionPolicy({
    ...context,
    currentUser: { authUid: 'another-user', status: 'Active' },
  }).userFor('bmg_projects'), null);
  assert.equal(createFirestoreSubscriptionPolicy({
    ...context,
    firebaseUser: { uid: 'auth-123', isAnonymous: true },
    currentUser: { authUid: 'auth-123', status: 'Active' },
  }).userFor('bmg_projects'), null);
  assert.equal(createFirestoreSubscriptionPolicy({
    ...context,
    currentUser: { authUid: 'auth-123', status: 'Inactive' },
  }).userFor('bmg_projects'), null);
});

test('project schedule data syncs on the dashboard and project schedule tab only', () => {
  const firebaseUser = { uid: 'auth-123', isAnonymous: false };
  const context = {
    firebaseUser,
    currentUser: {
      authUid: 'auth-123',
      status: 'Active',
      permissions: { proj_schedule: { view: true } },
    },
    activeMenu: 'projects',
    selectedProject: { id: 'project-1' },
  };

  assert.equal(createFirestoreSubscriptionPolicy({
    ...context,
    projectTab: 'schedule',
  }).userFor('bmg_projectSchedules'), firebaseUser);
  assert.equal(createFirestoreSubscriptionPolicy({
    ...context,
    projectTab: 'tools',
  }).userFor('bmg_projectSchedules'), null);
});
