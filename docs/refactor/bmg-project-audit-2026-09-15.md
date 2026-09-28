# รายงานตรวจสอบและแผนปรับปรุง BMG-Connect

วันที่ตรวจ: 15 กันยายน 2026

ขอบเขต: ตรวจ repository ปัจจุบันแบบอ่านอย่างเดียว รัน test/build/lint วิเคราะห์โค้ดที่เกี่ยวกับ Authentication, Authorization, Firestore, LocalStorage/IndexedDB, Backup/Restore, Google Apps Script และโครงสร้างหน้าจอ รวมทั้งตรวจ Firebase Console แบบอ่านอย่างเดียวจาก session ที่ผู้ใช้เปิดไว้

ไม่รวม: การแก้ข้อมูลจริง, deploy, การลบบัญชี, การแก้หรือ publish Firebase Rules และการทดสอบทุกเมนูผ่าน browser

## สรุปผู้บริหาร

ระบบยัง build และชุดทดสอบ Auth ปัจจุบันผ่าน แต่ยังไม่ควรเริ่มปรับหน้าจอจำนวนมากพร้อมกัน เพราะฐานข้อมูล สิทธิ์ และกลไกซิงค์ยังมีจุดเสี่ยงต่อข้อมูลสูญหายหรือสิทธิ์ไม่ตรงกับโปรไฟล์

ผลตรวจที่ยืนยันได้:

- `npm test` ผ่าน 14/14 แต่ทั้งหมดเป็น test ใน `tests/auth/`
- `npm run build` ผ่าน
- bundle หลัก 2,119.94 kB หรือ 525.98 kB gzip และมีคำเตือน chunk ใหญ่
- `npm run lint` ใช้งานไม่ได้ เพราะประกาศ script ไว้แต่ไม่ได้ติดตั้ง ESLint
- `App.jsx` มี 23,440 บรรทัด, `useState` 224 จุด และ `useEffect` 28 จุด
- ระบบเปิด real-time subscription ให้ collection จำนวนมากหลัง login โดยโหลดทั้ง collection
- repository ไม่มี Firestore Rules, Storage Rules, indexes, emulator config หรือ CI workflow ให้ตรวจร่วมกับโค้ด
- branch ปัจจุบันคือ `codex/phase-1-baseline` และตรงกับ `origin/codex/phase-1-baseline`; local `main` ตามหลัง `origin/main` 1 commit

ลำดับที่แนะนำคือ **ปิดช่องว่างด้านสิทธิ์และความถูกต้องของข้อมูลก่อน** แล้วจึงแยก `App.jsx`, ย้ายรูป และปรับ performance

## อัปเดตเหตุการณ์ Firebase — 15 กันยายน 2026

### ข้อมูลที่ตรวจพบใน Production console

- Firebase Authentication มีผู้ใช้รวม **917 บัญชี**: anonymous **855 บัญชี** และ email/password **62 บัญชี** เทียบกับ inventory ก่อนหน้าที่บันทึกไว้ 839 anonymous เท่ากับเพิ่มสุทธิ **16 บัญชี** (ยังระบุไม่ได้ว่าทุกรายการมาจาก session ใด)
- บัญชี anonymous ที่เห็นว่าสร้างในเดือนกันยายนมีอย่างน้อย 70 บัญชี โดยเฉพาะ 13 กันยายน 14 บัญชี, 14 กันยายน 1 บัญชี และ 15 กันยายน 2 บัญชี
- Firestore Usage ช่วง 24 ชั่วโมงล่าสุดแสดง reads **2.8 ล้าน**, writes **1.5 พัน**, ไม่มี deletes, snapshot listeners สูงสุด **791**, active connections สูงสุด **26** และ Rules allows **151,000**
- ภาพหน้า quota แสดง reads **83,000 ครั้งต่อวัน** หรือเกินโควตาฟรี 33,000 ครั้ง และค่า Firestore ของเดือนกันยายน **5,453.48 บาท** ตัวเลขนี้ใช้ช่วงเวลาและวิธีรวมผลต่างจากหน้า Usage จึงไม่ควรนำมาเทียบตรง ๆ
- Rules ที่ deploy อยู่จริงเป็น public ทั้งฐานข้อมูล: `allow read, write: if true;` ซึ่ง Firebase Console แสดงคำเตือนว่าสามารถอ่าน แก้ หรือลบข้อมูลได้โดยบุคคลทั่วไป

