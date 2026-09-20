const fail = (status, message) => Object.assign(new Error(message), { status });

// Server-only authorization and projection. Never return or spread a full user profile.
export function createScheduleRosterReader({ verifyToken, getProfile, getProject, getStaff }) {
  return async ({ token, projectId }) => {
    if (!token) throw fail(401, 'unauthorized');
    if (typeof projectId !== 'string' || !projectId || projectId.length > 200 || /[/\\]/.test(projectId) || projectId === '.' || projectId === '..') throw fail(400, 'invalid-project');
    let identity;
    try { identity = await verifyToken(token); } catch { throw fail(401, 'unauthorized'); }
    const profile = await getProfile(identity.uid);
    if (!profile || profile.authUid !== identity.uid || profile.status !== 'Active') throw fail(403, 'forbidden');
    const admin = identity.admin === true;
    if (!admin && profile.permissions?.proj_schedule?.view !== true) throw fail(403, 'forbidden');
    const project = await getProject(projectId);
    if (!project || typeof project.name !== 'string') throw fail(404, 'project-not-found');
    const departments = Array.isArray(profile.accessibleDepts) ? profile.accessibleDepts : [];
    if (!admin && profile.department !== project.name && !departments.includes('All') && !departments.includes(project.name)) throw fail(403, 'forbidden');
    const records = await getStaff(project.name);
    if (records.length > 500) throw fail(422, 'roster-too-large');
    const seen = new Set();
    const staff = records.map(record => {
      const id = typeof record.id === 'string' ? record.id : Number.isSafeInteger(record.id) ? String(record.id) : '';
      if (!id || seen.has(id)) throw fail(422, 'invalid-roster-identity');
      seen.add(id);
      return { id, ...Object.fromEntries(['employeeId', 'firstName', 'lastName', 'position'].map(key => [key,
        typeof record[key] === 'string' ? record[key] : key === 'employeeId' && Number.isSafeInteger(record[key]) ? String(record[key]) : '',
      ])) };
    });
    return { projectId, staff };
  };
}
