import {
  LEGACY_BUSINESS_KEYS,
  captureLegacyCacheSnapshot,
} from './legacyCacheSnapshot.js';

export const LEGACY_RECOVERY_ORIGIN = 'https://bmg-connect-6b24.vercel.app';
export const LEGACY_STATE_DATABASE = 'BMG_AppState_DB';
export const LEGACY_STATE_STORE = 'state';

function requestResult(request) {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error || new Error('IndexedDB request failed'));
  });
}

async function openExistingStateDatabase(indexedDb) {
  if (!indexedDb || typeof indexedDb.databases !== 'function') {
    throw new Error('indexeddb-database-list-unavailable');
  }

  const databases = await indexedDb.databases();
  if (!databases.some(database => database.name === LEGACY_STATE_DATABASE)) {
    return null;
  }

  const request = indexedDb.open(LEGACY_STATE_DATABASE);
  request.onupgradeneeded = () => {
    request.transaction?.abort();
  };
  return requestResult(request);
}

export async function createLegacyIndexedDbReader(indexedDb) {
  const database = await openExistingStateDatabase(indexedDb);

  return {
    async read(key) {
      if (!database) return undefined;
      if (!database.objectStoreNames.contains(LEGACY_STATE_STORE)) return undefined;

      const transaction = database.transaction(LEGACY_STATE_STORE, 'readonly');
      const request = transaction.objectStore(LEGACY_STATE_STORE).get(key);
      return requestResult(request);
    },
    close() {
      database?.close();
    },
  };
}

export async function captureBrowserLegacyCacheSnapshot({
  browserWindow = window,
  capturedAt = new Date().toISOString(),
  expectedOrigin = LEGACY_RECOVERY_ORIGIN,
} = {}) {
  const sourceOrigin = browserWindow?.location?.origin;
  if (sourceOrigin !== expectedOrigin) {
    throw new Error('legacy-recovery-origin-required');
  }

  const indexedDbReader = await createLegacyIndexedDbReader(browserWindow.indexedDB);
  try {
    return await captureLegacyCacheSnapshot({
      capturedAt,
      sourceOrigin,
      readLocalStorage: key => browserWindow.localStorage.getItem(key),
      readIndexedDb: key => indexedDbReader.read(key),
    });
  } finally {
    indexedDbReader.close();
  }
}

export function summarizeLegacySnapshot(snapshot) {
  const byKey = new Map();
  for (const entry of snapshot?.manifest || []) {
    const current = byKey.get(entry.key) || {
      key: entry.key,
      localStorageCount: null,
      indexedDbCount: null,
      redactedFieldCount: 0,
    };
    if (entry.source === 'localStorage') current.localStorageCount = entry.itemCount;
    if (entry.source === 'indexedDb') current.indexedDbCount = entry.itemCount;
    current.redactedFieldCount += entry.redactedFieldCount;
    byKey.set(entry.key, current);
  }

  const datasets = [...byKey.values()].sort((left, right) => left.key.localeCompare(right.key));
  return {
    scannedKeyCount: LEGACY_BUSINESS_KEYS.length,
    foundKeyCount: datasets.length,
    sourceCopyCount: snapshot?.manifest?.length || 0,
    redactedFieldCount: datasets.reduce((total, item) => total + item.redactedFieldCount, 0),
    warningCount: snapshot?.warnings?.length || 0,
    datasets,
  };
}