### การวินิจฉัยต้นเหตุ

**ยืนยันแล้ว**

1. `origin/main` ยังเรียก `signInAnonymously(auth)` เมื่อเปิดแอปและไม่มี custom token หาก browser/profile นั้นไม่มี anonymous session เดิม Firebase จะสร้างบัญชีใหม่
2. `scripts/audit-legacy-usernames.mjs` เรียก `signInAnonymously(auth)` เช่นกัน การรันใน auth context ใหม่จึงสร้างบัญชีเพิ่มได้ และ `signOut()` ไม่ได้ลบบัญชีที่สร้างแล้ว
3. แอป subscribe ทั้ง collection ด้วย `onSnapshot(collection(...))` จำนวนมาก โดยไม่มี query, limit หรือ project filter ในระดับ Firestore หลัง login มี subscription มากกว่า 20 ชุด
4. ชุดตรวจแบบ deterministic กับ `origin/main` ยังล้มเหลวด้วยข้อความ `RED: origin/main creates an anonymous Firebase session on app startup`

**ข้อสรุปที่มีหลักฐานสนับสนุนสูง**

- ค่า 791 snapshot listeners ต่อ 26 active connections เท่ากับประมาณ **30 listeners ต่อ connection** ใกล้เคียงจำนวน collection subscriptions ของแอปอย่างมาก จึงมีแนวโน้มสูงว่ายอดอ่านหลักมาจาก listener fan-out, การ reconnect และการเปิดหลาย tab/session
- การเปิด Rules สู่สาธารณะเป็นความเสี่ยง P0 และทำให้บุคคลภายนอกเรียกฐานข้อมูลได้ แต่ข้อมูลที่มีในตอนนี้ยังไม่เพียงพอจะสรุปว่ายอดอ่านทั้งหมดเกิดจากการโจมตี ต้องใช้ Query Insights/Cloud Logging หรือ telemetry ฝั่งแอปเพื่อระบุ caller ให้แน่นอน

### ลำดับรับมือที่แนะนำ

1. หยุดรันสคริปต์ audit ที่ sign-in แบบ anonymous และปิด preview/แท็บรุ่นเก่าที่ไม่จำเป็น
2. merge และ deploy รุ่น Firebase Auth ที่ไม่ sign-in anonymous ตอนเริ่มแอป พร้อมยืนยัน `VITE_AUTH_MODE=firebase` บน Production
3. export Rules ปัจจุบันเข้า repository สร้าง rules tests และออกแบบสิทธิ์ตาม role/project ก่อน publish Rules ใหม่ การเปลี่ยนจาก public ทันทีโดยไม่มี canary อาจทำให้ระบบ Production ใช้งานไม่ได้
4. ลด listener: query ตาม project/ช่วงเวลา, ใส่ limit/pagination, เปิด subscription เฉพาะหน้าที่ใช้งาน และ unsubscribe เมื่อออกจากหน้า
5. เปิด Query Insights/monitoring และตั้ง budget alert เพื่อตรวจว่า reads ลดลงหลัง deploy
6. เมื่อยืนยันว่าไม่มี client รุ่นเก่าพึ่ง anonymous แล้ว จึงปิด Anonymous provider; หลังสำรองและอนุมัติขอบเขต จึงพิจารณาลบบัญชี anonymous ที่ไม่ใช้แบบ batch

**ยังไม่ได้ดำเนินการ:** ไม่ได้ลบบัญชี anonymous, ไม่ได้เปลี่ยน Rules, ไม่ได้ปิด provider และไม่ได้ deploy เพื่อหลีกเลี่ยงข้อมูลเสียหายหรือ Production หยุดทำงานโดยไม่มี rollback plan

### งานแก้ไขที่ทำแล้วใน branch `codex/phase-1-baseline`

