// Read-only audit: this script deliberately contains no Firestore write operations.
import { initializeApp, applicationDefault, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { mkdir, writeFile } from 'node:fs/promises';

const projectId = 'bmg-connect-3e99a';
initializeApp({ projectId, credential: process.env.FIREBASE_SERVICE_ACCOUNT_JSON
  ? cert(JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_JSON)) : applicationDefault() });
const db = getFirestore();
const root = db.collection('artifacts').doc('bmg-app-prod').collection('public').doc('data');
const [source, projectDocs, userDocs, targetDocs, legacyUserDocs] = await Promise.all([
  root.collection('app_state').doc('bmg_schedules_v2').get(),
  root.collection('bmg_projects_docs').select('name').get(),
  db.collection('users').select('id', 'legacyId', 'authUid', 'username', 'name', 'department').get(),
  root.collection('bmg_projectSchedules_docs').get(),
  root.collection('bmg_users_docs').select('id', 'legacyId', 'authUid', 'username', 'name', 'department').get(),
]);
const state = source.data();
if (!state) throw new Error('Missing legacy source');
let payload = state.payload;
if (Number.isInteger(state.totalChunks)) {
  const chunks = await Promise.all(Array.from({ length: state.totalChunks }, (_, i) =>
    root.collection('app_state_chunks').doc(`bmg_schedules_v2_${i}`).get()));
  payload = chunks.map(d => d.data()?.chunk ?? '').join('');
}
const legacy = JSON.parse(payload);
const projects = projectDocs.docs.map(d => ({ id: d.id, ...d.data() }));
const users = userDocs.docs.map(d => ({ docId: d.id, ...d.data() }));
const aliases = new Map();
for (const user of users) for (const id of new Set([user.docId, user.id, user.legacyId, user.authUid].filter(Boolean))) {
  if (!aliases.has(String(id))) aliases.set(String(id), []);
  aliases.get(String(id)).push(user);
}
const legacyAliases = new Map();
for (const d of legacyUserDocs.docs) {
  const user = { docId: d.id, ...d.data() };
  for (const id of new Set([user.docId, user.id, user.legacyId, user.authUid].filter(Boolean))) {
    if (!legacyAliases.has(String(id))) legacyAliases.set(String(id), []);
    legacyAliases.get(String(id)).push(user);
  }
}
const targets = targetDocs.docs.map(d => ({ id: d.id, ...d.data() }));
const rows = [];
for (const [key, value] of Object.entries(legacy)) {
  const match = key.match(/^(.*)_(\d{4}-\d{2}-\d{2})(_act)?$/);
  if (!match) { rows.push({ key, status: 'invalid-key' }); continue; }
  const [, identity, date, actual = ''] = match;
  const matched = aliases.get(identity) ?? legacyAliases.get(identity) ?? [];
  const user = matched.length === 1 ? matched[0] : null;
  const candidates = user ? projects.filter(p => p.name === user.department) : [];
  const project = candidates.length === 1 ? candidates[0] : null;
  const month = date.slice(0, 7);
  const ids = user ? new Set([user.docId, user.id, user.legacyId, user.authUid].filter(Boolean)) : new Set([identity]);
  const existing = targets.filter(t => t.month === month).flatMap(t =>
    [...ids].filter(id => Object.hasOwn(t.schedules ?? {}, `${id}_${date}${actual}`))
      .map(id => ({ projectId: t.projectId, value: t.schedules[`${id}_${date}${actual}`] })));
  let status = !user ? (matched.length ? 'ambiguous-identity' : 'unknown-identity')
    : !project ? 'unresolved-project' : 'needs-historical-project-confirmation';
  if (project && existing.length) {
    status = existing.some(e => e.projectId !== project.id) ? 'cross-project-target'
      : existing.every(e => JSON.stringify(e.value) === JSON.stringify(value)) ? 'already-identical' : 'value-conflict';
  }
  rows.push({ key, month, date, type: actual ? 'ACT' : 'PLAN', value,
    identitySource: aliases.has(identity) ? 'current-users' : 'legacy-users',
    employee: user?.username ?? identity, employeeName: user?.name ?? '',
    projectId: project?.id ?? null, project: project?.name ?? user?.department ?? '', status, existing });
}
const counts = {};
const groups = new Map();
for (const row of rows) {
  counts[row.status] = (counts[row.status] ?? 0) + 1;
  const groupKey = `${row.projectId ?? row.project ?? 'unresolved'}|${row.month ?? 'unknown'}`;
  if (!groups.has(groupKey)) groups.set(groupKey, { project: row.project || 'จับคู่ไม่ได้', month: row.month ?? '-', cells: 0, statuses: {} });
  const group = groups.get(groupKey); group.cells++;
  group.statuses[row.status] = (group.statuses[row.status] ?? 0) + 1;
}
const summary = { generatedAt: new Date().toISOString(), mode: 'read-only', projectId,
  projectCount: projects.length, userCount: users.length, targetCount: targets.length,
  legacyCells: rows.length, counts, authorizedWrites: 0,
  policy: 'Current department is a candidate only, not proof of historical ownership. No months are confirmed for automatic migration.' };
const directory = `migration-output/schedule-audit-${new Date().toISOString().replace(/[:.]/g, '-')}`;
await mkdir(directory, { recursive: true, mode: 0o700 });
await writeFile(`${directory}/details.json`, JSON.stringify({ summary, rows }, null, 2), { mode: 0o600 });
const table = [...groups.values()].sort((a,b) => a.project.localeCompare(b.project) || a.month.localeCompare(b.month));
const markdown = `# รายงานตรวจตารางงานเดิม\n\nเวลา: ${summary.generatedAt}\n\nตรวจแบบอ่านอย่างเดียว ไม่มีการเขียนเข้า Firestore\n\nข้อมูลสังกัดปัจจุบันใช้เสนอการจับคู่เท่านั้น ยังไม่ยืนยันสังกัดย้อนหลัง แม้ไม่พบประวัติย้ายก็ไม่ได้แปลว่าไม่เคยย้าย\n\nเดอะเบลสได้รับการยืนยันจาก Admin แต่ยังไม่ทราบช่วงเดือน จึงยังไม่อนุมัติรายการใดให้ย้ายอัตโนมัติ\n\nสรุป: ${JSON.stringify(summary)}\n\n| โครงการที่เสนอ | เดือน | ช่องข้อมูลเดิม | ผลตรวจ |\n|---|---|---:|---|\n` + table.map(g => `| ${g.project.replaceAll('|','/')} | ${g.month} | ${g.cells} | ${JSON.stringify(g.statuses)} |`).join('\n') + '\n';
await writeFile(`${directory}/report.md`, markdown, { mode: 0o600 });
console.log(JSON.stringify({ ...summary, report: `${directory}/report.md`, details: `${directory}/details.json` }, null, 2));
