# Schedule data-loss — hotfix + recovery plan (2026-10-02)

## อาการ
เมนูตารางงาน: user A กรอกไว้ แล้ว user B เข้าไปแก้ ข้อมูลของ A หาย
**บางช่อง/บางคน, ทุกโครงการ, เกิดคนละวันก็ได้** (ไม่ใช่ race condition)

## Root cause (ยืนยันจาก Firestore console + โค้ด)
ข้อมูลตารางงานจริงยังอยู่ใน legacy store `app_state/bmg_schedules_v2`
(`totalChunks: 2`, timestamp 2026-09-15) และ **ยังไม่ถูก migrate** ขึ้น collection
ใหม่ `bmg_projectSchedules_docs` (console ยืนยันว่า collection นี้ไม่มีอยู่จริง).

เฉพาะ admin เท่านั้นที่โหลด legacy archive (`isLegacyScheduleArchiveAdmin` คุม
`shouldLoadLegacyScheduleArchive`). ผู้ใช้ทั่วไป:
1. เปิดตาราง → เห็น `bmg_projectSchedules_docs` ที่ว่าง/ไม่ครบ
2. ตาราง **ไม่ถูกตั้ง read-only** (เพราะ `isReadOnlyFallback` เป็น true เฉพาะ admin
   ที่โหลด legacy มาเจอ cells)
3. แก้ 1 ช่อง แล้ว Save → เขียนทับ record `projectId_month` ด้วย cells ของตัวเองเท่านั้น
   → ของคนอื่นหายจากการแสดงผล

**ข้อมูลเก่าไม่ถูกลบ** — `app_state/bmg_schedules_v2` ยังอยู่ครบ กู้ได้.

## หยุดเลือด (ทำแล้ว — commit 12c8b15, branch hotfix/schedule-lock-pre-migration)
เพิ่ม flag `SCHEDULE_SAVE_LOCKED = true` ใน App.jsx → ปิด Save ตารางทั้งระบบ
(บล็อกใน handleSaveSchedule + canEditPlan/canEditAct + ปุ่ม Save). ดู/พิมพ์/
ส่งออก CSV ได้ปกติ. 155/155 tests ผ่าน + regression test ใหม่. verify บน emulator:
ปุ่ม Save disabled, ตารางยังแสดงครบ.

**ขั้นถัดไป:** review + deploy branch นี้ขึ้น production เพื่อหยุดเลือดจริง.

## ผล audit จริง (2026-10-02, read-only)
รัน `node scripts/audit-legacy-schedule-cells.mjs` บน production:
- 27 โครงการ, 72 users, legacyCells รวม **12,201 ช่อง**
- `already-identical: 6,247` (51%) — ย้าย/ตรงกันแล้ว ไม่ต้องทำ
- `unknown-identity: 4,148` (34%) — key พนักงานจับคู่ user ปัจจุบันไม่ได้
  (ส่วนใหญ่เดือน ก.พ.–มิ.ย. น่าจะจาก auth id migration) → **ต้นเหตุ "บางคนหาย"**
- `needs-historical-project-confirmation: 1,614` (13%) — Head office + เดอะเบลส
- `cross-project-target: 103` — แอสปายลาดพร้าว 113 (พนักงานข้ามโครงการ)
- `value-conflict: 89` — **ข้อมูลที่ถูก save ทับจริง**, กระจุกที่ **ก.ย.–ต.ค. 2026**
  (เดอะมาร์ค 40, เลอร์โคซี่ 24, ศุภาลัยเพชรเกษม 12, เดอะทรัสต์ 10, ฯลฯ)
- `authorizedWrites: 0` — script ไม่ย้ายอัตโนมัติ, ต้องยืนยัน ownership รายกรณี
- report: `migration-output/schedule-audit-<ts>/report.md` + `details.json`

**ตีความ:** คลังเก่า 12,201 ช่องยังอยู่ครบ. value-conflict 89 ช่อง = cells ที่ผู้ใช้
ใหม่เขียนทับ (ของเดิมยังอยู่ในคลังเก่า กู้ได้). unknown-identity 4,148 = พนักงานที่
id เปลี่ยน → ต้อง map id เก่า→ใหม่ ก่อนย้าย.