- ถอด `signInAnonymously` ออกจาก application bootstrap ทั้งหมด; legacy mode ที่ไม่มี trusted custom token จะทำงาน local-only และไม่ restore anonymous session เก่า
- เปลี่ยนสคริปต์ `audit-legacy-usernames.mjs` ไปใช้ Firebase Admin credentials จึงไม่สร้าง Firebase Authentication user ระหว่าง audit
- เปลี่ยนค่าเริ่มต้นของ auth mode เป็น Firebase; legacy mode ต้องตั้ง `VITE_AUTH_MODE=legacy` อย่างชัดเจนเพื่อ rollback
- เพิ่ม subscription policy ที่อนุญาต Firestore listener เฉพาะเมื่อ Firebase user ไม่ใช่ anonymous, profile มีสถานะ Active และ Auth UID ตรงกัน
- จำกัด listener ตามเมนู/แท็บที่กำลังใช้งาน: Dashboard ใช้ข้อมูลหลัก 9 ชุดแทนการเปิดทุก collection และแท็บย่อยเปิดเฉพาะ collection ที่เกี่ยวข้อง; หน้า Settings ยังเปิดทุกชุดเพราะฟังก์ชัน backup/restore ต้องใช้ข้อมูลทั้งหมด
- เพิ่ม regression tests สำหรับ auth mode, legacy Firebase session และ subscription policy

**ผลตรวจหลังแก้:** `npm test` ผ่าน 21/21, production build ผ่านทั้งค่าเริ่มต้น Firebase และ explicit legacy mode, `git diff --check` ผ่าน, local browser smoke test แสดงหน้า login โดยไม่มี console error และไม่พบ `signInAnonymously` ใน `App.jsx`, `src/`, `scripts/` หรือ `tests/`

**ยังรอขั้น Production:** review mapping ของแต่ละหน้าด้วยผู้ใช้งานจริง, preview smoke test ทุก role, ตั้ง environment ให้ยืนยัน Firebase mode, deploy แบบ canary และติดตาม Authentication/Firestore Usage 24–48 ชั่วโมง

## P0 — ต้องตรวจและแก้ก่อนขยายระบบ

### 1. ยังยืนยันไม่ได้ว่า Firestore/Storage บังคับสิทธิ์จากฝั่ง server

**หลักฐาน**

- การมองเห็นเมนูและการอนุมัติหลายส่วนตัดสินจาก `currentUser`, `position`, `username` และ `permissions` ใน browser
- client เขียน Firestore โดยตรงผ่าน `usePersistentCollection`
- repository ไม่มีไฟล์ Rules และ emulator tests

**ความเสี่ยง**

การซ่อนปุ่มในหน้าจอไม่ใช่การป้องกันข้อมูล หาก Rules ที่ deploy อนุญาตกว้าง ผู้ใช้ที่ login แล้วอาจอ่านหรือเขียนข้อมูลนอกโครงการ/สิทธิ์ของตนผ่าน Firebase client โดยไม่ผ่าน UI

**สิ่งที่ต้องทำ**

1. export Rules และ indexes ที่ deploy จริงมาเก็บใน repository โดยยังไม่แก้หรือ deploy
2. ทำตารางสิทธิ์ตาม collection/action/role/project
3. เพิ่ม Firebase Emulator Suite และ rules tests สำหรับ read/create/update/delete, project isolation, admin claim และการห้ามผู้ใช้ยกระดับสิทธิ์ตนเอง
4. deploy Rules เป็นระยะ พร้อม canary และ rollback plan

### 2. วงจรสิทธิ์ `admin` custom claim ไม่สอดคล้องกับตำแหน่ง Super Admin

**หลักฐาน**

- `api/admin-users.js` ตรวจผู้เรียกด้วย `decoded.admin === true`
- ตอนสร้างหรือแก้ผู้ใช้ API อัปเดต Auth user และ Firestore profile แต่ไม่ได้เพิ่ม/ลบ `admin` custom claim ตามตำแหน่ง
- migration script เพิ่ม claim ให้ Super Admin เท่านั้น แต่ไม่มีขั้นตอนถอน claim เมื่อลดตำแหน่ง

**ผลกระทบ**

