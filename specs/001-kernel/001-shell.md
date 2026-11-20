---
id: KERNEL-001
title: Kernel Shell & Host Context
status: implemented
created: 2026-11-20
updated: 2026-11-20
---

# KERNEL-001: Kernel Shell & Host Context

## Goal
Provide a single host runtime (`useKernel()`) that exposes shared context (reactive `tenant`, auth state, navigation) to micro-apps without direct cross-app imports.

## Rules
- Micro-apps consume host capabilities **only** via `useKernel()` and shared packages.
- Micro-apps never import the host shell or sibling micro-apps directly.
- `kernel.tenant` (`KernelTenantContext`) is reactive; switching tenant updates all subscribed views/stores without full page reload.
