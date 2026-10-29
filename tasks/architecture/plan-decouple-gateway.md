# Spec & Plan: Decouple Gateway from Operon

## 1. Overview & Problem Statement
Currently, `operon` (`crates/cli`) bundles a custom `gateway` subsystem consisting of:
- Embedded Rust HTTP-to-SOCKS5 forwarder (`http_proxy.rs`).
- Complex supervisor and multi-VPS configuration loader (`supervisor.rs`, `config.rs`).
- Dependency fetchers for portable `cloudflared` and `ssh`.
- Subcommands: `opn gateway start`, `stop`, `status`, `config`, `probe`.

### Why Decouple?
1. **Unnecessary Complexity & Bloat:** Operon's core mission is an Automation Engine & Workstation. Managing low-level network tunnels, background Daemons, and proxy forwarders creates cognitive overhead and brittle cross-process states.
2. **Native Cloudflare CLI SSOT:** The workstation already has native `cloudflared` installed via Scoop (`C:\Users\ndtu6\scoop\apps\cloudflared`) and OpenSSH configured in `~/.ssh/config` (`Host my-vps-cf`).
3. **Zero-Code Overhead:** A simple PowerShell script or native SSH dynamic forwarding command (`ssh -N -D 1080 my-vps-cf`) accomplishes 100% of the network tunnel requirements with zero Rust lines of code.

---

## 2. 5W1H Analysis

| Question | Answer |
| :--- | :--- |
| **What** | Remove `commands/gateway` and `infrastructure/gateway` from `operon`. Create a standalone CLI script `tunnel.ps1` in `C:\Users\ndtu6\.opn\bin\` and update global `AGENTS.md`. |
| **Why** | Eliminate code debt, remove failure points, align with Unix/Google philosophy (do one thing well), and leverage native Cloudflare/SSH tooling. |
| **Who** | System Engineers and AI Agents running on this workstation. |
| **Where** | 1. Script: `C:\Users\ndtu6\.opn\bin\tunnel.ps1` & `tunnel.cmd` (already in `$env:PATH`).<br>2. Rule: `C:\Users\ndtu6\.gemini\config\AGENTS.md`.<br>3. Operon Codebase: `crates/cli/src/commands/gateway` and `crates/cli/src/infrastructure/gateway`. |
| **When** | Immediate rollout in 3 phases. |
| **How** | 1. Deploy native standalone script `tunnel.ps1`.<br>2. Update Global Agent Rules `AGENTS.md`.<br>3. Remove gateway code from `operon` crate and update `CONSTRAINTS.md`. |

---

## 3. Architecture Transition

### Before
```
[Operon CLI / Workstation]
       │
       ▼
[crates/cli/.../gateway] ──(Spawns/Supervises)──> [cloudflared + ssh + embedded Axum/Tokio HTTP proxy]
       │
       ▼ (127.0.0.1:1080 / 8118)
[VPS Mesh / GitHub]
```

### After
```
[Standalone CLI: tunnel.ps1] ──(Direct Native OpenSSH)──> [cloudflared access ssh] ──> [VPS (127.0.0.1:1080)]
                                                                                               │
[Git spush / Operon / Curl] ───────────────────────────────────────────────────────────────────┘
```

---

## 4. Phase-by-Phase Implementation Plan

### Phase 1: Standalone Native Tunnel Tooling (Zero-Dependency)
- **Path:** `C:\Users\ndtu6\.opn\bin\tunnel.ps1` and shim `tunnel.cmd` (in global `$env:PATH`).
- **Features:**
  - `tunnel on` / `tunnel start`: Launches `ssh -N -D 1080 my-vps-cf` in the background with PID tracking (`~/.operon/network/tunnel.pid`).
  - `tunnel off` / `tunnel stop`: Terminates the background tunnel process cleanly.
  - `tunnel status`: Checks if port 1080 is actively listening and probes egress IP (`curl -x socks5h://127.0.0.1:1080 https://api.ipify.org`).

### Phase 2: Update Global Agent Rules & Constraints
- **File:** `C:\Users\ndtu6\.gemini\config\AGENTS.md`.
- **Change:**
  - Replace references to `opn gateway start` with `tunnel on` (or `tunnel start`).
  - Replace `opn gateway status` with `tunnel status`.
  - Update `CONSTRAINTS.md` in `operon` to reflect external tunnel dependency.

### Phase 3: Clean Decoupling from `operon` Codebase
1. Remove `crates/cli/src/commands/gateway` and `crates/cli/src/infrastructure/gateway`.
2. Remove `Commands::Gateway` from `crates/cli/src/cli.rs` and `main.rs`.
3. In `crates/cli/src/commands/automation/mod.rs`: Replace internal gateway probe with loopback TCP check on `127.0.0.1:1080`.
4. In `crates/cli/src/commands/doctor/`: Simplify network check to test port `1080`.
5. Verify clean compilation: `cargo check -p operon` and `cargo check --manifest-path console/apps/workstation/src-tauri/Cargo.toml`.
6. Commit & Push: `git spush origin main`.
