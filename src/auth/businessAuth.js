import {
  createCurrentUser,
  usernameToAuthEmail,
} from './identity.js';

export class BusinessAuthError extends Error {
  constructor(code, cause) {
    super(code);
    this.name = 'BusinessAuthError';
    this.code = code;
    this.cause = cause;
  }
}

function assertActiveProfile(profile) {
  if (!profile) throw new BusinessAuthError('profile-not-found');
  if (profile.status !== 'Active') throw new BusinessAuthError('account-inactive');
}

function mapSignInError(error) {
  const code = error?.code || '';
  if (
    code === 'auth/invalid-credential' ||
    code === 'auth/user-not-found' ||
    code === 'auth/wrong-password' ||
    code === 'auth/invalid-email'
  ) {
    return new BusinessAuthError('invalid-credentials', error);
  }
  if (code === 'auth/user-disabled') {
    return new BusinessAuthError('account-inactive', error);
  }
  if (code === 'auth/too-many-requests') {
    return new BusinessAuthError('too-many-attempts', error);
  }
  if (code === 'auth/network-request-failed') {
    return new BusinessAuthError('network-error', error);
  }
  return new BusinessAuthError('auth-unavailable', error);
}

export function createBusinessAuth({
  signInWithEmail,
  signOut,
  loadProfile,
  authDomain,
  getSessionExpiry,
  now = () => Date.now(),
}) {
  if (!signInWithEmail || !signOut || !loadProfile || !getSessionExpiry) {
    throw new Error('business-auth-dependencies-required');
  }

  async function currentUserFromFirebaseUser(firebaseUser) {
    if (!firebaseUser) return null;
    const profile = await loadProfile(firebaseUser.uid);
    assertActiveProfile(profile);
    return createCurrentUser(
      { ...profile, authUid: firebaseUser.uid },
      { now: now(), sessionExpiry: getSessionExpiry() },
    );
  }

  return {
    async signIn(username, password) {
      let credential;
      try {
        credential = await signInWithEmail(
          usernameToAuthEmail(username, authDomain),
          password,
        );
      } catch (error) {
        throw mapSignInError(error);
      }

      try {
        const currentUser = await currentUserFromFirebaseUser(credential.user);
        return { firebaseUser: credential.user, currentUser };
      } catch (error) {
        await signOut();
        throw error;
      }
    },

    restore: currentUserFromFirebaseUser,
    signOut,
  };
}
