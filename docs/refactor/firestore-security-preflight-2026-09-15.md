# Firestore security preflight — 2026-09-15

Scope: BMG-Connect production data inspection, recoverable backup, draft Rules,
and local Emulator tests. No production Rules, Authentication providers, or
business records were changed or deleted in this work.

## 1. Read-only findings

### Duplicate test project

The production `bmg_projects_docs` collection contains 27 documents. An exact
query for `name == "โครงการทดสอบ"` returned two records:

| Document ID | Code | Name | Contract dates | Notes |
| --- | --- | --- | --- | --- |
| `dhtc5355v` | `O-002` | `โครงการทดสอบ` | 2026-09-15–2027-09-14 | Created by the first UI save attempt; `files` contains empty maps |
| `tst260915` | `O-002` | `โครงการทดสอบ` | 2026-09-15–2027-09-14 | Canonical test record recorded in the release report; `files` contains null values |

No deletion was performed. If cleanup is approved later, resolve every reference
first and delete only the explicitly approved document ID. Never delete by name
or delete the collection.

### Firebase Authentication

The Users table was counted across all 921 records without downloading or
committing user-level data:

- Anonymous: 858
- Email/Password: 63
- Anonymous records created on 2026-09-15: 5
- Anonymous records created on 2026-09-14: 1
- Anonymous records created on 2026-09-13: 14
- Anonymous provider: Enabled
- Email/Password provider: Enabled

The totals reconcile with the earlier baseline: 855 anonymous + 62 email at 917,
followed by three additional anonymous accounts and the one approved restricted
email account. The final tested Preview did not increase the total beyond 921.

### Project-scope schema sample

Up to 20 production documents were sampled read-only from every known
project-domain collection. Most sampled collections consistently contain a
non-empty `projectId`. Exceptions that the Rules must model explicitly:

- `bmg_utilityReadings_docs`: no `projectId`; scope is inherited through
  `meterId` → `bmg_meters_docs/{meterId}.projectId`.
- `bmg_contractors_docs`: four sampled documents, none with `projectId`; this is
  currently a global list and requires explicit `proj_contractors` permission.
- `bmg_forms_list_docs`: 20 sampled documents, none with `projectId`; this is
  currently a global list and requires explicit `proj_forms` permission.
- Empty collections at sample time: `bmg_meetings_docs`,
  `bmg_meeting_proxies_docs`, `bmg_meeting_ballots_docs`,
  `bmg_meeting_attendances_docs`, and `bmg_meeting_agendas_docs`.

## 2. Backup and rollback evidence

### Managed data export

A one-time export of the entire `(default)` Firestore database completed
successfully:

- Started: 2026-09-15 21:32:04 Asia/Bangkok
- Completed: 2026-09-15 21:33:12 Asia/Bangkok
- Destination: `bmg-connect-3e99a.firebasestorage.app/2026-09-15T14:32:04_36710`
- Documents: 35,798
- Export size reported by Google Cloud: 1.58 GB
- Scope: All Collections, current database state

Production had no previous import/export jobs, point-in-time recovery was off,
and daily/weekly backup retention was unset. This export is the recoverable data
checkpoint for the Rules hardening work. A later restore drill should restore to
a separate non-production database first; do not import over production as a
test.

### Configuration snapshots

- Current deployed Rules snapshot:
  `config-snapshots/firestore.rules.production-2026-09-15.rules`
- Current indexes snapshot:
  `config-snapshots/firestore.indexes.production-2026-09-15.json`

The Firebase Console showed no manual/composite indexes and no single-field
exemptions. Automatic collection-scope indexes were at the default enabled
settings. The CLI account available on the machine received HTTP 403 for Rules,
indexes, and backup APIs, so the deployed configuration was verified through the
logged-in Firebase Console account instead.

The old Rules snapshot is intentionally insecure and exists only as an exact
emergency rollback artifact. Restoring it reopens public read/write access and
must be treated as a temporary incident action, not an acceptable final state.

## 3. Draft Firestore Rules

`firestore.rules` now contains a fail-closed, not-yet-deployed draft that:

- rejects unauthenticated and anonymous requests;
- requires an active `users/{uid}` profile whose `authUid` matches Firebase Auth;
- uses the server-issued `admin` custom claim for global application data access;
- prevents all direct client writes to `users` profiles;
- limits project reads and writes to assigned project names/IDs and menu action
  permissions;
