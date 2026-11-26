---
id: CLI-001
title: Operon CLI Overview & Command Surface
status: implemented
created: 2026-11-20
updated: 2026-11-26
depends_on: [KERNEL-001, AUTH-001, WORKSPACE-001, DATA-SYNC-001]
---

# CLI-001: Operon CLI (`opn`) Overview

## Goal
Provide a clean, local-first CLI (`operon` / `opn`) and daemon (`:8765`) for core ops, UI launching, browser automation, and daemon execution, inheriting `specs/001`–`004` (`kernel`, `auth`, `workspace`, `data-sync`). Install, `desk`, and `update` details live in [CLI-002](./002-install-and-desk.md).

## 1. Core Ops Commands
- `auth` — Cloud login, session, and workspace context.
- `secret` (alias `secrets`) — Manage local and Cloud Secret Store entries (`{{secrets@name}}`).
- `update` (alias `upgrade`) — Update `operon` CLI and/or Operon Desktop from GitHub Releases.
- `version` — Print CLI version (`-v` / `-V` / `--version`).

## 2. UI & Daemon Commands
- `web` — Open Web `host shell` in browser (auto-starts local `daemon`).
- `desk` (hidden, alias `desktop`) — Launch or auto-install Operon Desktop (`--web` falls back to browser).
- `daemon` — Start, stop, or inspect the local `daemon` (`:8765`), exposing HTTP/SSE/WS for `browsers`, `tasks`, `jobs`, `secrets`, `system` (including `/system/db/reset`), `history`, `lint`, and `health`.

## 3. Domain Commands
- `browser` — Isolated antidetect browser runtime (`browser driver`) and `browser profile` sandbox.
- `automation` — Manage and execute automation workflows.

## 4. Hidden / Internal Commands
- `mcp` — MCP JSON-RPC 2.0 stdio server for AI agents.
- `schema` — Inspect and export system/config schemas (dev/codegen only).
- `env` — Inspect/switch project `.env` files.
