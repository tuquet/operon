---
id: ADR-0001
title: Kernel Architecture & Micro-App Isolation
status: accepted
date: 2026-11-20
---

# ADR-0001: Kernel Architecture & Micro-App Isolation

## Context
Micro-apps need shared runtime state (active `tenant`, session, navigation) and UI extension points without coupling directly to the host shell or sibling apps.

## Decision
1. **Host–Micro-app Boundary:** Micro-apps consume host capabilities **only** via `useKernel()` and shared packages; direct imports of `apps/shell` or sibling micro-apps are forbidden.
2. **Reactive Host Context:** `kernel` owns shared reactive state (`kernel.tenant`, session) so context switches update subscribed views without full page reloads.
3. **Slot-based Widgets:** Cross-app widgets (such as `TenantSelector`) register into shell slots (`sidebar-header`) instead of being hardcoded inside `apps/shell`.

## Consequences
- Micro-apps stay decoupled and independently testable.
- Architecture boundaries can be enforced automatically via lint/architecture checks.
