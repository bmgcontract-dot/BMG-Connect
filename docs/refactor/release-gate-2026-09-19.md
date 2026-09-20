# Stabilization release gate — 2026-09-19

Decision: HOLD. Local working-tree changes are not deployed or approved as a complete release.

## Fresh verification

- `npm test`: 114 passed, zero failures.
- `npm run build`: passed; 2,122.76 kB JS, 530.52 kB gzip, existing chunk-size warning.
- `git diff --check`: passed.
- `npm run test:rules` with temporary Java 21: 27 passed. The first sandboxed run could not bind localhost ports; the permitted localhost rerun passed.
- `node --test tests/schedule/roster.emulator-test.js`: one passed against synthetic local Auth/Firestore. The first sandboxed attempt could not connect; the permitted rerun passed.
- Local browser Restricted view inspected: two synthetic staff rows, V/O cells visible, inputs and exports disabled, Save absent.
- `npm run lint`: failed because ESLint is not installed. Do not count this gate as passed.

These tests do not establish two independent browser-session acceptance or full-system safety.

## Remaining gates

1. Two independent browser sessions: stale concurrent save, reload, denied write, network failure/retry, approval, lock/unlock, project/month switches.
2. Cross-module browser smoke tests for shared persistence: personnel, fees, reports, assets, PM, repairs and utilities. Verify persisted data, not just notifications.
3. Primary Vercel project `bmg-connect`: inspect production environment names without revealing values. New roster API needs `BMG_FIREBASE_PROJECT_ID` and a usable Firebase Admin credential (`FIREBASE_SERVICE_ACCOUNT_JSON` or verified ADC). Validate credential project/IAM through an authenticated scoped request. Production must not define emulator host variables.
4. Isolated deployment acceptance: default Preview can point at Production Firebase. Do not write test records there without verified isolation.
5. Establish a fresh independent, access-controlled backup, successful export status, manifest, counts and isolated restore evidence. A same-document `legacyEditImports` copy is not an independent backup. The existing Bless-only backup is not evidence of full-project coverage.
6. Restore lint tooling or explicitly document an accepted exception after targeted static review. Do not hide failures by weakening checks.

## Coordinated release plan (not executed)

- Record exact candidate commit, current immutable production deployment ID and currently deployed secure Rules before changes. Local HEAD alone is not proof of the deployed version.
- Freeze the legacy source during imports. Identify older open clients/writers; the transaction guard in the new client cannot protect against old writers.
- Confirm primary domain `bmg-connect.vercel.app`; do not replace recovery on `bmg-connect-6b24.vercel.app`.
- Review and release the absent-month, project-scoped Rules change with the app. Test current-client compatibility before Rules-first rollout. Without this Rules support Manager's new-month transaction can fail.
- After explicit release approval, deploy candidate and perform a limited authorized canary, then verify across roles/devices and expand. Stop on missing rows, false success, stale overwrite or widened access.

## Rollback plan (not executed)

- Stop affected writes through an established operational control; no new kill switch is claimed to exist.
- Preserve post-release records and errors before rollback. Promote only the recorded compatible prior immutable deployment after assessing older-writer risk.
- App rollback does not revert Firestore documents or Rules. Restore Rules only to a reviewed secure compatible revision; never use historical public-access Rules.
- Reconcile only verified affected project/month records from the independent backup and post-cutover writes. Do not bulk restore over new valid writes.
- Verify reload, permissions and server acknowledgements after recovery.

Billing diagnosis is separate: SKU data identifies Firestore transfer-out as the main expense, but this release has not been shown to fix that cause.

## ESLint checkpoint (supersedes the missing-tool gate above)

Installed ESLint flat configuration with browser/Node scope separation, recommended JavaScript correctness rules, JSX identity/key rules and React Hooks checks. `npm run lint` now fails on warnings as well as errors. Host-injected globals are read-only only in App.jsx; generated output and private backups are excluded, not application source or tests.

Removed unused imports/handlers and unused state bindings while retaining hook calls; fixed duplicate migration-object key and unnecessary escapes; kept explicit secret removal in identity sanitization. Hook dependencies use serialized query identity rather than unstable query objects; presence uses the latest setter without restarting its interval every render; logout is memoized with its auth adapter dependency.

Fresh results: lint zero errors/warnings; 116 tests passed including two lint configuration regression cases; normal build passed with existing large-bundle warning. Real browser acceptance remains required after hook changes. No deploy, Rules update or migration executed.

Tooling caveats: React ESLint plugin currently declares peer support through ESLint 9, so this installation uses 9 rather than forcing incompatible 10. npm marks ESLint 9 deprecated; plan a compatible upgrade. npm also reports four dependency audit findings (three moderate, one high), not remediated by forced upgrades in this change. Local Node is 23.7.0 while the project declares 22.x; repeat release checks with Node 22. None of these observations is a clean security audit.

## Two-session / backup verification — subsequent continuation

Only synthetic business data was changed. No Production writes, deployment, secret reveal or cloud export/import was performed.

