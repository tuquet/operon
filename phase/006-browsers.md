---
kanban-plugin: basic
---

## Backlog

## Tasks

## In Progress

## Review

- [ ] [[specs/006-browsers/001-crud|BROWSERS-001: Daemon Browser CRUD & Antidetect Launch]]
  - [ ] Strict `400`/`404`/`409` guards, `PATCH`, `clone`, `move`, `proxy/probe`, `batch/delete`, `PUT /extensions`
  - [ ] Disk cleanup, RFC-4180 CSV import, and antidetect Chromium flags
- [ ] [[specs/006-browsers/001-crud|BROWSERS-001: Console Browser Management UI]]
  - [ ] `browsers.vue`, `useBrowsersStore` (SSE + tenant watcher), and Form/Detail/CSV/Delete modals
- [ ] [[specs/006-browsers/001-crud|BROWSERS-001: Lease Unbind & Tenant Delete Guard]]
  - [ ] `POST /api/v1/browsers/{id}/unbind` and tenant delete guard/cascade cleanup
- [ ] [[specs/006-browsers/002-antidetect-runtime|BROWSERS-002: Antidetect Fingerprint Runtime]]
  - [ ] `search`, `install`, `use`, `list` (`adryfish/fingerprint-chromium`, `lts` channel)

## Done
