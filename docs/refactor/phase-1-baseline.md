# Phase 1: Baseline and risk audit

Date: 2026-09-10

Baseline commit: `518f2ec`

Working branch: `codex/phase-1-baseline`

## Scope

This document records the state of BMG Connect before the staged architecture,
authentication, Firestore, and Storage migration. Phase 1 must not modify or
delete production data.

## Repository baseline

- The application source is concentrated in `App.jsx` (more than 22,000 lines).
- Tracked source files at the baseline are `App.jsx`, `README.md`, `index.html`,
  `main.jsx`, `package.json`, and `vite.config.js`.
- `dist/` is generated output and is now ignored.
- No Firebase project configuration, Firestore rules, Storage rules, indexes,
  emulator configuration, or migration scripts are present in the repository.
- The Firebase CLI is installed locally, but this repository is not configured
  for authenticated administrative exports.

## Verification results

| Check | Result | Notes |
| --- | --- | --- |
| `npm run build` | Pass | Vite 5.4.21; 2,309 modules transformed |
| Production JS bundle | Warning | Main bundle is approximately 1.87 MB (458.75 KB gzip) |
| `npm run lint` | Fail | `eslint` command is declared but ESLint is not installed |
| Login screen render | Pass | Login form renders on local Vite server |
| Legacy admin login | Pass in offline fallback | Confirmed only as a baseline; the embedded credential must be removed |
| Main navigation | Pass | Dashboard, Users, Projects, Global Audit, Announcements, Manual, Settings render |
| Firebase connectivity | Not verified | Local browser fell back to offline storage after anonymous-auth failure |
| Production Firestore backup | Blocked | Requires an approved Firebase project/admin identity and backup destination |
| Firestore/Storage rules tests | Blocked | Rules and emulator configuration are not in the repository |

## Confirmed architecture

1. Firebase Authentication is used only to obtain a custom or anonymous Firebase
   identity. The business login is a separate client-side username/password check.
2. Business users are loaded from the legacy `bmg_users_docs` collection.
3. The signed-in business user is cached in `bmg_current_user` in LocalStorage.
4. Application data is mirrored between Firestore, IndexedDB, and LocalStorage.
5. Collection documents currently live under:

   `artifacts/{appId}/public/data/{legacyCollectionName}_docs/{documentId}`

6. Schedules use special `app_state` and `app_state_chunks` documents.
7. New image uploads are commonly compressed to Base64 and stored in application
   state. Some flows also send copies to Google Drive.
8. Firestore documents are protected from the 1 MB limit by dropping large image
   or file payloads during some save/restore paths. This can cause data loss and
   must be covered by migration tests.

## High-priority risks

### Critical

- A working administrator username and password are embedded in `App.jsx`.
- User passwords are stored and compared as plaintext in the browser.
- An emergency administrator bypass can create or elevate an administrator from
  client-side code.
- The repository does not contain security rules that can be reviewed alongside
  application changes.

### High

- The client treats the cloud collection as the absolute source of truth and can
  overwrite local state after a snapshot arrives.
- Some large image/file fields are silently removed before Firestore writes.
- Offline auth failure assigns a local fallback identity and disables Firestore.
- Firebase and Google Apps Script endpoints are embedded in application source.
- Most application state and UI logic share one component, increasing regression
  risk when a single feature changes.

### Medium

- The production bundle is large and screens are not lazy-loaded.
- Tailwind is loaded from the development CDN in `index.html`; the browser warns
  against using this configuration in production.
- The lint script cannot currently run.
- Runtime PDF/image libraries are loaded from third-party CDNs.
- Several collections subscribe immediately after business login, which may raise
  Firestore read cost and complicate cleanup.

## Phase 1 exit criteria

- [x] Record the source-control baseline.
- [x] Create a dedicated phase branch.
- [x] Prevent generated builds, environment files, credentials, backups, and
      migration output from entering Git accidentally.
- [x] Run the current build and lint commands.
- [x] Verify login and all top-level screens render in the offline fallback.
- [x] Inventory the current data stores and application screens.
- [x] Document a safe production backup and rollback procedure.
- [ ] Obtain an authorized Firebase admin identity and production project
      confirmation from the project owner.
- [ ] Capture a production Firestore export and Storage inventory.
- [ ] Obtain/export the deployed Firestore and Storage Security Rules.
- [ ] Perform a read-only production record-count comparison against the inventory.

The unchecked items require access to production Firebase administrative state.
They must be completed before any production migration is run.
