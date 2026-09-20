import { validateDeployedRoster } from '../src/schedule/deployedRosterVerification.js';

const baseUrl = process.env.BMG_ROSTER_BASE_URL || 'https://bmg-connect.vercel.app';
const projectId = process.env.BMG_ROSTER_PROJECT_ID;
const token = process.env.BMG_ROSTER_ID_TOKEN;

if (!projectId || !token) {
  console.error('Set BMG_ROSTER_PROJECT_ID and the short-lived BMG_ROSTER_ID_TOKEN.');
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
  });

  console.log(JSON.stringify({
    ok: true,
    origin: url.origin,
    ...evidence,
  }));
}
