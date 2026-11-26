---
id: CICD-001
title: GitHub Actions & Cloudflare Deployment
status: implemented
created: 2026-11-20
updated: 2026-11-26
---

# CICD-001: GitHub Actions & Cloudflare Deployment

## Goal
Standardize centralized CI/CD pipelines in the umbrella `tuquet/operon` repository (with Git submodules `console/` → `tuquet/console`, `core/` → `tuquet/core`, and native `docs/`) using GitHub Actions (`submodules: recursive`, `paths:`-filtered workflows), Cloudflare Pages deployment, and clear separation between GitHub Variables (`vars.*`) and GitHub Secrets (`secrets.*`).

## Repository Governance
- Protected `main` branch requiring passing CI status checks before merge.
- Conventional Commits enforced for automated release preparation.
- `CODEOWNERS` and PR/Issue templates maintained under `.github/`.

## CI Workflows
- **`console` (`CI: console quality` — `console-quality.yml`)**: Automated checks (`pnpm check`, `pnpm lint`, `pnpm test:unit`) on PRs and pushes.
- **`console` (`Preview: console desktop` — `console-preview-build.yml`)**: Desktop preview build using `.github/actions/setup-desktop`.
- **`operon` (`CI: rust workspace` — `ci.yml`)**: Rust workspace checks (`cargo check`, `cargo fmt`, `cargo clippy`, tests).

## CD & Release Workflows
- **`console` (`Deploy: console pages` — `console-deploy-pages.yml`)**: Builds `apps/shell` (`pnpm build:shell`) and deploys `apps/shell/dist` to Cloudflare Pages (`wrangler@4 pages deploy`) on push to `main` touching `console/**` or `workflow_dispatch`.
- **`console` (`Release: console prepare` / `Release: console desktop binaries` / `Maintenance: manage console releases`)**: Release PR preparation (`console-release-prepare.yml`), manual `workflow_dispatch` desktop binary build (`console-release.yml`, `console-v*` tag trigger paused), and release pruning (`console-release-manage.yml`).
- **`operon` (`release.yml`, tag `core-v*`)**: `opn` / `operon` CLI binary release automation.

## Environment & Secrets Policy
- **GitHub Variables (`vars.*`)**: Non-sensitive build/runtime configuration (e.g. `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `VITE_TURNSTILE_SITE_KEY`, Cloudflare project name).
- **GitHub Secrets (`secrets.*`)**: Sensitive tokens and credentials only (e.g. `CLOUDFLARE_API_TOKEN`, `CLOUDFLARE_ACCOUNT_ID`).