- prevents project IDs from being changed to an inaccessible project on update;
- resolves utility-reading scope through its meter;
- handles the two current global collections through explicit menu permissions;
- denies access to other artifact application namespaces; and
- denies every unmatched path by default.

`firebase.json` and `firestore.indexes.json` provide the local/deploy
configuration. These files are source artifacts only; no `firebase deploy` was
run. `.firebaserc` deliberately defaults to a `demo-` project so an unqualified
Firebase command cannot target Production. The verified local toolchain was
Firebase CLI 15.23.0 with OpenJDK 21.

## 4. Emulator test evidence

The public Rules seam was exercised with `@firebase/rules-unit-testing` against
the Firestore Emulator. TDD red/green evidence included the original public rule
allowing anonymous access, cross-project reads, direct profile escalation, and
cross-namespace reads before each guard was added.

Final Rules suite: 13/13 passed. Covered behaviors:

- anonymous denied;
- authenticated user without a profile denied;
- inactive user can load only their own profile and cannot read business data;
- restricted employee reads assigned project only;
- other artifact app namespace denied;
- self-service permission escalation denied;
- scoped project query succeeds and unscoped/cross-project query fails;
- restricted create/update/delete denied;
- permitted manager mutations allowed only in accessible projects;
- Admin reads all BMG project data but profile writes remain server-only;
- utility reading inherits meter project scope;
- global contractor list requires explicit permission; and
- staff-directory query must be constrained to an accessible department.

Application regression tests passed 42/42, the Vite production build passed, and
`git diff --check` passed. Production dependency audit remains at the previously
known two moderate `gaxios` → `uuid` findings; no high-severity production issue
was reported.

## Deployment blocker discovered by the tests

Do not deploy `firestore.rules` yet. The current React client still opens several
unscoped collection listeners and filters records only after downloading them.
Firestore Rules are not filters: an unscoped query is rejected when any possible
result is outside the caller's project. At minimum, the client must be changed
and tested against the Emulator to:

1. query `bmg_projects_docs` by accessible project name/ID instead of listing all
   projects for restricted users;
2. add `where('projectId', 'in', accessibleProjectIds)` or a single-project
   equivalent to every project-owned collection listener;
3. scope `users` queries by accessible `department` rather than listing the full
   directory;
4. query utility readings through the accessible meter IDs;
5. define safe rules/data ownership for `app_state`, `app_state_chunks`, central
   fee collections, `house_statuses_*`, and the schedule singleton; and
6. run the real application against an Emulator seed for Admin, manager, and
   restricted roles before any production Rules publish.

Until these client changes pass, Production must retain its current application
and Rules state even though the public rule remains an urgent security risk.

## 5. Client query remediation — 2026-09-15 (not deployed)

The collection-query blocker has now been remediated in the working branch. The
application uses one query-plan policy for both Firestore listeners and cached
local data:

- restricted project lists query only profile-assigned project names;
- project-owned collections query the selected `projectId`, or the caller's
  accessible project IDs on global screens;
- query plans with more than 30 values are split into multiple Firestore `in`
  queries and their snapshots are merged by document ID;
- `users` is blocked without explicit `proj_staff.view` and otherwise queries
  only accessible departments;
- utility readings query accessible `meterId` values after the scoped meter
  listener resolves;
- announcements query `All` plus accessible project IDs;
- cached localStorage/IndexedDB records are filtered synchronously with the same
  query plan, preventing an Admin cache from flashing cross-project data after
  a restricted user signs in; and
- central-fee status listeners now require `projectId`; new status, state, and
  chunk writes persist `projectId` and `menuId` ownership metadata.

Two composite indexes were added to source for the scoped date-range listeners:

- `bmg_dailyReports_docs`: `projectId ASC`, `date ASC`
- `bmg_pmHistoryList_docs`: `projectId ASC`, `date ASC`

The application query plans themselves were run against the Rules Emulator.
The latest evidence is 17/17 Rules tests passing for anonymous, unprofiled,
inactive, restricted employee, multi-project manager, and Admin contexts. The
application regression suite passes 51/51 and the Vite production build passes.
`git diff --check` also passes. `npm run lint` remains unavailable because the
repository declares the script but does not install `eslint`; this is a tooling
configuration issue rather than a lint result and must not be recorded as a
successful lint run.

### Remaining release gates

Do not publish the draft Rules yet. The collection-query blocker is fixed, but
the following migration gates remain:

