# Agent Engineering Directives & Strict SSOT

Official operational directives, architectural constraints, and Single Source of Truth (SSOT) rules for autonomous AI coding agents operating across the Operonworkspace.

::: tip Distributed via Skills CLI
You can pull and configure Operonagent rules and skill suites directly into your workspace or agent runtime using:
```bash
npx skills add operon/skills --skill='*'
```
Or for a specific agent runtime (Cursor, Claude Code, Antigravity):
```bash
npx skills add operon/skills --agent antigravity --skill='*' -y
```
:::

---

## 1. Single Source of Truth (SSOT) Architecture

All ecosystem runtimes, daemons, and storage MUST resolve strictly to the canonical SSOT root: `~/.operon/<pillar>/` (or `$TQ_HOME/<pillar>/`).

```text
~/.operon/
├── bin/          # Global compiled binaries (opn, operon)
├── system/       # Machine identity (.machine_id, .identity.json), history, update cache
├── automation/   # SQLite database (automation.sqlite), daemon config (automation.json)
├── worker/       # Worker supervisor daemon config (worker.json), logs, PIDs
├── browser/      # Chromium runtimes (runtimes/), profiles (profiles/), extensions (extensions/)
├── gateway/      # Mesh network config (gateway.json), background daemon PIDs (pids/), tunnel binaries (bin/)
└── faker/        # Synthetic identity schema & domain pool configuration (faker.json)
```

**Anti-Fragmentation Rule:** Prohibit saving directly to flat root paths (`~/.operon/workflows`) or legacy external paths (`~/.specter`, `~/.automation`).

---

## 2. Project Map & Repository Hierarchy

The workspace is organized into focused repositories adhering to the Single Responsibility Principle:

| Repository | Tech Stack | Responsibility | Key Paths / Files |
| :--- | :--- | :--- | :--- |
| **`cli`** | Rust (Axum, Tokio, Clap, Rusqlite) | Master CLI binary (`opn`), REST/WebSocket API (port 8765), Automation | `src/main.rs`, `src/api/routes.rs`, `src/commands/` |
| **`admin`** | TypeScript, Vue 3, Vite, Tailwind v4, Shadcn | Unified Management Console (Web Admin), Preferences Engine, Fleet UI | `packages/@core/preferences/`, `apps/web-admin/` |
| **`browser`** | Rust (CDP driver, command-group) | Dedicated browser management, profile sandbox, extension packer | `src/manager.rs`, `src/profile.rs`, `src/extension.rs` |
| **`worker`** | Rust (Win32 Job Objects, Tokio) | Kernel-level process supervisor daemon (zero-zombie) | `src/main.rs`, `src/core/`, `src/drivers/` |
| **`faker`** | Rust (Regex, Serde) | Synthetic persona & CCCD generator, authentic demographic address pool | `src/generator.rs`, `src/config.rs`, `src/providers/` |
| **`cloud`** | TypeScript, Supabase | Control plane, device fleet enrollment, cloud database migrations & plugins | `supabase/migrations/`, `supabase/plugins/` |
| **`skills`** | Markdown / Shell / Node.js | Agent skills adhering to the Ponytail simplicity standard | `skills/*/SKILL.md` |
| **`bot`** | Rust / TypeScript | Telegram ChatOps assistant daemon & health alerting | `src/` |
| **`docs`** | TypeScript, Vue 3, VitePress | Official documentation portal & guides | `en/`, `.vitepress/`, `index.md` |
| **`operon.com`** | TypeScript, Vite-SSG, Vue 3 | Official landing page & portfolio portal | `src/`, `public/`, `pages/` |

---

## 3. Engineering Boundaries & Invariants

### 1. Fail-Fast Strict SSOT & Zero-Shim Invariant
- **No Backward Compatibility Shims / Aliases:** Strictly prohibited. When migrating to canonical schemas (`operon/cloud`), never retain temporary aliases (e.g. no `RUNNERS: 'workers'`, no union type `'runners.*' | 'workers.*'`).
- **Rip-and-Replace:** Standardize 100% across source definitions and all callsites. 
- **Zero Drift & Fail-Fast:** Reject permissive fallbacks that conceal schema drift. Mismatched schemas or legacy terms must fail immediately so engineers and agents resolve the root cause.

