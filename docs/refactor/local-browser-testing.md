# Isolated browser testing

This mode is local-only and **not a Vercel Preview deployment**. It uses synthetic records in `demo-bmg-browser`, Auth at `127.0.0.1:9099`, Firestore at `127.0.0.1:8090`, and Vite at `127.0.0.1:5175`. The internal `bmg-app-prod` namespace is retained only to exercise the same Rules; the Firebase project is a separate demo emulator project.

## Start

Requires Java 21+ for the emulator. A temporary runtime for this session is at `/tmp/bmg-java21.CqCqMf/jdk-21.0.12.1+1-jre/Contents/Home`.

```sh
env JAVA_HOME=/tmp/bmg-java21.CqCqMf/jdk-21.0.12.1+1-jre/Contents/Home PATH="/tmp/bmg-java21.CqCqMf/jdk-21.0.12.1+1-jre/Contents/Home/bin:$PATH" npm run emulators:browser
```

In another terminal:

```sh
env FIRESTORE_EMULATOR_HOST=127.0.0.1:8090 FIREBASE_AUTH_EMULATOR_HOST=127.0.0.1:9099 npm run seed:browser
npm run dev:isolated
```

Seeding overwrites only the named synthetic fixtures and emulator test users. Do not reseed midway through an acceptance test. Emulator data is temporary and not exported automatically.

Local accounts: `admin`, `qa-manager`, `qa-restricted`. All use the intentionally public, emulator-only password `LocalOnly-2026!`. Never use this password or these fixtures in a real project.

## Isolation controls

- Emulator mode takes precedence over injected or manual Firebase config, forces Firebase Auth, and permits loopback development hosts only.
- No fallback to cloud Firebase if connection/setup fails. Both SDKs connect to explicit local emulator ports before use.
- Google Sheets/Drive URLs are empty in this mode. The local page's CSP restricts fetch/XHR/WebSocket destinations to itself and the two emulator ports. Local `/api/` requests return 503; Admin user management API is not emulated.
- Vite refuses `build --mode emulator`; normal Production builds retain their existing configuration.
- Seeding refuses to start unless both exact localhost emulator environment variables are present; it uses a fixed demo project and no ADC credentials.
- A visible LOCAL TEST banner and title distinguish it from Production. External font/Tailwind/static resources are not fully offline; business-data service connections are restricted.

## Browser evidence — 2026-09-19

Chrome tab 648321819 on browser 3, URL `http://127.0.0.1:5175/`:
1. Admin authenticated against the emulator, saw one synthetic project and three synthetic users.
2. Opened the project schedule for September 2026, saw the legacy import button.
3. Confirmation showed four matched cells and zero current-value conflicts.
4. Confirmed import through the UI. A subsequent read-only emulator check returned `migrationStatus: complete`, four cells and one audit copy.

The Mac locked while handling the success alert, preventing further UI inspection. Tab marked for handoff; localhost services left running for continuation. **Not yet browser-verified:** post-alert editable state, Manager/Restricted login, edit/reload, two independent sessions, offline errors. Existing SDK/emulator tests do not replace these checks. Resume after the Mac is unlocked; no Production writes or deployment performed.

Verification: 99 unit/handler tests pass; normal build passes with existing large-bundle warning. Emulator build refusal and seed-without-hosts refusal were both exercised successfully (expected nonzero exits). Prior Rules suite passed 27 tests; not rerun against the separate browser emulator ports.

## Resumed after unlock — 2026-09-19

- Dismissed the import success alert. September's legacy warning disappeared and PLAN fields became editable.
- Admin changed the first synthetic PLAN cell from M3 to H. Reloaded and reopened the project schedule: H persisted.
- Logged out, logged in as qa-manager: the same H value appeared. Changed it to V, reloaded and reopened the schedule: V persisted.
- Logged in as qa-restricted: project opened, Save button count was zero, but staff row count was also zero. Repro: on its September schedule, `getByRole('row').filter({hasText:'qa-restricted ข้อมูลจำลอง'}).count()` returned 0. This is NOT a successful read-only schedule acceptance test.
- Cause identified for this fixture: it has schedule view permission but no `proj_staff.view`; `src/firebase/queryScope.js` blocks the users query without that permission, consistent with `/users` Rules. The schedule renders rows from users, so an empty roster is displayed. Do not fix by broadly granting access to full employee profiles. A schedule-only roster or explicit access-state UX requires further work.
- Manager briefly saw empty cells before the server data arrived. Data subsequently appeared; this is evidence to investigate loading UX, not evidence of deleted records.
- These were sequential roles in one Chrome profile, not two independent browser sessions. Two-session concurrency, offline-error UI, approval/lock flows and Restricted roster behavior remain pending. No Production changes, push, deploy or Rules deployment were performed. Local services remain running and the Restricted test tab is retained for continuation.

Only browser QA and this evidence record changed in this continuation; prior automated test totals above were not rerun.

## Readiness/access-state fix — next continuation, 2026-09-19

