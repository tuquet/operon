<div align="center">

# Operon

**Distributed automation mesh and antidetect browser sandbox runtime in Rust**

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Rust](https://img.shields.io/badge/Rust-2024%20Edition-orange?logo=rust)](https://www.rust-lang.org)
[![Docker](https://img.shields.io/badge/Docker-Core%20Stack-2496ED?logo=docker)](docker-compose.yml)
[![Console](https://img.shields.io/badge/Console-Vue%203%20%2B%20Shadcn-4FC08D?logo=vuedotjs)](console/)

[Quickstart](#quickstart) • [Structure](#structure) • [CLI](#cli) • [Docs](docs/README.md) • [Contributing](CONTRIBUTING.md)

</div>

---

## Overview

Operon is an execution runtime and browser orchestration platform built in Rust, coordinated by a Supabase control plane and managed via a Vue 3 / Tauri v2 Console (`host shell`, `kernel`, `micro-app`).

- **Docs & Specs:** [docs/README.md](docs/README.md)
- **Standard Glossary:** [docs/GLOSSARY.md](docs/GLOSSARY.md)

## Structure

```text
operon/
├── .github/             # Centralized CI/CD workflows
├── console/             # Submodule (tuquet/console) — Vue 3 host shell, micro-apps, Tauri v2
├── core/                # Submodule (tuquet/core) — Rust workspace (crates/cli, worker, browser)
├── docs/                # Specs, ADRs, glossary, roadmaps, phase Kanban boards
└── docker-compose.yml   # Local stack
```

## Quickstart

```bash
git clone --recurse-submodules https://github.com/tuquet/operon.git
cd operon
cp .env.example .env
```

**Docker:**
```bash
docker compose up -d
```
- Daemon API: `http://localhost:8765` | Console: `http://localhost:5666`

**Local dev:**
```bash
# Core (Rust)
cargo check --manifest-path core/Cargo.toml --workspace
cargo run --manifest-path core/Cargo.toml -p operon --bin opn -- doctor

# Console (Frontend / Tauri)
pnpm --dir console install
pnpm --dir console dev          # web
pnpm --dir console dev:desktop  # desktop
```

## CLI

```bash
opn doctor
opn worker start --cloud --claim
opn browser launch "Campaign-US" --proxy socks5://127.0.0.1:1080
opn gateway start --http
```

## License

MIT — see [LICENSE](LICENSE).
