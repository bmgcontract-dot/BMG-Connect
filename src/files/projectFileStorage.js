// Firebase Storage integration for project document attachments.
// Files live at project-docs/{projectId}/{fileId}; Firestore stores only a
// lightweight reference {fileId, name, storagePath, contentType, uploadedAt}.
// This replaces the old base64/isLocal-in-IndexedDB approach so any device can
// download after any device uploads.

// --- pure helpers (unit-testable, no Firebase) ---

export function buildStoragePath(projectId, fileId) {
  if (!projectId || !fileId) throw new Error('projectId-and-fileId-required');
  return `project-docs/${projectId}/${fileId}`;
}

// The reference persisted into the project's files.{slot} map.
export function buildStorageFileRef({ fileId, name, storagePath, contentType, uploadedAt }) {
  return {
    fileId,
    name: name || '',
    storagePath,
    contentType: contentType || '',
    uploadedAt: uploadedAt || null,
    isLocal: false,
  };
}

// A ref points at cloud storage when it has a storagePath.
export function isStorageBackedRef(fileObj) {
  return Boolean(fileObj && typeof fileObj === 'object' && fileObj.storagePath);
}

// --- Firebase Storage wrappers (thin; injected SDK so tests stay pure) ---

// Upload a File/Blob to Storage and return the persisted Firestore ref.
// `storage` is a getStorage() instance; `sdk` supplies ref/uploadBytes/etc.
export async function uploadProjectFile({ storage, sdk, projectId, fileId, file, name, nowIso }) {
  const path = buildStoragePath(projectId, fileId);
  const storageRef = sdk.ref(storage, path);
  await sdk.uploadBytes(storageRef, file, { contentType: file.type || 'application/octet-stream' });
  return buildStorageFileRef({
    fileId,
    name: name || file.name,
    storagePath: path,
    contentType: file.type || '',
    uploadedAt: nowIso,
  });
}

// Resolve a temporary download URL for a storage-backed ref.
export async function getProjectFileUrl({ storage, sdk, fileObj }) {
  if (!isStorageBackedRef(fileObj)) return null;
  const storageRef = sdk.ref(storage, fileObj.storagePath);
  return sdk.getDownloadURL(storageRef);
}

export async function deleteProjectFile({ storage, sdk, fileObj }) {
  if (!isStorageBackedRef(fileObj)) return;
  const storageRef = sdk.ref(storage, fileObj.storagePath);
  await sdk.deleteObject(storageRef);
}
