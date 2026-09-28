# บันทึกส่งต่องาน BMG-Connect — 13 กันยายน 2026

## ความต้องการและขอบเขต

ผู้ใช้ขอพักงานและกลับมาทำต่อใน session ใหม่ งานหลักคือปรับระบบทีละส่วน ตรวจทุกเมนู/ฟีเจอร์/การแสดงผล ทดสอบและ commit แยกส่วน ต่อไปต้องการแยกหน้าเข้า src/screens/ และให้รูปใหม่ไป Storage ใหม่โดยรูปเก่ายังดูได้

สถานะที่ต้องสื่อสารให้ตรง: **การย้าย Login ไป Firebase Authentication และทดสอบ admin บน Production เสร็จแล้ว** งานคงค้างคือการตรวจและเก็บกวาดความปลอดภัย ไม่ควรบอกผู้ใช้ว่าการย้าย Login ยังไม่สำเร็จ หน้าเปลี่ยน/รีเซ็ตรหัสผ่านเป็นงานเพิ่มเติม

## ระบบและ repository

- Workspace: /Users/sunksun.lap/node_js/BMG-Connect
- Vite + React; App.jsx เป็นไฟล์หลักขนาดใหญ่มาก
- GitHub: bmgcontract-dot/BMG-Connect
- Vercel หลัก: bmg-connect; URL https://bmg-connect.vercel.app
- มี Vercel อีกโปรเจกต์ bmg-connect-6b24 ผูก repo เดียวกัน อย่าสับสนกับตัวหลัก
- Firebase: bmg-connect-3e99a; logical app ID: bmg-app-prod
- Legacy collections: artifacts/bmg-app-prod/public/data/{collectionName}_docs
- โปรไฟล์ใหม่: users/{Firebase Auth UID}

## งานที่เสร็จ

1. สำรวจระยะที่ 1 และเขียน docs/refactor/phase-1-baseline.md, feature-and-data-inventory.md, backup-and-rollback.md
2. สร้าง src/auth/identity.js, businessAuth.js, firebaseAuthAdapter.js และ adminUserClient.js
3. VITE_AUTH_MODE=firebase ใช้ Firebase Email/Password ผ่านอีเมลภายในที่แปลงจาก username และโหลด users/{uid}; เก็บ legacy ID ไว้ให้ส่วนอื่นใช้งานร่วมได้
4. โหมด Firebase ไม่เรียก anonymous login; ค่าอื่น/ไม่ตั้ง flag ยังเป็น legacy
5. เอา emergency admin credential ที่ฝังในโค้ดออก
6. ตัด password ออกจาก export/backup/Google Sheets payload รุ่นใหม่ ไม่ได้ลบสำเนาเก่าที่มีอยู่แล้ว
7. เพิ่ม api/admin-users.js สำหรับสร้าง/แก้ไข/ลบ Auth users และโปรไฟล์ ต้องมี Firebase ID token ที่มี admin custom claim
8. เพิ่ม migration script ใช้ Admin SDK importUsers แบบ HMAC_SHA256 เพื่อคงรหัสผ่านเดิม รวมถึงรหัสสั้น; ข้าม Auth UID ที่มีอยู่แล้ว แต่การรันซ้ำยัง merge โปรไฟล์ legacy กลับเข้าข้อมูลใหม่ได้ จึงอย่ารันซ้ำโดยไม่ตรวจ
9. เปิด Email/Password บน Firebase จริงแล้ว; Anonymous ยังเปิดอยู่
10. Migration จริงผู้ใช้รันเอง รายงาน importedAuthUsers: 62 และ writtenProfiles: 62
11. ข้อมูลต้นทาง 64 รายการ มี admin ซ้ำ 3 รายการ: u1, 0rm3m66pw, 2us67m83b ผู้ใช้ยืนยันเลือก u1 เป็นหลัก อีก 2 เอกสารยังเก็บไว้ ไม่ได้ลบหรือย้าย references
12. ตั้ง Vercel Preview แล้วทดสอบ; PR #2 merge เข้า main แล้ว ภาพจากผู้ใช้ยืนยัน merge commit eac28fd และ Production Ready/Current
13. ผู้ใช้ดำเนินการตั้ง Production/redeploy ตามคู่มือ และรายงาน Login admin ด้วยรหัสปัจจุบันผ่านบนเว็บจริง ไม่ได้ตรวจค่าลับหรือ Production runtime ซ้ำโดย agent

