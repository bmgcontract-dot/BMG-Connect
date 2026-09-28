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
  // Normalize across Firebase SDK versions and Email-Enumeration-Protection:
  // strip the "auth/" prefix and lowercase, and also inspect the raw message
  // (the SDK sometimes surfaces "INVALID_LOGIN_CREDENTIALS" only in the message).
  const rawCode = String(error?.code || '');
  const code = rawCode.replace(/^auth\//i, '').toLowerCase();
  const message = String(error?.message || '').toLowerCase();

  const credentialCodes = new Set([
    'invalid-credential',
    'invalid-login-credentials',
    'invalid_login_credentials',
    'user-not-found',
    'wrong-password',
    'invalid-email',
    'invalid-password',
  ]);
  if (
    credentialCodes.has(code)
    || message.includes('invalid_login_credentials')
    || message.includes('invalid login credentials')
  ) {
    return new BusinessAuthError('invalid-credentials', error);
  }
  if (code === 'user-disabled') {
    return new BusinessAuthError('account-inactive', error);
  }
  if (code === 'too-many-requests') {
    return new BusinessAuthError('too-many-attempts', error);
  }
  if (code === 'network-request-failed') {
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
