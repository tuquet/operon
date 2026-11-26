---
id: ROADMAP-004
title: Local DB, Cloud DB ERD & Sync
status: draft
created: 2026-11-20
updated: 2026-11-20
depends_on:
  - ROADMAP-002
  - ROADMAP-003
---

# ROADMAP-004: Local DB, Cloud DB ERD & Sync

Execution sequence for the local SQLite (`opn`) and cloud Postgres (Supabase) ERD schemas and bidirectional sync rules.

## Phases

1. **Phase 1 — ERD & Ownership:**
   - Define which tables live in `localDB` (SQLite), `cloudDB` (Postgres + RLS), and shared `workspace_id` foreign keys.
2. **Phase 2 — Sync & Failure Recovery:**
   - Define push/pull sync order, conflict resolution, schema version checks, and offline queue recovery.
