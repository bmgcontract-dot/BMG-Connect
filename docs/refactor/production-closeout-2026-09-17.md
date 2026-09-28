# Production closeout — 17 September 2026

## Scope

This record closes the BMG-Connect production rollout for the project-scoped
schedule migration and Firestore Rules hardening. It records only checks that
were observed during the rollout; it is not a claim that every application
workflow has been exercised.

## Release identity

- Source branch: `codex/phase-1-baseline`
- Release commit: `7e9c250` (`chore(schedule): authenticate production migration`)
- Preview deployment: `8SFdDwrmKY3o6P18Dme5ZpnQ4Wdo`
- Production deployment: `G9g2Hw26WqJCrUkvunQv5vBPTXGS`
- Production URL: `https://bmg-connect.vercel.app/`
- Firebase project: `bmg-connect-3e99a`

## Data migration

- The authenticated schedule metadata migration was applied to Production.
- 144 documents were updated.
- A post-apply dry run reported zero remaining writes and zero collisions.
- No application record was intentionally deleted during this rollout.

## Firestore Rules

- The repository `firestore.rules` was compiled and released successfully to
  `bmg-connect-3e99a` after the application and migration cutover.
- Firebase accepted the server-side Rules compilation and release.
- The pre-deployment Rules and index snapshots remain under
  `docs/refactor/config-snapshots/`.
- The old Rules snapshot is an emergency recovery artifact only. Restoring it
  would reopen insecure access and is not an acceptable steady state.

## Production verification

The following checks passed against the production domain after the Rules
release:

### Administrator

- Login and authenticated session succeeded.
- Dashboard and project schedule reads loaded without a Firestore permission
  error.
- The test user's project, role, and per-menu permissions could be inspected and
  changed through the administrator UI.

### Temporary Building Manager test

- `TEST-260915` was temporarily changed to Building Manager for
  `โครงการทดสอบ` only.
- The account saw only `โครงการทดสอบ`.
- The project schedule screen loaded and exposed the expected edit/save UI.
- The session remained valid after refresh.
- No schedule value was changed or saved during the test.
- No browser or Firestore error was observed.

### Restricted-role restoration

The temporary elevation was removed immediately after the Manager test. The
persisted final state was verified as:

- Position: `ช่างประจำอาคาร (Technician)`
- Primary department: `โครงการทดสอบ`
- Additional accessible departments: none
- Account status: Active
- Enabled permissions only:
  - `dashboard.view`
  - `projects.view`
  - `proj_overview.view`

A fresh restricted login and refresh then confirmed that the account saw only
`โครงการทดสอบ` and the overview menu. The schedule and user-management menus
were absent, and no browser or Firestore error was observed.

## Rollback points and limitations

- Application rollback: use Vercel deployment history to promote the last
  explicitly verified deployment before `G9g2Hw26WqJCrUkvunQv5vBPTXGS`.
- Firestore data checkpoint: the managed export created on 15 September 2026 at
  `bmg-connect-3e99a.firebasestorage.app/2026-09-15T14:32:04_36710`.
- Configuration snapshots:
  - `docs/refactor/config-snapshots/firestore.rules.production-2026-09-15.rules`
  - `docs/refactor/config-snapshots/firestore.indexes.production-2026-09-15.json`
- A Vercel rollback does not undo Authentication or Firestore changes.
- The 144-document migration is additive metadata work and is not automatically
  reversed by rolling back the application or Rules.
- Any data restore must first be rehearsed against a separate non-production
  database. Do not import a backup over Production as a test.

## Closeout decision

The rollout is accepted as complete for its stated scope. Production should now
enter an observation window before destructive cleanup, disabling Anonymous
Authentication, legacy-password removal, or structural `App.jsx` refactoring.
Those items remain separate, explicitly approved work.

