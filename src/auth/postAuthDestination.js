export function resolvePostAuthDestination({ user, projects, projectsLoaded }) {
  if (!user) return { kind: 'signed-out' };

  const department = typeof user.department === 'string'
    ? user.department
    : '';

  if (!department.trim() || department === 'Head Office') {
    return { kind: 'global' };
  }

  const project = (Array.isArray(projects) ? projects : [])
    .find((candidate) => candidate?.name === department);

  if (project) {
    return { kind: 'assigned-project', project };
  }

  if (!projectsLoaded) {
    return { kind: 'assigned-project-pending', department };
  }

  return { kind: 'assigned-project-unavailable', department };
}
