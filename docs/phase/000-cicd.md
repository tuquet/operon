# Phase 000: CI/CD & DevOps

## Backlog
- [ ] Configure GitHub repository branch protection & PR rules on `tuquet/operon` and `tuquet/core`
- [ ] Merge `tuquet/console` PR #44 (`feat/dashboard-overview-platform-unification` -> `main`) and switch `console` submodule tracking to `main`

## Ready

## In Progress

## Review

## Testing
- [ ] Verify centralized `.github/workflows/` (`submodules: recursive`, `vars.VITE_*` & `secrets.CLOUDFLARE_*`) on `tuquet/operon` GitHub Actions

## Done
- [x] Rename `tuquet/operon` -> `tuquet/core` (preserving Rust history) and create umbrella `tuquet/operon` with `console` & `core` submodules + native `docs/`
- [x] Consolidate all CI/CD workflows at `tuquet/operon/.github/workflows/` with `submodules: recursive` and `paths:` filters (`console`, `core`)
- [x] `console` — Composite action: `setup-desktop` (`.github/actions/setup-desktop/action.yml`)
- [x] `console` — `CI: quality` (`.github/workflows/quality.yml`)
- [x] `console` — `Preview: desktop` (`.github/workflows/preview-build.yml`)
- [x] `console` — `Deploy: console pages` to Cloudflare Pages (`.github/workflows/deploy-pages.yml`)
- [x] `console` — `Release: prepare` (`.github/workflows/release-prepare.yml`)
- [x] `console` — `Release: desktop binaries` (`.github/workflows/release.yml`)
- [x] `console` — `Maintenance: manage releases` (`.github/workflows/release-manage.yml`)
- [x] `operon` — `CI: rust workspace` (`.github/workflows/ci.yml`)
- [x] `operon` — `Release: opn Local Bridge` (`.github/workflows/release.yml`)