1. Deploy the two composite indexes first and wait until both report `READY`.
2. Dry-run and review a backfill for existing `house_statuses_*`, central-fee
   `app_state`, and `app_state_chunks` documents that predate `projectId` and
   `menuId`. The new Rules intentionally deny those legacy documents to
   non-Admin users until ownership is explicit.
3. Replace or migrate the global schedule and other legacy `usePersistentState`
   singleton documents (`bmg_schedules_v2`, schedule notes/approvals, project
   staff order, and meeting land documents) with project-owned records. The
   draft Rules currently leave these Admin-only rather than expose cross-project
   payloads.
4. Create a Preview from this branch only after the indexes are ready, then
   smoke-test login, dashboard, project overview, staff, utilities, announcements,
   and central fee with the restricted and manager test accounts.
5. Publish Rules only in a monitored maintenance window after the Preview gate
   passes. Production application deployment and Rules publication must remain
   separate rollback points.

### Release-gate evidence — 2026-09-16

Gate 1 is complete. The following Production composite indexes report
`Enabled` in Firebase Console:

- `bmg_dailyReports_docs`: `projectId ASC`, `date ASC`
  (`CICAgOjXh4EK`)
- `bmg_pmHistoryList_docs`: `projectId ASC`, `date ASC`
  (`CICAgJiUpoMK`)

Gate 2 completed its read-only dry-run before the approved backfill was applied.
`scripts/audit-firestore-ownership.mjs` used Firestore REST field masks
and did not request payloads, chunk contents, house numbers, or resident data.
The 2026-09-16 dry-run found:

- 27 project records;
- 1,108 `house_statuses_*` documents across 16 populated project collections,
  all missing `projectId` and none containing a mismatched `projectId`;
- 17 central-fee `app_state` documents, all missing both `projectId` and
  `menuId`, with no unresolved project IDs or mismatches; and
- 176 central-fee `app_state_chunks` documents, all missing both ownership
  fields, with no unresolved project IDs or mismatches.

The proposed ownership-only backfill therefore affects exactly 1,301 existing
documents. It must use merge/update-mask writes, preserve every existing field,
and abort on any document update-time conflict. The reviewed manifest SHA-256 is
`efcac769b58f913aa28b38f27491fe162be835fa702cf69d2b22897a7ad7bf3a`.
That manifest was explicitly approved and applied on 2026-09-16 in four atomic
commit batches of 400, 400, 400, and 101 writes. Every write used an update mask
and the document's dry-run `updateTime` as a precondition; no payload field was
requested or replaced.

The immediate post-write audit found zero proposed writes and zero ownership
mismatches:

- all 1,108 `house_statuses_*` documents have the expected `projectId`;
- all 17 central-fee `app_state` documents have the expected `projectId` and
  `menuId`; and
- all 176 central-fee `app_state_chunks` documents have the expected ownership
  fields.

Gate 2 is complete. The post-backfill empty-plan SHA-256 is
`4f53cda18c2baa0c0354bb5f9a3ecbe5ed12ab4d8e11ba873c2f11161202b945`.

Gate 3 remains blocked. The dry-run confirmed these global singleton records:

- `bmg_schedules_v2` plus 2 chunks;
- `bmg_scheduleNotes` plus 1 chunk;
- `bmg_scheduleApprovals` plus 1 chunk; and
- `bmg_projectStaffOrder` plus 1 chunk.

`bmg_meeting_land_docs` was not present. These singleton payloads cannot safely
be assigned to one project without a product/data-model decision. The draft
Rules continue to leave them Admin-only.

### Restricted Preview smoke test — 2026-09-16

The restricted account `TEST-260915` was tested against the Vercel Preview at
`https://bmg-connect-fjyly1df0-bmgcontract-6324s-projects.vercel.app/` after its
password was reset through the Admin UI. The profile/auth metadata audit found
one matching profile, matching Auth UID and profile document ID, the expected
internal Auth email mapping, schema version 2, `Active` status, and no legacy
password field in Firestore. A first login attempt displayed the generic invalid
credential message, but the same new credentials subsequently authenticated
successfully; the initial transient failure was not reproducible, so no code
change is justified from that message alone.

The authenticated restricted UI showed only the Dashboard navigation item,
identified the user as `บัญชีทดสอบ` / Technician, and selected
`โครงการทดสอบ`. No Firebase errors were present in the browser console. This
confirms the new password and basic restricted-role routing, but it does not
complete Gate 4.

