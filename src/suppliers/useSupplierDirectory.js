import { useEffect, useState } from 'react';

// Fresh on each activation; no persisted directory or data shared between users.
export function useSupplierDirectory({ auth, user, enabled }) {
  const [state, setState] = useState({ scope: null, status: 'unavailable', suppliers: [] });
  const [attempt, setAttempt] = useState(0);
  const scope = enabled && user ? user.uid : null;
  useEffect(() => {
    if (!scope) { setState({ scope: null, status: 'unavailable', suppliers: [] }); return; }
    const abort = new AbortController();
    setState({ scope, status: 'loading', suppliers: [] });
    (async () => {
      try {
        const token = await user.getIdToken();
        if (abort.signal.aborted || auth.currentUser?.uid !== user.uid) return;
        const response = await fetch('/api/supplier-directory', {
          headers: { Authorization: `Bearer ${token}` }, signal: abort.signal, cache: 'no-store',
        });
        const result = await response.json();
        if (!response.ok || !Array.isArray(result.suppliers)) throw new Error('supplier-directory-unavailable');
        if (!abort.signal.aborted && auth.currentUser?.uid === user.uid) {
          setState({ scope, status: 'ready', suppliers: result.suppliers });
        }
      } catch {
        if (!abort.signal.aborted) setState({ scope, status: 'error', suppliers: [] });
      }
    })();
    return () => abort.abort();
  }, [scope, user, auth, attempt]);
  const visibleState = scope && state.scope === scope ? state : { status: scope ? 'loading' : 'unavailable', suppliers: [] };
  return { ...visibleState, retry: () => setAttempt(value => value + 1) };
}
