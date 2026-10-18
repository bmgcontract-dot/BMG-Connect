import { useEffect, useState } from 'react';

// No polling, global cache, localStorage or listener: one scoped request per activation.
export function useScheduleRoster({ auth, user, projectId, enabled, month }) {
  const [state, setState] = useState({ scope: null, status: 'loading', staff: [] });
  const scope = enabled && user ? `${user.uid}:${projectId}:${month || 'current'}` : null;
  useEffect(() => {
    if (!scope) { setState({ scope: null, status: 'unavailable', staff: [] }); return; }
    const abort = new AbortController();
    setState({ scope, status: 'loading', staff: [] });
    (async () => {
      try {
        const token = await user.getIdToken();
        if (abort.signal.aborted || auth.currentUser?.uid !== user.uid) return;
        const response = await fetch(`/api/schedule-roster?projectId=${encodeURIComponent(projectId)}${month ? `&month=${encodeURIComponent(month)}` : ''}`, {
          headers: { Authorization: `Bearer ${token}` }, signal: abort.signal, cache: 'no-store',
        });
        const result = await response.json();
        if (!response.ok || result.projectId !== projectId || !Array.isArray(result.staff) || (month && result.month !== month)) throw new Error('roster-unavailable');
        if (!abort.signal.aborted) setState({ scope, status: 'ready', staff: result.staff });
      } catch {
        if (!abort.signal.aborted) setState({ scope, status: 'error', staff: [] });
      }
    })();
    return () => abort.abort();
  }, [scope, user, auth, projectId, month]);
  return scope && state.scope === scope ? state : { status: scope ? 'loading' : 'unavailable', staff: [] };
}
