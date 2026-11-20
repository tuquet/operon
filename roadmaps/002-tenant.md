---
id: ROADMAP-002
title: Tenant Management & Selector
status: implemented
created: 2026-11-20
updated: 2026-11-20
depends_on: [ROADMAP-001]
---

# ROADMAP-002: Tenant Management & Selector

Execution sequence for [001-tenant.md](../specs/core/001-tenant.md) across `operon` and `console` after [001-kernel.md](./001-kernel.md).

```mermaid
flowchart LR
    P1["Phase 1: DB & Tenant Schema"] --> P2["Phase 2: Tenant CRUD & Widget"]
```

## Phases

1. **Phase 1 — DB & Tenant Schema:**
   - SQLite `browsers.tenant_id`, per-tenant `default_profiles`, and Drizzle `tenants` schema.
2. **Phase 2 — Tenant CRUD & Widget:**
   - `useTenantStore`, `TenantSelector`, `TenantCreateDialog`, and real `/tenants` CRUD views.
