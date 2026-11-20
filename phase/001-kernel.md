---
kanban-plugin: basic
---

## Backlog

## Tasks

## In Progress

## Review

## Done

- [x] [[specs/001-kernel/001-shell|KERNEL-001: Host Kernel & Isolation Boundary]]
  - [x] Expose `useKernel()` reactive context (`kernel.tenant`)
  - [x] Enforce host/micro-app isolation boundary (no direct `apps/shell` or sibling imports)
- [x] [[specs/001-kernel/001-shell|KERNEL-001: Layout UI & Shell Framing]]
  - [x] Align sidebar-header with tabbar (`paddingTop` offset & hidden-header reset)
  - [x] Align header icon button, sidebar footer settings, and content margins (`px-3`)
  - [x] Remove redundant settings headings/labels in `@operon/layouts`
- [x] [[specs/001-kernel/001-shell|KERNEL-001: Design Tokens & Darkmode]]
  - [x] Increase darkmode contrast between content and chrome (`@operon-core/design`)
  - [x] Darken `background-deep` in dark themes
- [x] [[specs/001-kernel/001-shell|KERNEL-001: Shell Widget Slots & Playground]]
  - [x] Add `sidebar-header` widget slot and combobox widget registration
  - [x] Clean up `@operon/playground` overview and scope to implemented demos
