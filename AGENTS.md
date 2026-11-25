# Operon — Agent Directives

> **Contracts:** [`./CONSTRAINTS.md`](./CONSTRAINTS.md) (invariants) · [`./docs/GLOSSARY.md`](./docs/GLOSSARY.md) (mandatory domain terms). Never weaken or bypass assertions.

## 1. Architecture

Two decoupled planes:
1. **Device-Local Execution Plane:** Local `daemon` (`opn`, `:8765`) handling Chromium hardware sandboxing, `browser profile` / `browser session` isolation, and offline runs.
2. **Cloud Orchestration Plane:** Supabase Postgres handling multi-`tenant` state, `SKIP LOCKED` job leases, and Vault KEK/DEK encryption.

**Precedence:** `CONSTRAINTS.md` → `docs/GLOSSARY.md` → DDL Schemas → `docs/specs/` & `docs/adr/` → Submodule `AGENTS.md` → Agent reasoning.
- **Anti-Hallucination & Fail-Fast:** Never invent CLI flags, columns, or endpoints; never add shims or fallback chains to hide schema drift.

## 2. Subsystems

| Subsystem | Path | Stack | Role |
| :--- | :--- | :--- | :--- |
| **CLI** | `./core/crates/cli` | Rust (Axum, Clap, Tokio) | `opn` binary, `daemon` API (`:8765`) (`tuquet/core`). |
| **Worker** | `./core/crates/worker` | Rust (Tokio, PostgREST) | Process supervisor & cloud claim loop (`tuquet/core`). |
| **Browser** | `./core/crates/browser` | Rust (CDP, PRNG) | Stealth Chromium launcher & `browser profile` isolation (`tuquet/core`). |
| **Console** | `./console` | Vue 3, Shadcn, Tauri v2 | `host shell`, `kernel`, `micro-app` modules (`tuquet/console`). |
| **Docs** | `./docs` | Markdown, Kanban | Glossary, ADRs, specs, roadmaps, phase boards. |
| **CI/CD** | `./.github` | GitHub Actions | Centralized workflows for `core`, `console`, umbrella. |

## 3. Local CI/CD & Verification

Run locally before pushing (mirrors `.github/workflows/ci.yml` & `console-quality.yml`; tasks in [`.vscode/tasks.json`](./.vscode/tasks.json) invoke [`scripts/local-ci.mjs`](./scripts/local-ci.mjs) and write UTF-8 logs to `.logs/ci-<target>.log`, follow with `Get-Content .logs/ci-core.log -Encoding utf8 -Wait`):

- **Quick check (per-edit):**
  - Core: `cargo check --manifest-path core/Cargo.toml --workspace --all-targets`
  - Console: `pnpm --dir console check:type`
- **Local CI (`ci: core`, `ci: console`, `ci: docker`, `ci: all`):**
  ```bash
  node scripts/local-ci.mjs core     # fmt, clippy -D warnings, cargo test
  node scripts/local-ci.mjs console  # release:check, check:architecture/circular/type/i18n/dep, lint, test:unit
  node scripts/local-ci.mjs docker   # docker compose config -q
  node scripts/local-ci.mjs all      # runs core, console, docker in sequence without masking failures
  node scripts/releases.mjs --commands # check CLI (v*) / Desktop (console-v*) releases & install commands
  ```

## 4. Guardrails

- **Minimal change:** Smallest diff that solves the task; no unrelated refactoring.
- **Commit & push:** When finishing a coding task, only commit locally with `git commit --no-verify`; only push when the user explicitly requests it in the latest prompt. Never deploy without explicit user instruction.
- **VPS limits (3.8GB RAM / 2 Cores):** **NEVER** run `cargo build --release` on host; clean `core/target/` if disk $> 85\%$.
- **Progressive discovery:** Inspect `./docs/GLOSSARY.md`, `./core/AGENTS.md`, or `./console/AGENTS.md` only when working in that domain.
