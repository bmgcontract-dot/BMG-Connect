import test from 'node:test';
import assert from 'node:assert/strict';
import { browserTestConfig } from '../../src/firebase/browserTestConfig.js';

test('isolated browser config uses only a demo Firebase project on loopback development', () => {
  const config = browserTestConfig({ enabled: true, development: true, hostname: '127.0.0.1' });
  assert.equal(config.projectId, 'demo-bmg-browser');
  assert.equal(config.apiKey, 'emulator-only-not-a-real-key');
});
test('emulator mode fails closed on deployment hosts or production builds', () => {
  assert.throws(() => browserTestConfig({ enabled: true, development: true, hostname: 'bmg-connect.vercel.app' }));
  assert.throws(() => browserTestConfig({ enabled: true, development: false, hostname: 'localhost' }));
  assert.equal(browserTestConfig({ enabled: false, development: false, hostname: 'example.com' }), null);
});
