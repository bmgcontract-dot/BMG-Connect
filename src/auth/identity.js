export const DEFAULT_INTERNAL_AUTH_DOMAIN = 'auth.bmg-connect.local';

export function normalizeUsername(username) {
  return String(username ?? '').trim().toLowerCase();
}

function encodeBase64Url(value) {
  const bytes = new TextEncoder().encode(value);
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary)
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/g, '');
}

export function usernameToAuthEmail(username, domain = DEFAULT_INTERNAL_AUTH_DOMAIN) {
  const normalized = normalizeUsername(username);
  if (!normalized) throw new Error('username-required');

  const normalizedDomain = String(domain ?? '').trim().toLowerCase();
  if (!normalizedDomain || normalizedDomain.includes('@')) {
    throw new Error('invalid-auth-domain');
  }

  return `u-${encodeBase64Url(normalized)}@${normalizedDomain}`;
}

export function stripUserSecrets(user) {
  if (!user || typeof user !== 'object') return user;
  const safeUser = { ...user };
  delete safeUser.password;
  delete safeUser.sessionExpiry;
  return safeUser;
}

export function createCurrentUser(profile, { now = Date.now(), sessionExpiry } = {}) {
  if (!profile || typeof profile !== 'object') throw new Error('profile-required');
  if (!profile.authUid) throw new Error('profile-auth-uid-required');

  return {
    ...stripUserSecrets(profile),
    lastLogin: new Date(now).toISOString(),
    sessionExpiry,
  };
}

export function sanitizeUsersForExport(users) {
  return Array.isArray(users) ? users.map(stripUserSecrets) : [];
}
