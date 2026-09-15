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
