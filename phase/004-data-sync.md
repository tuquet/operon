---
kanban-plugin: basic
---

## Backlog

- [ ] [[specs/004-data-sync/001-erd-sync|DATA-SYNC-001: ERD & Table Ownership]]
  - [ ] Define `localDB` (SQLite) tables scoped by `tenant_id`
  - [ ] Define `cloudDB` (Postgres + RLS) tables scoped by `tenant_id`
- [ ] [[specs/004-data-sync/001-erd-sync|DATA-SYNC-001: Sync & Failure Recovery]]
  - [ ] Define push/pull sync order with valid session and active `tenant_id`
  - [ ] Define conflict resolution, schema version fail-fast, and idempotent offline queue retry

## Ready

## In Progress

## Review

## Testing

## Done
