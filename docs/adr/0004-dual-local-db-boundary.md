---
id: ADR-0004
title: Dual Local Schema Boundary (Core SQLite vs Drizzle)
status: accepted
date: 2026-11-26
apps: [core, console]
---

# ADR-0004: Dual Local Schema Boundary (`core` SQLite vs `@operon/local-db`)

## Context
Two local persistence definitions exist in the monorepo:
- `core/crates/cli` opens `~/.operon/data/operon.sqlite` (`browsers`, `tasks.browser_id`, `jobs`, `logs`, `system_settings`) and drops legacy `workflows`.
- `console/packages/local-db` (Drizzle) defines Cloud-aligned offline mirror tables (`browser_profiles`, `tasks.profile_id`, `jobs`, `execution_logs`, `workflows`, `proxies`, `devices`, `assets`).

Forcing an immediate rename across both layers risks breaking running daemon migrations or diverging from Supabase Postgres table names.

## Options
1. **Merge immediately into identical SQL table/column names:** Requires invasive Rust SQLite migrations and breaking changes across existing CLI handlers.
2. **Keep explicit boundary mapped at the API/Sync layer:** Let `core` SQLite own fast local execution tables (`browsers` / `browser_id`) while `@operon/local-db` mirrors Cloud Postgres naming (`browser_profiles` / `profile_id`), bound by common invariants.

## Decision
Adopt **Option 2** with strict boundary contracts:
1. **Runtime Owner (`core` SQLite):** Always enables `PRAGMA foreign_keys = ON`, `ON DELETE SET NULL` (`tasks.browser_id` → `browsers.id`, `jobs.browser_id` → `browsers.id`, `jobs.task_id` → `tasks.id`), and `ON DELETE CASCADE` (`logs.job_id` → `jobs.id`).
2. **Same-Workspace Isolation:** Linking `tasks.browser_id` requires matching `workspace_id` (`409 Conflict` on mismatch); moving a browser unlinks tasks in other workspaces (`browser_id = NULL`).
3. **Sync Mapping (`DATA-SYNC-001`):** Cloud/Drizzle `browser_profiles` and `profile_id` map 1:1 to Core `browsers` and `browser_id`; local acceptance testing resets Core SQLite via `seed.rs` (`POST /api/v1/system/db/reset`).

## Result
- UI and external automation consume canonical camelCase daemon JSON (`/api/v1/browsers`, `/api/v1/tasks` with `browserId` + joined `browserName`) without exposing schema differences.
- Future unification in SQLite becomes an internal Rust migration without changing REST or Cloud contracts.