Gate 4 is blocked by a duplicate project-name security defect. Production has
two active project documents named `โครงการทดสอบ`: `dhtc5355v` and the canonical
test record `tst260915`. Because both the client query plan and draft Rules map a
restricted user's department to project *name*, the test account receives both
project IDs; the Preview exposed this as `ดูอันดับ (ที่ 1 จาก 2)`. A read-only
aggregation audit across every project-owned collection, `app_state`,
`app_state_chunks`, and both `house_statuses_<projectId>` collections found zero
documents referencing either ID. The duplicate can therefore be quarantined
without moving business records.

The user explicitly approved the quarantine on 2026-09-16. A dry-run first
verified that `dhtc5355v` still had name `โครงการทดสอบ`, status `Active`, and
update time `2026-09-15T11:18:36.936582Z`. One conditional REST patch then used
an update mask for only `name` and `status`, together with that update-time
precondition. The verified result is:

- name: `โครงการทดสอบ (ยกเลิก-รายการซ้ำ)`;
- status: `Inactive`; and
- update time: `2026-09-16T01:57:45.346789Z`.

No project document was deleted and no other field was replaced. The immediate
restricted Preview listener changed from `ดูอันดับ (ที่ 1 จาก 2)` to
`ดูอันดับ (ที่ 1 จาก 1)`, confirming that only the canonical `tst260915`
record remains in the restricted account's name-scoped result. The reversible
rollback values for `dhtc5355v` are name `โครงการทดสอบ` and status `Active`;
restoring them would deliberately reintroduce the duplicate-name authorization
problem and must be used only if the quarantine itself is proven incorrect.

The client now also rejects project saves when the candidate name duplicates an
existing name after trimming/collapsing whitespace, or when the project code
duplicates an existing code after trimming and case normalization. Editing a
project is allowed to keep its own name and code. The policy is covered at its
public validation seam and is invoked before the project save begins. The
application suite passes 54/54 and the Vite production build passes. This is a
client-side guard against ordinary duplicate entry; a concurrent multi-client
uniqueness guarantee would require a server-side transactional name/code
registry and remains a separate hardening task.

### Latest Preview verification and Gate 3 schedule audit — 2026-09-16

Commit `7938970` was pushed to `codex/phase-1-baseline`. Both Vercel deployment
statuses completed successfully. The immutable Preview URL is
`https://bmg-connect-j1f22dsxp-bmgcontract-6324s-projects.vercel.app/` and it
loaded the same `index-KKYZ-4cn.js` bundle produced by the verified local build.
After the user signed in as `TEST-260915`, the Preview showed only the Dashboard
navigation item, the canonical `โครงการทดสอบ`, and `ดูอันดับ (ที่ 1 จาก 1)`.
The browser console contained no Firebase or permission errors; its only warning
was the pre-existing Tailwind CDN production warning. The restricted-user slice
of the Preview gate therefore passes.

A privacy-preserving read-only audit then reconstructed the four legacy schedule
singletons in memory and emitted only aggregate counts and project IDs. It did
not emit employee identifiers, employee names, or schedule cell contents. The
audit found:

- `bmg_schedules_v2`: 12,165 cells (10,579 plan and 1,586 actual) spanning
  2026-01-28 through 2026-10-31 and 116 distinct legacy user IDs;
- 8,017 schedule cells can currently be associated with one project through a
  migrated profile's Auth UID or `legacyId` and unique department name;
- 4,148 schedule cells cannot be associated with a project because their legacy
  user ID has no remaining profile-to-project mapping;
- `bmg_scheduleNotes`: 144 of 145 entries resolve to an existing project;
- `bmg_scheduleApprovals`: 143 of 144 entries resolve;
- `bmg_projectStaffOrder`: 11 of 12 entries resolve; and
- the unresolved notes, approval, and staff-order entries all reference the
  deleted/missing project ID `uuovsrp01`.

The 8,017 apparently resolvable schedule cells are still not safe for blind
historical migration: the schedule key contains only user ID and date, not
project ID, so using the employee's *current* department would misclassify old
cells if the employee moved between projects. The safe default is therefore to
leave the legacy singleton Admin-only as an archive, introduce project-owned
schedule records for new writes, and migrate historical records only where an
authoritative dated employee-to-project mapping is available. Production Rules
must remain undeployed until this product/data-retention choice is confirmed and
the new schedule path passes Emulator and role smoke tests.

### Project-owned schedule implementation and migration dry-run — 2026-09-16