### 2. Spec & Documentation Authority Invariant (Anti-Hallucination)
- **Tài liệu & SPEC là Quyền Năng Tối Thượng (Supreme Authority):** Tuyệt đối cấm code tự suy diễn / ảo giác logic, tính năng, cờ lệnh (flags) hoặc schema không có trong `docs/` và SPECs.
- **Báo Cáo Mức Độ Cao Nhất (Critical Issue Escalation):** Nếu code hoặc yêu cầu thiếu cơ sở trong tài liệu, hoặc tài liệu chưa đề cập đến, agent **BẮT BUỘC BÁO CÁO VẤN ĐỀ Ở MỨC ĐỘ CAO NHẤT (P0 / CRITICAL ALERT)** trước khi viết code. Cấm tự ý bịa đặt API, params hoặc schema khi tài liệu chưa phê duyệt.

### 3. VPS Disk & Compilation Protection (Strict)
- **Zero Release Builds on VPS:** Never execute `cargo build --release` on resource-constrained servers. Release compilation is handled exclusively by CI/CD pipelines.
- **Lightweight Verification:** Use `cargo check` and `cargo test`.
- **Target Pruning:** Immediately delete build outputs (`rm -rf target/`) post-test to maintain disk usage $\le 85\%$.

### 3. Git Hygiene Contract
- Every repository maintains **exactly 1 atomic commit** on `main` (`feat(<name>): initial open-source release v1.0.0`).
- Working trees must remain clean (`dirty=0`). Updates are pushed cleanly via `git push -f origin main`.

### 4. Local-First Verification & Zero-Unsolicited-Push
- Never run `git push` or trigger remote CI/CD without explicit instruction.
- Expose local dev servers across LAN or mesh networks (`--host 0.0.0.0`) for real-device testing at zero cost.

### 5. Security & Zero Regressions
- Zero hardcoded secrets (`gitleaks`), zero critical CVEs (`trivy`).
- Localhost-only bindings (`127.0.0.1`) for API (8765), SOCKS5 (1080), HTTP proxy (8118), and SSH (2222).
- Constant-time HMAC verification. Process name checks via `sysinfo` prior to terminating any PID.

### 6. Cloud Multi-Domain OAuth Allowlist
- Every domain or subdomain initiating authentication must be explicitly configured in the cloud allowlist (`https://console.operon.com/**`, `https://*.operon.com/**`).

### 7. Preferences Engine & UI Invariants
- **Deep-Clone Baseline Isolation:** Never share object references between initial preferences and reactive state. Always use `cloneValue()`.
- **Runtime Viewport State Preservation on Reset:** Never allow `resetPreferences()` to overwrite dynamic viewport state (`isMobile`) with static defaults.
- **Pristine Cache Purge:** Cleanly purge user override keys on preference resets.
- **Enterprise Typography:** Enforce Sentence case across all titles, headers, and status badges. Limit `uppercase` exclusively to technical acronyms $\le 4$ characters (`API`, `CPU`, `UUID`), tracked table headers, and micro-category overlines.
- **Intra-Page Navigation:** Tab keys default to route path (`rawKey = fullPathKey === true ? (fullPath ?? path) : path`). Query parameter modifications do not trigger component destruction or scroll resets unless explicitly configured.

---

## 4. MCP Tools Integration

Operon natively exposes Model Context Protocol (MCP) endpoints for autonomous agents:

- `operon_status`: Real-time health dashboard, SSOT root inspection, active listeners.
- `operon_workflow_list`: Inspect workflows stored in SQLite database.
- `operon_workflow_inspect`: Deep inspect workflow nodes and triggers.
- `operon_workflow_run`: Trigger headless workflow execution.
- `operon_worker_probe`: Verify worker daemon liveness on port 8765.
- `operon_browser_status`: Inspect installed Chromium runtimes and active profiles.
- `operon_faker_generate`: Generate synthetic identities or validate CCCD.
