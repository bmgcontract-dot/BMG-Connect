# Handoff to Codex — BMG-Connect (2026-10-07)

Full transfer of all in-flight work. Read this top-to-bottom before touching
anything. Two parallel streams: **(1) the modular refactor** and **(2) a production
schedule data-loss incident**. They intersect at one point (schedule migration), so
order matters.

---

## 0. TL;DR — state in one paragraph

Production (`main`, Vercel) is live for real customers with schedule saving **locked**
(`SCHEDULE_SAVE_LOCKED = true`) to stop an active data-loss bug. The refactor branch
`refactor/phase-0-seams` is 35 commits ahead of main and has finished Phase 4
(App.jsx 23,806 → 14,671 lines; every ProjectDetail tab is now its own component).
Phases 0–4 done; Phase 5 (Firestore migration via BmgRepository) is planned but not
started. **Nothing is pushed to origin** — both branches are local only. The data
recovery is blocked on human input (supervisor CSV confirmation) and has an
analyzed way to unblock without it (see §4).

---

## 1. Environment / how to run (verified working)

- Node: `/Users/sunksun.lap/.nvm/versions/node/v22.23.2/bin` (put on PATH).
- Java 21 (for emulator): `/opt/homebrew/opt/openjdk@21/libexec/openjdk.jdk/Contents/Home`
  — MUST be on PATH or firebase-tools refuses to start.
- Firebase CLI is NOT a dep: use `npx --yes firebase-tools@15.23.0`.
- Shell gotcha: `head` is aliased to a URL tool — run `unset -f head; unalias head`
  at the top of any command that pipes to head, or avoid head (use awk/node).
- Build/lint/test: `npm run build`, `npx eslint <files>`, `npm test`
  (runner: `node --test tests/**/*.test.js` — pass the glob, NOT a bare dir).
- Emulator smoke loop (how every refactor commit was verified):
  1. `JAVA_HOME=<java21> PATH=$JAVA_HOME/bin:<node>:$PATH npx --yes firebase-tools@15.23.0 emulators:start --config firebase.browser.json --project demo-bmg-browser --only auth,firestore` (background)
  2. `FIRESTORE_EMULATOR_HOST=127.0.0.1:8090 FIREBASE_AUTH_EMULATOR_HOST=127.0.0.1:9099 npm run seed:browser`
  3. `npm run dev:isolated` (background; serves on :5175)
  4. Drive with Playwright. Accounts: admin / qa-manager / qa-restricted, password `LocalOnly-2026!`.
     Seed project: "โครงการทดสอบ LOCAL เท่านั้น" (id qa-project).
  - Playwright lives in the session scratchpad, not the repo; `npm install playwright`
    in a scratch dir if missing.

---

## 2. Git state (IMPORTANT — nothing is pushed)

- `main` = production branch. Ahead of `origin/main` by **1 unpushed commit**
  (`4f77267` recovery probe scripts). Has the save-lock hotfix (`12c8b15`).
- `refactor/phase-0-seams` = all refactor work. **35 commits ahead of main, never
  pushed** (origin has no such branch). This is where Phases 0–5 live.
- The refactor branch forked from main at `9755f36` BEFORE the hotfix, so the hotfix
  was re-applied onto it semantically as `b2e8b58` (see §3 warning).
- Working tree: `memory/` shows as untracked — it is a LOCAL scratch dir, do NOT
  commit it (it's gitignored on the refactor branch but NOT on main — never
  `git add memory/` on main).

