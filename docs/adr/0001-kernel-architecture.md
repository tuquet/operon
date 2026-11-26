---
id: ADR-0001
title: Kernel Architecture & Micro-App Isolation
status: accepted
date: 2026-11-20
---

# ADR-0001: Kernel Architecture & Micro-App Isolation

## Context
Micro-apps need shared runtime state (active `workspace`, session, navigation) and UI extension points without coupling directly to the host shell or sibling apps.

## Decision
1. **Host–Micro-app Boundary:** Micro-apps consume host capabilities **only** via `useKernel()` and shared packages; direct imports of `apps/shell` or sibling micro-apps are forbidden.
2. **Reactive Host Context:** `kernel` owns shared reactive state (`kernel.workspace`, session) so context switches update subscribed views without full page reloads.
3. **Layout Widget Slots:** Cross-app header/sidebar controls (such as `WorkspaceSelector` in `apps/shell`) render in shell layout slots (`#workspace-selector` with `sidebar-header` / `header-left` placement) backed by Pinia + `kernel.workspace`, keeping `micro-app` packages free of shell chrome.

## Consequences
- Micro-apps stay decoupled and independently testable.
- Architecture boundaries can be enforced automatically via lint/architecture checks.
