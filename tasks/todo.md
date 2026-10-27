# Tasks: Unify Automation Execution into Supabase (SSOT Convergence)

- [ ] Task 1: Clean up obsolete CLI arguments & remove store.rs
  - Acceptance: `crates/cli/src/cli.rs` updated with streamlined `AutomationSubcommands::Run` and `List`, `store.rs` removed.
  - Verify: `cargo check -p operon`
  - Files: `crates/cli/src/cli.rs`, `crates/cli/src/commands/automation/mod.rs`

- [ ] Task 2: Refactor `table.rs` to fetch workflows directly from Supabase
  - Acceptance: `table.rs` calls `public.workflow_list()` via PostgREST and displays results.
  - Verify: `cargo check -p operon`
  - Files: `crates/cli/src/commands/automation/table.rs`

- [ ] Task 3: Refactor `executor.rs` to dispatch jobs directly to Supabase
  - Acceptance: `executor.rs` resolves workflow via `public.workflow_get` and calls `automation.enqueue_job`.
  - Verify: `cargo check -p operon`
  - Files: `crates/cli/src/commands/automation/executor.rs`

- [ ] Task 4: Full verification and Git push
  - Acceptance: `cargo check --workspace` passes, push to remote main.
  - Verify: `git spush origin main`
  - Files: Monorepo
