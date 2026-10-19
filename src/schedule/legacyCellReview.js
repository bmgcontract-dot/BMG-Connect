import { scheduleDocumentEqual } from './scheduleDocumentEqual.js';
import { buildAdminLegacyScheduleFallback } from './adminLegacyScheduleFallback.js';

export function reviewedLegacyCellKeys(record, source) {
  return Object.entries(record?.legacyCellReviews || {}).filter(([key, review]) =>
    review && ['import', 'keep-current'].includes(review.decision) && review.actorUid && review.reviewedAt
    && Object.hasOwn(source, key) && review.sourceValue === source[key]).map(([key]) => key);
}

export function legacyReviewCells({ record, month, staff, staffAliases = {}, legacySchedules }) {
  const ids = staff.map(row => row.id);
  if (ids.some(id => typeof id !== 'string' || !id) || new Set(ids).size !== ids.length) throw new Error('รายชื่อมีรหัสซ้ำหรือไม่ถูกต้อง');
  const identities = new Map();
  for (const id of ids) for (const alias of [id, ...(staffAliases[id] || [])]) {
    if (typeof alias !== 'string' || !alias) continue;
    if (identities.has(alias) && identities.get(alias) !== id) throw new Error('รหัสเดิมจับคู่ได้มากกว่าหนึ่งคน');
    identities.set(alias, id);
  }
  const canonicalSources = new Map();
  for (const [key, value] of Object.entries(legacySchedules || {})) {
    const match = /^(.*)_(\d{4}-\d{2}-\d{2})(_act)?$/.exec(key);
    const id = match && identities.get(match[1]);
    if (!id || !match[2].startsWith(`${month}-`)) continue;
    const canonical = `${id}_${match[2]}${match[3] || ''}`;
    if (canonicalSources.has(canonical) && canonicalSources.get(canonical) !== value) throw new Error('ค่าจากรหัสเดิมขัดแย้งกัน กรุณาตรวจสอบก่อน');
    canonicalSources.set(canonical, value);
  }
  const source = buildAdminLegacyScheduleFallback({ isAdmin: true, month, staffIds: staff.map(row => row.id), staffAliases,
    migratedStaffIds: record?.legacyCellMigration?.status === 'complete' ? record.legacyCellMigration.staffIds : [], legacySchedules }).schedules;
  const reviewed = new Set(reviewedLegacyCellKeys(record, source));
  return Object.entries(source).map(([key, sourceValue]) => {
    const match = /^(.*)_(\d{4}-\d{2}-\d{2})(_act)?$/.exec(key);
    if (!match || !match[2].startsWith(`${month}-`) || !/^\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/.test(match[2])
      || typeof sourceValue !== 'string') throw new Error('ข้อมูลเดิมมีรูปแบบไม่ถูกต้อง');
    const [year, number] = month.split('-').map(Number);
    if (Number(match[2].slice(-2)) > new Date(Date.UTC(year, number, 0)).getUTCDate()) throw new Error('วันที่ในข้อมูลเดิมไม่ถูกต้อง');
    const person = staff.find(row => row.id === match[1]);
    const currentPresent = Object.hasOwn(record?.schedules || {}, key);
    const currentValue = currentPresent ? record.schedules[key] : null;
    if (currentPresent && typeof currentValue !== 'string') throw new Error('ค่าตารางปัจจุบันมีรูปแบบไม่ถูกต้อง');
    return { key, person, date: match[2], type: match[3] ? 'ACT' : 'PLAN', sourceValue, currentPresent, currentValue,
      status: person?.scheduleReadOnly ? 'protected' : reviewed.has(key) ? 'reviewed'
        : !currentPresent ? 'missing' : currentValue === sourceValue ? 'identical' : 'conflict' };
  });
}

export function prepareLegacyCellReview({ record, cells, decisions, actorUid, reviewedAt }) {
  if (!record || !actorUid || !reviewedAt || !Array.isArray(decisions) || !decisions.length) throw new Error('กรุณาเลือกช่องที่ตรวจสอบแล้ว');
  const next = { ...record }, seen = new Set();
  if (record.approval?.isLocked || record.approval?.status === 'Approved') throw new Error('ตารางถูกอนุมัติหรือล็อกแล้ว');
  next.schedules = { ...record.schedules };
  next.legacyCellReviews = { ...record.legacyCellReviews };
  const audit = [];
  for (const choice of decisions) {
    const cell = cells.find(row => row.key === choice.key);
    if (!cell || seen.has(choice.key) || ['protected', 'reviewed'].includes(cell.status)
      || !['import', 'keep-current'].includes(choice.decision)
      || (choice.decision === 'keep-current' && !cell.currentPresent)) throw new Error('รายการยืนยันไม่ถูกต้อง');
    seen.add(choice.key);
    if (choice.decision === 'import') next.schedules[cell.key] = cell.sourceValue;
    const review = { decision: choice.decision, sourceValue: cell.sourceValue, actorUid, reviewedAt };
    audit.push({ key: cell.key, previousPresent: cell.currentPresent, previousValue: cell.currentValue,
      previousReview: record.legacyCellReviews?.[cell.key] || null, ...review });
    next.legacyCellReviews[cell.key] = review;
  }
  next.legacyCellReviewPendingKeys = cells.filter(cell => !seen.has(cell.key) && cell.status !== 'reviewed').map(cell => cell.key);
  next.legacyCellReviewHistory = [...(record.legacyCellReviewHistory || []), { actorUid, reviewedAt, cells: audit }];
  if (new TextEncoder().encode(JSON.stringify(next)).length > 750000) throw new Error('ข้อมูลพร้อมสำเนามีขนาดใหญ่เกินไป');
  return next;
}

// Never save preview-only cells through the full-grid Save path. While any
// legacy cell awaits review, only explicitly reviewed keys may change.
export function applyReviewedCellDraft(record, draft, keys) {
  const next = { ...record }, allowed = new Set(keys);
  next.schedules = { ...record.schedules };
  for (const key of allowed) if (Object.hasOwn(draft, key)) next.schedules[key] = draft[key];
  return next;
}

export function assertReviewIsCurrent(expected, actual) {
  if (!scheduleDocumentEqual(expected, actual)) throw new Error('ตารางเปลี่ยนแล้ว กรุณาโหลดและตรวจข้อมูลใหม่');
}
