// Normalize a department/project name for tolerant comparison: trim, collapse
// internal whitespace, and lowercase. Production data contains cased and padded
// variants (e.g. "Head office", "Head Office", trailing spaces on project names)
// that must still match.
function normalizeName(value) {
  return (typeof value === 'string' ? value : '')
    .trim()
    .replace(/\s+/g, ' ')
    .toLowerCase();
}

const HEAD_OFFICE = normalizeName('Head Office');

export function resolvePostAuthDestination({ user, projects, projectsLoaded }) {
  if (!user) return { kind: 'signed-out' };

  const department = typeof user.department === 'string'
    ? user.department
    : '';
  const normalizedDepartment = normalizeName(department);

  if (!normalizedDepartment || normalizedDepartment === HEAD_OFFICE) {
    return { kind: 'global' };
  }

  const project = (Array.isArray(projects) ? projects : [])
    .find((candidate) => normalizeName(candidate?.name) === normalizedDepartment);

  if (project) {
    return { kind: 'assigned-project', project };
  }

  if (!projectsLoaded) {
    return { kind: 'assigned-project-pending', department };
  }

  return { kind: 'assigned-project-unavailable', department };
}
