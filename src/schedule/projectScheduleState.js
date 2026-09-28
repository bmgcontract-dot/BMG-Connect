function documentId(projectId, month) {
  return `${projectId}_${month}`;
}

export function upsertProjectSchedule(records, { projectId, month, update }) {
  const list = Array.isArray(records) ? records : [];
  const id = documentId(projectId, month);
  const existing = list.find((record) => record?.id === id);
  const latestProjectRecord = list
    .filter((record) => record?.projectId === projectId && Array.isArray(record?.staffOrder))
    .sort((left, right) => String(right.month).localeCompare(String(left.month)))[0];
  const next = {
    id,
    projectId,
    month,
    schemaVersion: 1,
    schedules: {},
    note: '',
    approval: {},
    staffOrder: latestProjectRecord?.staffOrder ?? [],
    ...existing,
    ...update,
  };

  return existing
    ? list.map((record) => record?.id === id ? next : record)
    : [...list, next];
}

export function deriveProjectScheduleViews(records, projectId) {
  const projectRecords = (Array.isArray(records) ? records : [])
    .filter((record) => !projectId || record?.projectId === projectId)
    .sort((left, right) => String(left.month).localeCompare(String(right.month)));
  const views = {
    schedules: {},
    scheduleNotes: {},
    scheduleApprovals: {},
    projectStaffOrder: {},
  };

  for (const record of projectRecords) {
    Object.assign(views.schedules, record.schedules ?? {});
    const key = documentId(record.projectId, record.month);
    if (typeof record.note === 'string') views.scheduleNotes[key] = record.note;
    if (record.approval && typeof record.approval === 'object') {
      views.scheduleApprovals[key] = record.approval;
    }
    if (Array.isArray(record.staffOrder)) {
      views.projectStaffOrder[record.projectId] = record.staffOrder;
    }
  }

  return views;
}
