# Production backup and rollback runbook

Do not run a production migration until this runbook has been completed and the
project owner has confirmed the Firebase project ID and backup destination.

## Data classification

The export may contain user profiles, plaintext legacy passwords, operational
records, images, and documents. Store it only in an access-controlled location.
Never commit an export, service-account key, or migration report containing
personal data. Local `backups/` and `migration-output/` are ignored by Git.

## Preflight

1. Confirm the production Firebase project is `bmg-connect-3e99a` or record the
   corrected project ID.
2. Confirm which Google Cloud account is authorized to export Firestore.
3. Select a versioned Cloud Storage backup location with restricted access and
   retention enabled.
4. Export the currently deployed Firestore Rules, Storage Rules, indexes, and
   Firebase Authentication provider settings.
5. Record application commit, deployment version, export time, operator, and
   destination in a backup manifest.
6. Confirm that no service-account key is placed inside the repository.

## Firestore backup

Use the official managed Firestore export mechanism with an authorized account.
The exact command must be prepared only after the project and bucket are
confirmed. A successful command response alone is insufficient: verify the export
operation completed and that its metadata exists in the destination.

After export, collect read-only record counts for every collection listed in
`feature-and-data-inventory.md`. Store only aggregate counts in Git; record-level
data stays in the protected backup location.

## Firebase Storage inventory

The current client does not initialize Firebase Storage, but the configured
bucket may already contain files. Capture a read-only object inventory including:

- object path
- size
- content type
- creation/update time
- generation/version where available

Do not download personal images into the repository.

## Google Drive and Sheets

1. Identify the owner of both Apps Script deployments.
2. Record the destination Drive folders and Sheets without changing them.
3. Export or copy production data using the owner's approved retention policy.
4. Record whether Drive/Sheets are authoritative or only secondary copies.

## Migration rollback

Every module migration must have its own feature flag and cutover timestamp.
Rollback order:

1. Disable new writes for the affected module.
2. Re-enable the legacy reader/writer using the module feature flag.
3. Compare records written after the cutover timestamp.
4. Copy back only verified post-cutover changes; never overwrite the entire legacy
   collection blindly.
5. Confirm UI, permissions, totals, and attachments with representative users.
6. Preserve failed migration output for diagnosis without committing it.

## Restore drill acceptance criteria

- The export operation reports success.
- Rules and indexes are versioned separately from the data export.
- Every known collection has a before/after count.
- At least one non-production restore is opened and sampled.
- User, project, image, schedule, and transaction samples are readable.
- The team can identify the exact application commit compatible with the backup.