- Chrome session A on `127.0.0.1:5175` (qa-manager), session B on `localhost:5175` (admin). Different origins isolate browser storage/auth while using the same demo backend; this is two sessions on one physical device, not two physical machines.
- A changed first PLAN V to H; B displayed H. Save transitioned both to pending area-manager approval. Admin confirmed area-manager then HR approval; both displayed complete and disabled PLAN.
- Admin locked September: Manager had 121 textboxes, zero enabled. Admin unlocked: 121 enabled again. The approved state does not remain immutable after unlock; observe and confirm this business behavior before release.
- Paused only verified Java `demo-bmg-browser` Firestore emulator for 45 seconds with automatic SIGCONT recovery. A Save showed disabled `รอเซิร์ฟเวอร์ยืนยัน…`, not premature success. After resume the alert completed and pending approval appeared. This tests backend nonresponse/recovery, not every offline/disconnected-network failure path.
- Reloaded B and reopened schedule: H/O and pending approval persisted.
- Dispatched two UI fills concurrently: A first PLAN M1, B second PLAN H. Both screens converged to M1/H. No stale rejection was forced in this run; earlier SDK transaction tests provide deterministic stale-writer coverage, not browser race coverage.
- Opened personnel, fees, contracts, daily reports, assets, PM, repairs and utility screens as Admin: expected headings, no visible error. This is rendering smoke coverage, not full write/approval coverage for all modules.
- Created synthetic utility meter QA-LOCAL-0919, value 100. Manager's independent session displayed the same record/value. A native success alert blocked CDP temporarily; dismissed via native UI, no duplicate Save.
- Vercel primary project environment list shows `FIREBASE_SERVICE_ACCOUNT_JSON` for Production and Preview and `BMG_FIREBASE_PROJECT_ID` for both. Values were not revealed. No emulator host variables were listed among project variables. Shared-variable scope and authenticated deployed roster endpoint/IAM still need validation; name presence is not credential validity.
- Cloud Console under BMG account: all-collections export Sep 15 21:32:04 to 21:33:12, 35,798 documents, 1.58 GB at `bmg-connect-3e99a.firebasestorage.app/2026-09-15T14:32:04_36710`. This is not a fresh pre-release export or verified full restore.
- Local Bless backup checksum passed (checksum file contains bare digest, not shasum manifest syntax). `scripts/verify-bless-backup-local.mjs` restored before/after for five months into fixed `demo-bmg-restore-drill` on localhost8090, read back and deep-compared ten documents including timestamp decoding. No source or Production path was used as target. This local emulator drill does not verify managed Cloud export restore, bucket retention or full system coverage.

HOLD remains: full write smoke coverage, deterministic browser stale/offline-error cases, deployed credential/IAM acceptance, fresh full backup and isolated full restore. New paid export/restore resources require owner approval before creation. Existing synthetic fixtures and local restored documents were retained, not deleted.

## Release-gate continuation — 2026-09-20

No Production application, Rules, data migration, or deployment was changed in this continuation.

- Node 22 verification passed: `npm test` 119/119, `npm run lint` with zero errors/warnings, and `npm run build` with the existing large-chunk warning (2,123.44 kB JS, 530.66 kB gzip). `git diff --check` passed.
- `npm run test:rules` passed 27/27 with temporary Eclipse Temurin Java 21.0.12.1. The runtime remains session-local under `/tmp`; no system Java installation was changed.
- Schedule cells now remain in a local project/month draft until Save. Save compares the captured server baseline, including an intentionally absent month, and rejects a record created concurrently. While acknowledgement is pending, cells, note, staff dragging, and schedule click targets are disabled; a synchronous guard closes the pre-render race. Focused regression and independent spec re-review passed.
- Deterministic two-origin browser acceptance used `127.0.0.1` and `localhost` with separate Auth/storage against the same synthetic emulator. Firestore was paused while Admin and Manager submitted stale drafts: both displayed the pending acknowledgement state, one write succeeded after resume, and the stale writer received an explicit conflict without overwriting the first write.
- Browser approval checks passed for area-manager and HR approval. Lock disabled all schedule editing; unlock restored editing and returned the workflow to Pending HR. September values survived September → October → September navigation. Confirm this unlock workflow is the intended business behavior before release.
- Restricted browser acceptance passed: minimal roster and existing cells were visible, schedule inputs and export actions were disabled, and Save was absent. The authenticated roster emulator test passed separately; Rules cover the denied write.
- The deployed primary URL `https://bmg-connect.vercel.app/api/schedule-roster?projectId=qa-local-project` returned Vercel HTTP 404. Therefore the roster function is not deployed and deployed token/IAM acceptance cannot be performed. Environment-name presence from the prior check is not proof that credentials or IAM work.
- After explicit owner confirmation, Cloud Console exported the full Production `(default)` database in `asia-southeast1` to `bmg-connect-3e99a.firebasestorage.app/2026-09-20T01:36:34_32392`. It started Sep 20, 2026 08:36:34 ICT and completed successfully at 08:37:14 with 35,932 documents and 1.59 GB.
- Created isolated Standard/Native database `restore-drill-20260920` in `asia-southeast1` with restrictive default Rules, then imported the fresh manifest. Import started at 08:38:44 and completed successfully at 08:45:16 with 35,932 documents and 1.6 GB. Firestore Studio displayed the restored root collections and loaded a representative document's fields. No Production document was used as the restore target or modified by the drill.
- The export files and isolated database are retained as release evidence and continue to incur storage charges. Deletion was not authorized or performed.
- Standards review found no violation of documented repository standards. It recorded non-blocking maintainability debt in the large `App.jsx`, duplicated legacy chunk readers, raw lifecycle strings, and the legacy-import context data clump. Spec review passed the malformed-archive, runtime CSS selector, draft/save, absent-month, and in-flight-edit fixes.

