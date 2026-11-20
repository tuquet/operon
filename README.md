# Operon Specs (`specs-operon`)

Single source of truth for specs, architecture decisions (ADRs), glossary, and roadmaps across all Operon apps.

## Folder Layout

```text
specs-operon/
├── README.md        # Index and rules
├── GLOSSARY.md      # Standard terms across all repos
├── templates/       # Templates for new specs and ADRs
├── adr/             # Short, permanent architecture decisions
├── specs/
│   ├── 001-kernel/  # Host kernel shell & context
│   ├── 002-auth/    # Auth, JWT, RLS & offline session
│   ├── 003-tenant/  # Tenant management & selector
│   ├── 004-data-sync/# Local/Cloud ERD & sync
│   ├── 005-cli/     # CLI & local daemon (:8765)
│   └── 006-browsers/# Browser CRUD & antidetect runtime
├── phase/           # Per-phase Obsidian Kanban boards
└── roadmaps/        # Phased delivery plans
```

## Naming & Status Rules

- **Layers:** `GLOSSARY.md` + `adr/` (conventions) → `specs/core/` (default platform layer; `tenant` isolation is assumed) → `specs/<app>/` (app-specific behavior).
- **Spec:** `specs/<app>/<NNN>-<slug>.md` (use `core/` for multi-app specs)
- **ADR:** `adr/<NNNN>-<slug>.md`
- **Roadmap:** `roadmaps/<NNN>-<slug>.md`
- **Status values:** `draft` | `review` | `approved` | `implemented` | `deprecated`

## Index

### Glossary & ADRs
- [GLOSSARY.md](./GLOSSARY.md) — Standard terms (`tenant`, `browser profile`, `daemon`, `kernel`)
- [0001-tenant-term.md](./adr/0001-tenant-term.md) — Use `tenant` everywhere, remove `workspace` from domain code

### Core Specs
| ID | Title | Status |
| --- | --- | --- |
| 001 | [Kernel Shell & Host Context](./specs/001-kernel/001-shell.md) | `implemented` |
| 002 | [Auth, Session & Permission Boundary](./specs/002-auth/001-session.md) | `draft` |
| 003 | [Tenant Management & Selector](./specs/003-tenant/001-management.md) | `implemented` |
| 004 | [Local DB, Cloud DB ERD & Sync](./specs/004-data-sync/001-erd-sync.md) | `draft` |

### App Specs (`cli`)
| ID | Title | Status |
| --- | --- | --- |
| 001 | [Operon CLI Overview & Command Surface](./specs/005-cli/001-overview.md) | `implemented` |

### App Specs (`browsers`)
| ID | Title | Status |
| --- | --- | --- |
| 001 | [Browser Management CRUD & Lifecycle](./specs/006-browsers/001-crud.md) | `implemented` |
| 002 | [Antidetect Fingerprint Browser Runtime](./specs/006-browsers/002-antidetect-runtime.md) | `implemented` |

### Roadmaps
| ID | Title | Status |
| --- | --- | --- |
| 001 | [Kernel Shell & Host Context](./roadmaps/001-kernel.md) | `implemented` |
| 002 | [Auth, Session & Permission Boundary](./roadmaps/002-auth.md) | `draft` |
| 003 | [Tenant Management & Selector](./roadmaps/003-tenant.md) | `implemented` |
| 004 | [Local DB, Cloud DB ERD & Sync](./roadmaps/004-data-sync.md) | `draft` |
| 005 | [Operon CLI & Local Daemon](./roadmaps/005-cli.md) | `implemented` |
| 006 | [Browser Management](./roadmaps/006-browsers.md) | `implemented` |
