---
id: ADR-0003
title: Canonical Tenant Terminology
status: accepted
date: 2026-11-19
---

# ADR-0003: Canonical Tenant Terminology

## Context
The ecosystem mixed two terms (`tenant` and `workspace`) for the same multi-tenant isolation boundary across schemas, APIs, and UI, causing ambiguity and schema drift.

## Decision
Standardize **`tenant`** as the sole domain term across all layers:
1. **Data & APIs:** All schemas, foreign keys, and endpoints scope resources by `tenant`.
2. **Kernel & State:** Host context and client stores expose `tenant` as the active isolation boundary.
3. **UI & Copy:** All selectors, routes, and user-facing labels use `tenant` (no `workspace` aliases).

## Consequences
- One consistent ubiquitous language from storage to UI.
- `workspace` is permitted only for build tooling (package managers, Cargo) and external product names.
