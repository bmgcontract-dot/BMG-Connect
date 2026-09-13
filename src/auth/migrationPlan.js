import { createHash } from 'node:crypto';
import {
  normalizeUsername,
  stripUserSecrets,
  usernameToAuthEmail,
} from './identity.js';

function stableAuthUid(legacyId) {
  const digest = createHash('sha256').update(String(legacyId)).digest('base64url');
  return `bmg-${digest.slice(0, 24)}`;
}

export function buildUserMigrationPlan(users, { authDomain, canonicalLegacyIds = {} } = {}) {
  const sourceUsers = Array.isArray(users) ? users : [];
  const seenUsernames = new Map();
  const issues = [];
  const records = [];

  sourceUsers.forEach((legacyUser, index) => {
    const username = normalizeUsername(legacyUser?.username);
    const password = legacyUser?.password;
    const legacyId = legacyUser?.id;

    if (!legacyId) issues.push({ index, code: 'missing-id' });
    if (!username) issues.push({ index, code: 'missing-username' });
    if (typeof password !== 'string' || password.length === 0) {
      issues.push({ index, code: 'missing-password' });
    }

    const canonicalLegacyId = username ? canonicalLegacyIds[username] : undefined;
    const isCanonicalDuplicate = Boolean(canonicalLegacyId && legacyId === canonicalLegacyId);

    if (username) {
      if (seenUsernames.has(username)) {
        const conflict = seenUsernames.get(username);
        const conflictIsCanonical = canonicalLegacyIds[username] === conflict.legacyId;
        if (!canonicalLegacyId && !isCanonicalDuplicate && !conflictIsCanonical) {
          issues.push({
            index,
            legacyId,
            code: 'duplicate-username',
            conflictsWithIndex: conflict.index,
            conflictsWithLegacyId: conflict.legacyId,
          });
        }
      } else {
        seenUsernames.set(username, { index, legacyId });
      }
    }

    if (!legacyId || !username || typeof password !== 'string' || !password) return;

    const authUid = stableAuthUid(legacyId);
    if (canonicalLegacyId && legacyId !== canonicalLegacyId) return;

    records.push({
      authUid,
      authEmail: usernameToAuthEmail(username, authDomain),
      password,
      profile: {
        ...stripUserSecrets(legacyUser),
        id: legacyId,
        legacyId,
        authUid,
        authEmail: usernameToAuthEmail(username, authDomain),
        username,
        schemaVersion: 2,
      },
    });
  });

  return {
    sourceCount: sourceUsers.length,
    records,
    issues,
    canApply: sourceUsers.length > 0 && issues.length === 0,
  };
}
