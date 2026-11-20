# Glossary (SSOT)

Every spec, API, database schema, and UI label in Operon must use these exact terms. Do not add aliases ([ADR-0003](./adr/0003-tenant-term.md)).

| Standard Term                | Meaning                                                                                    | Do Not Use                                |
| ---------------------------- | ------------------------------------------------------------------------------------------ | ----------------------------------------- |
| **`tenant`**                 | Isolated account boundary (`local-default`, `local-*`, or Cloud UUID in `public.tenants`). | ~~`workspace`~~                           |
| **`tenantId` / `tenant_id`** | Key, query param, or header that links a resource to a tenant.                             | ~~`workspaceId`~~, ~~`workspace_id`~~     |
| **`browser profile`**        | Saved antidetect browser config (seed, proxy, extensions, user-data folder).               | ~~`browser instance`~~ (for saved config) |
| **`browser session`**        | Live running Chromium process (`pid`, `debuggingPort`, `wsUrl`).                           | —                                         |
| **`daemon`**                 | Local `opn` background service (`127.0.0.1:8765`).                                         | —                                         |
| **`console`**                | Web / Tauri Desktop UI (`@operon/shell` + micro-apps).                                     | —                                         |
| **`kernel`**                 | `@operon/kernel` (`useKernel()`) bridge between Shell and micro-apps.                      | —                                         |

> Exception: `workspace` is allowed only for build tools (`pnpm-workspace.yaml`, `workspace:*`, Cargo workspace) and third-party names (Google Workspace).