Decision remains **HOLD**. The fresh full export and isolated restore gate is now complete. Remaining blockers are: deploy the roster function and validate authenticated Production IAM; complete persisted cross-module write smoke coverage; confirm unlock workflow; and review the split commits before any deploy. Local work must be split into explicit product/test, audit-tooling, and evidence-documentation commits without adding local `.agents/`, `.claude/`, or `skills-lock.json` files.

## Persisted-write smoke and pre-deploy baseline — 2026-09-20

No Production data, Rules, application deployment, or roster IAM configuration was changed. Browser writes used only synthetic accounts and project `qa-project` against Auth/Firestore emulators on localhost.

- Daily Reports passed: created the 2026-09-20 synthetic report and verified its document in `bmg_dailyReports_docs`.
- Assets passed: created `QA-LOCAL-A-001` / `SMOKE-ASSET-20260920`, quantity 2 at `LOCAL-LAB`, and verified `bmg_assets_docs`.
- Machines passed: created `BMG-M-001` / `SMOKE-MACHINE-20260920`, Generator, quantity 1 at `LOCAL-PLANT`, and verified `bmg_machines_docs`.
- PM passed: created an active monthly plan for the synthetic machine, scheduled on day 1, and verified `bmg_pmPlans_docs`.
- Repairs passed: created `QA-LOCAL-REP-001` for `LOCAL-ROOM`, confirmed the rendered request, and verified `bmg_repairs_docs`.
- Utilities passed: created water meter `QA-W-001` / `SMOKE-METER-20260920` at `LOCAL-UTILITY` with opening value 100, recorded 125, and verified both the updated meter and reading (`prevValue: 100`, `usage: 25`) in `bmg_meters_docs` and `bmg_utilityReadings_docs`.
- Personnel is blocked in this isolated browser setup: saving a user requires the Firebase Authentication Admin API, which is not emulated by the local Vite setup. The attempted synthetic edit showed an explicit failure and did not claim or produce a persisted write.
- Central Fees failed the persistence gate: the settings modal's “save” control only closes the modal. `noticeThresholdDays` and `freezeThresholdMonths` are component state and are not written to shared storage. This is a release blocker if these settings are expected to survive reload or be shared across users.
- Native `alert()` calls in Machines, PM, and Utilities temporarily blocked browser automation. Each write was accepted only after the success dialog was dismissed and the resulting Firestore document was read back; alerts alone were not counted as evidence.

Pre-deploy baseline captured at 2026-09-20 09:11 ICT:

- Candidate branch: `codex/schedule-legacy-read-fallback`.
- Candidate HEAD: `41c55c49cda804ff861dc2698c9c020d71541867` before this evidence update.
- Remote branch baseline: `origin/codex/schedule-legacy-read-fallback` at `cf40c9002916e6533bd1d3ff8d3ba4e291e3604e`; the candidate was three commits ahead.
- Remote main baseline: `origin/main` at `eac28fde8a8dde59d608b046bd6d214be917859d`.
- Production roster request still returned `HTTP 404`, `X-Vercel-Error: NOT_FOUND`, request ID `sin1::j2nd7-1789870284277-453577bac985`. No authenticated IAM test is possible until the function is deployed.
- No local immutable Vercel deployment identifier or deployed Rules snapshot was available, so those two rollback anchors remain unrecorded and must be captured from the deployment platform before release.
- The three reviewed split commits are `99794e1` (product/tests), `28e8fcb` (audit tooling), and `41c55c4` (evidence documentation). Local `.agents/`, `.claude/`, and `skills-lock.json` remain untracked and excluded.

Decision remains **HOLD**. The persisted-write gate is complete for Reports, Assets, Machines/PM, Repairs, and Utilities. Remaining release blockers are Central Fees persistence, a production-capable Personnel/Admin-API smoke path, deployment plus authenticated IAM validation for the roster API, and recording the immutable pre-deploy Vercel deployment and deployed Rules revision. Current unlock-to-Pending-HR behavior is the working release assumption; record explicit business-owner approval in the final release decision.
