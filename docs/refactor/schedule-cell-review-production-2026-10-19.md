# Schedule release synchronized with production — 2026-10-19

This release preserves the already activated 24-project schedule policy and four
reviewed October historical rosters, including read-only protection for unknown
rows. It replaces the Admin bulk legacy import with per-cell review. Every cell
starts deferred; Admin explicitly selects use-archive or keep-current. Review
records actor, time, source value and previous value/presence without approving or
unlocking the table. Partial Save cannot copy deferred preview cells into the
canonical document. Ordinary users cannot forge review metadata or change pending
cells; existing project/month, role, approval and unknown-row restrictions remain.

## Production evidence reported by the operator

- Vercel deployment HGWp2W9R6eMLQET76vTcxjxGDbwG became Ready and was aliased to
  https://bmg-connect.vercel.app after correcting the release commit email.
- Source commit: e0db15ad4f5336c173fa3fa84d2c70520fb0bc98.
- Client asset: /assets/index-DsjAM7Lr.js.
- Client SHA256: e2eda28380d6de3d81753e71b670ae6ba1a30e147cf3497385a68a906debb3fc.
- Rules SHA256: 310718590aa2b0489381b19c63404266b7d956302fdeed1273c4018391010616.
- The Mark October pending gate was applied by the operator and read back with
  verified=true: 67 pending cells, zero confirmations and zero shift, approval,
  policy or profile writes. Only the pending-list metadata field was initialized.
- Comparison: 65 archive values identical to canonical values, two absent, zero
  conflicts. Ownership and the two absent values remain unconfirmed; preserve
  them for Admin review rather than filling or marking them migrated automatically.

The deployment and activation evidence above came from operator output, not a
fresh agent production write or complete browser acceptance. Production Admin
acceptance of the final panel remains to be recorded. Actual user save/reload was
explicitly deferred by the operator. Never infer historical ownership from current
staff department, or treat a legacy preview count as a count of missing values.

## Validation completed on this release

207 unit/handler tests, 33 access/policy/month Rules regression tests, ESLint and
production build passed. Two real Firestore emulator tests cover pending-cell
protection, Admin-only review metadata, accepted user edits, unchanged deferred
absence/approval/history/Timestamp data, unknown-row protection and private roster
configuration. The actual panel was exercised with synthetic local data: confirm
one cell, edit it, leave two missing cells disabled and absent. This is separate
from production acceptance.

Private backups, manifests, receipts, credentials and real employee/cell details
are intentionally excluded from Git. Preserve local operator backups for incident
review. This source synchronization does not change the pending decisions or
perform a migration. Main auto-deploys on Vercel; reverting to the former bulk
editor while the pending gate remains active is not a safe incident rollback.
