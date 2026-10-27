<div align="center">

# Operon

**Distributed automation mesh and antidetect browser sandbox runtime in Rust**

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Rust](https://img.shields.io/badge/Rust-2024%20Edition-orange?logo=rust)](https://www.rust-lang.org)
[![Docker](https://img.shields.io/badge/Docker-Core%20Stack-2496ED?logo=docker)](docker-compose.yml)
[![Console](https://img.shields.io/badge/Console-Vue%203%20%2B%20Shadcn-4FC08D?logo=vuedotjs)](console/)

[Quickstart](#quickstart) • [Repository structure](#repository-structure) • [CLI usage](#cli-usage) • [Contributing](.github/CONTRIBUTING.md)

</div>

---

## Overview

Operon is an open-source execution runtime and browser orchestration platform. Built with high-concurrency Rust and backed by a Supabase control plane, Operon enables operators and automation agents to coordinate remote worker nodes, manage sandboxed browser sessions without fingerprint leaks, and execute automated browser workflows reliably.

### Core subsystems

- **Worker daemon (`crates/worker`)**: Background process supervisor connecting workstations and remote VPS nodes over authenticated WebSockets.
- **Browser sandbox (`crates/browser`)**: Profile manager, deterministic PRNG hardware masking, and native CDP automation engine.
- **Admin workstation (`console/`)**: Administrative web console and desktop application built with Vue 3, Vite, Tailwind CSS, and Shadcn UI.
- **Control plane (`cloud/`)**: Supabase-powered backend providing multi-tenant isolation, database schemas, and row-level security (RLS).
- **Network gateway**: Dynamic SOCKS5 (`1080`) and embedded HTTP (`8118`) forwarder routing traffic through encrypted mesh tunnels.

---

## Repository structure

```text
operon/
├── crates/
│   ├── cli/       # Canonical opn CLI toolchain
│   ├── worker/    # Workstation daemon and process supervisor
│   ├── browser/   # Stealth Chromium launcher and hardware sandbox
│   └── faker/     # Synthetic identity generation engine
├── console/       # Administrative web console and Tauri desktop app
├── cloud/         # Supabase database schemas, migrations, and functions
├── docs/          # Technical documentation (VitePress)
└── docker-compose.yml # Unified local development stack
```

---

## Quickstart

### Prerequisites

- **Rust toolchain**: 1.82+ (2024 edition compatible)
- **Node.js & pnpm**: Node 20+, pnpm 9+
- **Docker**: Optional, for containerized local development

### Option A: Launch with Docker Compose (Fastest)

Run the entire ecosystem locally:

```bash
cp .env.example .env
docker compose up -d
```

- **Daemon API & Worker Gateway**: `http://localhost:8765`
- **Operon Workstation**: `http://localhost:5666`

---

### Option B: Local development from source

1. **Configure environment variables**:
   ```bash
   cp .env.example .env
   ```

2. **Verify and build Rust backend**:
   ```bash
   # Verify all workspace crates compile
   cargo check --workspace

   # Run CLI commands in debug mode
   cargo run -p operon -- doctor

   # Start the background worker daemon directly
   cargo run -p operon -- worker start --port 8765
   ```
   *To compile the production release binary, run `cargo build --release -p operon`. The binary is generated at `target/release/opn` (or `opn.exe` on Windows).*

3. **Start the administrative frontend**:
   ```bash
   cd console
   pnpm install
   pnpm dev
   ```

4. **Run Desktop App (Tauri v2 Mode)**:
   ```bash
   cd console
   pnpm dev:desktop
   ```

---

## CLI usage

The primary CLI executable is `opn`. All commands follow microservice domains:

```bash
# Check runtime health, storage pillars, and dependencies
opn doctor

# Start the background worker daemon
opn worker start --port 8765

# Launch an isolated browser profile with proxy routing
opn browser launch "Campaign-US" --proxy socks5://127.0.0.1:1080

# Start network gateway forwarders (SOCKS5 on 1080, HTTP on 8118)
opn gateway start --http

# Generate synthetic personas and test identities
opn faker identity --count 5
```

---

## License

This project is licensed under the MIT License. See [LICENSE](LICENSE) for details.
