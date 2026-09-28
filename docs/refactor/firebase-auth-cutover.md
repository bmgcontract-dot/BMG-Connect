# Firebase Authentication migration and cutover

## Current state

The application code now supports two explicit modes:

- `VITE_AUTH_MODE=legacy` explicitly enables the existing Firestore password
  login for an intentional rollback only.
- `VITE_AUTH_MODE=firebase` authenticates with Firebase Email/Password, loads the
  trusted profile from `users/{uid}`, and never uses a password from Firestore.

If `VITE_AUTH_MODE` is omitted, the application now defaults to `firebase` so a
deployment cannot silently fall back to legacy authentication.

The visible login remains username/password. Internally, a normalized username is
encoded into a deterministic address under `auth.bmg-connect.local`; users do not
need to know or enter that address.

Do not enable Firebase mode in Vercel until every preflight item is complete.

## Production audit on 2026-09-13

- Legacy users: 64
- Missing username: 0
- Missing password: 0
- Password shorter than six characters: 55
- Duplicate normalized username groups: 1
- Inactive users: 0

Only aggregate statistics were printed. No username or password was written to a
report. The duplicate username must be resolved before the migration can apply.

## Required owner-only setup stages

These stages require an owner/editor of Firebase project `bmg-connect-3e99a`:

1. Grant the deployment/migration operator only the Firebase/Google Cloud roles
   required for Authentication user administration and Firestore migration.
2. Enable the Email/Password provider in Firebase Authentication.
3. Export the currently deployed Firestore Rules and add them to source control
   before changing them.
4. Merge a rule for `users/{uid}` that permits authenticated application users to
   read the directory but prevents direct browser writes. Profile writes are made
   only by the verified `/api/admin-users` server function.
5. Create a dedicated service account for the Vercel server function, store its
   JSON as the encrypted `FIREBASE_SERVICE_ACCOUNT_JSON` environment variable,
   and never expose it through a `VITE_` variable.
6. Resolve the duplicate normalized username in the legacy user collection.
7. Run `npm run auth:migrate:dry-run` with authorized Admin credentials.
8. Back up Firestore, then run `npm run auth:migrate` with
   `BMG_CONFIRM_PROJECT_ID=bmg-connect-3e99a`.
9. Verify login for every role and project scope in a preview deployment with
   `VITE_AUTH_MODE=firebase`.
10. Enable Firebase mode in production. Keep legacy password fields temporarily
    read-only for rollback; remove them only after the observation window.

## Migration properties

- Dry-run is the default and performs no Auth/profile writes.
- The applying command refuses to run unless the explicit project confirmation
  matches the target project ID.
- Passwords are converted locally to HMAC-SHA256 import hashes and are never
  printed. This preserves the 55 existing passwords shorter than six characters.
- Firebase re-hashes imported passwords with its internal algorithm after a
  successful sign-in.
- Auth UIDs and internal emails are deterministic.
- Existing Auth UIDs are skipped, so rerunning does not reset a migrated password.
- The migration aborts on duplicates or incomplete records.
- New Firestore profiles do not contain `password` or `sessionExpiry`.
- Legacy password fields are not deleted by the migration command.

## Compatibility contract

The Auth module returns a `currentUser` with the legacy `id`, permissions,
department, and project-access fields plus `authUid`. Existing screens can keep
using the same fields. The `users` directory switches to the password-free root
collection only in Firebase mode.

User create, edit, disable, password reset, and delete operations in Firebase mode
go through `/api/admin-users`. The function verifies the caller's Firebase ID
token and requires the server-issued `admin` custom claim. Direct browser writes
to the new directory should be denied by Firestore Rules. Restricting account
mutation to this claim prevents a user from granting themselves stronger
permissions by modifying a request payload.

CSV user import is intentionally disabled in Firebase mode until it is replaced
with a server-side bulk account import. Other screens and data collections retain
their existing paths during this cutover.

## Rollback

For the Firebase read-mitigation release, use the exact immutable Vercel
deployment recorded in `firebase-read-mitigation-deploy-2026-09-15.md` and use
Instant Rollback without rebuilding it.

1. Stop testing and record the failure time and affected path.
2. Roll back the `bmg-connect` project to the recorded known-good deployment.
3. Do not change or delete Firebase Auth accounts, profiles, Rules, or data.
4. Verify login/logout and read-only critical paths after the domain is restored.
5. Fix forward in a new preview and repeat every deployment gate before promote.

`VITE_AUTH_MODE=legacy` is a degraded local-only fallback when no trusted custom
token is injected. It is not a full cloud-data rollback and must not be described
or tested as one.

Never delete legacy password fields until the production observation window is
complete and an approved rollback no longer depends on legacy login.
