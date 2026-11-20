---
id: CLI-001
title: Operon CLI Overview & Command Surface
status: draft
created: 2026-11-20
updated: 2026-11-20
depends_on: [SPEC-001, SPEC-002, SPEC-003, SPEC-004]
---

# CLI-001: Operon CLI (`opn`) Overview

## Goal
Provide a clean, local-first CLI and daemon (`:8765`) for core ops, UI launching, browser automation, and worker execution, inheriting `specs/001`–`004` (`kernel`, `auth`, `tenant`, `data-sync`).

## 1. Core Ops Commands
- `auth` — Cloud login, session, and tenant context.
- `config` — View configuration; `config edit` opens config in `$EDITOR`.
- `logs` — View `agent.log` (last 50 lines), `-f` follow, `errors` (`errors.log`), `--since 1h`.
- `secrets` — Manage local and external secret sources (`{{secrets@name}}`).
- `update` — Update `opn` to the latest version.

## 2. UI & Daemon Commands
- `dashboard` — Start web UI dashboard (`--stop`, `--status`).
- `webapp` — Open/serve web app UI.
- `desktop` — Launch desktop app UI.
- Local daemon (`:8765`) — Exposes HTTP/SSE/WS for `browsers`, `jobs`, `secrets`, `settings`, `system`, `history`, `lint`, and `health`.

## 3. Domain Commands
- `browser` — Isolated antidetect browser runtime and profile sandbox.
- `workflow` (hidden alias: `automation`) — Manage and run automation workflows.
- `worker` — Distributed worker daemon and cloud execution node.

## 4. Hidden / Internal Commands
- `mcp` — MCP JSON-RPC 2.0 stdio server for AI agents.
- `schema` — Inspect and export system/config schemas (dev/codegen only).
