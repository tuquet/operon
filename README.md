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

- **Spec:** `specs/<app>/SPEC-<NNN>-<slug>.md` (use `core/` for multi-app specs)
- **ADR:** `adr/ADR-<NNNN>-<slug>.md`
- **Roadmap:** `roadmaps/ROADMAP-<NNN>-<slug>.md`
- **Status values:** `draft` | `review` | `approved` | `implemented` | `deprecated`

## Index

### Glossary & ADRs
- [GLOSSARY.md](./GLOSSARY.md) — Standard terms (`tenant`, `browser profile`, `daemon`, `kernel`)
- [ADR-0001](./adr/ADR-0001-canonical-tenant-terminology.md) — Use `tenant` everywhere, remove `workspace` from domain code

### Core Specs
| ID | Title | Apps | Status |
| --- | --- | --- | --- |
| SPEC-001 | [Tenant Management & Selector Widget](./specs/core/SPEC-001-tenant-and-widget.md) | `console`, `operon` | `implemented` |
| SPEC-002 | [Browser Management CRUD & Lifecycle](./specs/core/SPEC-002-browser-management-crud.md) | `operon`, `console` | `implemented` |

### Roadmaps
| ID | Title | Status |
| --- | --- | --- |
| ROADMAP-001 | [Tenant & Browser Management](./roadmaps/ROADMAP-001-tenant-and-browser.md) | `implemented` |
