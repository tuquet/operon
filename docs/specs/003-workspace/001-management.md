---
id: WORKSPACE-001
title: Workspace Management & Selector Widget
app: core
status: implemented
created: 2026-11-19
updated: 2026-11-20
related_adrs: [ADR-0001]
---

# WORKSPACE-001: Workspace Management & Selector Widget

## 1. Goal & Scope

Unify multi-workspace state across `console` (`@operon/kernel`, `apps/shell`, `apps/workspaces`, `packages/local-db`) and `operon` (`crates/cli`) using `workspace` ([ADR-0001](../../adr/0001-workspace-term.md)).

- **In scope:** Reactive `kernel.workspace` context, Shell workspace store (Local + Cloud CRUD), `WorkspaceSelector` header widget, `/workspaces` micro-app, and daemon `local-*` workspace switching.
- **Out of scope:** Cloud billing/member invite UI changes.

## 2. Reactive Flow

```mermaid
flowchart TB
    TSW["WorkspaceSelector Widget"] -->|select / create| STORE["useWorkspaceStore (Shell Pinia)"]
    WORKSPACES["/workspaces Page (apps/workspaces)"] -->|activate / edit / delete| STORE
    STORE -->|updates reactive ref| KERNEL["HostKernel (kernel.workspace & kernel.auth.workspaceId)"]
    STORE -->|saves| LS["localStorage (activeWorkspaceId + local-workspaces)"]
    STORE -->|emits| EVT["CustomEvent: opn:workspace-changed"]
    STORE -->|POST /api/v1/system/workspaces/switch| DAEMON["Operon Daemon :8765"]
    KERNEL -->|reactive watch| AUTO["@operon/automation (Browsers / Workflows / Jobs)"]
```

## 3. Data Model (`KernelWorkspaceRecord`)

| Field | Type | Required | Notes |
| --- | --- | --- | --- |
| `id` | `string` | Auto | Cloud UUID, `'local-default'`, or `'local-<8hex>'` |
| `name` | `string` | Yes | `2..60` chars trimmed |
| `slug` | `string` | Yes | Lowercase `[a-z0-9-]{2,48}`, unique |
| `plan` | `string` | No | `'local' \| 'free' \| 'pro' \| 'enterprise'` |
| `status` | `string` | Auto | `'active' \| 'archived' \| 'suspended'` |
| `avatarUrl` | `string \| null` | No | Falls back to first-letter badge |

## 4. CRUD & Guardrails

- **Create:** Auto-generates `slug` from `name` until user edits `slug` manually (`isSlugTouched`). Rejects duplicate slugs.
- **Read / Switch:** Loads Cloud workspaces when signed in, or `local-workspaces` when offline. Blocks switching to `archived` or `suspended` workspaces.
- **Update:** Edits `name`, `slug`, `plan`, or `status` in Cloud (`PATCH /rest/v1/workspaces`) or `localStorage`.
- **Delete:**
  - Blocks deleting `local-default` or the last remaining workspace.
  - Blocks deleting if daemon reports running browser sessions in that workspace.
  - Requires typing the exact `slug` in confirmation dialog.
  - Cleans up owned offline browser profiles via `POST /api/v1/browsers/batch/delete`.
  - If the deleted workspace was active, switches to the next active workspace.

## 5. Widget (`workspace-selector.vue`)

- **Expanded (`!collapsed`):** `h-9` button; uses `minWidth = sidebar.width - 24` when placed in desktop `header-left`. Shows avatar/initial, `name`, and `slug`.
- **Collapsed (`collapsed === true`):** `size-9` icon button.
- **Popover:** Searchable `Command` list with plan badges, loading skeleton, **`Create New Workspace`** (`WorkspaceCreateDialog`), and **`Manage Workspaces`** link to `/workspaces`.

## 6. Checks

- `vitest run apps/shell/src/store/__tests__/workspace.test.ts apps/shell/src/components/common/__tests__/workspace-selector.test.ts`
- `pnpm check:type`, `pnpm run check:i18n`, `pnpm run check:architecture`, `pnpm lint`
