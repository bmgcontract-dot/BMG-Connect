const MONTH_PATTERN = /^\d{4}-(0[1-9]|1[0-2])$/;

function splitProjectMonth(key) {
  if (typeof key !== 'string' || key.length < 8) return null;
  const month = key.slice(-7);
  if (key.at(-8) !== '_' || !MONTH_PATTERN.test(month)) return null;
  return { projectId: key.slice(0, -8), month };
}

function emptyRecord(projectId, month, migratedAt) {
  return {
    id: `${projectId}_${month}`,
    projectId,
    month,
    schemaVersion: 1,
    schedules: {},
    note: '',
    approval: {},
    staffOrder: [],
    legacyMigration: {
      source: 'project-keyed-metadata',
      migratedAt,
    },
  };
}

export function buildAuthoritativeProjectScheduleRecords({
  notes = {},
  approvals = {},
  staffOrder = {},
  projectIds = [],
  currentMonth,
  migratedAt,
}) {
  if (!MONTH_PATTERN.test(currentMonth ?? '')) {
    throw new Error('currentMonth must use YYYY-MM format.');
  }

  const knownProjectIds = new Set(projectIds);
  const records = new Map();
  const unresolved = {
    noteKeys: [],
    approvalKeys: [],
    staffOrderProjectIds: [],
  };
  let migratedNotes = 0;
  let migratedApprovals = 0;
  let migratedStaffOrders = 0;

  const recordFor = (projectId, month) => {
    const id = `${projectId}_${month}`;
    if (!records.has(id)) records.set(id, emptyRecord(projectId, month, migratedAt));
    return records.get(id);
  };

  for (const [key, note] of Object.entries(notes ?? {})) {
    const identity = splitProjectMonth(key);
    if (!identity || !knownProjectIds.has(identity.projectId) || typeof note !== 'string') {
      unresolved.noteKeys.push(key);
      continue;
    }
    recordFor(identity.projectId, identity.month).note = note;
    migratedNotes += 1;
  }

  for (const [key, approval] of Object.entries(approvals ?? {})) {
    const identity = splitProjectMonth(key);
    if (!identity || !knownProjectIds.has(identity.projectId)
      || !approval || typeof approval !== 'object' || Array.isArray(approval)) {
      unresolved.approvalKeys.push(key);
      continue;
    }
    recordFor(identity.projectId, identity.month).approval = approval;
    migratedApprovals += 1;
  }

  for (const [projectId, order] of Object.entries(staffOrder ?? {})) {
    if (!knownProjectIds.has(projectId) || !Array.isArray(order)) {
      unresolved.staffOrderProjectIds.push(projectId);
      continue;
    }
    recordFor(projectId, currentMonth).staffOrder = order;
    migratedStaffOrders += 1;
  }

  const sortedRecords = [...records.values()].sort((left, right) => left.id.localeCompare(right.id));
  unresolved.noteKeys.sort();
  unresolved.approvalKeys.sort();
  unresolved.staffOrderProjectIds.sort();

  return {
    records: sortedRecords,
    report: {
      recordCount: sortedRecords.length,
      migratedNotes,
      migratedApprovals,
      migratedStaffOrders,
      skippedScheduleCells: true,
      unresolved,
    },
  };
}
