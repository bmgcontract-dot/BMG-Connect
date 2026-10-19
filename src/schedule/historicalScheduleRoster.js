import { scheduleDocumentEqual } from './scheduleDocumentEqual.js';

export const HISTORICAL_ROSTER_PROJECTS = Object.freeze(['ioblbvq9p', 'vivwmaynf', 'vzdknz8j1', 'z8z448en8']);
export const historicalRosterScope = (projectId, month) => month === '2026-10' && HISTORICAL_ROSTER_PROJECTS.includes(projectId);
const owner = key => /^(.*)_\d{4}-\d{2}-\d{2}(?:_act)?$/.exec(key)?.[1];
const projection = row => ({ id: row.id, ...Object.fromEntries(['employeeId', 'firstName', 'lastName', 'position'].map(k => [k, typeof row[k] === 'string' ? row[k] : ''])) });

// Configuration is read only by the authorized server from an operator-reviewed
// document, never supplied by the caller. It contains projections, not accounts.
export function buildHistoricalScheduleRoster({ projectId, month, currentStaff, config, schedule }) {
  if (!historicalRosterScope(projectId, month) || config?.projectId !== projectId || config?.month !== month
      || config?.status !== 'reviewed' || !Array.isArray(config.rows) || !schedule || schedule.projectId !== projectId || schedule.month !== month) {
    throw new Error('historical-roster-not-reviewed');
  }
  const staff = currentStaff.map(projection), seen = new Set(staff.map(row => row.id));
  for (const row of config.rows) {
    if (typeof row.id !== 'string' || !row.id || seen.has(row.id) || row.confirmedMonth !== month) throw new Error('invalid-historical-roster');
    seen.add(row.id);
    staff.push({ ...projection(row), scheduleHistorical: true, scheduleReadOnly: false });
  }
  const cells = schedule.schedules || {};
  for (const key of Object.keys(cells)) {
    const id = owner(key);
    if (!id || !key.includes(`_${month}-`)) throw new Error('invalid-schedule-cell');
    if (!seen.has(id)) {
      seen.add(id);
      staff.push({ id, employeeId: '', firstName: 'ไม่ทราบตัวตน', lastName: '(ข้อมูลเดิม)', position: 'อ่านอย่างเดียว', scheduleHistorical: true, scheduleReadOnly: true });
    }
  }
  if (staff.length > 500) throw new Error('roster-too-large');
  return staff;
}

export function assertProtectedScheduleRowsUnchanged(before, after, ids = []) {
  const protectedIds = new Set(ids);
  const pick = record => Object.fromEntries(Object.entries(record?.schedules || {}).filter(([key]) => protectedIds.has(owner(key))));
  if (!scheduleDocumentEqual(pick(before), pick(after))) throw new Error('ข้อมูลแถวที่ยังไม่ทราบตัวตนเปิดให้อ่านอย่างเดียว ห้ามแก้ไขหรือลบ');
}