Branches you can ignore: codex/*, perf/optimization, fix/*, hotfix/* (historical).

---

## 3. Stream 1 — Modular refactor (Phases 0–6)

Master plan: `docs/refactor/system-redesign-2026-09-29.md` §6. Seven phases (0–6).

| Phase | What | Status |
|---|---|---|
| 0 | Seams: BmgRepository / AttachmentStore / Clock / IdGen + tests | ✅ done (src/data/, src/platform/) |
| 1 | Low-risk screens (Manual, Settings, Announcements) | ✅ done |
| 2 | Users, Projects, Contracts, Assets/Tools | ✅ done |
| 3 | Maintenance(PM), Repairs, Utilities, Audits | ✅ done |
| 4 | Schedule, Meeting, Inventory, CentralFee + all small tabs | ✅ done (this session) |
| 5 | Firestore collection migration via repo | 🔴 planned, not started |
| 6 | Performance/UX (lazy-load, aggregate docs, pagination, E2E) | 🔴 not started |

### Pattern used for EVERY tab extraction (follow it exactly)
Presentational component under `src/screens/project/<Name>Tab.jsx` receiving grouped
props: `ui` (Card/Button/etc.), `helpers`, `state`/`data`, `setters`, `actions`.
All state, refs, handlers, modals, and Firestore writes STAY in App.jsx; the inline
block's logic is lifted into `actions` callbacks at the call site so behavior is
byte-identical. Icons imported from lucide-react in the new file. Verify: build +
lint + `npm test` green, then emulator smoke driving the real tab. Commit per tab.
23 screens extracted so far (all of src/screens/).

### Phase 4 result (this session's work, all on refactor branch)
App.jsx 23,806 → **14,671 lines**. Commits: MeetingTab fc3fded, ScheduleTab 6f250f2,
FormsTab 2f3f89b, DailyTab c57febc, StaffTab 723ee3a, ActionTab e7cbaf7,
OthersTab 4aaeb20, ContractorsTab ce1fca0, OverviewTab 247a015. Each build+lint+236
tests+emulator-smoke green. ProjectDetail is now a shell + tab nav; every tab is a
component.

### ⚠️ MERGE WARNING (do not skip)
Before merging `refactor/phase-0-seams` → main, confirm the result still has
`SCHEDULE_SAVE_LOCKED = true` (grep App.jsx). The refactor branch carries the lock as
`b2e8b58` (re-applied, not cherry-picked, because the schedule tab moved into
ScheduleTab.jsx — flag lives in App.jsx, passed to ScheduleTab as
`state.scheduleSaveLocked`). A careless merge that drops it re-opens the data-loss
bug. Only set the flag false after the schedule migration is done + verified (§4).
Note: the `Button` component does not forward a `title` prop (pre-existing both
branches) — the lock is enforced by `disabled`, the tooltip is cosmetic/dropped.

### Phase 5 — planned, ready to start (NOT blocked)
Read `docs/refactor/phase-5-plan-2026-10-07.md` + `phase-5-survey-2026-10-07.md`.
Key facts:
- The data seam (src/data/: bmgRepository + firestoreRepository + inMemoryRepository
  + attachmentStore + compositionRoot) is BUILT and TESTED but **wired nowhere** —
  App.jsx still uses the 417-line `usePersistentCollection` hook (App.jsx ~1712) for
  all 24 collections.
- The hook is subscription (onSnapshot) + cache (localStorage/IndexedDB) + scoping
  (queryPlan/dateScope) + batched-writes, NOT thin CRUD. The repo is single-doc.
- Chosen strategy (a): keep subscription/cache/scoping in the hook; route only
  writes + doc path through an injected repo; migrate one domain at a time behind a
  per-collection flag. Firestore path is isolated to `collectionPath()` in
  firestoreRepository.js — that's the only place the option-A path change lands.
- Suggested first PR: "wiring + bmg_othersData pilot" — one collection, one tab,
  path unchanged, flag-reversible. Full step list in the plan doc §5.
- Order: othersData → forms/contractors → ... → meeting collections →
  **bmg_projectSchedules LAST** (its cutover IS the migration the save-lock waits on
  — blocked on §4).

---

## 4. Stream 2 — Schedule data-loss incident (PRODUCTION, active)

Runbook (on main): `docs/refactor/schedule-dataloss-hotfix-2026-10-02.md`.

### What happened
Schedule data still lives in legacy `app_state/bmg_schedules_v2` and was never
migrated to `bmg_projectSchedules_docs`. A non-admin opens a schedule, sees an
empty/partial table that is NOT read-only, edits one cell, Save overwrites the
project_month record with only their cells → everyone else's cells vanish. Legacy
archive is intact, so data is recoverable. Hotfix `SCHEDULE_SAVE_LOCKED` stops new
writes; deployed to production (merge 5f3560a). View/CSV/PDF still work.

### Audit numbers (12,201 legacy cells) — the shape of recovery
- 6,439 already in the new store (fine).
- 5,762 missing, split EXACTLY into:
  - **4,148 unknown-identity (ghost)** — map to NO current user. Recovery EXHAUSTED:
    searched Chrome IndexedDB snapshots (both origins), the restore-drill-20260920
    Firestore db, and legacyRecoverySnapshots — 0/63 match on every id field. These
    are an extinct id generation; do NOT force-migrate (wrong-person attribution is
    worse than an archived gap). No live user ever sees them.
  - **1,614 needs-historical-project-confirmation** — map to current users BUT the
    employee's current project differs from the old cell's project (mostly Head
    office, Feb–Sep 2026, 21 project|month buckets).
- **89 value-conflict** — the genuine "A saved, B overwrote" cells: 11 named people,
  7 projects (เดอะมาร์ค 40, เลอร์โคซี่ 24, ศุภาลัยเพชรเกษม 12, เดอะทรัสต์ 10, +4
  singletons). Each row has both legacy (original) and current (overwritten) value.

### The blocker and how to beat it
Recovery of the 89 value-conflicts was waiting on a supervisor CSV confirmation
(`value-conflicts-review.csv`) that has not come back. **Decision taken: unlock
production first — do NOT block the customer on the 89.** The unlock and the 89 are
separable (unlock needs the table complete for editable months; the 89 is restoring
past cells). Analysis in
`migration-output/.../unlock-path-analysis.md`. Recommended **Option B**: lift the
lock for the CURRENT month only (where bmg_projectSchedules_docs is already
complete), keep historical months read-only. No migration of the ambiguous 1,614,
no confirmation needed, zero data-loss risk. Requires a small month-scoped-lock code
change in ScheduleTab, not just flipping the flag — the next actionable step is to
read the schedule editability gate and implement month-scoped locking.
Alternatives (A: migrate 1,614 after per-project confirm; C: full unlock accepting
the gap) are in the same doc.

### Recovery tooling (read-only, on main as 4f77267)
`scripts/audit-legacy-schedule-cells.mjs` (the audit), `probe-restore-drill-roster.mjs`,
`probe-restore-drill-raw.mjs`, `probe-recovery-snapshots.mjs`. All read-only, use ADC
(`gcloud auth application-default login`) against prod project `bmg-connect-3e99a`.
`migrate-project-schedule-metadata.mjs` and `migrate-bless-confirmed-schedules.mjs`
exist but migrate metadata only / need scope review before use.

---

## 5. CRITICAL constraints (do not violate)

- **No production credentials for the agent.** The human runs every
  production-touching command (migrations, applies). The agent writes scripts +
  reviews dry-runs only. Production project: `bmg-connect-3e99a`, appId `bmg-app-prod`.
- **`migration-output/` and `backups/` are gitignored and contain PII** (names,
  employee ids, photos). Never commit, upload, or paste their contents. The Chrome
  IndexedDB backup under `backups/browser-local-2026-09-21/` especially — its
  MANIFEST says do not share.
- **Never paste a service-account JSON in chat.** Use ADC.
- **Wrong id→person mapping is more dangerous than data loss** — a human must
  confirm any ownership mapping before an apply.
- Preview/Production point at the real Firestore — read-only only when verifying,
  never save/edit there.
- Deploy: Vercel auto-deploys on merge to main. Before deploying, set Vercel env
  `GOOGLE_SHEETS_SCRIPT_URL` + `GOOGLE_DRIVE_SCRIPT_URL` or sheets/drive sync 503s.

---

## 6. Open work (prioritized)

1. **Unlock production without CSV** (Stream 2, Option B): implement month-scoped
   schedule lock → verify current month editable + history read-only on emulator →
   human deploys to production. Unblocks real customers. HIGH VALUE, not blocked.
2. **Phase 5 first PR**: wiring + bmg_othersData pilot (Stream 1). Not blocked.
3. **89 value-conflict recovery**: if CSV ever returns → write apply script
   (backup → dry-run → apply only confirmed rows). Else Option B leaves it as a
   non-urgent cleanup. Blocked on human input only.
4. **1,614 historical cells**: per-project ownership confirmation, then migrate.
   Low urgency under Option B.
5. **Phase 5 remaining domains**, then Phase 6. Long tail.
6. **Push branches to origin** when the human is ready (nothing is pushed yet).
7. Eventually: merge refactor → main (heed §3 merge warning).

---

## 7. Where to read more (all in-repo unless noted)

- `docs/refactor/system-redesign-2026-09-29.md` — master plan, 7 phases.
- `docs/refactor/phase-4-handoff-2026-09-30.md` — Meeting/Schedule extraction notes.
- `docs/refactor/phase-5-survey-2026-10-07.md` + `phase-5-plan-2026-10-07.md` — Phase 5.
- `docs/refactor/schedule-dataloss-hotfix-2026-10-02.md` (main) — incident runbook.
- `docs/refactor/backup-and-rollback.md` — migration safety protocol (feature flag +
  cutover timestamp + rollback order).
- `migration-output/schedule-audit-2026-10-02T08-35-31-993Z/` (LOCAL, gitignored):
  `report.md`, `snapshot-export-findings.md`, `unlock-path-analysis.md`,
  `value-conflicts-review.csv`, `details.json`.
- Agent memory (outside repo): `~/.claude/projects/-Users-sunksun-lap-node-js-BMG-Connect/memory/`
  — MEMORY.md + schedule-ghost-ids-unrecoverable.md + refactor-branch-merge-prereqs.md.
  (Codex won't read these; their content is folded into this handoff.)
