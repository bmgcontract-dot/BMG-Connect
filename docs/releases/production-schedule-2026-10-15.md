# Production schedule policy — twenty projects (2026-10-15)

This source records the already deployed twenty-project client, based on main
9701543. It supersedes the seventeen-project runtime list recorded in the prior
release. The three additions are Bang Sare, Pruksa Ville 91/3 and Airlink phase 2.
The operator explicitly accepted unknown historical gaps; no missing shifts were
inferred, no PLAN values materialized into ACT, and no schedule/profile data was
written by activation. Four projects with unresolved runtime identities remain
excluded: Aspire Lat Phrao 113, Supalai Ville Phetkasem 69, The Seed and The Mark.
October exact scopes are retained, with rolling current/next Bangkok month access
starting November. Emergency, server policy, permission and approval gates remain.

Deployment dpl_Fky5jwkb6KwCmDZrmg8bCuHiMM7v reached READY and alias
https://bmg-connect.vercel.app. The operator rebuilt with the existing project's
production configuration; the resulting asset hash matches production review.
The operator then activated three additional scopes and read back verified true,
with twenty total projects, one policy write, zero schedule/profile writes.
See the companion JSON for source and deployed asset/Rules fingerprints.

Validation: the isolated source passed 187 tests, lint and build. Rules are
unchanged. Shared activation unit/emulator checks passed. Super Admin UI checks
for all three additions covered twelve month views: PLAN/ACT fields and Save
were enabled in October and November, and disabled in September and December.
No values were edited and Save/approval controls were not clicked. Prior checks
covered the original seventeen. An already-open browser initially retained the
older client; reload loaded index-DL7SUbZu.js and the new gates passed.
Real user-account save/reload and real calendar rollover remain untested/deferred.
Unknown data gaps remain present; UI gating is not proof of historical completeness.

Only client policy, matching tests and release records belong to this source sync.
Phase 5 refactor, private evidence/backups, credentials and activation artifacts
remain outside this release. Do not rerun migration or activation commands to
synchronize source. A push to main may auto-deploy the same reviewed client;
ensure Vercel remains linked to bmg-connect with its existing production settings.