## หลักฐานทดสอบและข้อจำกัด

- npm test ผ่าน 14/14; Firebase-mode build ผ่าน มี warning chunk ใหญ่ประมาณ 2.12 MB / gzip 526 KB
- ผู้ใช้รายงาน Local ผ่าน logout/login, session, role, เมนู/สิทธิ์ และสร้าง/แก้ไขผู้ใช้
- ผู้ใช้รายงาน Preview ผ่าน login/logout/refresh/role อื่น แต่ยังไม่ได้ยืนยันสร้าง/แก้ไขผู้ใช้บน Preview โดยละเอียด
- Production ผู้ใช้ยืนยันเฉพาะ admin login ผ่าน ไม่ควรขยายข้อสรุปเป็นทุก role/API ผ่าน
- Vite dev server ปกติไม่ได้ให้บริการ Vercel /api/admin-users เอง จึงควรตรวจหลักฐานการสร้าง/แก้ไขผู้ใช้จาก Production API จริง แม้ผู้ใช้เคยรายงาน Local ผ่าน
- รหัส admin ที่ migration ใช้คือรหัสเดิมของ u1 ไม่ใช่รหัสเริ่มต้นทั่วไป ห้ามเดา รีเซ็ต หรือบันทึกรหัสผ่านลงเอกสาร
- ยังไม่ได้วัดความเร็วก่อน–หลัง จึงห้ามยืนยันตัวเลขหรือรับประกันว่าเร็วขึ้น

## Environment variables ที่โค้ดใช้

- VITE_AUTH_MODE=firebase (Config) ใช้ตอน build เว็บ
- VITE_INTERNAL_AUTH_DOMAIN (optional) default auth.bmg-connect.local; ต้องตรงกับฝั่ง server
- BMG_FIREBASE_PROJECT_ID=bmg-connect-3e99a (Config) ฝั่ง Admin API
- BMG_INTERNAL_AUTH_DOMAIN=auth.bmg-connect.local (Config) ฝั่ง Admin API
- FIREBASE_SERVICE_ACCOUNT_JSON (Secret) เนื้อหา JSON ฝั่ง server ห้ามเติม VITE_ และห้าม commit/แสดงค่า
- BMG_FIRESTORE_APP_ID=bmg-app-prod ใช้ migration script ไม่ได้เปลี่ยน client config ซึ่งยัง hardcoded
- สคริปต์ migration รับ GOOGLE_APPLICATION_CREDENTIALS ผ่าน applicationDefault หรือ FIREBASE_SERVICE_ACCOUNT_JSON
- BMG_CANONICAL_LEGACY_IDS_JSON={"admin":"u1"} ใช้ตอน migration
- BMG_CONFIRM_PROJECT_ID=bmg-connect-3e99a เป็น gate สำหรับ --apply

ผู้ใช้มี service-account file และใช้ migration สำเร็จแล้ว ไม่ทราบ path ที่เลือกจริง ไม่ต้องสร้าง key ใหม่หรือขอให้ส่งเนื้อหามาในแชต Environment ที่ export ใน Terminal ของผู้ใช้ไม่จำเป็นต้องปรากฏใน terminal ของ agent

## งานต่อไปตามลำดับ

