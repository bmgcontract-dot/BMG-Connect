export function createFirestoreSubscriptionPolicy({
  firebaseUser,
  currentUser,
  activeMenu,
  selectedProject,
  projectTab,
}) {
  const isVerifiedBusinessUser = Boolean(
    firebaseUser &&
    !firebaseUser.isAnonymous &&
    currentUser &&
    currentUser.status === 'Active' &&
    currentUser.authUid === firebaseUser.uid,
  );
  const canViewProjectSchedules = Boolean(
    currentUser?.username === 'admin'
    || currentUser?.position === 'Super Admin'
    || currentUser?.permissions?.proj_schedule?.view === true,
  );

  const globalMenuCollections = {
    dashboard: [
      'bmg_projects', 'bmg_users', 'users', 'bmg_actionPlans',
      'bmg_announcements', 'bmg_audits', 'bmg_dailyReports',
      'bmg_pmHistoryList', 'bmg_pmPlans', 'bmg_projectSchedules',
    ],
    users: ['bmg_users', 'users', 'bmg_projects', 'bmg_rolePermissions'],
    projects: ['bmg_projects'],
    audits: ['bmg_projects', 'bmg_audits'],
    announcements: ['bmg_projects', 'bmg_announcements'],
    manual: [],
  };
  const alwaysActiveData = new Set(['bmg_companyInfo']);

  const projectTabCollections = {
    overview: [
      'bmg_projects', 'bmg_users', 'users', 'bmg_contracts',
      'bmg_dailyReports', 'bmg_repairs', 'bmg_pmPlans',
      'bmg_pmHistoryList', 'bmg_meters', 'bmg_actionPlans',
      'bmg_audits', 'bmg_announcements', 'bmg_project_events',
      'bmg_deposits', 'bmg_companyInfo',
    ],
    centralfee: ['bmg_projects'],
    contracts: ['bmg_projects', 'bmg_contracts'],
    staff: ['bmg_projects', 'bmg_users', 'users'],
    schedule: [
      'bmg_projects', 'bmg_users', 'users', 'bmg_dailyReports',
      'bmg_projectSchedules',
    ],
    daily: ['bmg_projects', 'bmg_dailyReports'],
    assets: ['bmg_projects', 'bmg_assets'],
    tools: ['bmg_projects', 'bmg_tools'],
    pm: ['bmg_projects', 'bmg_machines', 'bmg_pmPlans', 'bmg_pmHistoryList'],
    repair: ['bmg_projects', 'bmg_repairs'],
    utilities: ['bmg_projects', 'bmg_meters', 'bmg_utilityReadings'],
    action: ['bmg_projects', 'bmg_actionPlans'],
    audit: ['bmg_projects', 'bmg_audits'],
    forms: ['bmg_projects', 'bmg_forms_list'],
    contractors: ['bmg_projects', 'bmg_contractors'],
    meeting: [
      'bmg_projects', 'bmg_meetings', 'bmg_meeting_invitations',
      'bmg_meeting_proxies', 'bmg_meeting_ballots',
      'bmg_meeting_attendances', 'bmg_meeting_agendas',
      'bmg_meeting_gantt_plans', 'bmg_meeting_land_docs',
    ],
    inventory: ['bmg_projects', 'bmg_inventory', 'bmg_inventory_transactions'],
    others: ['bmg_projects', 'bmg_othersData'],
  };

  return {
    userFor(collectionName) {
      if (!isVerifiedBusinessUser) return null;
      if (collectionName === 'bmg_projectSchedules' && !canViewProjectSchedules) return null;
      if (!selectedProject && activeMenu === 'settings') return firebaseUser;
      if (alwaysActiveData.has(collectionName)) return firebaseUser;

      const activeCollections = selectedProject
        ? projectTabCollections[projectTab] || []
        : globalMenuCollections[activeMenu] || [];

      return activeCollections.includes(collectionName) ? firebaseUser : null;
    },
  };
}
