# Implementation Plan: Total Elimination of SQLite in Favor of Supabase SSOT

Based on approved spec: [`spec-total-sqlite-elimination.md`](file:///C:/Users/ndtu6/.gemini/antigravity/brain/193e6030-3c4e-45d8-b114-da4bb68f3c2f/spec-total-sqlite-elimination.md)

## 1. Overview
Execute the complete removal of `rusqlite` and local database persistence in `crates/cli`. Unify Workflows, Browser Profiles, and Job Dispatches into direct Supabase PostgREST and RPC calls.

---

## 2. Implementation Slices

### Slice 1: Adapt AppState & Models
- Update `crates/cli/src/core/models/id.rs`: Remove `rusqlite::types::ToSql` and `FromSql` traits.
- Update `crates/cli/src/core/error.rs`: Remove `rusqlite::Error` mapping.
- Update `crates/cli/src/lib.rs`: Remove `AutomationDb` from `AppState`.

### Slice 2: Migrate Handlers from SQLite to Supabase
- Refactor `crates/cli/src/api/handlers/settings.rs`: In-memory config store based on `AppConfig`.
- Refactor `crates/cli/src/api/handlers/browsers.rs`: Query Supabase `browsers.profiles` or in-memory active process map.
- Refactor `crates/cli/src/api/handlers/jobs/`: Route job execution directly to Supabase RPCs.
- Refactor `crates/cli/src/core/engine/workflow_resolver/`: Remove `AutomationDb` references.

### Slice 3: Purge SQLite Layer & rusqlite Dependency
- Delete `crates/cli/src/infrastructure/db/` directory.
- Delete `crates/cli/src/commands/automation/store.rs`.
- Update `crates/cli/src/commands/inbox/storage.rs` to in-memory TTL store.
- Remove `rusqlite` from `crates/cli/Cargo.toml`.

### Slice 4: Workspace Verification & Push
- Run `cargo check --workspace` to ensure clean compilation.
- Commit: `refactor(core): purge SQLite and converge all state onto Supabase SSOT`.
- Push to GitHub: `git spush origin main`.
