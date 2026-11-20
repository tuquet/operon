---
id: ADR-0001
title: Use tenant everywhere instead of workspace
status: accepted
date: 2026-11-19
apps: [core, operon, console]
---

# ADR-0001: Use `tenant` everywhere instead of `workspace`

## Context

The codebase mixed two names for the same multi-tenant boundary:
- Cloud DB (`public.tenants`), constants (`TENANT_STATUS`), `/tenants` routes, and daemon APIs used **`tenant`**.
- Some UI widgets (`WorkspaceSelector`), stores (`useWorkspaceStore`), and draft columns used **`workspace`**.

Having two names caused confusion and schema drift.

## Decision

Use **`tenant`** as the only domain term across all repos:
1. **DB & API:** `tenant_id`, `tenantId`, `DEFAULT_TENANT_ID = "local-default"`, `tenants` / `tenant_members`.
2. **Kernel & Stores:** `KernelTenantContext` (`kernel.tenant`), `useTenantStore`, event `opn:tenant-changed`.
3. **UI & Locales:** `TenantSelector`, `TenantCreateDialog`, `tenantSelectorButtonPosition`, `page.tenant.*` / `tenants.*`.

Remove all `workspace` aliases from domain code.

## Result

- One consistent model from Postgres and SQLite up to Vue UI.
- `workspace` remains only in package-manager config (`pnpm-workspace.yaml`, `workspace:*`, Cargo workspace).
