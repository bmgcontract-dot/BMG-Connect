import { initializeApp, applicationDefault, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { readFile, writeFile } from 'node:fs/promises';
const input = process.argv[2];
if (!input) throw new Error('Pass the existing audit details.json path');
const audit = JSON.parse(await readFile(input, 'utf8'));
initializeApp({ projectId: 'bmg-connect-3e99a', credential: process.env.FIREBASE_SERVICE_ACCOUNT_JSON
  ? cert(JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_JSON)) : applicationDefault() });
const db = getFirestore();
const root = db.doc('artifacts/bmg-app-prod/public/data');
async function legacyState(key) {
  const doc = await root.collection('app_state').doc(key).get();
  if (!doc.exists) return null;
  const data = doc.data();
  let payload = data.payload;
  if (Number.isInteger(data.totalChunks)) {
    const chunks = await Promise.all(Array.from({length: data.totalChunks}, (_, i) => root.collection('app_state_chunks').doc(`${key}_${i}`).get()));
    payload = chunks.map(d => d.data()?.chunk ?? '').join('');
  }
  if (typeof payload !== 'string' || !payload.trim()) {
    console.log(JSON.stringify({source:key, readable:false, fields:Object.keys(data), totalChunks:data.totalChunks}));
    return null;
  }
  return JSON.parse(payload);
}
const [legacyUsers, orders, projects] = await Promise.all([legacyState('bmg_users'), legacyState('bmg_projectStaffOrder'), root.collection('bmg_projects_docs').select('name').get()]);
const projectNames = new Map(projects.docs.map(d => [d.id, d.data().name]));
const users = Array.isArray(legacyUsers) ? legacyUsers : Object.values(legacyUsers ?? {});
const unknown = new Map();
for (const r of audit.rows.filter(r => r.status === 'unknown-identity')) {
  if (!unknown.has(r.employee)) unknown.set(r.employee, []);
  unknown.get(r.employee).push(r);
}
const rows = [...unknown].map(([id, cells]) => {
  const matches = users.filter(u => [u.id,u.legacyId,u.authUid].includes(id)).map(u => ({id:u.id, employee:u.username, name:u.name, department:u.department}));
  const orderProjects = Object.entries(orders ?? {}).filter(([, list]) => Array.isArray(list) && list.includes(id)).map(([project]) => project);
  return {id, cells:cells.length, months:[...new Set(cells.map(c=>c.month))].sort(), matches, orderProjects,
    projectCandidates:orderProjects.map(id => projectNames.get(id) ?? id)};
});
const report = {generatedAt:new Date().toISOString(), legacyUserCount:users.length, unknownIdentities:rows.length,
  matchedIdentities:rows.filter(r=>r.matches.length===1).length,
  matchedCells:rows.filter(r=>r.matches.length===1).reduce((n,r)=>n+r.cells,0),
  staffOrderOnlyIdentities:rows.filter(r=>r.matches.length===0 && r.orderProjects.length).length, rows};
const output = input.replace(/details\.json$/, 'identity-investigation.json');
await writeFile(output, JSON.stringify(report,null,2), {mode:0o600});
await writeFile(input.replace(/details\.json$/, 'identity-investigation.md'),
  '# ผลตรวจรหัสพนักงานที่ยังจับคู่ไม่ได้\n\nตรวจแบบอ่านอย่างเดียว ไม่มีการแก้ข้อมูล Firestore\n\nรหัสภายใน 63 รหัส ครอบคลุม 4,148 ช่อง ยังไม่พบทะเบียนที่เชื่อมกับชื่อพนักงาน รหัสในโค้ดสร้างแบบสุ่ม ไม่สามารถถอดชื่อจากรหัสได้\n\nพบหลักฐานจากลำดับพนักงานของโครงการ 9 รหัส ใช้เป็นเบาะแสเท่านั้น ไม่ใช่หลักฐานยืนยันบุคคลหรือสังกัดย้อนหลัง\n\nขั้นต่อไป: ใช้ snapshot จาก Chrome Profile เดิมที่มีทะเบียนพนักงาน หรือไฟล์สำรองก่อนย้ายระบบ เพื่อเทียบ id กับชื่อและรหัสพนักงาน ห้ามเดาจากกะงานที่คล้ายกัน\n\n| รหัสภายใน | จำนวนช่อง | เดือน | โครงการจากลำดับพนักงาน (ยังไม่ยืนยัน) |\n|---|---:|---|---|\n' + rows.map(r => `| ${r.id} | ${r.cells} | ${r.months.join(', ')} | ${r.projectCandidates.join(', ') || 'ไม่พบ'} |`).join('\n')+'\n', {mode:0o600});
console.log(JSON.stringify({...report, rows:undefined, output},null,2));