- Super Admin ที่สร้างใหม่อาจจัดการผู้ใช้ไม่ได้
- ผู้ที่ถูกลดตำแหน่งอาจยังถือ `admin` claim และยังเรียก Admin endpoint ได้
- profile และสิทธิ์จริงใน token อาจแสดงผลไม่ตรงกันจนกว่าจะ refresh token

**สิ่งที่ต้องทำ**

- รวม create/update/disable/role-change ไว้ในโมดูลจัดการบัญชีเดียว
- whitelist ตำแหน่งและฟิลด์ที่ server ยอมรับ
- ตั้งหรือลบ claim ให้ตรงกับบทบาททุกครั้ง และบังคับ refresh/re-auth เมื่อสิทธิ์เปลี่ยน
- เพิ่ม integration tests ครอบคลุม promote, demote, disable, delete และห้ามลบบัญชีตนเอง
- เขียน audit log ที่ระบุผู้กระทำ เป้าหมาย การเปลี่ยนสิทธิ์ และเวลา โดยไม่บันทึกรหัสผ่าน/token

### 3. Legacy passwords และเส้นทาง Legacy Auth ยังไม่ถูกปิดงาน

**หลักฐาน**

- โค้ดยังมีเส้นทางเปรียบเทียบ `u.password === inputPassword` สำหรับ legacy mode
- migration ตั้งใจเก็บ password เดิมใน legacy Firestore เพื่อ rollback
- backup เก่า, LocalStorage และ IndexedDB อาจยังมีสำเนาข้อมูลผู้ใช้รุ่นเดิม

**สิ่งที่ต้องทำ**

1. ยืนยัน Firebase Auth บน Production ให้ครบทุก role และ Admin API
2. ทำ inventory สำเนารหัสผ่านโดยไม่แสดงค่าจริง
3. กำหนด observation window และ rollback decision
4. ลบ plaintext password แบบมี backup, record counts และหลักฐานตรวจหลังลบ
5. หลัง cutover สมบูรณ์ ให้ถอด legacy login implementation ออกจาก production bundle ไม่ใช่เพียงปิดด้วย environment flag

ห้ามลบข้อมูลหรือรัน migration ซ้ำก่อนตรวจข้อมูลปัจจุบันและตกลงขอบเขตกับเจ้าของระบบ

### 4. กลไกบันทึกอาจตัดรูปหรือไฟล์ออกจากข้อมูลโดยอัตโนมัติ

**หลักฐาน**

- `usePersistentCollection` ลบ `files[*].data` เมื่อยาวเกิน 100,000 ตัวอักษรและตั้ง `isLocalOnly`
- เมื่อ document ใหญ่ ระบบล้าง `performance[*].images`, `images` หรือ `photo` ก่อนเขียน Firestore
- การตัดข้อมูลเกิดภายใน implementation ของการ save/restore และผู้เรียกไม่ได้รับผลลัพธ์ว่าข้อมูลใดถูกตัด

**ผลกระทบ**

ข้อมูลในเครื่องกับ Cloud ไม่เหมือนกัน รูปอาจหายเมื่อเปลี่ยนเครื่อง ล้าง cache หรือ snapshot จาก Cloud เขียนทับ state ในเครื่อง

**สิ่งที่ต้องทำ**

- หยุดเพิ่ม Base64 ใหม่ใน Firestore
- สร้างโมดูล Attachment/Storage ที่มี interface เล็ก: upload, resolve, delete และคืน metadata/checksum
- ใช้ Firebase Storage สำหรับไฟล์ใหม่ พร้อม progress, retry และสถานะผิดพลาดที่ผู้ใช้เห็น
- reader ต้องรองรับทั้ง Storage URL ใหม่และ Base64/URL เดิม โดยไม่ย้ายของเก่าอัตโนมัติ
- ห้ามรายงาน save สำเร็จหาก attachment upload ล้มเหลว และต้องมี reconciliation report

### 5. Backup/Restore อาจสำเร็จเพียงบางส่วนแต่หน้าจอรายงานว่าสำเร็จทั้งหมด

**หลักฐาน**

