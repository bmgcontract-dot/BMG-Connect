import { validateDeployedRoster } from '../src/schedule/deployedRosterVerification.js';

const baseUrl = process.env.BMG_ROSTER_BASE_URL;
const projectId = process.env.BMG_ROSTER_PROJECT_ID;
const token = process.env.BMG_ROSTER_ID_TOKEN;
const expectedStaffIds = (process.env.BMG_ROSTER_EXPECTED_STAFF_IDS || '')
  .split(',')
  .map(value => value.trim())
  .filter(Boolean);

if (!baseUrl || !projectId || !token || expectedStaffIds.length === 0) {
  console.error(
    'Set BMG_ROSTER_BASE_URL, BMG_ROSTER_PROJECT_ID, BMG_ROSTER_ID_TOKEN, and BMG_ROSTER_EXPECTED_STAFF_IDS.',
  );
  process.exitCode = 2;
} else {
  const url = new URL('/api/schedule-roster', baseUrl);
  url.searchParams.set('projectId', projectId);

  const response = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const payload = await response.json().catch(() => ({}));
  const evidence = validateDeployedRoster({
    status: response.status,
    cacheControl: response.headers.get('cache-control'),
    payload,
    projectId,
    expectedStaffIds,
  });

  console.log(JSON.stringify({
    ok: true,
    origin: url.origin,
    ...evidence,
  }));
}
