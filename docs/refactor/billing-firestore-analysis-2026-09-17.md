# Billing and Firestore usage analysis — 17 September 2026

## Scope and data freshness

This is a read-only analysis of Firebase Usage, Google Cloud Billing Reports,
Firestore Usage, and Firestore Query Insights for `bmg-connect-3e99a`.
No budget, quota, billing configuration, database record, rule, index, or
Production deployment was changed.

Billing data displayed a delay warning of up to 24 hours. At inspection time,
the latest complete daily billing data was 16 September 2026. Therefore this
report establishes the pre/post-deployment baseline but does not yet claim a
full-day saving from the 17 September rollout.

## Cost breakdown: 1–16 September 2026

- Total project cost: **THB 6,129.52**
- Firebase overview total (slightly newer display): **THB 6,131.24**
- Forecast for 1–30 September: **THB 10,389.50**
- The 1–16 September total was reported as 3% lower than 16–31 August.

Billing grouped the Firestore SKUs under the Google Cloud service name
`App Engine`:

| SKU | Usage | Cost | Share of total |
| --- | ---: | ---: | ---: |
| Cloud Firestore Internet Data Transfer Out from Singapore to APAC | 1,188.83 GiB | THB 5,375.37 | 87.7% |
| Cloud Firestore Read Ops Singapore | 62,354,365 reads | THB 747.26 | 12.2% |
| Cloud Firestore Storage Singapore | 0.96 GiB-month | THB 2.58 | <0.1% |
| Cloud Storage replication within Asia | 1.59 GiB | THB 4.19 | <0.1% |

The dominant cost is therefore data transfer, not the read-operation charge
alone. The aggregate ratio is approximately 20.0 KiB transferred per billed
document read. This strongly suggests repeated downloads of comparatively large
Firestore documents.

## Firestore daily operations

Daily reads shown for 1–16 September were:

| Date | Reads |
| --- | ---: |
| Sep 1 | 4.886M |
| Sep 2 | 3.530M |
| Sep 3 | 4.308M |
| Sep 4 | 3.308M |
| Sep 5 | 4.358M |
| Sep 6 | 2.529M |
| Sep 7 | 3.701M |
| Sep 8 | 6.364M |
| Sep 9 | 4.775M |
| Sep 10 | 5.406M |
| Sep 11 | 3.355M |
| Sep 12 | 3.683M |
| Sep 13 | 2.850M |
| Sep 14 | 2.716M |
| Sep 15 | 3.943M |
| Sep 16 | 1.830M |

The repeated multi-million-read days show a chronic workload pattern rather
than a one-time migration spike.

Writes were normally about 0.8K–2.6K per day, then reached 15.067K on
16 September. The authenticated schedule migration wrote only 144 documents,
so it cannot account for the long-running read or transfer pattern by itself.

## Detailed 16 September cost

| SKU | Usage | Cost |
| --- | ---: | ---: |
| Firestore transfer Singapore -> APAC | 36.76 GiB | THB 157.23 |
| Firestore reads | 1,844,578 | THB 21.79 |
| Firestore storage | 0.06 GiB-month | THB 0.17 |
| Firestore writes | 14,906 | THB 0.00 |
| Firestore deletes | 252 | THB 0.00 |

The day's transfer/read ratio was approximately 20.9 KiB per read, consistent
with the month-to-date ratio.

## Current quota period and subscriptions

The Firestore Usage view covered 16 September 15:00 through 17 September 14:00
(Asia/Bangkok):

- 1.88M cumulative reads
- 15K cumulative writes
- 252 deletes
- 756 peak snapshot listeners
- 22 peak active connections
- 89K Rules allows, 1.8K denies, and 10 Rules errors

Most reads accumulated before 20:00 on 16 September. Between 08:00 and 13:00 on
17 September, cumulative reads increased from about 1.846M to 1.880M, or roughly
34K reads over five hours.

Visible listener/connection samples were:

| Time | Snapshot listeners | Active connections |
| --- | ---: | ---: |
| Sep 16 15:00 | 477 | 18 |
| Sep 16 16:00 | 532 | 18 |
| Sep 16 18:00 | 756 | 22 |
| Sep 17 08:00 | 10 | 1 |
| Sep 17 10:00 | 12 | 4 |
| Sep 17 12:00 | 31 | 7 |
| Sep 17 13:00 | 13 | 2 |

The morning values are encouraging but are not directly comparable to the prior
afternoon peak and do not constitute a full working-day result.

## Query Insights after the rollout

Query Insights warns that new data can take 1–2 hours to appear. In the latest
one-day view, no query shape approached the historical million-read load. The
largest visible row was a `/users` projection query with 63 read operations over
two executions. Other visible project and schedule queries were in the low
double or single digits.

This supports, but does not prove, that the scoped-query release is reducing
reads. Query Insights may not fully attribute historical realtime-listener
traffic, so Billing and Firestore Usage remain the authoritative acceptance
signals.

## Root-cause assessment

The evidence is consistent with the previously audited client behavior:

1. many realtime listeners were open per active connection;
2. older listeners downloaded broad collections and filtered client-side; and
3. some Firestore documents contain or historically contained large Base64
   image/attachment fields.

Because the average network payload is about 20 KiB per billed read, reducing
only the number of reads will help but will not fully address cost. Large binary
payloads must also stop travelling with routine list and dashboard queries.

## Acceptance check after data catches up

Recheck after a complete post-release working day is present in Billing:

1. Compare 17/18 September reads against the 2.5M–6.36M historical daily range.
2. Compare daily Firestore transfer against the 36.76 GiB observed on
   16 September.
3. Compare peak listeners per connection against the 756/22 historical peak.
4. Confirm Rules denies/errors do not represent broken user workflows.
5. If transfer remains high, inventory Firestore document sizes by collection
   and prioritize removal of Base64 payloads from list/query documents.

Do not use the forecast as proof of savings until the delayed billing data has
caught up.

## Recommended next engineering order

1. Complete the post-release 24-hour billing check.
2. Identify large-document collections and attachment fields using read-only
   metadata/audit tooling.
3. Add collection-level client instrumentation in a non-Production environment.
4. Move new binary content to Cloud Storage and keep only metadata/URLs in
   Firestore, starting with one canary module.
5. Continue the Admin custom-claim lifecycle work after the urgent cost baseline
   and regression guard are in place.

