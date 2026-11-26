# Contributing to Operon

## Setup

```bash
git clone --recurse-submodules https://github.com/<your-username>/operon.git
cd operon
cp .env.example .env
pnpm --dir console install
cargo check --manifest-path core/Cargo.toml --workspace
```

Requires **Git**, **Rust** (edition 2024), **Node 20+**, **pnpm 9+**, and optionally **Docker**.

## Database Reset & Acceptance Seed (Local SQLite)

Reset `~/.operon/data/operon.sqlite` (`browsers`, `tasks`, `jobs`, `logs`) and load deterministic acceptance fixtures (5 browser profiles, 12 linked/unassigned tasks, 3 sample jobs):

```bash
# Resets `local-default` via live daemon (:8765, pushes SSE reload to UI)
# or falls back to the offline core seeder when the daemon is stopped
node scripts/db-reset.mjs

# Options
node scripts/db-reset.mjs --workspace <id>   # Reset/seed a specific workspace
node scripts/db-reset.mjs --all              # Clear all workspaces before seeding
node scripts/db-reset.mjs --offline          # Run core/crates/cli/examples/db_reset.rs directly
```

- Single source of truth for fixtures lives in `core/crates/cli/src/infrastructure/db/seed.rs`.
- VS Code task: **Run Task → `db: reset`**.
- Drizzle (`@operon/local-db`) schema migrations: `pnpm --dir console --filter @operon/local-db db:generate`.

## Local CI & Verification

Run the centralized CI wrapper before pushing:

```bash
node scripts/doctor.mjs            # Check submodules, toolchains, .env, Docker
node scripts/local-ci.mjs core     # cargo fmt, clippy -D warnings, cargo test
node scripts/local-ci.mjs console  # architecture, circular, typecheck, lint, i18n, vitest, dep
node scripts/local-ci.mjs glossary # canonical domain terms (GLOSSARY.json)
node scripts/local-ci.mjs all      # full local suite
```

## Deploy & Release

- **Console Web (Cloudflare Pages):** Automatic on push to `main` touching `console/**` (or manual `workflow_dispatch`) via `.github/workflows/console-deploy-pages.yml` (`pnpm build:shell` → `wrangler pages deploy` using GitHub `vars.VITE_*` and `secrets.CLOUDFLARE_*`).
- **Core CLI (`opn`):** Push tag `core-v*` (or `workflow_dispatch`) to trigger `.github/workflows/release.yml`.
- **Desktop Binaries (Tauri):** Trigger `.github/workflows/console-release-prepare.yml` (`workflow_dispatch`) and `.github/workflows/console-release.yml` (currently manual `workflow_dispatch` only; tag trigger `console-v*` is paused).
- **Check release status & install commands:** `node scripts/releases.mjs --commands`.
- **Host / VPS guardrails:** Never run `cargo build --release` on low-RAM hosts; keep `core/target/` disk usage under 85%.

## Commits & PRs

- Follow [Conventional Commits](https://www.conventionalcommits.org/) (`feat:`, `fix:`, `docs:`, `chore:`, `refactor:`, `test:`).
- Use canonical domain terms from [GLOSSARY.json](GLOSSARY.json).
- Verify locally via `node scripts/local-ci.mjs all` before opening a PR against `main`.

## Links

- **Discussions:** [tuquet/operon/discussions](https://github.com/tuquet/operon/discussions)
- **Security:** [core/SECURITY.md](core/SECURITY.md)
