import test from 'node:test';
import assert from 'node:assert/strict';
import {initializeApp,deleteApp} from 'firebase/app';
import {getFirestore,connectFirestoreEmulator,doc,getDoc,updateDoc,runTransaction,deleteDoc,terminate} from 'firebase/firestore';
import {initializeApp as initAdmin,deleteApp as deleteAdmin} from 'firebase-admin/app';
import {getFirestore as adminFirestore,Timestamp} from 'firebase-admin/firestore';
import {legacyReviewCells,prepareLegacyCellReview,assertReviewIsCurrent,applyReviewedCellDraft} from '../../src/schedule/legacyCellReview.js';
test('Rules and real transaction preserve deferred cells; only Admin confirms, user edits accepted cells only',async()=>{
 assert.equal(process.env.FIRESTORE_EMULATOR_HOST,'127.0.0.1:8090');
 const projectId='demo-bmg-browser',admin=initAdmin({projectId},'cell-review-fixtures'),db=adminFirestore(admin);
 const root='artifacts/bmg-app-prod/public/data',month=new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Bangkok',year:'numeric',month:'2-digit'}).format(new Date());
 const scope=`cell-review_${month}`,uid='cell-review-admin',userUid='cell-review-user',key=d=>`staff_${month}-${d}_act`;
 const ref=db.doc(`${root}/bmg_projectSchedules_docs/${scope}`),policy=db.doc(`${root}/bmg_scheduleWritePolicy/current`),oldPolicy=await policy.get();
 const apps=[initializeApp({projectId,apiKey:'fake'},uid),initializeApp({projectId,apiKey:'fake'},userUid)],clients=apps.map((a,i)=>{const f=getFirestore(a);connectFirestoreEmulator(f,'127.0.0.1',8090,{mockUserToken:{sub:i?userUid:uid,...(i?{}:{admin:true})}});return f;});
 try{
  await db.doc('users/'+uid).set({authUid:uid,status:'Active'});
  await db.doc('users/'+userUid).set({authUid:userUid,status:'Active',department:'Cell review test',permissions:{proj_schedule:{view:true,save:true,edit:true}}});
  await db.doc(`${root}/bmg_projects_docs/cell-review`).set({name:'Cell review test',status:'Active'});
  await policy.set({enabled:true,verifiedScopes:[scope]});
  const original={id:scope,projectId:'cell-review',month,createdAt:Timestamp.fromMillis(1000),schedules:{[key('01')]:'M3'},note:'keep',approval:{status:'Pending HR'},legacyCellReviewPendingKeys:[key('01'),key('02')]};
  await ref.set(original);
  const refs=clients.map(f=>doc(f,ref.path));
  await assert.rejects(updateDoc(refs[1],{[`schedules.${key('02')}`]:'O'}),e=>e.code==='permission-denied');
  await assert.rejects(updateDoc(refs[1],{legacyCellReviewPendingKeys:[]}),e=>e.code==='permission-denied');
  await assert.rejects(deleteDoc(refs[0]),e=>e.code==='permission-denied');
  const clientBaseline=(await getDoc(refs[0])).data();
  const source={[key('01')]:'M3',[key('02')]:'O'},staff=[{id:'staff'}];
  await runTransaction(clients[0],async tx=>{
   const before=(await tx.get(refs[0])).data();assertReviewIsCurrent(clientBaseline,before);
   const cells=legacyReviewCells({record:before,month,staff,legacySchedules:source});
   tx.set(refs[0],prepareLegacyCellReview({record:before,cells,decisions:[{key:key('01'),decision:'keep-current'}],actorUid:uid,reviewedAt:'review-time'}));
  });
  let persisted=(await ref.get()).data();assert.equal(Object.hasOwn(persisted.schedules,key('02')),false);assert.deepEqual(persisted.approval,original.approval);
  await updateDoc(refs[1],{[`schedules.${key('01')}`]:'V'});
  persisted=(await ref.get()).data();const history=structuredClone(persisted.legacyCellReviewHistory);
  await assert.rejects(updateDoc(refs[1],{[`schedules.${key('02')}`]:'H'}),e=>e.code==='permission-denied');
  await assert.rejects(updateDoc(refs[1],{legacyCellReviews:{[key('02')]:{decision:'import'}}}),e=>e.code==='permission-denied');
  await runTransaction(clients[0],async tx=>{const before=(await tx.get(refs[0])).data();tx.set(refs[0],applyReviewedCellDraft(before,{...source,[key('01')]:''},[key('01')]));});
  persisted=(await ref.get()).data();assert.equal(persisted.schedules[key('01')],'');assert.equal(Object.hasOwn(persisted.schedules,key('02')),false);assert.deepEqual(persisted.legacyCellReviewHistory,history);assert.equal(persisted.createdAt.toMillis(),1000);
 }finally{
  await ref.delete();await db.doc(`${root}/bmg_projects_docs/cell-review`).delete();await db.doc('users/'+uid).delete();await db.doc('users/'+userUid).delete();
  if(oldPolicy.exists)await policy.set(oldPolicy.data());else await policy.delete();
  await Promise.all(clients.map(terminate));await Promise.all(apps.map(deleteApp));await deleteAdmin(admin);
 }
});