- restore ทำทีละหมวดและจับ error ภายใน loop แล้วเพียง `console.error` ก่อนทำหมวดถัดไป
- setter ของ collection จับ Firestore write error ภายในและไม่ throw กลับผู้เรียก
- เมื่อ loop จบ UI แสดงว่านำเข้าสำเร็จตามจำนวนหมวดที่พยายามทำ แม้บางหมวดอาจเขียนไม่สำเร็จ
- ระหว่าง restore มีการลบ Base64 บางส่วนออกจาก object ที่นำเข้า

**สิ่งที่ต้องทำ**

- เพิ่ม preflight validation: schema version, checksum, record counts, required IDs และขนาดไฟล์
- ทำ dry-run preview และแผน diff ก่อนเขียน
- ให้แต่ละหมวดคืนผล `success/failed/skipped` พร้อมจำนวน record
- จบงานด้วย reconciliation report; ถ้ามีหมวดล้มเหลวต้องแสดง Partial failure ไม่ใช่ Success
- ทดสอบ restore ไปยัง emulator/โปรเจกต์ staging ก่อน Production

## P1 — ความเสถียร ประสิทธิภาพ และต้นทุน

### 6. `App.jsx` เป็นโมดูลตื้นขนาดใหญ่และเป็นจุดเสี่ยงของทั้งระบบ

ไฟล์เดียวรวม constants, Firebase initialization, data synchronization, auth/session, business rules, export/print, ทุกหน้าจอ และ modal จำนวนมาก ทำให้การแก้หนึ่งเมนูต้องรู้ interface โดยนัยจำนวนมากและเพิ่มโอกาส regression

**แนวทาง deep modules**

- แยกตาม vertical slice เช่น `users`, `projects`, `schedules`, `maintenance`, `audits`, `inventory`, `meetings`
- แต่ละ slice มี interface สำหรับ command/query ของตนและซ่อน schema conversion, persistence และ validation ไว้ใน implementation
- กำหนด seam ของข้อมูลที่ `BmgRepository`; production ใช้ Firestore adapter และ tests ใช้ in-memory adapter
- กำหนด seam ของไฟล์ที่ `AttachmentStore`; production ใช้ Firebase Storage adapter และ tests ใช้ in-memory adapter
- ย้ายหน้าจอไป `src/screens/` และ lazy-load ทีละเมนู หลังมี characterization tests ป้องกันพฤติกรรมเดิม
- อย่าแยกเป็นไฟล์ย่อยที่ส่ง props/state จำนวนมาก เพราะเป็นการย้ายความซับซ้อนโดยไม่ได้เพิ่ม depth หรือ locality

### 7. โหลด collection ทั้งหมดและเปิด subscription จำนวนมากหลัง login

**หลักฐาน**

- มี `usePersistentCollection` ต่อเนื่องมากกว่า 20 collection
- listener ใช้ `onSnapshot(collection(...))` โดยไม่มี query, project filter, pagination หรือ limit
- snapshot ถูกแปลงและเปรียบเทียบด้วย `JSON.stringify` ทั้ง array

**ผลกระทบ**

เวลาเข้าแอป, memory, CPU, Firestore reads และค่าใช้จ่ายจะเพิ่มตามข้อมูลทั้งหมด แม้ผู้ใช้เปิดเพียงเมนูเดียวหรือมีสิทธิ์เพียงโครงการเดียว

**สิ่งที่ต้องทำ**

- วัด production read count, payload size และเวลา login-to-interactive ก่อนแก้
- subscribe เฉพาะหน้าจอที่เปิดและ unsubscribe เมื่อออก
- query ด้วย `projectId`, ช่วงวันที่, status และ pagination
- ทำ aggregate documents/server-side aggregation สำหรับ Dashboard
- ใส่ indexes ที่จำเป็นและทดสอบ query บน emulator/staging

### 8. การซิงค์หลายชั้นมีความเสี่ยง race condition และ last-write-wins

ข้อมูลเดียวกันกระจายระหว่าง React state, refs, Firestore, LocalStorage, IndexedDB, chunk documents, Google Sheets และ Google Drive ขณะที่ error หลายจุดถูกกลืนไว้ การเขียน chunk ไม่มี version/checksum เดียวกันสำหรับทุกชิ้น จึงอาจอ่านข้อมูลคนละรุ่นเมื่อมีหลาย client เขียนใกล้กัน

**สิ่งที่ต้องทำ**

