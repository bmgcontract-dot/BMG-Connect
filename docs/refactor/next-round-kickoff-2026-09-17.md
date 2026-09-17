# Next-round kickoff — Admin claim lifecycle

Prepared: 17 September 2026  
Working branch: `codex/admin-claim-lifecycle`  
Starting point: `9e91b85` (`docs: close production rollout`)

## Goal

Close the remaining P0 gap between a user's business profile and the
server-issued Firebase `admin` custom claim. Creating, promoting, demoting, or
disabling an account must leave Firebase Authentication and Firestore in a
consistent authorization state.

This round is local/test work first. It does not authorize a Production deploy,
Production account mutation, deletion, Anonymous Auth shutdown, or legacy-data
cleanup.

## Why this is next

`api/admin-users.js` currently requires `decoded.admin === true` from callers,
but its create and update paths do not set or remove the target user's claim.
The migration script granted the claim to migrated Super Admins only. Therefore
a newly promoted Super Admin can lack server access, while a demoted or disabled
user can retain it until an explicit claim update occurs.

## Repository gate before any release

- `codex/phase-1-baseline` and its remote are closed at `9e91b85`.
- The prepared branch starts from that exact commit.
- `origin/main` contains the earlier PR merge commit `eac28fd` and is otherwise
  behind this starting point by 32 commits; the only main-side-only revision is
  that merge commit.
- Before Preview or Production deployment, review and merge the completed
  Phase 1 branch into `main`, then rebase or recreate this branch from the
  updated `origin/main`.
- A merge to `main` may trigger Vercel. Treat it as a release action and confirm
  the intended deployment behavior before merging.

## Proposed implementation slice

1. Extract the account mutation policy from `api/admin-users.js` into a small,
   testable server module.
2. Define one policy function for the target claim:
   - Active `Super Admin` -> `admin: true`
   - every other position or an inactive account -> remove/clear `admin`
3. Apply that policy on create and update, preserving unrelated custom claims.
4. Reject unsafe self-service transitions that would unexpectedly remove the
   last working administrator; settle the exact self-demotion rule before code
   is merged.
5. Whitelist server-accepted profile fields instead of spreading arbitrary
   client input into `users/{uid}`.
6. Return a stable result that tells the UI when the affected user must refresh
   their ID token or sign in again.
7. Add a server-written audit record for role/status changes without storing
   passwords, ID tokens, service credentials, or full request bodies.

## Test-first checklist

Add focused tests before changing handler behavior:

- missing token -> `401`
- authenticated non-admin caller -> `403`
- create Active Super Admin -> claim is added
- create ordinary user -> no admin claim
- promote Active user -> claim is added
- demote Super Admin -> admin claim is removed
- disable Super Admin -> admin claim is removed
- re-enable non-Super Admin -> admin claim stays absent
- unrelated custom claims survive every transition
- password and unapproved fields never enter the Firestore profile or audit log
- duplicate username remains `409`
- current-user delete remains blocked
- partial Auth/Firestore failure returns a failure and does not report success
- role/status audit records identify actor, target, transition, and server time

The handler should be exercised with injected/mocked Auth and Firestore
adapters. Production credentials must not be required by the automated suite.

## Verification gates

Run locally before requesting a Preview:

1. `npm test`
2. focused Admin API tests
3. `npm run build`
4. `git diff --check`
5. verify no secret, password, ID token, Firebase credential, or Production
   export entered the diff

Preview verification must use explicitly approved test accounts. Because the
current Preview configuration can point at Production Firebase, do not perform
role changes merely because a Vercel Preview exists.

## Release sequence after tests pass

1. Review the diff and the account-transition matrix.
2. Create a Preview from a commit dedicated to this slice.
3. Confirm the Preview's Firebase target before any write test.
4. Test create/promote/demote/disable using disposable approved accounts.
5. Confirm an affected session loses or gains Admin API access only after the
   expected token refresh/re-login.
6. Promote only after Admin, Manager, and Restricted regression checks pass.
7. Observe Authentication failures, Admin API errors, and Firestore writes
   after release; keep the previous Vercel deployment available for rollback.

## Explicit non-goals for this slice

- splitting `App.jsx`
- disabling or deleting Anonymous Auth users
- removing legacy passwords or backups
- Storage/image migration
- restore workflow refactoring
- deleting duplicate projects or user records

Those remain separate changes after the authorization lifecycle is closed and
observed in Production.

## Evening starting command

Start by confirming the branch and unchanged baseline:

```sh
git status --short --branch
git log -3 --oneline
npm test
```

Then write the failing claim-lifecycle tests before modifying
`api/admin-users.js`.

