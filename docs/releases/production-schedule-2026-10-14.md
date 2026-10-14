# Production schedule and supplier source synchronization

This branch records the code already deployed to production on October 14. It
does not deploy code or change Firestore data/policy. The accompanying JSON records
the deployment, compiled client and Rules hashes and exact reviewed source hashes.

Supplier search uses the authorized server directory to include suppliers across
projects while keeping contract details under their existing permissions.

Schedule writes require both the reviewed client project list and the trusted
server policy. Seventeen reviewed projects (the original Tawan, Life in the Garden
Ban Chang and Head office plus fourteen existing-table projects) support the
current Bangkok month and next month, starting November 2026. Seven projects
awaiting identity or table-coverage answers remain excluded. The existing exact
October scopes are retained. Prior months and months beyond next remain read-only.
The month window advances automatically without monthly deployment. Permission,
legacy read-only and approval/HR-lock conditions remain in place. Transactions
recheck scope and existing data to reject stale saves. Browser admin cannot bypass
the policy or change it through Firestore client writes.

The operator deployed and activated the matching policy with verified readback.
The reviewed CSV recovery completed separately: 89 cells restored; two additional
leave entries intentionally retained. Neither data backups nor migration evidence
are included in this branch. Do not rerun migration/activation commands to merge
this source synchronization.

Validation: 187 client tests and lint/build passed for the seventeen-project
client. Rules are unchanged from the earlier release (38 emulator tests passed).
The expansion transaction's unit/emulator checks passed: existing tables and
metadata stay untouched and later data/policy changes refuse activation. The
operator activated the fourteen additions and verified policy readback, with
zero schedule/profile writes. Production admin UI checks passed for the original
three projects; checks for fourteen additions remain pending. User-account
save/reload testing is explicitly deferred, not reported as completed.

The Phase 5 refactor remains in its separate dirty checkout. This branch must be
reviewed/merged independently so a future main deployment retains the supplier
fix and schedule month policy. The real production environment must retain the
existing supplier API credentials; no secrets were copied into source control.
Policy stays trusted server state rather than being recreated automatically by
deployment. New projects need separate evidence review and client/policy updates.
