# System stability audit — 2026-09-19

Scope: local source at cf40c90, existing automated suite, build, and isolated replay of the actual schedule-save handler. This is not a certification of all Production workflows. No Production data, Rules, or deployments changed during this review.

## Findings

1. **P1 — Schedule success is not a server acknowledgement.** `App.jsx:4888` calls persistence setters without awaiting completion, then displays success. `updateProjectScheduleField` does not return the persistence promise. The shared collection setter catches write failures and only logs them (`App.jsx:2025`). Replaying the actual handler with three rejected persistence operations still displays success. This can make users believe data was saved when it was not. This replay is isolated, not a live Production failure.
2. **P1 — Concurrent edits can overwrite one another.** The shared setter writes entire documents with `batch.set` (`App.jsx:2012`), without a version precondition or transaction. Schedule records contain an entire project-month. Two clients starting from the same version and changing different cells can replace each other's document. This is a code-level risk; occurrence in Production has not been established.
3. **P1 — Legacy editing request remains incomplete.** The fallback explicitly sets read-only state and the UI disables saving (`App.jsx:12074`). It is also Admin-only (`src/schedule/adminLegacyScheduleFallback.js`), so an Admin's visibility of old cells does not establish that other roles can see them. Removing only the banner is not a migration or safe editing solution.
4. **P1 — Load failures are represented as completed loading.** `App.jsx:1825` handles all listener errors as “Working offline” and sets loaded=true, without returning a distinct error state. Permission/index/network failures need separate visible states; an empty screen must not imply that no records exist.
5. **P2 — Save semantics are inconsistent.** Editing a shift already invokes `setSchedules` (`App.jsx:8620`), which persists immediately. The Save button also writes notes, cells, and approval separately. These are not one atomic operation; users cannot rely on Save as the sole boundary for committing edits or submitting approval.

## Verification

| Check | Result | Limitation |
|---|---|---|
| `npm test` | 69/69 passed | Mostly module tests; does not establish complete browser workflows |
| Actual save-handler replay with rejected setters | Failure reproduced: success still shown | Mock persistence; no Production writes |
| `npm run build` | Passed | JS bundle approximately 2.10 MB; chunk warning |
| `npm run lint` | Failed: eslint not installed | Static lint gate currently unusable |
| `npm run test:rules` | Blocked: Java 21+ required | No Rules test verdict; do not label this passed |
| Real two-browser / multi-role end-to-end | Not performed in this review | Requires controlled test records and authenticated role sessions |

## Required release gates, in order

1. Establish a persistence result contract: saving, server-confirmed success, failure, pending offline. Propagate promises and errors through every caller; do not show success before acknowledgement.
2. Make schedule save/approval atomic, protect against stale concurrent writes, and explicitly define whether cells autosave or remain a draft until Save.
3. Complete legacy schedule editing through a controlled import path that preserves the source and existing current cells. Keep unresolved employee identities and historical project ownership out of automatic merges.
4. Distinguish loading, empty, failed, and cached views. Verify project routing and staff visibility for Admin, Manager, and Restricted roles.
5. Add integration coverage for failed save, reload, two clients, project/month switching, clearing cells, approvals, locks, and unauthorized writes. Run Firestore Rules tests with a supported Java runtime.
6. Validate on Preview with isolated test data. Preview alone does not guarantee a separate Firebase database: inspect environment configuration first.
7. After approval, release once; verify on two devices that server-confirmed changes survive reload and are visible only to authorized users. Maintain an explicit rollback and backup reference.

Other modules (fees, contracts, personnel, daily reports, assets, tools, PM, repairs, utilities, announcements, and audit) require browser acceptance checks. They share persistence infrastructure, so passing schedule tests alone is insufficient. Billing improvement and full recovery completeness are not established by this review.

## Implementation checkpoint — local only

The schedule Save action now waits for an explicit `{ ok: true }` persistence result. Cells, note and submission approval are passed to one document write, exports run only after acknowledgement, and a synchronous in-flight guard prevents duplicate submissions. The button shows a waiting label. Retrying explicitly rewrites the selected document even if the optimistic local copy is unchanged. The shared setter returns failure results instead of treating unavailable persistence or caught write errors as acknowledgement.

Verification: 73 tests pass, including four tests replaying the actual UI save handler (pending acknowledgement/double click, rejected result, missing acknowledgement, retry after rejection). Build passes; diff whitespace check passes. These tests use a persistence boundary double, not live Firebase. The handler extraction is temporary coverage for the existing monolithic component.

Not yet fixed: concurrent clients, autosave error presentation, other modules' success messages, legacy editing/import, load-error UI, and live cross-role/device tests. Existing optimistic cache behavior remains. No deployment or Production data change performed. This checkpoint must not be released as the full stabilization fix.

## Concurrency checkpoint — local only, subsequent change

Schedule writes now compare the entire original project-month record inside a Firestore transaction before writing. A stale client is rejected even when editing a different cell (conservative conflict detection, not automatic merging). Transaction retries compare the same original baseline. Schedule cache is no longer optimistically advanced by the setter before acknowledgement; failed writes remain retryable. Pending local snapshots are ignored and server metadata events are enabled. Stale React render actions are rejected if the hook already received a newer record.

