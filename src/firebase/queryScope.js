const FIRESTORE_IN_LIMIT = 30;

const GLOBAL_COLLECTIONS = new Set([
  'bmg_contractors',
  'bmg_forms_list',
]);

const PROJECT_OWNED_COLLECTIONS = new Set([
  'bmg_contracts',
  'bmg_audits',
  'bmg_dailyReports',
  'bmg_repairs',
  'bmg_assets',
  'bmg_tools',
  'bmg_machines',
  'bmg_pmPlans',
  'bmg_pmHistoryList',
  'bmg_meters',
  'bmg_actionPlans',
  'bmg_othersData',
  'bmg_meetings',
  'bmg_deposits',
  'bmg_inventory',
  'bmg_inventory_transactions',
  'bmg_meeting_gantt_plans',
  'bmg_meeting_invitations',
  'bmg_meeting_proxies',
  'bmg_meeting_ballots',
  'bmg_meeting_attendances',
  'bmg_meeting_agendas',
  'bmg_projectSchedules',
  'bmg_project_events',
]);

function uniqueStrings(values, trim = true) {
  return [...new Set(values
    .filter((value) => typeof value === 'string')
    .map((value) => trim ? value.trim() : value)
    .filter((value) => value.trim().length > 0))];
}

function accessibleDepartmentNames(currentUser) {
  const configured = Array.isArray(currentUser?.accessibleDepts)
    ? currentUser.accessibleDepts
    : (typeof currentUser?.accessibleDepts === 'string'
      ? currentUser.accessibleDepts.split(',')
      : []);

  return uniqueStrings([currentUser?.department, ...configured], false)
    .filter((name) => name !== 'All');
}

function hasGlobalProjectAccess(currentUser) {
  const configured = Array.isArray(currentUser?.accessibleDepts)
    ? currentUser.accessibleDepts
    : (typeof currentUser?.accessibleDepts === 'string'
      ? currentUser.accessibleDepts.split(',').map((value) => value.trim())
      : []);

  return currentUser?.username === 'admin'
    || currentUser?.position === 'Super Admin'
    || configured.includes('All');
}

function hasExplicitPermission(currentUser, menuId, action = 'view') {
  return hasGlobalProjectAccess(currentUser)
    || currentUser?.permissions?.[menuId]?.[action] === true;
}

function createTargets(field, values) {
  // Names are stored authorization keys; trimming them changes the Firestore query.
  const safeValues = uniqueStrings(values, field !== 'name' && field !== 'department');
  if (safeValues.length === 0) return [];

  const targets = [];
  for (let index = 0; index < safeValues.length; index += FIRESTORE_IN_LIMIT) {
    const chunk = safeValues.slice(index, index + FIRESTORE_IN_LIMIT);
    targets.push([{
      field,
      operator: chunk.length === 1 ? '==' : 'in',
      value: chunk.length === 1 ? chunk[0] : chunk,
    }]);
  }
  return targets;
}

function scopedPlan(field, values) {
  const targets = createTargets(field, values);
  return targets.length > 0
    ? { kind: 'scoped', targets }
    : { kind: 'blocked', targets: [] };
}

function accessibleProjectIds(accessibleProjects) {
  return uniqueStrings((Array.isArray(accessibleProjects) ? accessibleProjects : [])
    .map((project) => project?.id));
}

function selectedProjectIsAccessible({ currentUser, selectedProject, accessibleProjects }) {
  if (!selectedProject?.id) return false;
  if (hasGlobalProjectAccess(currentUser)) return true;

  const projectIds = accessibleProjectIds(accessibleProjects);
  if (projectIds.includes(selectedProject.id)) return true;

  return accessibleDepartmentNames(currentUser).includes(selectedProject.name);
}

export function createFirestoreCollectionQueryPlan({
  collectionName,
  currentUser,
  selectedProject = null,
  accessibleProjects = [],
  meters = [],
}) {
  if (!currentUser) return { kind: 'blocked', targets: [] };

  if (collectionName === 'bmg_projects') {
    if (hasGlobalProjectAccess(currentUser)) return { kind: 'unscoped', targets: [[]] };
    return scopedPlan('name', accessibleDepartmentNames(currentUser));
  }

  if (collectionName === 'users' || collectionName === 'bmg_users') {
    if (!hasExplicitPermission(currentUser, 'proj_staff')) {
      return { kind: 'blocked', targets: [] };
    }
    if (hasGlobalProjectAccess(currentUser)) return { kind: 'unscoped', targets: [[]] };
    return scopedPlan('department', accessibleDepartmentNames(currentUser));
  }

  if (GLOBAL_COLLECTIONS.has(collectionName)) {
    return { kind: 'unscoped', targets: [[]] };
  }

  if (collectionName === 'bmg_utilityReadings') {
    const allowedProjectIds = selectedProjectIsAccessible({
      currentUser,
      selectedProject,
      accessibleProjects,
    })
      ? [selectedProject.id]
      : accessibleProjectIds(accessibleProjects);
    const meterIds = (Array.isArray(meters) ? meters : [])
      .filter((meter) => allowedProjectIds.includes(meter?.projectId))
      .map((meter) => meter?.id);
    return scopedPlan('meterId', meterIds);
  }

  if (collectionName === 'bmg_announcements') {
    if (!selectedProject && hasGlobalProjectAccess(currentUser)) {
      return { kind: 'unscoped', targets: [[]] };
    }
    const projectIds = selectedProjectIsAccessible({
      currentUser,
      selectedProject,
      accessibleProjects,
    })
      ? [selectedProject.id]
      : accessibleProjectIds(accessibleProjects);
    return scopedPlan('projectId', ['All', ...projectIds]);
  }

  if (PROJECT_OWNED_COLLECTIONS.has(collectionName)) {
    if (selectedProjectIsAccessible({ currentUser, selectedProject, accessibleProjects })) {
      return scopedPlan('projectId', [selectedProject.id]);
    }
    if (!selectedProject && hasGlobalProjectAccess(currentUser)) {
      return { kind: 'unscoped', targets: [[]] };
    }
    return scopedPlan('projectId', accessibleProjectIds(accessibleProjects));
  }

  return { kind: 'unscoped', targets: [[]] };
}

function matchesFilter(item, filter) {
  const actual = item?.[filter.field];
  if (filter.operator === '==') return actual === filter.value;
  if (filter.operator === 'in') return filter.value.includes(actual);
  if (filter.operator === '>=') return actual >= filter.value;
  if (filter.operator === '<') return actual < filter.value;
  return false;
}

export function filterItemsForQueryPlan(items, plan) {
  const safeItems = Array.isArray(items) ? items : [];
  if (plan?.kind === 'unscoped') return safeItems;
  if (!plan || plan.kind === 'blocked' || plan.targets.length === 0) return [];

  return safeItems.filter((item) => plan.targets.some((filters) => (
    filters.every((filter) => matchesFilter(item, filter))
  )));
}
