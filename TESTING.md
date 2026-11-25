# Testing Guide

## 0. First Time / Session Start
- [ ] `node scripts/doctor.mjs`
- [ ] Never run `cargo build --release` on low-RAM hosts.

## 1. While Coding (no full binary needed)
- [ ] **Rust (`core/`):** `cargo check --manifest-path core/Cargo.toml --workspace --all-targets` · `cargo test --manifest-path core/Cargo.toml -p operon <test>`
- [ ] **UI / Tauri (`console/`):** `pnpm --dir console check:type` · `pnpm --dir console vitest run <file>` · `pnpm --dir console tauri:check`

## 2. Live App Smoke (skip if unit tests cover it)
- [ ] Switch `opn` to local debug build: `node scripts/switch.mjs dev --build`
- [ ] Run app: `opn worker start -H 127.0.0.1 -p 8765 -d` then `pnpm --dir console dev` (or `dev:desktop`)
- [ ] Restore release binary when done: `node scripts/switch.mjs release`

## 3. Before Commit & Release
- [ ] `node scripts/local-ci.mjs core` | `console` | `all` (cached per unchanged module)
- [ ] `gitleaks detect --no-banner --redact`
- [ ] Release tag check: `node scripts/releases.mjs --commands` (commit inside `core/` / `console/` submodules before root)
