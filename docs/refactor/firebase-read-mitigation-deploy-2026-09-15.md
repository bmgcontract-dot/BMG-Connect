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
- [x] รอบแรก `npm test` ผ่าน 21/21; หลังพบปัญหา Preview เพิ่ม regression tests แล้วผ่าน 25/25, หลังพบ partial user-cache snapshot ผ่าน 26/26 และหลังเพิ่ม durable Auth persistence ผ่าน 28/28; Firebase-default build, explicit-legacy build และ `git diff --check` ผ่าน
- [x] commit เฉพาะ source, tests, script และเอกสารของ release นี้ที่ `ded9609566e0beb6ccabb840630b7d5c0ad1859a`; ไม่ได้ใช้ `git add .`
- [x] push เฉพาะ branch `codex/phase-1-baseline`; ยังไม่ merge เข้า `main`
- [x] ยืนยันจาก Vercel ว่า Preview และ Production ตั้ง `VITE_AUTH_MODE=firebase` โดยไม่เปิดเผยค่า secret/config อื่น
- [ ] smoke test บัญชีตัวแทน: Super Admin ผ่านแล้ว; ผู้ใช้หลายโครงการ, ผู้จัดการโครงการ และพนักงานจำกัดสิทธิ์ยังรอทดสอบ
- [ ] login, logout, refresh/session restore และเมนู/แท็บที่ Super Admin เข้าถึงผ่านแล้ว; เมนูที่ห้ามและ project scope ของ role อื่นยังรอทดสอบ
- [ ] ทดสอบ Admin create/edit/disable ด้วยบัญชีทดสอบที่ตกลงไว้เท่านั้น แล้วล้างข้อมูลทดสอบตามอนุมัติ
- [ ] Preview console/runtime logs ไม่มี error และ Auth total ไม่เพิ่ม; ยังต้องเก็บ Firebase Usage delta ในช่วงควบคุมเพื่อยืนยันว่า reads ไม่เพิ่มผิดปกติ
- [x] บันทึก Preview URL, commit SHA, ผู้ทดสอบ, เวลา และผล gate ที่ดำเนินการแล้ว
- [ ] เจ้าของระบบอนุมัติ Production promotion หลังอ่านผลทดสอบ

Preview ใช้ Firebase Production จริง การทดสอบเขียนจึงมีผลต่อข้อมูลจริง ห้ามสร้าง/แก้/ลบข้อมูลธุรกิจเพื่อ smoke test

### Preview evidence

- Vercel deployment: `EhJyLs9cTsUdpLN35KNpYSokrSJy`
- Preview URL: `https://bmg-connect-jswujkla0-bmgcontract-6324s-projects.vercel.app`
- source commit: `ded9609566e0beb6ccabb840630b7d5c0ad1859a`
- build: `Ready` ใน 21 วินาที ไม่มี build error
- remote browser smoke: หน้า login render, ไม่มี runtime console error; พบเฉพาะ Tailwind CDN warning เดิม
- Vercel runtime logs หลังเปิด Preview: Warning 0, Error 0, Fatal 0
- Firebase Authentication หลังเปิด local และ remote Preview: total ยังคง 917 บัญชี
- ผู้ใช้ล็อกอินบัญชี Super Admin บน Preview สำเร็จ และข้อมูลหลักโหลดได้ 25 โครงการ / 62 พนักงาน
- พบตัวบล็อกหลังโหลดข้อมูลจริง: `RangeError: Invalid string length` จากการ stringify snapshot ทั้ง collection จึงหยุด release นี้ไว้ที่ Preview และยังไม่ promote Production
- แก้ใน branch โดยเลิก stringify snapshot เพื่อเปรียบเทียบ และจำกัด listener ของ `bmg_dailyReports`/`bmg_pmHistoryList` บน Dashboard/ภาพรวมโครงการไว้เฉพาะเดือนที่หน้าจอใช้ โดยเก็บข้อมูลเดือนอื่นใน IndexedDB; หน้า Daily/PM ยังโหลดประวัติเต็มเมื่อเปิดใช้งาน
- Dashboard เปลี่ยนเดือนอันดับรายงานได้ตามเดิม โดย query เฉพาะเดือนที่เลือกแทนการสะสมข้อมูลตั้งแต่เดือนนั้นถึงปัจจุบัน
- regression tests ครอบคลุม payload ที่ serialize ไม่ได้, ขอบเขตต้นเดือน/สิ้นเดือน, การแทนที่/ลบข้อมูลในช่วง query, การเก็บข้อมูลนอกช่วง และการป้องกัน ID ซ้ำ
- ยังไม่มีการเขียนข้อมูล เพราะ Preview ใช้ Firebase Production และยังไม่ได้ระบุข้อมูลทดสอบที่อนุญาต

