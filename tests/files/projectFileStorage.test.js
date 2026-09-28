import test from 'node:test';
import assert from 'node:assert/strict';

import {
  buildStoragePath,
  buildStorageFileRef,
  isStorageBackedRef,
  uploadProjectFile,
  getProjectFileUrl,
} from '../../src/files/projectFileStorage.js';

test('buildStoragePath: project-docs/{projectId}/{fileId}', () => {
  assert.equal(buildStoragePath('p1', 'f1'), 'project-docs/p1/f1');
  assert.throws(() => buildStoragePath('', 'f1'));
  assert.throws(() => buildStoragePath('p1', ''));
});

test('buildStorageFileRef: minimal cloud ref, isLocal=false', () => {
  const ref = buildStorageFileRef({ fileId: 'f1', name: 'x.pdf', storagePath: 'project-docs/p1/f1', contentType: 'application/pdf', uploadedAt: '2026-09-22T00:00:00Z' });
  assert.deepEqual(ref, {
    fileId: 'f1', name: 'x.pdf', storagePath: 'project-docs/p1/f1',
    contentType: 'application/pdf', uploadedAt: '2026-09-22T00:00:00Z', isLocal: false,
  });
});

test('isStorageBackedRef: true only with a storagePath', () => {
  assert.equal(isStorageBackedRef({ storagePath: 'project-docs/p1/f1' }), true);
  assert.equal(isStorageBackedRef({ fileId: 'f1', isLocal: true }), false); // old local ref
  assert.equal(isStorageBackedRef({}), false);
  assert.equal(isStorageBackedRef(null), false);
});

test('uploadProjectFile: uploads to the right path and returns a cloud ref', async () => {
  const calls = [];
  const sdk = {
    ref: (_s, path) => { calls.push(['ref', path]); return { path }; },
    uploadBytes: async (r, file, meta) => { calls.push(['uploadBytes', r.path, meta.contentType]); },
  };
  const file = { name: 'doc.pdf', type: 'application/pdf' };
  const ref = await uploadProjectFile({ storage: {}, sdk, projectId: 'p1', fileId: 'f9', file, nowIso: 'T' });
  assert.deepEqual(calls, [['ref', 'project-docs/p1/f9'], ['uploadBytes', 'project-docs/p1/f9', 'application/pdf']]);
  assert.equal(ref.storagePath, 'project-docs/p1/f9');
  assert.equal(ref.name, 'doc.pdf');
  assert.equal(ref.isLocal, false);
});

test('getProjectFileUrl: returns a URL for cloud refs, null for local', async () => {
  const sdk = { ref: (_s, p) => ({ p }), getDownloadURL: async (r) => `https://dl/${r.p}` };
  assert.equal(await getProjectFileUrl({ storage: {}, sdk, fileObj: { storagePath: 'project-docs/p1/f1' } }), 'https://dl/project-docs/p1/f1');
  assert.equal(await getProjectFileUrl({ storage: {}, sdk, fileObj: { fileId: 'f1', isLocal: true } }), null);
});
