# Tasks: Total Elimination of SQLite

- [ ] Task 1: Clean up models, error types, and AppState to decouple from rusqlite
  - Acceptance: `core/models/id.rs`, `core/error.rs`, and `lib.rs` no longer reference `rusqlite` or `AutomationDb`.
  - Verify: `cargo check -p operon`
  - Files: `crates/cli/src/core/models/id.rs`, `crates/cli/src/core/error.rs`, `crates/cli/src/lib.rs`

- [ ] Task 2: Migrate handlers and workflow resolver away from AutomationDb
  - Acceptance: `api/handlers/`, `core/engine/workflow_resolver/`, and `commands/automation/` no longer use `AutomationDb`.
  - Verify: `cargo check -p operon`
  - Files: `crates/cli/src/api/handlers/settings.rs`, `crates/cli/src/api/handlers/browsers.rs`, `crates/cli/src/commands/automation/executor.rs`

- [ ] Task 3: Remove infrastructure/db directory and drop rusqlite dependency
  - Acceptance: `crates/cli/src/infrastructure/db/` deleted, `rusqlite` removed from `crates/cli/Cargo.toml`.
  - Verify: `cargo check --workspace`
  - Files: `crates/cli/Cargo.toml`, `crates/cli/src/infrastructure/mod.rs`

- [ ] Task 4: Full verification and Git safe push
  - Acceptance: `cargo check --workspace` clean, commit & push to GitHub.
  - Verify: `git spush origin main`
  - Files: Monorepo
