# Implementation Plan: Unify Automation Execution into Supabase (SSOT Convergence)

Based on approved spec: [`spec-automation-supabase-ssot.md`](file:////.gemini/antigravity/brain/193e6030-3c4e-45d8-b114-da4bb68f3c2f/spec-automation-supabase-ssot.md)

## 1. Overview
Refactor `crates/cli` automation commands to completely eliminate local SQLite and transient Axum runners, redirecting all workflow queries and job dispatches directly to Supabase PostgREST RPCs (`public.workflow_list`, `public.workflow_get`, `automation.enqueue_job`).

---

## 2. Execution Phases

### Phase 1: Clean Up Fragmented Local Runners
- Remove `crates/cli/src/commands/automation/store.rs` (SQLite import/export).
- Refactor `crates/cli/src/cli.rs`:
  - Simplify `AutomationSubcommands::Run` to accept `target: String` (name or UUID).
  - Clean up obsolete flags (`--workflow-json`, raw file positions).
  - Remove `AutomationSubcommands::Workflow` (import/export subcommands).

### Phase 2: Implement Direct Supabase Client for Automation CLI
- In `crates/cli/src/commands/automation/table.rs`:
  - Call Supabase RPC `public.workflow_list()` using `DeviceIdentity` / PostgREST client.
  - Display workflows cleanly in terminal table or JSON format.
- In `crates/cli/src/commands/automation/executor.rs`:
  - Call Supabase RPC `public.workflow_get(p_target)` to resolve workflow ID and settings.
  - Call Supabase RPC `automation.enqueue_job` to register the job in `automation.jobs`.
  - Output Job ID and listen to execution logs/status.

### Phase 3: Verification & Build
- Verify workspace compiles cleanly: `cargo check --workspace`.
- Test CLI commands:
  - `cargo run -p operon -- automation list`
  - `cargo run -p operon -- automation run "Quickstart: Google Search & Scrape"`
- Commit and push to GitHub repository via `git spush origin main`.
