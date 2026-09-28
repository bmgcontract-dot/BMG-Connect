import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { initializeApp, applicationDefault, cert } from 'firebase-admin/app';
import { getFirestore, Timestamp } from 'firebase-admin/firestore';

const FIREBASE_PROJECT = 'bmg-connect-3e99a';
const NAME = 'นิติบุคคลหมู่บ้านจัดสรร เดอะเบลส';
const MONTHS = ['2026-05', '2026-06', '2026-07', '2026-08', '2026-09'];
const ROOT = 'artifacts/bmg-app-prod/public/data';
const args = process.argv.slice(2);
const backupArg = args.find(v => v.startsWith('--backup='))?.slice(9);
initializeApp({projectId: FIREBASE_PROJECT, credential: process.env.FIREBASE_SERVICE_ACCOUNT_JSON
  ? cert(JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_JSON)) : applicationDefault()});
const db = getFirestore();
const hash = value => createHash('sha256').update(value).digest('hex');
function encode(v) {
  if (v instanceof Timestamp) return { __firestoreTimestamp: [v.seconds, v.nanoseconds] };
  if (v === null || typeof v !== 'object') return v;
  if (Array.isArray(v)) return v.map(encode);
  assert.equal(Object.getPrototypeOf(v), Object.prototype, 'Unsupported backup field type');
  assert.ok(!Object.hasOwn(v, '__firestoreTimestamp'), 'Reserved backup key');
  return Object.fromEntries(Object.entries(v).map(([k,x]) => [k,encode(x)]));
}
function decode(v) {
  if (v === null || typeof v !== 'object') return v;
  if (Array.isArray(v)) return v.map(decode);
  if (v.__firestoreTimestamp) return new Timestamp(...v.__firestoreTimestamp);
  return Object.fromEntries(Object.entries(v).map(([k,x]) => [k,decode(x)]));
}
const tracked = [];
function track(d) {
  tracked.push({path:d.ref.path, exists:d.exists, updateTime:d.updateTime?.toDate().toISOString(),
    version:d.updateTime ? [d.updateTime.seconds,d.updateTime.nanoseconds] : null});
  return d;
}
if (!args.includes('--apply')) {
  const projects = await db.collection(`${ROOT}/bmg_projects_docs`).where('name','==',NAME).get();
  assert.equal(projects.size,1,'Project must resolve uniquely');
  const project = track(projects.docs[0]);
  const users = await db.collection('users').where('department','==',NAME).get();
  assert.equal(users.size,2,'Confirmed UI scope contains exactly two staff; changed roster needs review');
  const staff = users.docs.map(d => {track(d); const u=d.data(); return {id:u.id || u.authUid,
    aliases:[...new Set([u.id,u.legacyId,u.authUid,d.id].filter(Boolean))], employee:u.username};});
  assert.deepEqual(staff.map(s=>s.employee).sort(),['2510136','2610202']);
  const state = track(await db.doc(`${ROOT}/app_state/bmg_schedules_v2`).get()).data();
  let payload = state.payload;
  if (Number.isInteger(state.totalChunks)) {
    const chunks = await Promise.all(Array.from({length:state.totalChunks},(_,i)=>db.doc(`${ROOT}/app_state_chunks/bmg_schedules_v2_${i}`).get()));
    payload=chunks.map(d=>track(d).data().chunk).join('');
  }
  const legacy=JSON.parse(payload);
  const sourceCells={}; const mapped={};
  for(const [key,value] of Object.entries(legacy)) {
    const m=key.match(/^(.*)_(\d{4}-\d{2}-\d{2})(_act)?$/);
    if(!m || !MONTHS.includes(m[2].slice(0,7))) continue;
    const matches=staff.filter(s=>s.aliases.includes(m[1]));
    if(!matches.length) continue;
    assert.equal(matches.length,1,'Ambiguous employee alias');
    assert.equal(typeof value,'string','Unexpected cell value');
    const canonical=`${matches[0].id}_${m[2]}${m[3]||''}`;
    if(Object.hasOwn(mapped,canonical)) assert.equal(mapped[canonical],value,'Conflicting legacy aliases');
    sourceCells[key]=value; mapped[canonical]=value;
  }
  const allTargets = await db.collection(`${ROOT}/bmg_projectSchedules_docs`).get();
  const operations=[]; const counts=[];
  for(const month of MONTHS) {
    const path=`${ROOT}/bmg_projectSchedules_docs/${project.id}_${month}`;
    const target=track(await db.doc(path).get()); const before=target.exists?target.data():null;
    if(before) { assert.equal(before.projectId,project.id); assert.equal(before.month,month); }
    const additions=Object.fromEntries(Object.entries(mapped).filter(([k])=>k.includes(`_${month}-`)));
    assert.ok(Object.keys(additions).length>0,`No cells for ${month}`);
    for(const other of allTargets.docs) {
      const d=other.data(); if(d.month!==month) continue;
      for(const [key,value] of Object.entries(additions)) {
        const staffEntry=staff.find(s=>key.startsWith(`${s.id}_`));
        const suffix=key.slice(staffEntry.id.length);
        for(const alias of staffEntry.aliases) if(Object.hasOwn(d.schedules??{},`${alias}${suffix}`)) {
          assert.equal(d.projectId,project.id,'Cell also exists under another project');
          assert.equal(d.schedules[`${alias}${suffix}`],value,'Existing cell conflict');
        }
      }
    }
    const after={id:`${project.id}_${month}`,projectId:project.id,month,schemaVersion:1,
      note:'',approval:{},staffOrder:[],...before,
      schedules:{...before?.schedules,...additions},
      legacyCellMigration:{status:'complete',staffIds:staff.map(s=>s.id),
        confirmedBy:'project-owner: Bangkok Admin verified May–September 2026',
        source:'bmg_schedules_v2',sourceSha256:hash(JSON.stringify(additions)),
        cellCount:Object.keys(additions).length,migratedAt:new Date().toISOString()}};
    operations.push({path,before:encode(before),after:encode(after)});
    counts.push({month,sourceCells:Object.keys(additions).length,existingCells:Object.keys(before?.schedules??{}).length,
      approvalStatus:before?.approval?.status??null,locked:before?.approval?.isLocked??false});
  }
  const backup={schemaVersion:1,firestoreProject:FIREBASE_PROJECT,projectId:project.id,projectName:NAME,months:MONTHS,
    createdAt:new Date().toISOString(),staff,sourceCells,tracked,operations,counts};
  const directory=`backups/bless-schedules-${new Date().toISOString().replace(/[:.]/g,'-')}`;
  await mkdir(directory,{recursive:true,mode:0o700});
  const text=JSON.stringify(backup,null,2); const path=`${directory}/backup.json`;
  await writeFile(path,text,{mode:0o600,flag:'wx'});
  await writeFile(`${path}.sha256`,hash(text),{mode:0o600,flag:'wx'});
  assert.equal(await readFile(path,'utf8'),text);
  assert.deepEqual(decode(JSON.parse(text)),decode(backup));
  for(const op of operations) assert.deepEqual(encode(decode(op.before)),op.before);
  console.log(JSON.stringify({mode:'backup-verified',backup:path,projectId:project.id,counts,
    cells:Object.keys(mapped).length,documents:operations.length,sha256:hash(text)},null,2));
} else {
  assert.ok(backupArg,'--backup is required');
  const raw=await readFile(backupArg,'utf8');
  assert.equal(hash(raw),(await readFile(`${backupArg}.sha256`,'utf8')).trim(),'Backup checksum mismatch');
  const backup=JSON.parse(raw);
  assert.equal(backup.firestoreProject,FIREBASE_PROJECT); assert.equal(backup.projectName,NAME);
  assert.deepEqual(backup.months,MONTHS); assert.equal(backup.operations.length,5);
  for(const [i,op] of backup.operations.entries()) {
    assert.equal(op.path,`${ROOT}/bmg_projectSchedules_docs/${backup.projectId}_${MONTHS[i]}`);
    assert.equal(op.after.projectId,backup.projectId); assert.equal(op.after.month,MONTHS[i]);
  }
  await db.runTransaction(async tx => {
    const current=await tx.getAll(...backup.tracked.map(d=>db.doc(d.path)));
    current.forEach((d,i)=>{
      const original=backup.tracked[i]; assert.equal(d.exists,original.exists,'Existence changed since backup');
      assert.deepEqual(d.updateTime?[d.updateTime.seconds,d.updateTime.nanoseconds]:null,original.version,'Data changed since backup');
    });
    for(const op of backup.operations) tx.set(db.doc(op.path),decode(op.after));
  },{maxAttempts:1});
  const results=await db.getAll(...backup.operations.map(op=>db.doc(op.path)));
  results.forEach((d,i)=>assert.deepEqual(d.data(),decode(backup.operations[i].after)));
  const result={mode:'applied-and-verified',verifiedAt:new Date().toISOString(),projectId:backup.projectId,
    documents:results.length,counts:backup.counts,backup:backupArg};
  await writeFile(backupArg.replace('backup.json','result.json'),JSON.stringify(result,null,2),{mode:0o600});
  console.log(JSON.stringify(result,null,2));
}