1. ตรวจสถานะ remote/main และ Production แบบอ่านอย่างเดียวก่อนเริ่ม เปรียบเทียบกับ local ซึ่งยังค้างบน branch เก่า
2. ปิดงาน validation บน Production: logout/session/role และ API สร้าง–แก้ไขผู้ใช้ ด้วยบัญชีทดสอบที่ตกลงไว้ ตรวจ logs และโปรไฟล์ไม่มี password
3. ตรวจ Firestore/Storage Security Rules ที่ deploy จริง: ก่อนหน้านี้พบว่าไม่มี rules ใน repo ซึ่ง **ไม่เท่ากับไม่มี rules บน Firebase** อย่า deploy rules ที่เดาขึ้นมา ตรวจการอ่านข้อมูล role/admin claims และการป้องกันแก้สิทธิ์ตนเองโดยตรง
4. ตรวจข้อมูลผู้ใช้เปลี่ยนระหว่าง migration กับ cutover; อย่ารัน migration ซ้ำทับข้อมูลใหม่โดยอัตโนมัติ
5. วางแผน cleanup passwords ใน legacy, browser cache/localStorage/IndexedDB และสำเนา backup เก่า หลังมีแผนสำรองและผ่านการใช้งานจริง ขอขอบเขตการลบอย่างชัดเจน
6. ตรวจผู้เรียก Anonymous ทั้ง production เก่า/โปรเจกต์ Vercel ซ้ำ/แท็บเก่า/สคริปต์ audit ก่อนปิด provider และลบบัญชี อย่าลบตามตัวเลข 839 เพราะเป็นจำนวนจากภาพเก่า
7. หน้าเปลี่ยนรหัสผ่าน/รีเซ็ตและ forced first change ยังไม่ได้ทำ ผู้ใช้เคยแจ้งรหัสเริ่มต้นทั่วไป แต่ไม่ได้ยืนยันนโยบายรหัสใหม่ร่วมกัน; ใช้กระบวนการปลอดภัยและไม่ hardcode รหัสร่วมโดยอัตโนมัติ
8. แยก App.jsx เข้า src/screens/ และ deep modules ทีละส่วน
9. ย้ายรูปใหม่เข้า Storage ใหม่ รักษาการเปิดรูปเก่า
10. วัด performance และปรับโหลดหน้า/ข้อมูลตามที่ใช้งาน ตรวจทุกเมนูทีละส่วน

## ข้อควรระวังจากงานวันนี้

- สคริปต์ audit ของ agent เรียก signInAnonymously หลายครั้งและสร้าง Anonymous accounts เพิ่มจริง การ signOut ไม่ลบบัญชี ไม่ควรโยนสาเหตุทั้งหมดให้ production เก่า และ anonymous login ไม่จำเป็นต้องสร้าง UID ใหม่ทุก refresh เมื่อมี session เดิม
- หลีกเลี่ยงสร้าง anonymous ใหม่ในการตรวจ ใช้ credential/บริบทอ่านที่ได้รับอนุญาตและแสดงเฉพาะข้อมูลจำเป็น
- Canonical migration patch ล่าสุดข้าม noncanonical username duplicates แต่ยังไม่มี validation ว่า canonical ID ที่ระบุมีอยู่จริง และ test ไม่ครอบคลุมกรณีหายนี้ อย่าอ้างว่าตรวจแล้ว; migration จริงครั้งนี้สำเร็จแล้ว ไม่ใช่เหตุให้ rerun
- Rollback deployment ไม่ย้อนข้อมูล Auth/Firestore บัญชีใหม่/รหัสผ่านที่เปลี่ยนใน Auth ไม่ sync กลับ legacy การกลับ legacy ยังคืนความเสี่ยง plaintext ด้วย
- Preview ใช้ Firebase จริง การเขียนจาก Preview กระทบข้อมูลจริง
- ห้ามลบ passwords, users หรือปิด Anonymous อัตโนมัติจากเพียงคำขอให้ตรวจ/สรุป

## Git ณ เวลาบันทึก

Local branch: codex/phase-1-baseline (ยังไม่ได้ sync main หลังผู้ใช้ merge)

- 43af95b docs: establish phase 1 migration baseline
- 25e2390 feat(auth): prepare Firebase Authentication migration
- 84f3e3f feat(auth): select canonical legacy user during migration
- 5ddc72b fix(auth): ignore noncanonical duplicate migration records

Untracked ที่พบก่อนสร้างบันทึกนี้: .agents/, .claude/, scripts/audit-legacy-usernames.mjs, skills-lock.json รักษาไว้ อย่า git add . โดยไม่ตรวจ บันทึกส่งต่อนี้ยังไม่ได้ commit/push

## วิธีเริ่ม session ใหม่

อ่านบันทึกนี้ ตรวจ git status และสถานะ remote/Production ปัจจุบันก่อนลงมือ ผู้ใช้ขอทำต่อวันถัดไป ยังไม่ได้ขอ automation หรืออนุญาตลบข้อมูล คุยภาษาไทย สรุปตรงประเด็น และไม่ให้ผู้ใช้ทำขั้นตอนที่ทำเสร็จไปแล้วซ้ำ
