const PROJECT_ID = 'bmg-connect-3e99a';
const DATABASE_ID = '(default)';
const API_KEY = 'AIzaSyAy03rxniCLFDYT4ztY_Ry2zh0ddzdBoPE';
const API_ROOT = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/${encodeURIComponent(DATABASE_ID)}/documents`;

async function main() {
  const counts = {
    totalProfiles: 0,
    activeProfiles: 0,
    inactiveProfiles: 0,
    otherStatusProfiles: 0,
    activeAuthUidMismatch: 0,
  };
  let pageToken;

  do {
    const url = new URL(`${API_ROOT}/users`);
    url.searchParams.set('key', API_KEY);
    url.searchParams.set('pageSize', '1000');
    url.searchParams.append('mask.fieldPaths', 'authUid');
    url.searchParams.append('mask.fieldPaths', 'status');
    if (pageToken) url.searchParams.set('pageToken', pageToken);

    const response = await fetch(url, { signal: AbortSignal.timeout(30_000) });
    if (!response.ok) {
      throw new Error(`Readiness audit failed (${response.status}): ${(await response.text()).slice(0, 500)}`);
    }
    const page = await response.json();
    for (const document of page.documents ?? []) {
      const documentId = document.name.split('/').at(-1);
      const status = document.fields?.status?.stringValue;
      const authUid = document.fields?.authUid?.stringValue;
      counts.totalProfiles += 1;
      if (status === 'Active') {
        counts.activeProfiles += 1;
        if (!authUid || authUid !== documentId) counts.activeAuthUidMismatch += 1;
      } else if (status === 'Inactive') {
        counts.inactiveProfiles += 1;
      } else {
        counts.otherStatusProfiles += 1;
      }
    }
    pageToken = page.nextPageToken;
  } while (pageToken);

  console.log(JSON.stringify({
    mode: 'read-only',
    firestoreProject: PROJECT_ID,
    privacy: 'Only authUid and status field masks were requested; no identifiers are printed.',
    ...counts,
    safeToDeployEmergencyAuthGate: counts.activeProfiles > 0 && counts.activeAuthUidMismatch === 0,
  }, null, 2));
}

main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
