---
id: CICD-001
title: GitHub Actions & Cloudflare Deployment
status: draft
created: 2026-11-20
updated: 2026-11-20
---

# CICD-001: GitHub Actions & Cloudflare Deployment

## Goal
Standardize CI/CD pipelines in the unified `tuquet/operon` monorepo using GitHub Actions (`paths:`-filtered workflows), Cloudflare Pages/Workers deployment, and clear separation between GitHub Variables (`vars.*`) and GitHub Secrets (`secrets.*`).

## Repository Governance
- Protected `main` branch requiring passing CI status checks before merge.
- Conventional Commits enforced for automated release preparation.
- `CODEOWNERS` and PR/Issue templates maintained under `.github/`.

## CI Workflows
- **`console` (`CI: quality`)**: Automated checks (`pnpm check`, `pnpm lint`, `pnpm test:unit`) on PRs and pushes.
- **`console` (`Preview: desktop`)**: Desktop preview build using `.github/actions/setup-desktop`.
- **`operon` (`CI: rust workspace`)**: Rust workspace checks (`cargo check`, `cargo fmt`, `cargo clippy`, tests).

## CD & Release Workflows
- **`console` (`Deploy: console pages`)**: Builds `apps/shell` (`pnpm build:shell`) and deploys `apps/shell/dist` to Cloudflare Pages (`wrangler@4 pages deploy`) on push to `main` or `workflow_dispatch`.
- **`console` (`Release: prepare`, `Release: desktop binaries`, `Maintenance: manage releases`)**: Tagging and desktop binary release automation.
- **`operon` (`Release: opn Local Bridge`)**: `opn` CLI/bridge binary release automation.

## Environment & Secrets Policy
- **GitHub Variables (`vars.*`)**: Non-sensitive build/runtime configuration (e.g. `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `VITE_TURNSTILE_SITE_KEY`, Cloudflare project name).
- **GitHub Secrets (`secrets.*`)**: Sensitive tokens and credentials only (e.g. `CLOUDFLARE_API_TOKEN`, `CLOUDFLARE_ACCOUNT_ID`).
