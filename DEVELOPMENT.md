# Development Guide

## 0. First Time / Session Start
- [ ] `node scripts/doctor.mjs`

## 1. While Coding (fast checks, no full binary needed)
- [ ] **Rust (`core/`):** `cargo check --manifest-path core/Cargo.toml --workspace --all-targets` · `cargo test --manifest-path core/Cargo.toml -p operon <test>`
- [ ] **UI / Tauri (`console/`):** `pnpm --dir console check:type` · `pnpm --dir console vitest run <file>` · `pnpm --dir console tauri:check`

## 2. Live Dev Mode (daemon + UI)
- [ ] Switch global `operon` / `opn` to your local debug build:
  ```bash
  node scripts/switch.mjs dev --build
  opn daemon start -H 127.0.0.1 -p 8765 -d
  ```
- [ ] Start UI: `pnpm --dir console dev` (Web `:5666`) or `pnpm --dir console dev:desktop` (Tauri).
- [ ] Isolate state when testing destructive/install flows: set temporary `DATA_DIR` / `OPERON_HOME`.
- [ ] Restore installed release binary when done:
  ```bash
  node scripts/switch.mjs release
  opn daemon start -H 127.0.0.1 -p 8765 -d
  ```

## 3. Local Update Simulation
- [ ] **Automated Desktop updater check (mock feed + Minisign verification):**
  ```bash
  pnpm --dir console updater:simulate
  ```
  _(Add `-- --dry-run` to validate mock artifacts only.)_
- [ ] **Live Desktop app update test:**
  1. Terminal 1: `pnpm --dir console updater:simulate -- --apply-config --server-only` _(Ctrl+C stops server and restores `tauri.conf.json`)_
  2. Terminal 2: `pnpm --dir console dev:desktop`
- [ ] **CLI install / switch round-trip:** test `node scripts/switch.mjs dev|release|status` with temporary `OPERON_HOME`, and `install.ps1` / `install.sh` with `OPERON_REPO` / `OPERON_HOME` overrides.

## 4. Before Commit & Release
- [ ] `node scripts/local-ci.mjs core` | `console` | `all`
- [ ] `gitleaks detect --no-banner --redact`
- [ ] Release check: `node scripts/releases.mjs --commands` & `pnpm --dir console release:check` (commit inside `core/` / `console/` submodules before root)
