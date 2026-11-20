---
id: KERNEL-001
title: Host Shell & Kernel Context
status: implemented
created: 2026-11-20
updated: 2026-11-20
---

# KERNEL-001: Host Shell & Kernel Context

## Goal
Provide a single host runtime (`useKernel()`) and `host shell` layout so `micro-app` modules consume shared capabilities without importing the host shell or sibling micro-apps.

## Isolation & Fallback
- Micro-apps consume host capabilities **only** via `useKernel()` and shared packages.
- Micro-apps never import `apps/shell` or sibling micro-apps directly.
- When `useKernel()` is called outside the `host shell` (e.g. standalone dev or unit tests), it returns a safe default/empty fallback context instead of throwing.

## `useKernel()` Contract
- **`kernel.tenant`** (`KernelTenantContext`): reactive active `tenant`; switching tenant updates all subscribed views/stores without full page reload.
- **`kernel.auth`**: reactive session state (current user, token/auth status, logout trigger).
- **`kernel.navigate(target, params?)`**: host-coordinated navigation between micro-apps; each micro-app manages only its own internal sub-routes.
- **`kernel.theme`**: reactive theme state (`'light' | 'dark' | 'system'`).

## Host Shell & Widget Slots
- `host shell` owns the top-level frame, primary navigation, and named widget slots (e.g. `sidebar-header`).
- Micro-apps register widgets declaratively via manifest contribution points (VS Code-style `contributes` / slot declarations), rather than imperative runtime injection.

## Theme & Design System
- `host shell` and all micro-apps share CSS design tokens from the shared UI package.
- Micro-apps follow `kernel.theme` and must not override root palette tokens.
