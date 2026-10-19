import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { readLegacyScheduleSnapshot } from '../../src/schedule/legacyScheduleEditing.js';
import { scheduleDocumentEqual } from '../../src/schedule/scheduleDocumentEqual.js';
import { legacyReviewCells, prepareLegacyCellReview, assertReviewIsCurrent } from '../../src/schedule/legacyCellReview.js';
const source=readFileSync(new URL('../../App.jsx',import.meta.url),'utf8');
const start=source.indexOf('  const handleConfirmLegacyCells = '),end=source.indexOf('  useEffect(() => {\n      schedulesRef.current',start);
function ui({ok=true,admin=true,stale=false,draft=false}={}) {
 const key='u_2026-10-01',missing='u_2026-10-02_act';
 let archive={[key]:'M3',[missing]:'O'},records=[{id:'p_2026-10',projectId:'p',month:'2026-10',schedules:{[key]:'M3'},approval:{status:'Pending HR'}}],writes=0;
 const context={projectId:'p',month:'2026-10',actorUid:'admin'},contextRef={current:context};
 const scope={isLegacyScheduleArchiveAdmin:admin,hasPerm:()=>true,canWriteScheduleNow:()=>true,fbUser:{uid:'admin'},legacyEditInFlight:{current:false},
 scheduleDraftRef:{current:draft?{scope:'p_2026-10'}:null},scheduleScopeKey:'p_2026-10',legacyEditContext:context,legacyEditContextRef:contextRef,
 projectScheduleRecords:records,readLegacyScheduleSnapshot,db:{},appId:'test',doc:(...path)=>path.join('/'),
 getDocFromServer:async()=>({exists:()=>true,data:()=>({payload:JSON.stringify(stale?{[key]:'H'}:archive)})}),
 legacyScheduleArchive:archive,scheduleDocumentEqual,legacyReviewCells,prepareLegacyCellReview,assertReviewIsCurrent,
 selectedProjectScheduleStaff:[{id:'u',employeeId:'EMP-1'}],setProjectScheduleRecords:async update=>{
  const next=update(records);writes++;if(ok)records=next;
  return ok?{ok:true}:{ok:false,error:new Error('permission-denied')};
 }};
 const confirm=new Function(...Object.keys(scope),`${source.slice(start,end)};return handleConfirmLegacyCells;`)(...Object.values(scope));
 return {confirm,contextRef,get records(){return records;},get writes(){return writes;},drift:()=>{records=[{...records[0],note:'changed'}];}};
}
test('actual Admin handler confirms only selected cell and leaves missing preview out of canonical document',async()=>{
 const screen=ui();await screen.confirm([{key:'u_2026-10-01',decision:'keep-current'}]);
 assert.equal(screen.writes,1);assert.equal(Object.hasOwn(screen.records[0].schedules,'u_2026-10-02_act'),false);
 assert.deepEqual(screen.records[0].legacyCellReviewPendingKeys,['u_2026-10-02_act']);
 assert.equal(screen.records[0].approval.status,'Pending HR');
});
test('server refusal is surfaced, never success',async()=>{
 const screen=ui({ok:false});await assert.rejects(screen.confirm([{key:'u_2026-10-01',decision:'import'}]),/permission-denied/);
 assert.equal(screen.records[0].legacyCellReviews,undefined);
});
test('non-admin, draft edits, stale archive, project change and target drift prevent confirmation',async()=>{
 for(const options of [{admin:false},{draft:true},{stale:true}]){
  const screen=ui(options);await assert.rejects(screen.confirm([{key:'u_2026-10-01',decision:'import'}]));assert.equal(screen.writes,0);
 }
 const changed=ui();changed.contextRef.current={projectId:'other'};await assert.rejects(changed.confirm([{key:'u_2026-10-01',decision:'import'}]));assert.equal(changed.writes,0);
 const drift=ui();drift.drift();await assert.rejects(drift.confirm([{key:'u_2026-10-01',decision:'import'}]));assert.equal(drift.writes,0);
});
