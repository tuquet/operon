# Phase 000: CI/CD & DevOps

## Backlog
- [ ] Configure GitHub repository branch protection & PR rules
- [ ] Standardize environment config in GitHub Variables (`vars.*`) & Secrets (`secrets.*`) across workflows
- [ ] Consolidate `console` and `specs-operon` into `tuquet/operon` monorepo (`console/`, `docs/` or `specs/`)
- [ ] Merge `.github/workflows` into `tuquet/operon` with `paths:` filters (`console/**`, `crates/**`, `cloud/**`) and update Cloudflare Pages deploy root

## Ready

## In Progress

## Review

## Testing

## Done
- [x] `console` — Composite action: `setup-desktop` (`.github/actions/setup-desktop/action.yml`)
- [x] `console` — `CI: quality` (`.github/workflows/quality.yml`)
- [x] `console` — `Preview: desktop` (`.github/workflows/preview-build.yml`)
- [x] `console` — `Deploy: console pages` to Cloudflare Pages (`.github/workflows/deploy-pages.yml`)
- [x] `console` — `Release: prepare` (`.github/workflows/release-prepare.yml`)
- [x] `console` — `Release: desktop binaries` (`.github/workflows/release.yml`)
- [x] `console` — `Maintenance: manage releases` (`.github/workflows/release-manage.yml`)
- [x] `operon` — `CI: rust workspace` (`.github/workflows/ci.yml`)
- [x] `operon` — `Release: opn Local Bridge` (`.github/workflows/release.yml`)
