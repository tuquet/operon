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
Provide a clean, local-first CLI and daemon (`:8765`) for browser automation, worker execution, secrets, and workstation control, inheriting `specs/001`–`004` (`kernel`, `auth`, `tenant`, `data-sync`).

## Top-Level Commands (Target)
- `auth` — Cloud login, session, and tenant context.
- `browser` — Isolated antidetect browser runtime and profile sandbox.
- `workflow` (hidden alias: `automation`) — Manage and run automation workflows.
- `worker` — Distributed worker daemon and cloud execution node.
- `workstation` (`desktop`) — Launch the Workstation Control Plane UI.
- `secret` (`secrets`) — Local encrypted Secret Store (`{{secrets@name}}`) and env config.

## Hidden / Internal Commands
- `mcp` — MCP JSON-RPC 2.0 stdio server for AI agents.
- `schema` — Inspect and export system/config schemas (dev/codegen only).

## Local Daemon (`:8765`)
- Exposes HTTP/SSE/WS endpoints for `browsers`, `jobs`, `secrets`, `settings`, `system` (`tenant`, `cloud`, `metrics`, `process`), `history`, `lint`, and `health`.