- Added a fifth collection-hook result for scoped read status (loading/ready/error/blocked/unavailable). Existing four tuple values remain compatible. Account/query changes invalidate readiness synchronously; server-required cache snapshots do not mark ready. Failed reads are not equivalent to an empty successful result.
- Schedule screen now gates its grid/actions until both roster and schedule collection are ready. A blocked roster gives an explicit permission explanation, not a blank grid. This is a safe UX fix, **not** a schedule-only roster implementation and does not grant Restricted access to employee profiles.
- PLAN/ACT fields, note and row dragging now also respect schedule save permission (and relevant lock state). No Firestore Rules or real user permissions were changed in this continuation.
- Browser confirmed Restricted sees the access explanation instead of the blank grid. Manager still sees the previously saved V/O cells and an enabled PLAN input.
- Regression harness executes the actual collection-hook implementation with controlled hook/SDK boundaries. It initially failed three cases, then passed; an additional query-switch case covers project scope. Slow/offline timing still needs browser-level acceptance; automated boundary tests are not a full React lifecycle or two-session browser test.
- No push/deployment. A minimal schedule roster for users without personnel access remains a separate design/data task; do not broaden `/users` reads as a shortcut.

## Minimal roster implementation — 2026-09-19

- Implemented authenticated read-only `/api/schedule-roster?projectId=...` for accounts without personnel read access. Server checks verified token (including revocation), active matching profile, explicit schedule view permission and project ownership/access. Admin bypass requires the token claim, not a display username. Payload is allowlisted to id, employeeId, firstName, lastName, position; no full-profile spreads in responses. At most 500 staff; overflow/duplicate identity fails explicitly rather than truncating silently.
- Client request runs only while needed for the active schedule project, aborts on cleanup and masks responses from previous account/project scopes. No polling, browser persistence or public HTTP cache. Current department association matches existing schedule UI semantics; this is not a reconstruction of historical transfers.
- Isolated Vite now serves this one endpoint through the same server reader pinned to demo-bmg-browser and localhost emulators. All other `/api/` routes remain disabled. Earlier statement that *every* local API returns 503 is superseded by this narrow exception.
- Browser: Restricted passed through loading state, then saw Manager V/O schedule cells and both staff rows. Inputs are read-only/disabled and Save is absent. Full employee records were not made accessible by Rules changes. Export controls now respect the schedule print permission.
- `node --test tests/schedule/roster.emulator-test.js` passed against localhost: real synthetic Auth token, minimal roster response, private/no-store header, anonymous 401, direct full Manager profile read still 403. Initial harness used a literal email instead of the app's encoded email and was corrected to use usernameToAuthEmail; no account changes.
- Deployment prerequisite: the primary Vercel project must provide the existing Firebase Admin credential/project configuration to the new function. Do not deploy this ordinary app to the old recovery domain. Production endpoint/credential/IAM checks, two-browser concurrency and full release acceptance remain pending. No cloud writes, migration, push or deploy in this checkpoint.

## Deterministic two-origin continuation — 2026-09-20

- Used separate `127.0.0.1:5175` and `localhost:5175` origins so Admin and Manager had independent Auth and browser storage while sharing the same synthetic emulator backend.
- Schedule edits remained local before Save: Admin's unsaved day-3 value was not visible in the other session. Manager then saved day 4; Admin's stale draft was rejected explicitly and did not replace the Manager write.
- In the paused-Firestore case, both sessions showed `รอเซิร์ฟเวอร์ยืนยัน…`. After the emulator resumed, one write completed and the stale write was rejected. This closes the deterministic pending-acknowledgement/stale-writer browser gate for the synthetic environment.
- Area-manager approval, HR approval, lock, unlock, month switching, and Restricted read-only roster behavior were exercised. Unlock currently reopens the workflow as Pending HR; product ownership must confirm that behavior.
- Final automated verification after the draft fixes: Node 22 tests 119/119, lint clean, Production build passed, and Java 21 Firestore Rules tests 27/27.

These checks do not validate a deployed roster function or Production IAM. The primary deployed roster URL currently returns Vercel 404, so deployment acceptance remains blocked. They also do not replace persisted write smoke tests for the other shared-persistence modules.

## Central Fees and Personnel API continuation — 2026-09-20

- Central Fees project settings are now stored in scoped `app_state` documents. Browser acceptance saved 91 notice days / 7 freeze months, verified the emulator document, reloaded, and displayed the same values.
- The isolated Vite server still fails closed for `/api/admin-users`; it does not expose privileged account management inside the browser harness.
- Personnel server behavior is covered separately with `npm run test:admin-api`. This starts isolated Auth/Firestore emulators and invokes the real Vercel handler for create, update, and delete using only synthetic records.
- The deployed roster acceptance command is `npm run verify:deployed-roster`; its four required environment variables and fail-closed checks are recorded in the release gate document. `BMG_ROSTER_EXPECTED_STAFF_IDS` must name at least one known synthetic Preview row so an empty or incomplete roster cannot pass. Do not store the short-lived ID token in a file or commit it.