### Fixed Preview evidence

- Vercel deployment: `J3AY2MrmUvjdPZrWju2nhk3LaMdK`
- Preview URL: `https://bmg-connect-pe9x9rv4x-bmgcontract-6324s-projects.vercel.app`
- source commit: `7fd129cf3e7025b04cc9ac5c64b869fac3915f98`
- build: `Ready` ใน 22 วินาที ไม่มี build error
- ผู้ทดสอบ: เจ้าของระบบล็อกอินด้วยบัญชี Super Admin; Codex ดำเนินการ smoke test แบบอ่านอย่างเดียว วันที่ 15 กันยายน 2026 เวลาประมาณ 15:31–16:01 น. (Asia/Bangkok)
- login ผ่าน; Dashboard โหลด 25 โครงการ / 62 พนักงาน / Audit เฉลี่ย 82.0% / Action Plan ค้าง 237 รายการ โดยไม่พบ `RangeError`
- เปิด Users (62 รายการ), Projects (25 โครงการ), Audit, Announcements, Manual และ Settings สำเร็จ
- เปิดภาพรวมโครงการตัวอย่างและแท็บ central fee, contracts, staff, schedule, assets, tools, repair, utilities, action plan, audit, forms, supplier, meetings, inventory, others, Daily Report และ PM สำเร็จ
- refresh/session restore ผ่าน: ระหว่าง Firebase restore มีหน้า Login ปรากฏชั่วครู่ก่อนกลับ Dashboard; ควรเพิ่ม auth-loading screen เพื่อลดความสับสน แต่ไม่พบการหลุด session
- logout ผ่านและกลับหน้า Login; ไม่มีการส่งฟอร์มสร้าง/แก้ไข/ลบข้อมูล
- browser console พบเฉพาะ Tailwind CDN warning เดิม; Vercel runtime logs ของ deployment นี้ในช่วงทดสอบเป็น Warning 0, Error 0, Fatal 0
- Firebase Authentication total ก่อนและหลัง smoke test ยังคง 917 บัญชี จึงไม่พบบัญชี anonymous ใหม่จาก release นี้
- ระหว่าง navigation มีการเปิด modal สร้าง Audit โดยไม่ตั้งใจหนึ่งครั้ง แต่ปิดทันทีโดยไม่แก้ field และไม่กดบันทึก จึงไม่มี write
- การปิด announcement overlay บน Preview บันทึกเฉพาะ dismissed IDs ใน `localStorage` ของ Preview origin ไม่ได้เขียนข้อมูล cloud
- ยังไม่ทดสอบ role อื่น, Admin create/edit/disable และ Firestore Usage delta เพราะ Preview เชื่อม Firebase Production และไม่มีข้อมูล/บัญชีทดสอบที่ได้รับอนุมัติ

### Second Admin session and Usage findings

- ผู้ใช้เปิด `bmg-connect-6b24.vercel.app` ในครั้งแรก ซึ่งเป็น Vercel project คนละตัวกับ Fixed Preview จึงหยุดทดสอบทันทีและย้ายไป URL ที่ถูกต้องโดยไม่แก้ข้อมูล
- หลัง login ใหม่บน Fixed Preview พบ Dashboard และ Users แสดงผู้ใช้เพียง 1 คนชั่วคราว ก่อน server snapshot โหลดครบเป็น 62 คน
- Firestore console ยืนยันว่า root collection `users` มีโปรไฟล์หลายรายการและหน้าแอปแสดงครบ 62 รายการเมื่อ server snapshot มาถึง
- สาเหตุคือ Firebase Auth profile `getDoc` เติม cache ด้วยเอกสาร Admin หนึ่งรายการก่อน collection listener เปิด ทำให้ cache snapshot แรกถูกแสดงเสมือนข้อมูลครบ
- เพิ่ม regression test และตัวเลือก `requireServerSnapshot` ให้ root `users` listener ไม่ยอมรับ partial cache snapshot; ใช้ `includeMetadataChanges` เพื่อรอ authoritative server snapshot แล้วค่อยปลด loading state
- Firestore Usage ช่วง 24 ชั่วโมง วันที่ 14–15 กันยายน 2026 แสดง reads 2.5M, writes 1.4K, snapshot listeners peak 791 และ active connections peak 26 ตัวเลขนี้รวม Firebase console และทุก deployment จึงยังใช้วัดผลเฉพาะ Preview ไม่ได้ แต่เป็นสัญญาณให้เร่งแยก traffic และลด listeners
- Firestore Rules ปัจจุบันตรวจยืนยันอีกครั้งว่าเป็น public: `allow read, write: if true;` จึงเป็น Production security blocker

