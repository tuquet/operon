# Operon Roadmap

Single delivery tracker referencing `docs/specs/`. Detailed contracts stay in each spec.

## Completed Foundations

| Domain | Status | Specs | Notes |
| :--- | :--- | :--- | :--- |
| `000` CI/CD & Cloudflare | `implemented` | [CICD-001](./specs/000-cicd/001-github-cloudflare.md) | `.github/workflows/*.yml`, Cloudflare Pages deploy; desktop tag trigger paused |
| `001` Host Shell & Kernel | `implemented` | [KERNEL-001](./specs/001-kernel/001-shell.md), [KERNEL-002](./specs/001-kernel/002-frontend-routes.md) | `useKernel()` boundary and shell route modules |
| `003` Workspace Management | `implemented` | [WORKSPACE-001](./specs/003-workspace/001-management.md) | Local/cloud switching, `WorkspaceSelector`, `/workspaces` CRUD |
| `005` CLI & Daemon API | `implemented` / `approved` | [CLI-001](./specs/005-cli/001-overview.md), [CLI-002](./specs/005-cli/002-install-and-desk.md) | `operon` / `opn` CLI and daemon `:8765`; `desk` / `update` release flows tracked in `CLI-002` |
| `006` Browsers & Drivers | `implemented` | [BROWSERS-001](./specs/006-browsers/001-crud.md), [BROWSERS-002](./specs/006-browsers/002-antidetect-runtime.md), [BROWSERS-003](./specs/006-browsers/003-console-ui.md) | Profile CRUD, browser driver store, `/browsers/index` UI |

## In Progress & Next

1. **Tasks Execution (`007` — `TASKS-001` Phase 2):**
   - **Done:** SQLite + Drizzle schemas (`tasks` ↔ `browsers`/`browser_profiles` ↔ `jobs`), same-workspace & unlink-on-move guards, `/tasks/index` UI, acceptance `db-reset` seed.
   - **Next:** Trigger `Job` runs directly from `/tasks/index`, fail fast on unassigned `browser_id`, and enforce 1 active job per `browser_id` ([TASKS-001](./specs/007-tasks/001-tasks-and-jobs.md)).
2. **Auth, Session & RLS Boundary (`002` — `AUTH-001`):**
   - **Next:** Finalize JWT handoff (`console` → `daemon :8765`), Supabase `workspace_id` RLS checks, and offline session cache/re-validation ([AUTH-001](./specs/002-auth/001-session.md)).
3. **Cloud Sync (`004` — `DATA-SYNC-001` Phase 2):**
   - **Done:** Local SQLite FK ERD and dependency order defined.
   - **Next:** Implement bidirectional push/pull sync (`workspaces` → `proxies` → `browser_profiles` → `workflows` → `tasks`), schema-version fail-fast, and idempotent offline retry ([DATA-SYNC-001](./specs/004-data-sync/001-erd-sync.md)).