The confirmed implementation keeps the legacy schedule singleton unchanged as
an Admin-only archive and introduces `bmg_projectSchedules_docs`, with one
document per project and month. Each document has an explicit `projectId`,
`month`, schema version, schedules, note, approval state, and staff order. New
client listeners use the same accessible-project query plan as other
project-owned collections. Dashboard listeners open this collection only for a
user with `proj_schedule.view`; users without that permission do not start a
listener that the restricted Rules would reject.

The draft Rules map the new collection to `proj_schedule`. Emulator coverage
verifies that a manager can query and mutate only schedule documents belonging
to accessible projects, while a restricted employee without schedule
permission and cross-project requests are denied. Verification completed with:

- application/unit suite: 62/62 passing;
- Firestore Rules Emulator on Java 21: 18/18 passing, including the actual
  project-scoped schedule query;
- Vite production build: passing; and
- `git diff --check`: passing.

The repository currently has no installed ESLint executable, so `npm run lint`
cannot run (`eslint: command not found`). This is a pre-existing tooling gap,
not a lint finding. Production Rules remain undeployed and no schedule migration
writes have occurred.

The read-only Production migration planner was then run. It intentionally
excluded every legacy schedule cell and selected only project-keyed notes,
approvals, and current staff order. The privacy-safe result was:

- 27 current project IDs;
- 144 target project-month documents;
- 144 resolved notes, 143 resolved approvals, and 11 resolved staff orders;
- one unresolved key in each source, all excluded from the target plan;
- zero existing target documents, zero already-present documents, and zero
  collisions;
- 144 proposed create-only writes; and
- manifest SHA-256
  `cd45096f0ffdeff71e52e6d44eaead2f16b12c580ad1c4c75d8df296ca0414ee`.

The planner reports `safeToApply: true`, but applying remains a separate gated
operation. Each planned write uses an `exists=false` precondition, and the apply
mode requires the exact Production project ID, write count, and manifest hash.
If any target is created or source input changes before approval, the fresh
manifest changes or the create precondition fails instead of overwriting data.

### Cost-containment Production release and emergency auth gate — 2026-09-16

Firestore usage reached approximately 1.8 million reads for the day while the
deployed Rules still allowed public reads and writes. The previously verified
query-scoping application at commit `7938970` was promoted to Production first.
Vercel deployment `9Y4dFG617v9zWy9jUykSakYcvfDZ` completed with status Ready,
and `bmg-connect.vercel.app` loaded the BMG login screen. The granular Rules
remain blocked by the legacy schedule singleton used by that Production commit.

For immediate containment without breaking the legacy schedule, an intermediate
`firestore.emergency-auth.rules` configuration was prepared. It preserves
legacy artifact reads and writes for a signed-in Active BMG profile, permits a
signed-in user to read their own profile so the app can reject inactive users,
keeps profile writes server-only, rejects unrelated app namespaces, and denies
all other paths. It is intentionally less restrictive than the final scoped
Rules and exists only as a short-lived bridge.

The emergency gate feedback loop passed 5/5 tests, including a 25-request
anonymous read burst with zero allowed reads. The combined Rules suite passed
23/23, the application suite passed 62/62, and the Production build passed. A
privacy-preserving Production readiness audit requested only `status` and
`authUid`: all 63 profiles were Active, all 63 had an `authUid` matching the
profile document ID, and the audit reported `safeToDeployEmergencyAuthGate:
true`. The exact public Rules snapshot remains the rollback configuration.

The emergency authenticated-access Rules were published to Production through
the Firebase Console on 2026-09-16 at 19:51 Asia/Bangkok. The Console showed a
new published version and no longer displayed the public-Rules warning. A
post-publish unauthenticated REST audit was rejected with HTTP 403 (`Missing or
insufficient permissions`), confirming that anonymous collection reads were
blocked. A full browser reload of an existing Active Admin session then loaded
the dashboard and Production data successfully, confirming that the legacy
authenticated application path remained operational after the cutover.

### Rollback plan

- Application rollback: redeploy the last verified Production source or revert
  only the query-remediation commit. The prior safe baseline is commit
  `3724b82`.
- Rules rollback: keep
  `config-snapshots/firestore.rules.production-2026-09-15.rules` available as an
  exact emergency configuration rollback. It reopens public access, so use it
  only to restore service temporarily while immediately preparing a corrected
  restricted rule.
- Data rollback: do not delete or overwrite legacy records during backfill.
  Apply ownership metadata with merge writes after the dry-run manifest is
  approved. The managed export at
  `2026-09-15T14:32:04_36710` remains the full pre-change recovery checkpoint.
