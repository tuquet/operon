---
id: CLI-001
title: Operon CLI Overview & Command Surface
status: implemented
created: 2026-11-20
updated: 2026-11-20
depends_on: [SPEC-001, SPEC-002, SPEC-003, SPEC-004]
---

# CLI-001: Operon CLI (`opn`) Overview

## Goal
Provide the local-first CLI and daemon (`:8765`) for browser automation, worker execution, secrets, and workstation control, inheriting `specs/core/` (`kernel`, `auth`, `tenant`, `data-sync`).

## Top-Level Commands
- `auth` — Cloud login, credentials, and session management.
- `worker` — Distributed worker daemon and cloud execution node.
- `automation` — Manage and run automation workflows.
- `env` — Inspect/switch `.env` profiles (`--check`, `--switch`, `--list`, `--format table|json|card`).
- `browser` — Isolated antidetect browser runtime and profile sandbox.
- `secret` (`secrets`) — Local encrypted Secret Store (`~/.operon/system/.secret_key`, `{{secrets@name}}`).
- `workstation` (`desktop`) — Launch the Workstation Control Plane UI.
- `schema` — Inspect and export system/config schemas.
- `mcp` (hidden) — MCP JSON-RPC 2.0 stdio server for AI agents.

## Local Daemon (`:8765`)
- Exposes HTTP/SSE/WS endpoints for `browsers`, `jobs`, `secrets`, `settings`, `system` (`tenant`, `cloud`, `metrics`, `process`), `history`, `lint`, and `health`.
