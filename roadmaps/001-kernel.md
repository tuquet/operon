---
id: ROADMAP-001
title: Kernel Shell & Host Context
status: implemented
created: 2026-11-19
updated: 2026-11-20
---

# ROADMAP-001: Kernel Shell & Host Context

Execution sequence for [kernel/001-shell.md](../specs/core/kernel/001-shell.md) (host kernel shell and reactive context boundary via `useKernel()`).

## Phases

1. **Phase 1 — Kernel Reactivity & Host Boundary:**
   - Reactive `kernel.tenant` (`KernelTenantContext`) exposed to micro-apps via `useKernel()`.
   - Host/micro-app isolation boundary (micro-apps never import `apps/shell` or sibling apps).