- กำหนด source of truth ต่อชนิดข้อมูลให้ชัด
- เพิ่ม `schemaVersion`, `updatedAt`, `updatedBy`, revision/precondition และ idempotency key
- ใช้ transaction/batch สำหรับ operation ที่ต้อง atomic
- chunked state ต้องมี generation ID, checksum และ pointer สลับรุ่นหลังเขียนครบ
- แยก offline queue ออกจาก cache และมีหน้าจอสถานะ pending/conflict/error
- ห้ามใช้ empty/non-empty heuristic เป็นกฎป้องกันข้อมูลหายระยะยาว

### 9. Google Apps Script sync ยืนยันผลสำเร็จไม่ได้และ endpoint อยู่ใน client

**หลักฐาน**

- Sheets/Drive Web App URLs ฝังใน `App.jsx`
- หลายคำขอใช้ `mode: 'no-cors'`
- UI ถือว่าสำเร็จเพียงเพราะ browser ส่ง request ออกไปได้ ทั้งที่อ่าน HTTP status/response ไม่ได้

**สิ่งที่ต้องทำ**

- ย้ายการเชื่อมต่อไป server-side endpoint ที่ตรวจ Firebase ID token และสิทธิ์
- เก็บ URL/credential เป็น server secret และหมุน endpoint หากถือเป็น capability URL
- ตอบ job ID และติดตามสถานะสำเร็จ/ล้มเหลวจริง
- เพิ่ม retry แบบ idempotent, rate limit, payload validation และ audit log
- ทบทวนข้อมูลส่วนบุคคลที่ส่งออกและกำหนด retention/access ของ Sheets/Drive

### 10. Production bundle และ third-party runtime assets ใหญ่และพึ่ง CDN

**หลักฐาน**

- bundle หลัก gzip ประมาณ 526 kB
- Tailwind Play CDN โหลดจาก `cdn.tailwindcss.com` ใน Production
- PDF/image libraries และ fonts โหลด runtime จาก CDN ภายนอก

**สิ่งที่ต้องทำ**

- build Tailwind ผ่าน PostCSS ที่มีอยู่แล้วและถอด Play CDN
- ติดตั้ง/ล็อก PDF และ image libraries เป็น dependencies หรือโหลดแบบ lazy จากแหล่งที่ควบคุม
- แยก route/screen chunks และ manual/print-heavy code ออกจาก initial bundle
- เพิ่ม Content Security Policy หลังจัดการ external dependencies
- ตั้ง performance budget ใน CI

### 11. การสร้าง ID และวันที่ยังไม่มีมาตรฐานกลาง

- `generateId()` ใช้ `Math.random()` เพียง 9 ตัวอักษร จึงไม่มีการรับประกัน uniqueness ที่เพียงพอสำหรับข้อมูลหลาย client
- มีการใช้ `new Date().toISOString().split('T')[0]` และ local date calculations หลายรูปแบบ ซึ่งอาจเปลี่ยนวันเมื่อ timezone ไม่ใช่ UTC

ควรใช้ `crypto.randomUUID()`/Firestore auto ID และสร้างโมดูล Date/Clock ที่ระบุ timezone `Asia/Bangkok` พร้อม test รอบเที่ยงคืน สิ้นเดือน ปีอธิกสุรทิน และปี พ.ศ./ค.ศ.

## P2 — คุณภาพการพัฒนาและการดูแลระบบ

### 12. Quality gate ไม่ครบ

- ติดตั้งและกำหนด ESLint ให้ `npm run lint` ใช้งานจริง
- เพิ่ม formatter และ `check` script ที่รัน lint + test + build
- เพิ่ม CI สำหรับ pull request โดยห้าม deploy เมื่อ check ไม่ผ่าน
- เพิ่ม error boundary และ smoke test หน้า Login/เมนูหลัก
- เพิ่ม test สำหรับ Admin endpoint, Rules, persistence, backup/restore, permissions, date calculations และ business calculations
- เพิ่ม browser E2E สำหรับ role สำคัญและ CRUD หลัก โดยใช้ staging/emulator ไม่ใช้ Production data

### 13. Observability และการจัดการข้อผิดพลาดยังพึ่ง console/alert