## Production deploy (เสร็จแล้ว)
- 2026-10-02: merge PR #3 → `main` (merge commit `5f3560a`)
- Vercel auto-deploy Production = `5f3560a`, state: **success**
- Verify: emulator ✅, Vercel Preview (ปุ่ม Save สีเทา) ✅,
  **Production `bmg-connect.vercel.app` (ตารางงาน) ปุ่มบันทึกสีเทา disabled ✅**
- **หยุดเลือดสำเร็จ** — ผู้ใช้ save ตารางทับไม่ได้อีก; ดู/พิมพ์/export ยังปกติ
- rollback: ถ้าต้องย้อน ให้ revert `5f3560a` บน main แล้ว Vercel redeploy

## แผนกู้คืน (หลัง deploy hotfix)

Production project: `bmg-connect-3e99a`, appId `bmg-app-prod`.
ทุก script ใช้ service account ผ่าน env `FIREBASE_SERVICE_ACCOUNT_JSON`
(หรือ `gcloud auth application-default login`).

### ขั้น 1 — audit: ดูว่ามี cells ค้างแค่ไหน (read-only, ปลอดภัย)
```
export FIREBASE_SERVICE_ACCOUNT_JSON='<service-account-json>'
node scripts/audit-legacy-schedule-cells.mjs
```
รายงานจำนวน cells ที่ยังอยู่ในคลังเก่า แยกตามโครงการ/เดือน. ไม่มีการเขียน.

### ขั้น 2 — dry-run migrate metadata (read-only โดย default)
```
node scripts/migrate-project-schedule-metadata.mjs
```
พิมพ์ report (mode: read-only-dry-run): proposedWrites, collisions, manifestSha256,
safeToApply. **ยังไม่เขียนอะไร** จนกว่าจะใส่ `--apply` + ยืนยัน 3 ค่า.
> หมายเหตุ: script นี้ย้ายแค่ note/approval/staffOrder — **ไม่ย้าย cells**
> (schedules: {} เว้นว่างให้ขั้น 3).

### ขั้น 3 — ย้าย cells จริง (bless, ต้องตรวจ ownership)
`scripts/migrate-bless-confirmed-schedules.mjs` — ย้าย cells จากคลังเก่าเข้า record
ใหม่ หลังยืนยันว่าพนักงาน/โครงการ/เดือนถูกต้อง. default dry-run; `--apply` เขียน +
สร้าง backup ที่ `backups/bless-schedules-<timestamp>/`.
**ต้องรีวิว scope ของ script นี้ก่อน** (ตอนนี้ hardcode "exactly two staff" —
ต้องปรับให้ตรงกับ roster จริงของแต่ละโครงการก่อนใช้งานกว้าง).

ทางเลือก: ให้ admin กด **"นำเข้าตารางเดิม"** ใน UI ทีละโครงการ/เดือน
(`handleEnableLegacyScheduleEditing`) ซึ่งออกแบบให้ตรวจ ownership + เก็บ backup อยู่แล้ว.
**แต่ flow นี้ถูกปิดโดย SCHEDULE_SAVE_LOCKED** — ต้องเปิด flag เฉพาะตอน migrate
หรือใช้ script ขั้น 3 แทน.

### ขั้น 4 — verify + เปิด save กลับ
- ตรวจ `bmg_projectSchedules_docs` มี cells ครบเทียบกับ audit ขั้น 1
- ตั้ง `SCHEDULE_SAVE_LOCKED = false` ใน App.jsx → deploy
- smoke test: A กรอก → B เปิด → B เห็นของ A ครบ → B แก้ → ของ A ไม่หาย

## หมายเหตุ branch
- hotfix อยู่บน `hotfix/schedule-lock-pre-migration` (แตกจาก main) — ไม่ปนกับงาน
  refactor บน `refactor/phase-0-seams`
- ต้องขออนุมัติก่อน deploy ตาม CLAUDE-CODE-HANDOFF.md
