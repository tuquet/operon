---
id: BROWSERS-002
title: Antidetect Fingerprint Browser Runtime
app: core
status: implemented
created: 2026-11-20
updated: 2026-11-26
depends_on: [KERNEL-001, TENANT-001]
---

# BROWSERS-002: Antidetect Fingerprint Browser Runtime

## 1. Goal & Scope
Download, verify, store, and switch versioned C++ antidetect Chromium binaries (`adryfish/fingerprint-chromium`, Blink/V8 patch) used by `operon` to launch deterministic stealth `browser session` instances ([001-crud.md](./001-crud.md)).

## 2. Storage & Resolution Order

- **Config file:** `~/.operon/browser/browser.json` (`get_browser_config_path`) tracks active runtime name and version.
- **Runtime binaries:** `~/.operon/browser/runtimes/<version>/` (`chrome.exe` on Windows, `Chromium.app/Contents/MacOS/Chromium` on macOS, `chrome` on Linux).
- **Resolution priority (`get_runtime_dir`):**
  1. Configured active runtime directory name (`~/.operon/browser/runtimes/<active_name>`).
  2. Exact `v<active_ver>` or `<active_ver>` directory.
  3. Installed non-vanilla directory matching `<active_ver>` via manifest/binary stem detection.
  4. Default `stealth` LTS directory (`~/.operon/browser/runtimes/stealth`).
  5. Any installed non-vanilla (`!chromium-*`) antidetect runtime.
- When no antidetect binary exists (and no system Chromium resolves), session start ([001-crud.md](./001-crud.md)) fails fast with a launch error rather than spawning unpatched browsers silently.

## 3. CLI Capabilities (`opn browser`)

- **`search [--remote]`:** Display upstream release manifest (`lts` channel, `recommended`, `buggy`, `unverified`, `deprecated` statuses) and mark currently installed/active versions.
- **`install [--force] [VERSION]`:** Download and extract target version (or pinned Golden LTS `148.0.7778.215`) into `~/.operon/browser/runtimes/`.
- **`list`:** List all locally installed browser runtimes and active selection (`--json` supported).
- **`use <VERSION>`:** Switch active antidetect runtime version for subsequent `browser session` launches.
- **`status` / `clean`:** Inspect active executable path/disk usage or remove installed runtimes.

## 4. Non-Goals

- Profile CRUD, proxy probing, and Console UI live in [001-crud.md](./001-crud.md) and [003-console-ui.md](./003-console-ui.md).

## 5. Checks

- `node scripts/local-ci.mjs core` (`cargo test -p operon --lib`)
- `opn browser status`
