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

// Tolerant name comparison: trim, collapse internal whitespace, lowercase.
// Production department/project names have cased and padded variants that must
// still match (e.g. "Head office" vs "Head Office", trailing spaces).
function normalizeName(value) {
  return (typeof value === 'string' ? value : '')
    .trim()
    .replace(/\s+/g, ' ')
    .toLowerCase();
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

  const allowedNames = new Set(
    [user.department, ...departmentList].map(normalizeName).filter(Boolean),
  );

  return projectList.filter((project) => allowedNames.has(normalizeName(project?.name)));
}
