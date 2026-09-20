const ROSTER_FIELDS = ['employeeId', 'firstName', 'id', 'lastName', 'position'];

export function validateDeployedRoster({ status, cacheControl, payload, projectId }) {
  if (status !== 200) {
    throw new Error(`roster-http-${status}:${payload?.error || 'unexpected-response'}`);
  }
  if (!cacheControl?.split(',').map(value => value.trim()).includes('no-store')) {
    throw new Error('roster-cache-control-missing-no-store');
  }
  if (payload?.projectId !== projectId || !Array.isArray(payload?.staff)) {
    throw new Error('roster-response-shape-invalid');
  }
  if (payload.staff.length > 500) throw new Error('roster-response-too-large');

  const seenIds = new Set();
  for (const person of payload.staff) {
    const keys = Object.keys(person).sort();
    if (JSON.stringify(keys) !== JSON.stringify(ROSTER_FIELDS)) {
      throw new Error('roster-response-fields-invalid');
    }
    if (!person.id || seenIds.has(person.id)) {
      throw new Error('roster-response-identity-invalid');
    }
    seenIds.add(person.id);
  }

  return { projectId, staffCount: payload.staff.length };
}

