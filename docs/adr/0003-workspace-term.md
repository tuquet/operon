---
id: ADR-0003
title: Canonical Workspace Terminology
status: accepted
date: 2026-11-19
---

# ADR-0003: Canonical Workspace Terminology

## Decision
Use **`workspace`** as the canonical domain term across all layers (`GLOSSARY.json`):
1. **Data & APIs:** Schemas (`workspaces`, `workspace_id`) and endpoints scope resources by `workspace`.
2. **Kernel & State:** `kernel.workspace` and `useWorkspaceStore` expose the active isolation boundary.
3. **UI & Copy:** Selectors, routes (`/workspaces`), and labels use `workspace`.
