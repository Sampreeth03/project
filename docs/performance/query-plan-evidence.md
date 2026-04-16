# MongoDB Query Plan Evidence

Generated at: 2026-04-18T13:42:40.894Z

| Query | API Mapping | Scan Type | Docs Examined | Keys Examined | Returned | Time (ms) | Indexes |
| --- | --- | --- | ---: | ---: | ---: | ---: | --- |
| projects_topic_status_deadline | /api/project and /api/search/projects | IXSCAN | 4 | 4 | 4 | 1 | topic_1_status_1 |
| doubts_public_timestamp | /api/doubts | IXSCAN | 2 | 2 | 2 | 1 | visible_to_all_1_timestamp_-1 |
| notifications_user_unread_createdAt | /api/notifications and /api/job_not | IXSCAN | 0 | 0 | 0 | 2 | user_id_1_is_read_1_createdAt_-1 |
| jobApplications_user_dateApplied | /api/job and /api/job_not | IXSCAN | 0 | 0 | 0 | 1 | user_id_1_status_1_date_applied_-1 |
| joinRequests_user_pending_requestedAt | /api/joined-projects and /api/notifications | IXSCAN | 0 | 0 | 0 | 1 | user_id_1_status_1_requested_at_-1 |
| projectMembers_project_user | /api/project/:id and chat member routes | IXSCAN | 0 | 0 | 0 | 2 | project_id_1_user_id_1 |

## Notes

- IXSCAN indicates index-backed query execution.
- COLLSCAN indicates full collection scan and should be optimized for frequent paths.
- Raw explain payload is stored in the paired JSON file.
