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
│   ├── core/        # Cross-app specs
│   ├── operon/      # Rust CLI, daemon (:8765), stealth browser
│   ├── console/     # Vue 3 / Tauri UI
│   ├── bot/         # Alerts and ChatOps
│   ├── id/          # Auth and identity
│   └── store/       # Storefront and commerce
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
| 001 | [Kernel Shell & Host Context](./specs/core/001-kernel.md) | `implemented` |
| 002 | [Auth, Session & Permission Boundary](./specs/core/002-auth.md) | `draft` |
| 003 | [Tenant Management & Selector](./specs/core/003-tenant.md) | `implemented` |
| 004 | [Local DB, Cloud DB ERD & Sync](./specs/core/004-data-sync.md) | `draft` |

### App Specs (`browsers`)
| ID | Title | Status |
| --- | --- | --- |
| 001 | [Browser Management CRUD & Lifecycle](./specs/browsers/001-crud.md) | `implemented` |

### Roadmaps
| ID | Title | Status |
| --- | --- | --- |
| 001 | [Kernel Shell & Host Context](./roadmaps/001-kernel.md) | `implemented` |
| 002 | [Auth, Session & Permission Boundary](./roadmaps/002-auth.md) | `draft` |
| 003 | [Tenant Management & Selector](./roadmaps/003-tenant.md) | `implemented` |
| 004 | [Local DB, Cloud DB ERD & Sync](./roadmaps/004-data-sync.md) | `draft` |
| 005 | [Browser Management](./roadmaps/005-browsers.md) | `implemented` |