### Durable-session Preview evidence

- Vercel deployment: `BnR6Yw5KzaLauggi1qDf9ER8EwFM`
- Preview URL: `https://bmg-connect-7x9l5anzm-bmgcontract-6324s-projects.vercel.app`
- source commit: `04689df107a70fb5124b2ff2a541ff2123e22f8c`
- build: `Ready` ใน 23 วินาที ไม่มี build error
- เปลี่ยน Firebase Auth initialization ให้กำหนด durable persistence ชัดเจน: IndexedDB เป็นตัวเลือกแรกและ browser local storage เป็น fallback
- ผู้ทดสอบล็อกอิน Super Admin สำเร็จ; Dashboard โหลด 25 โครงการ / 62 พนักงาน / Audit เฉลี่ย 82.0%
- refresh สองรอบติดต่อกัน restore session สำเร็จภายในประมาณ 3 วินาทีโดยไม่ต้องกรอกรหัสผ่านใหม่ และทั้งสองรอบกลับมาพร้อมข้อมูล 25 โครงการ / 62 พนักงาน
- browser console error 0; พบเฉพาะ Tailwind CDN warning เดิม
- Vercel runtime logs ช่วงทดสอบ: Warning 0, Error 0, Fatal 0
- Firebase Authentication หลัง login และ refresh สองรอบยังคง 917 บัญชี ไม่พบบัญชี anonymous เพิ่ม
- ระหว่างรอ `onAuthStateChanged` ยังเห็นหน้า Login ชั่วครู่ จัดเป็น UX follow-up ไม่ใช่ session loss
- ไม่มีการสร้าง แก้ไข หรือลบข้อมูลธุรกิจในการทดสอบนี้

### Restricted-role test preparation

- ได้รับอนุมัติให้สร้างข้อมูลทดสอบใน Firebase ที่ Preview และ Production ใช้ร่วมกัน เพื่อทดสอบสิทธิ์พนักงานแบบจำกัดขอบเขต
- พบข้อบกพร่องสำคัญในฟอร์มเพิ่มโครงการ: หน้าจอแจ้งว่าบันทึกสำเร็จก่อนรอผลเขียน Firestore; รายการ `โครงการทดสอบ` ปรากฏจาก IndexedDB ชั่วคราว แต่หายเมื่อ server snapshot กลับมา และตรวจ Firestore โดยตรงได้ 25 โครงการ / 0 รายการที่ชื่อ `โครงการทดสอบ` หรือรหัส `O-002`
- เพื่อไม่กดซ้ำจนเกิดข้อมูลซ้ำ ได้ตรวจชื่อและรหัสก่อนสร้าง แล้วสร้างเอกสารทดสอบเพียงรายการเดียวใน collection เดียวกับแอป พร้อมอ่านกลับยืนยันค่าหลักครบถ้วน
- ทรัพยากรทดสอบที่สร้างแล้ว: document ID `tst260915`, code `O-002`, name `โครงการทดสอบ`, type `Office Building`, status `Active`, contract `2026-09-15` ถึง `2027-09-14`
- rollback ของข้อมูลทดสอบ: ลบเฉพาะเอกสาร `artifacts/bmg-app-prod/public/data/bmg_projects_docs/tst260915` หลังได้รับคำยืนยัน ณ เวลาที่ลบ; ห้ามลบทั้ง collection
- บัญชีพนักงานทดสอบยังไม่ถูกสร้าง ขั้นเตรียมกำหนดให้สังกัดเฉพาะ `โครงการทดสอบ`, ไม่มี `accessibleDepts`, ตำแหน่ง `ช่างประจำอาคาร (Technician)` และให้สิทธิ์ดูเฉพาะ Dashboard/Projects/Project Overview โดยไม่มี save/edit/approve/delete/print
- ก่อนกดสร้างบัญชีจริงต้องขอคำยืนยันอีกครั้ง เพราะจะสร้างทั้ง Firebase Authentication account และ Firestore profile; หลังสร้างต้องตรวจ Auth count, anonymous count, profile scope และ login/refresh/logout ด้วยบัญชีจำกัดสิทธิ์

### Restricted-account API failure investigation

