export function initializeFirebaseBrowserAuth({
  app,
  initializeAuth,
  indexedDBLocalPersistence,
  browserLocalPersistence,
}) {
  if (
    !app ||
    !initializeAuth ||
    !indexedDBLocalPersistence ||
    !browserLocalPersistence
  ) {
    throw new Error('firebase-browser-auth-dependencies-required');
  }

  return initializeAuth(app, {
    persistence: [indexedDBLocalPersistence, browserLocalPersistence],
  });
}
