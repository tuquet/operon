---

kanban-plugin: board

---

## Backlog

- [ ] [[specs/006-browsers/001-crud|BROWSERS-001: Daemon Browser CRUD & Antidetect Launch]]
	  - [ ] Strict `400`/`404`/`409` guards, `PATCH`, `clone`, `move`, `proxy/probe`, `batch/delete`, `PUT /extensions`
	  - [ ] Disk cleanup, RFC-4180 CSV import, and antidetect Chromium flags
- [ ] [[specs/006-browsers/002-antidetect-runtime|BROWSERS-002: Antidetect Fingerprint Runtime]]
	  - [ ] `search`, `install`, `use`, `list` (`adryfish/fingerprint-chromium`, `lts` channel)
- [ ] [[specs/006-browsers/001-crud|BROWSERS-001: Lease Unbind & Workspace Delete Guard]]
	  - [ ] `POST /api/v1/browsers/{id}/unbind` and workspace delete guard/cascade cleanup
- [ ] [[specs/006-browsers/001-crud|BROWSERS-001: Console Browser Management UI]]
	  - [ ] `browsers.vue`, `useBrowsersStore` (SSE + workspace watcher), and Form/Detail/CSV/Delete modals


## Ready



## In Progress



## Review



## Testing



## Done





%% kanban:settings
```
{"kanban-plugin":"board"}
```
%%