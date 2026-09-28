import test from 'node:test';
import assert from 'node:assert/strict';

import { resolveAuthMode } from '../../src/auth/authMode.js';

test('Firebase Auth is the safe default and legacy mode requires an explicit setting', () => {
  assert.equal(resolveAuthMode(undefined), 'firebase');
  assert.equal(resolveAuthMode(''), 'firebase');
  assert.equal(resolveAuthMode('firebase'), 'firebase');
  assert.equal(resolveAuthMode('legacy'), 'legacy');
});