Autosave callers now display failure results. Approve/lock/unlock success messages wait for acknowledgement. A second edit while a write is pending is explicitly rejected with a retry message, not queued. Browser bulk schedule restore is blocked before any restore table is written, to prevent bypassing the guard; controlled migration scripts remain separate and unchanged.

Ten two-client/persistence regression cases and a stale-render handler case added. These use the actual setter/handler source with a fake transaction boundary; they do not replace Firestore Emulator or real two-browser testing. Previous pre-fix two-client test failed (second writer succeeded and replaced the first edit); it now passes.

Important rollout limitation: this is client-side protection. An already-open older app, old deployment, or Admin SDK script can still overwrite records because Rules have not changed. Do not claim universal concurrency protection until the release/cutover plan handles those writers. Legacy editing, other modules, load errors, and end-to-end release gates remain pending. No push/deploy performed.

## Legacy editing checkpoint — local only, subsequent change

An Admin can choose **นำเข้าตารางเดิมเพื่อแก้ไข** on any project/month displaying legacy fallback data. This is a reusable per-project/month flow, not an automatic bulk migration. The Admin must review historical project ownership, staff and shifts; present-day department matching alone is not evidence of historical ownership.

The flow reads the archive from the server (no cache fallback), refuses missing chunks/changing metadata, and compares the server-derived view with the displayed table. Confirmation identifies the project/month, matched count and current-value conflicts. It rereads the archive before applying and checks that the user, project, month, staff mapping and target document still match the preview. The existing guarded transaction performs the final target write.

Import rules:
- Only known aliases for selected staff/month are included. Unknown identities are skipped; ambiguous shared aliases, conflicting aliases, malformed dates/values and oversized documents block import.
- Current target values win, including intentional empty strings. Other projects/months and the legacy source are not modified.
- Source cells, previous target cells, prior migration marker, actor and time are stored in `legacyEditImports` in the same document as the import. This is an audit copy, **not an independent immutable/off-site backup**. Take an independent backup before a Production rollout.
- Completed staff are marked so cleared cells do not reappear from the archive. Previously migrated staff remain excluded from reimport.
- Note, approval, lock and staff order are preserved. Import removes the legacy fallback restriction, not normal permissions or approval/lock restrictions. Managers/Restricted users do not gain archive access; after import they read the normal project-owned document subject to existing permissions.

Thirteen new unit/actual-handler tests exercise preparation, source reads, explicit confirmation, failed writes, stale source/target, project switching and non-admin entry. Browser acceptance and Firestore Rules integration are still release gates. Source reread is not an atomic source+target transaction: keep the legacy source frozen during cutover. No live data migration, push or deployment performed in this checkpoint.

Preview acceptance checklist: Admin imports a dedicated test month; Manager sees the same server-backed cells; edit and clear a cell then reload from a second browser; verify archived originals and audit copy; verify normal locks/approval and Restricted permissions; test simultaneous writers. Verify Preview uses isolated test data before any writes.

## Emulator verification checkpoint — 2026-09-19

**Preview is not established as isolated.** App.jsx falls back to the hard-coded `bmg-connect-3e99a` Firebase project and `bmg-app-prod` namespace. The checked Vite/index source has no separate Preview Firebase selection or emulator connection. Do not perform write-based browser acceptance on that default Preview build.

Downloaded a temporary Java 21 JRE into `/tmp/bmg-java21.CqCqMf` without changing the system Java installation. Ran `npm run test:rules` with this runtime and the existing `demo-bmg-connect-rules` emulator configuration. Emulator listeners were on localhost and shut down after the tests. No production credentials/data used by these tests.

Real Firestore SDK + Emulator verification now includes the actual schedule setter's transaction path, not just a mocked transaction:
- Admin imports a test project-month with the audit copy; Manager reads and clears a cell; Restricted write is denied.
- A second SDK client with a stale baseline cannot overwrite the first client's edit.
- Manager creates a previously absent project-month safely.
- Foreign project, invalid month/ID, unknown project, Restricted absent-document reads, and unscoped listing remain denied.

This exposed a real release blocker: the new transaction read of an absent month was denied for Manager by the previous Rules, despite ordinary creation being permitted. Reproduced as a failing emulator test (`permission-denied` during `get`), then fixed **locally** with an absent-only, get-only schedule rule scoped to the project ID encoded in the month-document ID, requiring active membership and schedule view+save permissions. Existing write rules are unchanged. Production Rules have NOT been deployed; this Rules change must be included and reviewed in the eventual release plan.

Results: **97/97 unit/handler tests and 27/27 emulator tests pass**. Initial Admin integration fixture lacked the required admin token claim; corrected the fixture rather than weakening Rules. Java 21 blocker is resolved for the temporary test runtime. Actual two-browser UI acceptance is still pending; multiple SDK clients are not a substitute for that UI test. Next requirement is an isolated browser test configuration (local Auth/Firestore emulators or a dedicated staging Firebase project), including disabling real Google Sheets/Drive endpoints. No push, Preview deployment, Production deployment or live migration occurred.

Re-run while the temporary JRE exists:
```sh
env JAVA_HOME=/tmp/bmg-java21.CqCqMf/jdk-21.0.12.1+1-jre/Contents/Home PATH="/tmp/bmg-java21.CqCqMf/jdk-21.0.12.1+1-jre/Contents/Home/bin:$PATH" npm run test:rules
```
