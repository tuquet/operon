---
kanban-plugin: basic
---

## Backlog

- [ ] [[specs/002-auth/001-session|AUTH-001: Auth, Session & Permission Boundary]]
  - [ ] Write JWT & daemon (:8765) auth contract
  - [ ] Define Supabase RLS & offline cached-session rules
- [ ] [[specs/004-data-sync/001-erd-sync|DATA-SYNC-001: Local DB, Cloud DB ERD & Sync]]
  - [ ] Document localDB (SQLite) & cloudDB (Postgres) ERD
  - [ ] Define local <-> cloud push/pull sync & conflict rules
- [ ] [[specs/005-cli/001-overview|CLI-001: Operon CLI Overview]]
  - [ ] Implement CLI Phase 1 Core Ops (`config`, `logs`, `secrets`, `update`)
  - [ ] Implement CLI Phase 2 UI Launchers (`dashboard`, `webapp`, `desktop`)
  - [ ] Refactor CLI Phase 3 Domain (`workflow` alias `automation`, hide `schema`)

## Tasks

## In Progress

## Review

## Done

- [x] [[specs/001-kernel/001-shell|KERNEL-001: Kernel Shell & Host Context]]
- [x] [[specs/003-tenant/001-management|TENANT-001: Tenant Management & Selector]]
- [x] [[specs/006-browsers/001-crud|BROWSERS-001: Browser Management CRUD & Lifecycle]]
- [x] [[specs/006-browsers/002-antidetect-runtime|BROWSERS-002: Antidetect Fingerprint Browser Runtime]]
- [x] [[roadmaps/001-kernel|ROADMAP-001: Kernel Shell & Host Context]]
- [x] [[roadmaps/003-tenant|ROADMAP-003: Tenant Management & Selector]]
- [x] [[roadmaps/006-browsers|ROADMAP-006: Browser Management]]
- [x] [[adr/0001-tenant-term|ADR-0001: Canonical Tenant Terminology]]
