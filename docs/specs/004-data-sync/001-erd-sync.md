---
id: DATA-SYNC-001
title: Local DB, Cloud DB ERD & Sync
status: draft
created: 2026-11-20
updated: 2026-11-20
depends_on: [AUTH-001, WORKSPACE-001]
---

# DATA-SYNC-001: Local DB, Cloud DB ERD & Sync

## Goal
Define table ownership between `localDB` (SQLite) and `cloudDB` (Postgres), shared `workspace_id` keys, and bidirectional sync rules.

## Rules (Draft)
- **Local DB (SQLite):** Owns device-local runtime state (`browsers`, local `default_profiles`, local execution logs) scoped by `workspace_id`.
- **Cloud DB (Postgres + RLS):** Owns multi-workspace control-plane state (`workspaces`, memberships, leases, encrypted secrets) scoped by `workspace_id`.
- **Sync (`local <-> cloud`):**
  - Push/pull runs only with a valid session (`SPEC-002`) and active `workspace_id` (`SPEC-003`).
  - Schema version mismatch fails fast at the boundary (no silent fallback).
  - Conflict resolution and offline queue retry rules must be idempotent.
