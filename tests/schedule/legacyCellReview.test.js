import test from 'node:test';
import assert from 'node:assert/strict';
import { legacyReviewCells, prepareLegacyCellReview, applyReviewedCellDraft, assertReviewIsCurrent } from '../../src/schedule/legacyCellReview.js';
import { buildAdminLegacyScheduleFallback } from '../../src/schedule/adminLegacyScheduleFallback.js';
const key = day => `staff_2026-10-${day}_act`;
function fixture() {
 const record = { id: 'p_2026-10', projectId: 'p', month: '2026-10', schedules: { [key('01')]: 'M3', [key('03')]: '' }, note: 'keep', approval: {status:'Pending HR'}, staffOrder:['staff'] };
 const source = { [key('01')]: 'M3', [key('02')]: 'O', [key('03')]: 'H' };
 const staff = [{id:'staff',employeeId:'EMP-1'}];
 return {record,source,staff,cells:legacyReviewCells({record,month:'2026-10',staff,legacySchedules:source})};
}
function apply(f,decisions) { return prepareLegacyCellReview({record:f.record,cells:f.cells,decisions,actorUid:'admin',reviewedAt:'2026-10-18T00:00:00Z'}); }
test('confirm only one existing cell: missing and deferred values never copied; metadata kept',()=>{
 const f=fixture(),before=structuredClone(f.record),next=apply(f,[{key:key('01'),decision:'keep-current'}]);
 assert.deepEqual(next.schedules,before.schedules); assert.deepEqual(next.approval,before.approval); assert.equal(next.note,before.note);
 assert.equal(Object.hasOwn(next.schedules,key('02')),false); assert.equal(next.legacyCellReviewHistory[0].cells.length,1);
 assert.deepEqual(f.record,before);
 const reviewed=legacyReviewCells({record:next,month:'2026-10',staff:f.staff,legacySchedules:f.source});
 assert.deepEqual(reviewed.map(c=>c.status),['reviewed','missing','conflict']);
});
test('explicit import restores only chosen absent cell, preserves canonical conflict and backup',()=>{
 const f=fixture(),next=apply(f,[{key:key('02'),decision:'import'}]);
 assert.equal(next.schedules[key('02')],'O');assert.equal(next.schedules[key('03')],'');
 assert.equal(next.legacyCellReviewHistory[0].cells[0].previousPresent,false);
});
test('explicit conflict choice is required and previous value is backed up',()=>{
 const f=fixture(),next=apply(f,[{key:key('03'),decision:'import'}]);
 assert.equal(next.schedules[key('03')],'H'); assert.equal(next.legacyCellReviewHistory[0].cells[0].previousValue,'');
});
test('partial grid save cannot leak missing preview values or overwrite unreviewed canonical cells',()=>{
 const f=fixture(),reviewed=apply(f,[{key:key('01'),decision:'keep-current'}]);
 const next=applyReviewedCellDraft(reviewed,{...f.source,[key('01')]:'V'},[key('01')]);
 assert.equal(next.schedules[key('01')],'V');assert.equal(next.schedules[key('03')],'');assert.equal(Object.hasOwn(next.schedules,key('02')),false);
 assert.deepEqual(next.approval,reviewed.approval);assert.deepEqual(next.legacyCellReviews,reviewed.legacyCellReviews);
});
test('pending legacy preview excludes accepted cells; edited/cleared accepted values stay canonical',()=>{
 const f=fixture();let next=apply(f,[{key:key('01'),decision:'import'}]); next.schedules[key('01')]='';
 const cells=legacyReviewCells({record:next,month:'2026-10',staff:f.staff,legacySchedules:f.source});
 const fallback=buildAdminLegacyScheduleFallback({isAdmin:true,month:'2026-10',staffIds:['staff'],reviewedCellKeys:cells.filter(c=>c.status==='reviewed').map(c=>c.key),projectSchedules:next.schedules,legacySchedules:f.source});
 assert.equal(fallback.legacyCellCount,2);assert.equal(fallback.schedules[key('01')],'');
});
test('source drift invalidates prior confirmation; full-record drift refuses commit',()=>{
 const f=fixture(),next=apply(f,[{key:key('01'),decision:'import'}]);
 assert.equal(legacyReviewCells({record:next,month:'2026-10',staff:f.staff,legacySchedules:{...f.source,[key('01')]:'N'}})[0].status,'conflict');
 assert.throws(()=>assertReviewIsCurrent(f.record,{...f.record,note:'new'}));
});
test('rejects protected row, empty selection, missing keep-current, duplicate and approval lock',()=>{
 const f=fixture();
 assert.throws(()=>apply(f,[]));assert.throws(()=>apply(f,[{key:key('02'),decision:'keep-current'}]));
 assert.throws(()=>apply(f,[{key:key('01'),decision:'import'},{key:key('01'),decision:'import'}]));
 assert.throws(()=>apply({...f,cells:f.cells.map(c=>({...c,status:'protected'}))},[{key:key('01'),decision:'import'}]));
 assert.throws(()=>apply({...f,record:{...f.record,approval:{isLocked:true}}},[{key:key('01'),decision:'import'}]));
});

test('review and partial save preserve opaque Firestore metadata types', () => {
 const f=fixture();const stamp={toDate(){return new Date(0);}};f.record.createdAt=stamp;
 const next=apply(f,[{key:key('01'),decision:'keep-current'}]);assert.equal(next.createdAt,stamp);
 assert.equal(applyReviewedCellDraft(next,{[key('01')]:'V'},[key('01')]).createdAt,stamp);
});

test('legacy aliases use canonical cell keys without introducing duplicate identities', () => {
 const f=fixture();const cells=legacyReviewCells({record:f.record,month:'2026-10',staff:f.staff,staffAliases:{staff:['old-staff']},legacySchedules:{'old-staff_2026-10-02_act':'O'}});
 assert.equal(cells[0].key,key('02'));
 assert.throws(()=>legacyReviewCells({record:f.record,month:'2026-10',staff:[...f.staff,...f.staff],legacySchedules:f.source}));
});

test('ambiguous aliases and conflicting old aliases never become selectable confirmations', () => {
 const f=fixture();
 assert.throws(()=>legacyReviewCells({record:f.record,month:'2026-10',staff:[{id:'a'},{id:'b'}],staffAliases:{a:['old'],b:['old']},legacySchedules:{}}));
 assert.throws(()=>legacyReviewCells({record:f.record,month:'2026-10',staff:f.staff,staffAliases:{staff:['old']},legacySchedules:{[key('01')]:'M3','old_2026-10-01_act':'N'}}));
});
