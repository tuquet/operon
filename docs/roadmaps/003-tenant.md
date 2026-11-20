---
id: ROADMAP-003
title: Tenant Management & Selector
status: implemented
created: 2026-11-20
updated: 2026-11-20
depends_on: [ROADMAP-001, ROADMAP-002]
---

# ROADMAP-003: Tenant Management & Selector

Execution sequence for [003-tenant/001-management.md](../specs/003-tenant/001-management.md) after [001-kernel.md](./001-kernel.md) and [002-auth.md](./002-auth.md).

```mermaid
flowchart LR
    P1["Phase 1: DB & Tenant Schema"] --> P2["Phase 2: Tenant CRUD & Widget"]
```

## Phases

1. **Phase 1 — DB & Tenant Schema:**
   - SQLite `browsers.tenant_id`, per-tenant `default_profiles`, and Drizzle `tenants` schema.
2. **Phase 2 — Tenant CRUD & Widget:**
   - `useTenantStore`, `TenantSelector`, `TenantCreateDialog`, and real `/tenants` CRUD views.
