async function requestAdminUser(auth, method, body) {
  const firebaseUser = auth?.currentUser;
  if (!firebaseUser) throw new Error('auth-session-required');

  const token = await firebaseUser.getIdToken();
  const response = await fetch('/api/admin-users', {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });
  const result = await response.json().catch(() => ({}));
  if (!response.ok) {
    const error = new Error(result.error || 'admin-user-request-failed');
    error.code = result.error || 'admin-user-request-failed';
    throw error;
  }
  return result;
}

export function createAdminUserClient(auth) {
  return {
    create: (profile, password) => requestAdminUser(auth, 'POST', { profile, password }),
    update: (profile, password) => requestAdminUser(auth, 'PATCH', { profile, password }),
    remove: (authUid) => requestAdminUser(auth, 'DELETE', { authUid }),
  };
}
