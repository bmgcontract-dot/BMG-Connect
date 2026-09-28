import test from 'node:test';
import assert from 'node:assert/strict';

import { fileObjectHasContent } from '../../src/files/fileRef.js';

test('empty slot {} is NOT a file (the dead-download-button bug)', () => {
  assert.equal(fileObjectHasContent({}), false);
});

test('null / undefined / non-object are not files', () => {
  assert.equal(fileObjectHasContent(null), false);
  assert.equal(fileObjectHasContent(undefined), false);
  assert.equal(fileObjectHasContent(123), false);
});

test('a stored local file (fileId) is a file', () => {
  assert.equal(fileObjectHasContent({ fileId: 'abc', name: 'x.pdf', isLocal: true }), true);
});

test('inline base64 data is a file', () => {
  assert.equal(fileObjectHasContent({ data: 'data:application/pdf;base64,AAAA' }), true);
});

test('a fileUrl is a file', () => {
  assert.equal(fileObjectHasContent({ fileUrl: 'https://…/x.pdf' }), true);
});

test('a non-empty filename string is a file; blank string is not', () => {
  assert.equal(fileObjectHasContent('contract.pdf'), true);
  assert.equal(fileObjectHasContent('   '), false);
  assert.equal(fileObjectHasContent(''), false);
});

test('a slot with only name/isLocal but no fileId/data/url is NOT downloadable', () => {
  // name alone cannot be fetched — matches the download handler's real needs.
  assert.equal(fileObjectHasContent({ name: 'x.pdf', isLocal: true }), false);
});
