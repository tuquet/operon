---
id: ROADMAP-003
title: Workspace Management & Selector
status: implemented
created: 2026-11-20
updated: 2026-11-20
depends_on: [ROADMAP-001, ROADMAP-002]
---

# ROADMAP-003: Workspace Management & Selector

Execution sequence for [003-workspace/001-management.md](../specs/003-workspace/001-management.md) after [001-kernel.md](./001-kernel.md) and [002-auth.md](./002-auth.md).

```mermaid
flowchart LR
    P1["Phase 1: DB & Workspace Schema"] --> P2["Phase 2: Workspace CRUD & Widget"]
```

## Phases

1. **Phase 1 — DB & Workspace Schema:**
   - SQLite `browsers.workspace_id`, per-workspace `default_profiles`, and Drizzle `workspaces` schema.
2. **Phase 2 — Workspace CRUD & Widget:**
   - `useWorkspaceStore`, `WorkspaceSelector`, `WorkspaceCreateDialog`, and real `/workspaces` CRUD views.
