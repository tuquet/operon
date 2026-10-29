# Operon Monorepo — Agent Engineering Directives

> **Contractual authority:** [`CONSTRAINTS.md`](CONSTRAINTS.md) — read before modifying code. **Never** weaken, bypass, or delete assertions to make a check pass.
> **Architecture & Documentation:** [`docs/`](docs/) • [`cloud/README.md`](cloud/README.md) • [`console/`](console/).

---

## 1. Single Source of Truth (SSOT)

All runtimes, daemons, and workstation storage resolve strictly to `~/.operon/<pillar>/` (or `$DATA_DIR/<pillar>/`).
Pillars: `bin`, `system`, `automation`, `worker`, `browser`, `gateway`, `faker`.

- **Anti-fragmentation:** No flat root paths (`~/.operon/workflows`) and no legacy paths (`~/.tq`, `~/.specter`, `~/.automa`).
- **Canonical naming:** Always use canonical terms (`automation`, `worker`, `gateway`, `operon`, `workstation`). No backward compatibility shims or union aliases hiding schema drift.

---

## 2. Core Invariants (Non-negotiable)

1. **VPS Resource Protection (3.8GB RAM / 2 Cores):**
   - **NEVER** run `cargo build --release` on the VPS. Release builds belong exclusively to GitHub Actions CI/CD.
   - Use incremental checks: `cargo check --workspace` or `cargo run -p operon --bin opn -- <args>`.
   - Clean up target directories if disk rises: maintain root disk $\le 85\%$.
2. **Console Pre-Push Verification (`console/`):**
   - `pnpm check:type` (0 errors)
   - `pnpm run lint` (0 errors)
   - `pnpm run build:workstation` (build must succeed)
   - In `apps/workstation/package.json`, dependencies must strictly use `"catalog:"`.
3. **Cloud Control Plane & Supabase Gates (`cloud/`):**
   - **Zero direct private schema access:** External clients must call `public.<domain>_*` RPC wrappers with `SECURITY INVOKER`.
   - **Connection Pooler:** Distributed workers connect via Transaction Pooler port `6543` (Supavisor). Direct port `5432` is for migrations/admin only.
   - **Immutable migrations:** 100% schema changes live in `supabase/migrations/` or `supabase/plugins/`, verified through all 11 test suites.
4. **Local-First, Zero Unsolicited Push:**
   - **NEVER** run `git push` or trigger CI/CD without an explicit instruction from the user.
5. **Git Hygiene:**
   - Pre-commit hooks (`lefthook.yml`) must run cleanly and fast (< 1s). Do not introduce heavy full-typecheck tasks into pre-commit.

---

## 3. Subsystems Map

- **`crates/cli`**: Master CLI binary (`opn`), REST & WebSocket API daemon (`127.0.0.1:8765`), automation engine.
- **`crates/worker`**: Background process supervisor daemon connecting nodes via WebSockets with claim loop.
- **`crates/browser`**: Stealth Chromium launcher, profile manager, PRNG hardware masking & native CDP automation.
- **`console`**: Administrative workstation & desktop app (Vue 3, Tailwind v4, Shadcn, Tauri v2).
- **`cloud`**: Supabase control plane (8 isolated domain plugins + Core IAM).
- **`docs`**: Technical documentation VitePress portal.
- **`bot`**: Telegram ChatOps assistant daemon.
- **`skills`**: Curated Agent Skills catalog (`skills-lock.json`).

---

## 4. Context Budget & Progressive Discovery

- Keep this file lean (~2 KB) as an always-loaded core.
- Read domain-specific details (`cloud/README.md`, `console/AGENT-DIRECTIVES.md`, `docs/`) only when actively working in those directories.
