# Billing checkpoint — 2026-09-19

Evidence is the user-provided Firebase Usage and billing screenshot, not a live billing export:

- Selected month September 2026, project cost THB 6,158.64.
- Reads approximately 93K for the displayed daily quota period, 43K above 50K no-cost quota.
- Writes 264; deletes 0. Those counts are within the displayed no-cost thresholds.
- Previous screenshot was THB 6,135.60; the displayed difference is THB 23.04, not an attributable daily Firestore-read charge. Reporting periods/latency and per-service costs have not been reconciled.

Do not conclude data loss from a quota counter, nor assume all monthly cost is reads. Do not stop billing, delete data, disable authentication, or loosen Rules to lower spend.

## Next read-only evidence

1. In Cloud Billing Reports select this project and September dates; inspect daily grouping and service/SKU breakdown (reads, storage, network, backups/PITR and any other services actually listed). Obtain database region and billed unit prices before estimating THB from counts.
2. Compare Firestore Usage over matching time windows on active working days, not a just-reset daily counter or partial day versus full day. Free quota resets around midnight Pacific, not midnight Bangkok.
3. Trace representative navigation/login/reload workloads in an isolated fixture. Count initial document results and subscription restarts; correlate with production usage before claiming a root cause or reduction.
4. Inspect broad dashboard queries, settings subscriptions, project-month scope and reconnection frequency. Existing code has tab-based subscriptions and some history scopes, but that does not prove deployed code or all workloads are bounded. No performance bug has been reproduced in this checkpoint.
5. Recommend an alerts-only budget scoped to the project (thresholds such as 50/80/100% after the owner chooses the amount). This is not a spending cap. No budget or notification settings were changed.

## New roster cost behavior

The schedule-only roster endpoint is requested when a user without personnel access enters a schedule project. It verifies current identity/status/permission and queries only that project's department, with a 501-row fail-closed bound. It returns five display/identity fields, has no polling or extra realtime listener, and uses private no-store responses. Reopening/reloading performs another authorized read; this is not a zero-cost cache. Server reads include caller/project and roster documents. Field projection reduces payload, not the number of document reads. No measured reduction of the screenshot's 93K reads is claimed.

Sources checked:
- https://firebase.google.com/docs/firestore/pricing — daily quotas, document/index/storage/network billing, reconnect and Rules-dependent reads.
- https://docs.cloud.google.com/billing/docs/how-to/budgets — alerts-only budgets do not automatically cap usage/spend; reporting can be delayed.