- การกดบันทึกบัญชีทดสอบบน Preview ล้มเหลว 4 ครั้งด้วย HTTP 500; หยุด retry ทันทีเพื่อไม่ให้เสี่ยงเกิดข้อมูลซ้ำ
- Vercel runtime logs ยืนยันว่า function ล้มระหว่างโหลดโมดูลก่อนเข้า handler: `jwks-rsa` เรียก `jose` ซึ่งเป็น ESM ผ่าน `require()` ภายใต้ Vercel Node 24 (`ERR_REQUIRE_ESM`)
- เพราะล้มก่อนเข้า handler จึงไม่มีการสร้าง Auth user และไม่มีการเขียน Firestore profile; ค้นหา internal email ของ `bmg-test-limited-260915` ใน Firebase Authentication แล้วไม่พบบัญชี
- เพิ่ม regression check ให้ admin-user function โหลดแบบ ESM และล็อก Vercel runtime เป็น Node `22.x` ซึ่ง Firebase Admin v14 รองรับ
- local gate หลังแก้: test 30/30 และ production build ผ่าน; lint ยังรันไม่ได้เพราะ repository ไม่มี `eslint` dependency แม้มี script เดิม
- Preview แรกที่ commit `080f9f5` build ไม่ผ่านเพราะ lockfile เดิมบันทึกเฉพาะ Rollup binary ของ macOS และการเปลี่ยน Node ทำให้ Vercel ข้าม cache; เพิ่ม `@rollup/rollup-linux-x64-gnu@4.63.1` เป็น optional dependency ให้ตรงกับ Rollup ที่ Vite ใช้ แล้วรัน test/build ซ้ำผ่าน
- Preview `3yYDDetCz7gYNJDuNfx7aXgjtjuq` ที่ commit `870d4b3` build Ready และ Resources ยืนยัน Node `22.x` แต่ safe GET ยังได้ 500 พร้อม `ERR_REQUIRE_ESM` เดิม จึงยืนยันว่าการลด Node version อย่างเดียวไม่พอและยังไม่มีการเรียก handler
- ไม่ใช้ทางเลือก downgrade Firebase Admin 13.10.0 เพราะ production audit เพิ่มเป็นช่องโหว่ระดับปานกลาง 8 รายการ; คง Firebase Admin 14.4.0 แล้ว override เฉพาะ `jose` เป็น 5.10.0 ซึ่งมีทั้ง CommonJS และ ESM exports เพื่อให้ `jwks-rsa` 4.1.0 โหลดบน Vercel ได้
- dependency gate ของแนวทาง override: Firebase Admin 14.4.0 → jwks-rsa 4.1.0 → jose 5.10.0, test 31/31 และ build ผ่าน; production audit เหลือ 2 moderate จาก gaxios 6.7.1 → uuid 9.0.1 ซึ่งไม่ได้เกิดจาก jose override และยังต้องติดตามแยก
- ขั้นถัดไปต้องสร้าง Preview ใหม่ แล้วยืนยัน Resources เป็น Node 22 และ GET `/api/admin-users` เปลี่ยนจาก `500 FUNCTION_INVOCATION_FAILED` เป็น handler-level `405 method-not-allowed` ก่อนทดสอบการสร้างบัญชีอีกครั้ง
- runtime probe บน Preview deployment `88g95nt58Q6tfvfSKwQr4voBSeU3` (source `dcba713`) ถึง function จริงแล้ว: Vercel Runtime Logs แสดง `GET /api/health-probe` สถานะ `405`, Warning 0, Error 0, Fatal 0 เมื่อ 15 กันยายน 2026 เวลา 19:02 น. (Asia/Bangkok) จึงยืนยันว่า Firebase Admin dependency graph โหลดสำเร็จและ request เข้าถึง handler-level method guard แล้ว
- probe endpoint, rewrite และลิงก์ทดสอบเป็นของชั่วคราว ลบออกก่อนสร้าง clean Preview; การตรวจนี้เป็น GET เท่านั้นและไม่สร้าง Auth user หรือ Firestore profile
- หาก Node 22 ยังเกิด `ERR_REQUIRE_ESM` ให้ rollback เฉพาะ Preview ไป deployment `BnR6Yw5KzaLauggi1qDf9ER8EwFM` และพิจารณาตรึง dependency/ปรับ ESM bundling ใน Preview ใหม่; ห้าม promote Production

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

- project-scoped queries, limits และ pagination (release นี้เพิ่มเฉพาะ date scope สำหรับสอง collection ขนาดใหญ่บน Dashboard/ภาพรวมโครงการ)
- export/version Firestore Rules และ indexes
- Firebase Emulator Rules tests
- Query Insights และ budget alerts
- ปิด Anonymous provider และลบบัญชีเก่า
- เพิ่ม auth-loading screen ระหว่าง `onAuthStateChanged` restore เพื่อไม่ให้หน้า Login กระพริบชั่วครู่หลัง refresh
- เพิ่ม loading/error state ที่แยก cache snapshot จาก authoritative server snapshot สำหรับ collection สำคัญอื่น หากพบรูปแบบเดียวกับ `users`
