// Presence (online / last-active) is stored in its own collection so the client
// can write its OWN heartbeat, because the users collection is read-only to
// clients. A presence doc carries no personal data — only the auth UID and the
// last-active time.

export const PRESENCE_ONLINE_WINDOW_MS = 15 * 60 * 1000; // shown "online" within 15 min
export const PRESENCE_HEARTBEAT_MS = 5 * 60 * 1000;      // write at most every 5 min

// Minimal, non-sensitive shape written to bmg_presence_docs/{authUid}.
export function buildPresenceDoc(authUid, nowIso) {
  return { id: authUid, authUid, lastActive: nowIso };
}

// Should this client write a fresh heartbeat yet? Throttled to PRESENCE_HEARTBEAT_MS.
export function shouldWriteHeartbeat(lastActiveIso, nowMs) {
  const last = lastActiveIso ? new Date(lastActiveIso).getTime() : 0;
  if (!Number.isFinite(last)) return true;
  return nowMs - last > PRESENCE_HEARTBEAT_MS;
}

export function isOnline(lastActiveIso, nowMs) {
  if (!lastActiveIso) return false;
  const last = new Date(lastActiveIso).getTime();
  if (!Number.isFinite(last)) return false;
  return nowMs - last <= PRESENCE_ONLINE_WINDOW_MS;
}

// Merge presence docs (by authUid) onto the user list. Presence lastActive wins
// over the user's own lastLogin when it is newer, so the directory reflects
// cross-device activity. Returns a new array; never mutates input.
export function mergePresenceIntoUsers(users, presenceDocs) {
  const byUid = new Map(
    (Array.isArray(presenceDocs) ? presenceDocs : [])
      .filter((p) => p && p.authUid)
      .map((p) => [p.authUid, p.lastActive]),
  );
  return (Array.isArray(users) ? users : []).map((u) => {
    const presenceActive = byUid.get(u.authUid);
    if (!presenceActive) return u;
    const existing = u.lastLogin ? new Date(u.lastLogin).getTime() : 0;
    const incoming = new Date(presenceActive).getTime();
    if (Number.isFinite(incoming) && incoming > existing) {
      return { ...u, lastLogin: presenceActive };
    }
    return u;
  });
}
