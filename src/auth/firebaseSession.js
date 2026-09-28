const noop = () => {};

export function startLegacyFirebaseSession({
  auth,
  customToken,
  observeAuth,
  signInWithCustomToken,
  onUser,
  onError = noop,
}) {
  if (!auth || !customToken) {
    return {
      ready: Promise.resolve('local-only'),
      unsubscribe: noop,
    };
  }

  const unsubscribe = observeAuth(auth, (user) => {
    if (user && !user.isAnonymous) onUser(user);
  });

  const ready = signInWithCustomToken(auth, customToken)
    .then(() => 'trusted-token')
    .catch((error) => {
      onError(error);
      return 'unavailable';
    });

  return { ready, unsubscribe };
}
