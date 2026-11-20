---
id: BROWSERS-002
title: Antidetect Fingerprint Browser Runtime
status: implemented
created: 2026-11-20
updated: 2026-11-20
depends_on: [SPEC-001, SPEC-003]
---

# BROWSERS-002: Antidetect Fingerprint Browser Runtime

## Goal
Download, verify, store, and switch versioned antidetect Chromium binaries (`adryfish/fingerprint-chromium`, Blink/V8 C++ patch) for deterministic stealth automation.

## Capabilities
- **Manifest & Discovery (`search`):** Fetch release manifest (`--remote` or cached), showing channels (`lts`), release status (`recommended`, `buggy`, `unverified`, `deprecated`), and installed/active state.
- **Download & Install (`install`):** Download and extract target version (or default Golden LTS) into local runtime storage; support `--force` reinstall.
- **Version Switching (`use`, `list`):** List installed runtimes and switch the active runtime version used by browser launches (`BROWSERS-001`).

## Non-Goals
- Profile CRUD, proxy probing, and per-profile fingerprint flags live in [001-crud.md](./001-crud.md).
