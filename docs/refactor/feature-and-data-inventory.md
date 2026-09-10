# Feature and legacy data inventory

This is the initial static inventory. It is a living document and must be updated
when each screen is manually tested with representative production-like data.

## Top-level screens

| Screen | Current implementation | Key dependencies |
| --- | --- | --- |
| Login | Inline in `App.jsx` | Firebase anonymous/custom auth, `bmg_users`, LocalStorage session |
| Dashboard | `DashboardView` | projects, users, audits, reports, PM, action plans, schedules, contracts |
| Users | `UserManagement` | users, permissions, projects |
| Projects | `ProjectList` | projects, project logo, user project access |
| Global Audit | `GlobalAuditList` | audits, projects, charts |
| Announcements | `AnnouncementsView` | announcements, images, user-specific dismissals |
| Manual | `ManualView` | static bilingual help content and remote images |
| Settings | `SettingsView` | company info, backup/restore, Google Sheets/Drive sync |

## Project screens

| Project tab | Data domain |
| --- | --- |
| Overview | Aggregates the selected project's operational data |
| Contracts | `bmg_contracts` and contract files |
| Staff | users and `bmg_projectStaffOrder` |
| Schedule | `bmg_schedules_v2`, notes, approvals |
| Assets | `bmg_assets` and photos |
| Tools | `bmg_tools` and photos |
| Preventive Maintenance | `bmg_pmPlans`, `bmg_pmHistoryList`, images |
| Utilities | `bmg_meters`, `bmg_utilityReadings` |
| Repairs | `bmg_repairs` |
| Action Plans | `bmg_actionPlans` |
| Daily Reports | `bmg_dailyReports`, departmental images |
| Audits | `bmg_audits` |
| Forms | `bmg_forms_list` and links/files |
| Contractors | `bmg_contractors` |
| Central Fee | Project-specific `house_statuses_{projectId}` |
| Meetings | meeting plans, invitations, proxies, ballots, attendance, agendas, documents |
| Inventory | inventory items, transactions, deposits |
| Others | `bmg_othersData` |

## Legacy collection-backed state

The `usePersistentCollection` hook appends `_docs` to these logical names:

- `bmg_users`
- `bmg_projects`
- `bmg_contracts`
- `bmg_audits`
- `bmg_dailyReports`
- `bmg_repairs`
- `bmg_contractors`
- `bmg_assets`
- `bmg_tools`
- `bmg_machines`
- `bmg_pmPlans`
- `bmg_pmHistoryList`
- `bmg_meters`
- `bmg_utilityReadings`
- `bmg_actionPlans`
- `bmg_othersData`
- `bmg_forms_list`
- `bmg_meetings`
- `bmg_announcements`
- `bmg_deposits`
- `bmg_inventory`
- `bmg_inventory_transactions`
- `bmg_meeting_gantt_plans`
- `bmg_meeting_invitations`
- `bmg_meeting_proxies`
- `bmg_meeting_ballots`
- `bmg_meeting_attendances`
- `bmg_meeting_agendas`
- `bmg_project_events`

## Legacy singleton/chunked state

- `bmg_companyInfo`
- `bmg_scheduleNotes`
- `bmg_scheduleApprovals`
- `bmg_projectStaffOrder`
- `bmg_rolePermissions`
- `bmg_meeting_land_docs`
- `bmg_schedules_v2`
- `bmg_theme` (per Firebase user)
- `bmg_sidebar_open` (per Firebase user)
- `bmg_bell_pos` (per Firebase user)
- `bmg_current_user` (LocalStorage business session)
- `bmg_dismissed_announcements` (LocalStorage)

## Migration compatibility rules

1. New readers must understand both the legacy and new schema during migration.
2. New writers must never put Base64 images into Firestore.
3. Existing Base64 images and legacy URLs remain readable without automatic upload.
4. A migration must be idempotent and retain a stable `legacyId` mapping.
5. A source collection stays read-only and retained until counts and sampled
   records match after the observation period.
6. Authentication migration must never copy plaintext passwords into a new
   Firestore collection.
7. Every project-owned record in the new schema must carry or inherit a verified
   `projectId` for rules enforcement.
