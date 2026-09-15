# Firebase read mitigation — pre-deploy and rollback plan

วันที่เตรียม: 15 กันยายน 2026

ขอบเขต release: หยุด anonymous startup, บังคับ Firebase Auth เป็นค่าเริ่มต้น และลด Firestore listener ตามหน้าที่ใช้งาน

ไม่รวม: การเปลี่ยน Rules, indexes, schema, provider settings, การลบบัญชี หรือ data migration

## Production baseline ที่ยืนยันแล้ว

- Vercel team: `bmgcontract-6324s-projects`
- โปรเจกต์หลัก: `bmg-connect`
- Production domain: `https://bmg-connect.vercel.app`
- deployment ปัจจุบัน: `FcaoqPLPsLG4wibz6v3XEmrQE3iD`
- source commit: `eac28fde8a8dde59d608b046bd6d214be917859d`
- สถานะที่ตรวจจาก Vercel: `Ready`, `Production`, `Current`
- โปรเจกต์ `bmg-connect-6b24` ผูก repository เดียวกันแต่ไม่ใช่เป้าหมาย Production หลัก ห้าม promote หรือ rollback สลับโปรเจกต์

Environment variable names ที่มีอยู่ในโปรเจกต์หลักถูกตรวจโดยไม่เปิดค่า:

- Production: `FIREBASE_SERVICE_ACCOUNT_JSON`, `VITE_AUTH_MODE`, `BMG_FIREBASE_PROJECT_ID`, `BMG_INTERNAL_AUTH_DOMAIN`
- Preview: รายการข้างต้น และ `BMG_FIRESTORE_APP_ID`

ห้ามบันทึกค่าของ secret/config ลงรายงาน Git หรือข้อความทดสอบ

## Deployment gates

ต้องผ่านตามลำดับ ห้ามข้าม gate:

- [x] อัปเดต `origin/main` และยืนยันว่า Production source คือ `eac28fd`
- [x] review สองแกน Standards/Spec; แก้ runtime crash, strict Auth UID gate และ schedule listener regression แล้ว
- [x] local login page render และ browser console ไม่มี error ใน session ใหม่
- [x] เปิด local preview แล้ว Firebase Authentication total ยังคง 917 บัญชี ไม่เกิด user ใหม่
- [x] รัน `npm test` ผ่าน 21/21, Firebase-default build ผ่าน, explicit-legacy build ผ่าน และ `git diff --check` ผ่านหลังแก้ครั้งสุดท้าย
- [ ] commit เฉพาะ source, tests, script และเอกสารของ release นี้; ห้ามใช้ `git add .`
- [ ] push branch เพื่อสร้าง Vercel Preview; ห้าม merge เข้า `main`
- [x] ยืนยันจาก Vercel ว่า Preview และ Production ตั้ง `VITE_AUTH_MODE=firebase` โดยไม่เปิดเผยค่า secret/config อื่น
- [ ] smoke test บัญชีตัวแทน: Super Admin, ผู้ใช้หลายโครงการ, ผู้จัดการโครงการ และพนักงานจำกัดสิทธิ์
- [ ] ทดสอบ login, logout, refresh/session restore, เมนูที่อนุญาต/ห้าม, project scope และการเปิดแต่ละแท็บ
- [ ] ทดสอบ Admin create/edit/disable ด้วยบัญชีทดสอบที่ตกลงไว้เท่านั้น แล้วล้างข้อมูลทดสอบตามอนุมัติ
- [ ] ตรวจ Preview console/runtime logs ไม่มี error และตรวจ Firebase Usage ว่า listener/read ไม่เพิ่มผิดปกติ
- [ ] บันทึก Preview URL, commit SHA, ผู้ทดสอบ, เวลา และผลทุก gate
- [ ] เจ้าของระบบอนุมัติ Production promotion หลังอ่านผลทดสอบ

Preview ใช้ Firebase Production จริง การทดสอบเขียนจึงมีผลต่อข้อมูลจริง ห้ามสร้าง/แก้/ลบข้อมูลธุรกิจเพื่อ smoke test

## Release procedure

1. สร้าง Preview จาก branch ที่ commit แล้ว และตรวจ build logs
2. เปิด Preview เฉพาะผู้ทดสอบ ใช้บัญชีทดสอบที่ตกลงไว้
3. หาก gate ใดไม่ผ่าน ให้หยุดที่ Preview แก้และสร้าง Preview ใหม่
4. เมื่อทุก gate ผ่าน จึง merge/promotion ในช่วงที่มีผู้ดูแลระบบพร้อม
5. ตรวจ login และหน้าหลักทันที แล้วติดตาม Auth user count, Firestore reads/listeners, Vercel errors ที่ 5, 15, 30 และ 60 นาที
6. ติดตามต่อ 24–48 ชั่วโมงก่อนปิด Anonymous provider หรือเริ่ม cleanup บัญชี

## Rollback triggers

ให้ rollback ทันทีเมื่อพบอย่างใดอย่างหนึ่ง:

- login page ไม่ render, JavaScript runtime error หรือ login/logout/session restore ล้มเหลว
- ผู้ใช้เห็นโครงการหรือเมนูผิดสิทธิ์
- การอ่านหรือบันทึกข้อมูลในหน้าหลักล้มเหลว
- Firestore listeners/reads หรือ Anonymous user เพิ่มผิดรูปแบบหลัง release
- Admin API ทำงานผิดหรือมี error ต่อเนื่อง

## Exact rollback procedure

1. หยุดการทดสอบและเก็บ timestamp/error โดยไม่ลบข้อมูลหรือ replay งาน
2. ใน Vercel โปรเจกต์ `bmg-connect` เลือก deployment เดิม `FcaoqPLPsLG4wibz6v3XEmrQE3iD` แล้วใช้ **Instant Rollback** เพื่อคืน domain ไป immutable deployment เดิม โดยไม่ rebuild
3. ยืนยันว่า `bmg-connect.vercel.app` ชี้ไป deployment เดิมและหน้า login render
4. ทดสอบ admin login/logout และอ่านข้อมูลสำคัญแบบไม่แก้ข้อมูล
5. ตรวจ Vercel runtime logs, Firebase Auth count และ Firestore Usage หลัง rollback
6. แก้ปัญหาใน branch/Preview ใหม่; ห้าม promote release เดิมซ้ำจนกว่าจะผ่านทุก gate

Release นี้ไม่เปลี่ยน schema, Rules หรือข้อมูลเป็น batch จึงไม่ควร restore Firestore ระหว่าง application rollback หากมีข้อมูลที่ผู้ใช้เขียนระหว่างช่วงผิดปกติ ให้เก็บและตรวจทีละรายการ ห้าม overwrite ทั้ง collection

`VITE_AUTH_MODE=legacy` ไม่ใช่ full rollback: เมื่อไม่มี trusted custom token โหมดนี้ตั้งใจทำงาน local-only และไม่มี Firestore sync ใช้ได้เฉพาะ degraded emergency access ที่รับความเสี่ยงแล้วเท่านั้น

## งานที่ยังไม่รวมใน release นี้

- project/date-scoped queries, limits และ pagination
- export/version Firestore Rules และ indexes
- Firebase Emulator Rules tests
- Query Insights และ budget alerts
- ปิด Anonymous provider และลบบัญชีเก่า
