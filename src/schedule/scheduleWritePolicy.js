import { clock } from '../platform/clock.js';

// Add a project/month only after a fresh audit confirms its ownership and cells.
// October 13: Tawan pilot plus reviewed empty October months for Life in the
// Garden Ban Chang and Head office. Evidence reviewed locally; server
// activation remains operator-controlled. Never populate this from current
// employee departments or from the absence of a legacy fallback.
export const VERIFIED_SCHEDULE_SCOPES = Object.freeze([
  { projectId: 'r7n92q0md', month: '2026-10' },
  { projectId: 'nasqxexpr', month: '2026-10' },
  { projectId: 'vg0zs4rlr', month: '2026-10' },
]);

export const ROLLING_SCHEDULE_PROJECTS = Object.freeze(['r7n92q0md', 'nasqxexpr', 'vg0zs4rlr']);
export const ROLLING_SCHEDULE_FROM_MONTH = '2026-11';
const monthIndex = month => Number(month.slice(0, 4)) * 12 + Number(month.slice(5, 7)) - 1;

export function scheduleWriteAccess({
  projectId, month, emergencyLocked = true,
  verifiedScopes = VERIFIED_SCHEDULE_SCOPES, currentMonth = clock.thisMonth(),
  rollingProjects = ROLLING_SCHEDULE_PROJECTS, rollingFromMonth = ROLLING_SCHEDULE_FROM_MONTH,
}) {
  if (emergencyLocked) return { allowed: false, reason: 'ปิดการบันทึกตารางงานชั่วคราวทั้งระบบ' };
  if (!projectId || !/^\d{4}-(0[1-9]|1[0-2])$/.test(month ?? '')) {
    return { allowed: false, reason: 'ยังไม่ยืนยันโครงการและเดือนของตารางงาน' };
  }
  const currentOrNext = /^\d{4}-(0[1-9]|1[0-2])$/.test(currentMonth)
    && monthIndex(month) >= monthIndex(currentMonth) && monthIndex(month) <= monthIndex(currentMonth) + 1;
  if (!currentOrNext) return { allowed: false, reason: 'แก้ไขได้เฉพาะเดือนปัจจุบันและเดือนถัดไป เดือนอื่นเปิดให้อ่านและส่งออก' };
  const exact = month === currentMonth && verifiedScopes.some(scope => scope.projectId === projectId && scope.month === month);
  const rolling = /^\d{4}-(0[1-9]|1[0-2])$/.test(rollingFromMonth)
    && monthIndex(month) >= monthIndex(rollingFromMonth) && rollingProjects.includes(projectId);
  if (!exact && !rolling) {
    return { allowed: false, reason: 'โครงการและเดือนนี้ยังไม่ผ่านการยืนยันความครบถ้วนของข้อมูล' };
  }
  return { allowed: true, reason: '' };
}
