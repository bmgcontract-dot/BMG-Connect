export function hasUserPermission(user, menuId, action = 'view') {
  if (!user) return false;
  if (user.username === 'admin' || user.position === 'Super Admin') return true;

  const permissions = user.permissions || {};

  if (
    menuId.startsWith('proj_')
    && action === 'view'
    && (!permissions[menuId] || permissions[menuId].view === undefined)
  ) {
    return true;
  }

  if (menuId === 'projects' && action === 'view') {
    const departments = user.accessibleDepts;
    const departmentList = Array.isArray(departments)
      ? departments
      : (typeof departments === 'string' ? departments.split(', ').filter(Boolean) : []);
    if (departmentList.length > 0) return true;
  }

  return Boolean(permissions[menuId]?.[action]);
}

export function filterAccessibleProjects({ user, projects }) {
  const projectList = Array.isArray(projects) ? projects : [];
  if (!user) return [];
  if (user.username === 'admin' || user.position === 'Super Admin') return projectList;

  const departments = user.accessibleDepts;
  const departmentList = Array.isArray(departments)
    ? departments
    : (typeof departments === 'string' ? departments.split(', ').filter(Boolean) : []);

  if (departmentList.includes('All')) return projectList;

  return projectList.filter((project) => (
    project?.name === user.department || departmentList.includes(project?.name)
  ));
}
