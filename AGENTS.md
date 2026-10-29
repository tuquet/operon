# Operon — Autonomous Agent Operational Directives

> **Contractual Authority:** [`./CONSTRAINTS.md`](./CONSTRAINTS.md) is the non-negotiable architectural contract. When modifying code, never weaken, bypass, or delete assertions to satisfy checks.  
> **Documentation Hub:** Technical specifications and architecture guides reside in [`./docs/`](./docs/) and [`./cloud/README.md`](./cloud/README.md).

---

## 1. System Mission & Architectural Model

Operon is a **distributed automation mesh and stealth browser sandbox runtime in Rust**, coordinated by a **Supabase multi-tenant control plane** and managed via a **Vue 3 / Tauri v2 workstation UI**.

The architecture operates across **Two Decoupled Planes**:
1. **Device-Local Execution Plane:** Managed by the local CLI daemon (`opn`, port `8765`), handling deterministic Chromium hardware sandboxing, local profile isolation, and offline execution.
2. **Distributed Cloud Orchestration Plane:** Managed by Supabase Postgres, handling multi-tenant state, fleet coordination via non-blocking lease claiming (`SKIP LOCKED`), and zero-knowledge credential encryption (Vault KEK/DEK).

---

## 2. Authority Hierarchy & Decision Precedence

When encountering ambiguous requirements or conflicting patterns, agents must adhere strictly to this precedence hierarchy:

```text
./CONSTRAINTS.md (Contractual Invariants)
       ↓
Database Schemas & DDL (Data Integrity SSOT)
       ↓
./docs/ & SPECs (System & Component Design)
       ↓
Local Domain Directives (Subsystem READMEs)
       ↓
Agent Reasoning & Tool Verification
```

- **Anti-Hallucination Rule:** Never invent CLI flags, database columns, or API endpoints absent from schemas and `./docs/`. If an interface lacks documentary foundation, escalate it as a specification blocker before writing code.
- **Fail-Fast Rule:** Never implement backward-compatibility shims, union types, or fallback chains to conceal schema drift. Raise clear, actionable runtime errors at the boundary.

---

## 3. High-Level Subsystems Topology (Relative to Monorepo Root)

| Subsystem | Relative Path | Core Technology | Architectural Responsibility |
| :--- | :--- | :--- | :--- |
| **CLI Coordinator** | `./crates/cli` | Rust (Axum, Clap, Tokio) | Master binary (`opn`), daemon API (:8765), local automation engine. |
| **Process Supervisor** | `./crates/worker` | Rust (Tokio, PostgREST) | Zero-zombie process supervisor & distributed cloud claim loop. |
| **Stealth Sandbox** | `./crates/browser` | Rust (CDP, PRNG, WebSockets) | Antidetect Chromium launcher, hardware masking, and profile isolation. |
| **Workstation UI** | `./console` | Vue 3, Shadcn UI, Tauri v2 | Central workstation GUI, preferences engine, and desktop wrapper. |
| **Control Plane** | `./cloud` | Supabase, PostgreSQL, RLS, Vault | Core IAM and 8 isolated domain plugins (automations, workers, secrets...). |
| **Error Relay** | `./relay` | Cloudflare Worker, TypeScript | Edge ingestion and sanitization routing Sentry alerts to Telegram. |
| **ChatOps Bot** | `./bot` | TypeScript, grammY | Telegram operations assistant and cluster health monitoring. |
| **Documentation** | `./docs` | VitePress | Official portal for architecture specs, block schemas, and guides. |
| **Agent Skills** | `./skills` | Agent Skills Specification | Standardized engineering runbooks and operational checklists. |
| **Production Tasks** | `./tasks` | Markdown & Workflows | Complex end-to-end production workflow plans (e.g. HRMS automation). |

---

## 4. Agent Operational Directives (Mindset & Boundaries)

### 1. Minimal Invasive Change (Occam's Razor)
- Solve the user's objective with the smallest, most targeted architectural delta.
- Avoid architectural churn: do not refactor working code outside the direct scope of the task.

### 2. Evidence-Driven Completion (Run & Verify First)
- A task is considered complete **only** when backed by concrete verification from real tool output (`cargo check`, `cargo fmt -- --check`, `cargo clippy`, `pnpm check:type`, or automated test suites).
- Never report a feature or fix as working without executing the corresponding verification command.

### 3. Local-First & Zero Unsolicited Side-Effects
- All development and testing run locally.
- **Never run `git push` or trigger external deployments without explicit operator instruction.**
- Preserve clean git working trees with atomic commits adhering to Conventional Commits.

### 4. VPS Resource Stewardship (3.8GB RAM / 2 Cores)
- **NEVER execute `cargo build --release` on host environments.** Release packaging is reserved strictly for GitHub Actions CI/CD.
- Rely on incremental checks (`cargo check --workspace`). Always clean build artifacts (`rm -rf target/`) to maintain disk usage $\le 85\%$.

---

## 5. Progressive Discovery Workflow

To prevent context bloating and preserve token bandwidth:
- **Do not load all subdirectories simultaneously.**
- When working within a specific domain, progressively discover its dedicated directives:
  - Working on Supabase / DDL: inspect `./cloud/README.md` and `./cloud/supabase/plugins/`.
  - Working on Workstation UI: inspect `./console/` guidelines.
  - Working on Automation workflows: inspect `./tasks/` and `./docs/en/automation/`.
