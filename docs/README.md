# Operon Specs (`specs-operon`)

Documentation repository for the Operon project (specs, architecture decisions, glossary, and roadmaps).

## Folder Layout

```text
root/
├── README.md        # Index and rules
├── adr/             # Short, permanent architecture decisions
├── specs/           # Feature specifications
├── phase/           # Per-phase Obsidian Kanban boards
└── roadmaps/        # Phased delivery plans
```

## Naming & Status Rules

- **Spec:** `specs/<NNN>-<domain>/<NNN>-<slug>.md`
- **ADR:** `adr/<NNNN>-<slug>.md`
- **Roadmap:** `roadmaps/<NNN>-<slug>.md`
- **Doc status:** `draft` | `review` | `approved` | `implemented` | `deprecated`
- **Kanban columns:** `Backlog` | `Ready` | `In Progress` | `Review` | `Testing` | `Done`

## Index

- [adr/](./adr/) — Architecture decisions
- [specs/](./specs/) — Feature specifications
- [roadmaps/](./roadmaps/) — Phased delivery plans
- [phase/](./phase/) — Per-phase Kanban boards
