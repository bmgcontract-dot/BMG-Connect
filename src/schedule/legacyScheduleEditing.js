import { upsertProjectSchedule } from './projectScheduleState.js';

/** Read a complete server snapshot; never treat missing chunks as an empty archive. */
export async function readLegacyScheduleSnapshot(read) {
  const meta = await read('metadata');
  if (!meta) throw new Error('ไม่พบคลังตารางงานเดิมบนเซิร์ฟเวอร์');
  let json;
  if (meta.totalChunks !== undefined) {
    if (!Number.isInteger(meta.totalChunks) || meta.totalChunks < 1 || meta.totalChunks > 100) {
      throw new Error('จำนวนส่วนของคลังตารางงานไม่ถูกต้อง');
    }
    const parts = [];
    for (let i = 0; i < meta.totalChunks; i++) {
      const part = await read('chunk', i);
      if (typeof part?.chunk !== 'string') throw new Error('ข้อมูลตารางงานเดิมไม่ครบ กรุณาลองใหม่');
      parts.push(part.chunk);
    }
    json = parts.join('');
  } else {
    json = meta.payload;
  }
  if (typeof json !== 'string') throw new Error('คลังตารางงานเดิมไม่มีข้อมูลที่อ่านได้');
  const latest = await read('metadata');
  if (JSON.stringify(meta) !== JSON.stringify(latest)) throw new Error('คลังข้อมูลเดิมเปลี่ยนระหว่างอ่าน กรุณาลองใหม่');
  const schedules = JSON.parse(json);
  if (!schedules || typeof schedules !== 'object' || Array.isArray(schedules)) throw new Error('รูปแบบคลังตารางงานเดิมไม่ถูกต้อง');
  return schedules;
}

/** The admin explicitly reviews ownership for this project/month; current department alone is not proof. */
export function prepareLegacyScheduleEditing({ records, projectId, month, staffIds, staffAliases = {}, legacySchedules, actorUid, confirmed, importedAt }) {
  if (!confirmed || !actorUid || !projectId || !/^\d{4}-(0[1-9]|1[0-2])$/.test(month)) {
    throw new Error('ต้องยืนยันโครงการ เดือน และผู้ดำเนินการก่อนนำเข้า');
  }
  const existing = records.find(record => record.id === `${projectId}_${month}`);
  const migrated = existing?.legacyCellMigration?.status === 'complete' ? existing.legacyCellMigration.staffIds || [] : [];
  const identities = new Map();
  for (const id of staffIds) {
    if (typeof id !== 'string' || !id) continue;
    for (const alias of new Set([id, ...(staffAliases[id] || [])])) {
      if (typeof alias !== 'string' || !alias) continue;
      if (identities.has(alias) && identities.get(alias) !== id) throw new Error('รหัสพนักงานจับคู่ได้มากกว่าหนึ่งคน ต้องตรวจสอบก่อนนำเข้า');
      identities.set(alias, id);
    }
  }
  const cells = {};
  const importedStaff = new Set();
  const sourceCells = {};
  let unmatchedCells = 0;
  for (const [key, value] of Object.entries(legacySchedules)) {
    const match = key.match(/^(.*)_(\d{4}-\d{2})-(\d{2})(_act)?$/);
    if (!match) {
      if (key.includes(`_${month}-`)) throw new Error('พบวันหรือค่ากะงานไม่ถูกต้อง ต้องตรวจสอบก่อนนำเข้า');
      continue;
    }
    if (match[2] !== month) continue;
    if (typeof value !== 'string') throw new Error('พบวันหรือค่ากะงานไม่ถูกต้อง ต้องตรวจสอบก่อนนำเข้า');
    const id = identities.get(match[1]);
    if (!id) { unmatchedCells++; continue; }
    if (migrated.includes(id)) continue;
    const day = Number(match[3]);
    const days = new Date(Number(month.slice(0, 4)), Number(month.slice(5)), 0).getDate();
    if (day < 1 || day > days) throw new Error('พบวันหรือค่ากะงานไม่ถูกต้อง ต้องตรวจสอบก่อนนำเข้า');
    const target = `${id}_${month}-${match[3]}${match[4] || ''}`;
    if (Object.hasOwn(cells, target) && cells[target] !== value) throw new Error('ข้อมูลจากรหัสเดิมของพนักงานขัดแย้งกัน ต้องตรวจสอบก่อนนำเข้า');
    cells[target] = value;
    sourceCells[key] = value;
    importedStaff.add(id);
  }
  if (!importedStaff.size) throw new Error('ไม่พบข้อมูลเดิมที่จับคู่ได้และยังไม่นำเข้าในเดือนนี้');
  const current = existing?.schedules || {};
  const preservedConflicts = Object.keys(cells).filter(key => Object.hasOwn(current, key) && current[key] !== cells[key]).length;
  const update = {
    schedules: { ...cells, ...current },
    legacyCellMigration: {
      ...existing?.legacyCellMigration,
      status: 'complete',
      staffIds: [...new Set([...migrated, ...importedStaff])],
      source: 'bmg_schedules_v2',
      confirmedBy: actorUid,
      migratedAt: importedAt,
    },
    legacyEditImports: [...(existing?.legacyEditImports || []), {
      importedAt, actorUid, projectId, month,
      sourceCells,
      previousSchedules: current,
      previousMigration: existing?.legacyCellMigration || null,
      preservedConflicts,
    }],
  };
  const next = upsertProjectSchedule(records, { projectId, month, update });
  // Leave substantial headroom below Firestore's 1 MiB document limit; never drop backup data.
  const document = next.find(record => record.id === `${projectId}_${month}`);
  if (new TextEncoder().encode(JSON.stringify(document)).length > 750000) throw new Error('ข้อมูลพร้อมสำเนามีขนาดใหญ่เกินไป ต้องสำรองแยกก่อนนำเข้า');
  return { records: next, cellCount: Object.keys(cells).length, preservedConflicts, unmatchedCells };
}