ควรมี structured error codes, correlation/job IDs, client error reporting ที่ไม่ส่งข้อมูลส่วนบุคคล, dashboard ของ sync failures และ runbook สำหรับ rollback/recovery ผู้ใช้ต้องแยกได้ว่า “บันทึกในเครื่อง”, “รอซิงค์”, “ขึ้น Cloud แล้ว” หรือ “ล้มเหลว”

### 14. เอกสารเริ่มต้นยังไม่เพียงพอ

`README.md` มีเพียงชื่อและคำอธิบายสั้น ควรเพิ่ม architecture overview, environment matrix, local setup, test/build/deploy, data ownership, security model, backup/restore และ incident runbook โดยไม่ใส่ secret

## แผนดำเนินงานที่แนะนำ

### ระยะ A — Safety baseline

1. sync branch กับ `origin/main` อย่างปลอดภัยและแยก untracked tooling ออกจาก application changes
2. เก็บ Firestore export/Storage inventory และ export Rules/indexes ที่ deploy จริง
3. ตรวจ Production canary: login/logout/session ทุก role และ Admin CRUD ด้วยบัญชีทดสอบ
4. บันทึก record counts, bundle/read metrics และ rollback point

**เกณฑ์ผ่าน:** มี backup ที่กู้คืนได้, Rules ตรวจได้ใน repo และทราบสถานะ Production จริง

### ระยะ B — ปิด P0

1. แก้ claim lifecycle และเพิ่ม Admin API tests
2. เพิ่ม Rules + emulator tests
3. ทำ restore validation/reconciliation
4. สร้าง AttachmentStore และเริ่มใช้ Storage สำหรับรูปใหม่หนึ่งเมนูแบบ canary
5. หลัง observation window จึง cleanup legacy passwords ตามแผนที่อนุมัติ

**เกณฑ์ผ่าน:** สิทธิ์ server-side ตรงกับ role, restore ไม่รายงานผลเท็จ และไฟล์ใหม่ไม่ถูกตัดทิ้งเงียบ ๆ

### ระยะ C — แยกโครงสร้างทีละเมนู

เริ่มจากโมดูลที่ขอบเขตชัดและความเสี่ยงต่ำ จากนั้นค่อยไปโมดูลที่ข้อมูลเชื่อมกันมาก:

1. Manual/Settings UI ที่ไม่แก้ข้อมูลหลัก
2. Announcements
3. Users ผ่าน Account Administration module
4. Projects/Contracts/Assets
5. Maintenance/Repairs/Utilities/Audits
6. Schedules/Meetings/Inventory

ทุก slice ต้องมี characterization tests ก่อนย้าย และ commit แยกส่วนโดย behavior เดิมต้องไม่เปลี่ยน

### ระยะ D — Performance และ UX

1. lazy-load screens
2. query ตาม project/date พร้อม pagination
3. Dashboard aggregates
4. sync status/conflict UX
5. accessibility, responsive และ browser E2E

## รายการตรวจรับก่อน Production ในแต่ละระยะ

- test/lint/build/Rules tests ผ่าน
- ไม่มี secret, plaintext password หรือ production export ใน Git
- diff ไม่มีการเปลี่ยน collection path/schema โดยไม่ตั้งใจ
- backup และ rollback command ผ่านการทวนสอบ
- ตรวจอย่างน้อย Admin, Manager และผู้ใช้โครงการจำกัดสิทธิ์
- ทดสอบ create/update/delete, refresh session, offline/reconnect และหลาย browser
- เปรียบเทียบ record counts และสุ่มตรวจ attachments ก่อน–หลัง
- deploy canary ก่อน แล้วตรวจ logs/read costs/error rate
- บันทึก commit, deployment URL, Firebase project และผลตรวจโดยไม่บันทึก credential

## ข้อจำกัดของรายงานนี้

รายงานนี้เป็น static audit จาก source และ local verification ไม่ใช่การรับรอง Production 100% ประเด็น Rules, สิทธิ์ข้อมูลจริง, Google Apps Script, record counts, Storage objects และทุก workflow ต้องตรวจใน environment ที่ได้รับอนุญาตก่อนสรุปผลหรือทำ destructive cleanup
