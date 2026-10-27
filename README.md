<div align="center">

# ⚡ Operon

**Ultra-High Performance Distributed Automation Mesh & Browser Sandbox Runtime in Rust**

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Rust](https://img.shields.io/badge/Rust-2024%20Edition-orange?logo=rust)](https://www.rust-lang.org)
[![Docker](https://img.shields.io/badge/Docker-Core%20Stack-2496ED?logo=docker)](docker-compose.yml)
[![Vue 3](https://img.shields.io/badge/Console-Vue%203%20%2B%20Shadcn-4FC08D?logo=vuedotjs)](console/)

[Quick Start](#-quick-start) • [Architecture](#-architecture) • [CLI Usage](#-cli-usage) • [Contributing](.github/CONTRIBUTING.md)

</div>

---

## 📖 Overview

**Operon** is an enterprise-grade autonomous execution engine and browser orchestration platform. Built with high-concurrency Rust and orchestrated via a modern control plane, Operon allows developers and teams to coordinate distributed worker nodes, manage sandboxed browser sessions, and execute complex workflows reliably.

### Key Pillars
- **🚀 Distributed Execution Engine (`crates/worker`)**: Zero-overhead worker runtime connecting to the mesh via authenticated WebSockets.
- **🌐 Browser Sandbox Subsystem (`crates/browser`)**: Profile manager, fingerprint shielding, and CDP automation.
- **🖥️ Operon Workstation (`console/`)**: Comprehensive administrative UI built on Vue 3, Tailwind CSS, and Shadcn.
- **🔒 Operon Cloud (`cloud/`)**: Supabase-powered control plane featuring granular Row-Level Security (RLS) and isolated tenant spaces.

---

## 🚀 Quick Start

### 1. Clone & Setup Environment
```bash
git clone https://github.com/operon/operon.git
cd operon

cp .env.example .env
```

### 2. Option A: Launch with Docker (Fastest)
Operon comes with a production-ready Docker Compose configuration:
```bash
docker compose up -d
```
- **Daemon API & Worker Gateway**: `http://localhost:8765`
- **Operon Workstation**: `http://localhost:5666`

---

### 3. Option B: Local Bare-Metal Development (No Docker)

For contributors and developers who want hot-reload, fast iteration, and step debugging directly on the host machine:

#### Prerequisites
- **Rust Toolchain**: 1.82+ (2024 edition compatible)
  ```bash
  rustup update stable
  ```
- **Node.js & pnpm**: Node 20+, pnpm 9+
  ```bash
  corepack enable && corepack prepare pnpm@latest --activate
  ```
- *(Optional)* **Supabase CLI**: If you need local cloud backend and migrations.

#### Step 1: Build & Run Rust Backend (CLI / Worker Mesh)
You can compile and run the backend components directly using Cargo:
```bash
# Verify all workspace crates compile
cargo check --workspace

# Run CLI commands directly in debug mode
cargo run -p operon -- status

# Start the background Worker node daemon directly on port 8765
cargo run -p operon -- worker start --port 8765
```
*(Tip: Or build the release binary once via `cargo build --release -p operon`, the binary will be located at `target/release/opn` or `opn.exe`)*

#### Step 2: Run Operon Workstation (Vue 3 Frontend)
The frontend administrative workstation runs with Vite instant hot-reload:
```bash
cd console

# Install workspace dependencies
pnpm install

# Start the local development server (default: http://localhost:5666)
pnpm dev
```

#### Step 3: Run Desktop App (Tauri v2 Mode)
If you are developing the desktop variant with native window integrations:
```bash
cd console
pnpm dev:desktop
```

### 4. Run the CLI
Use the provided smart shim:
```bash
./opn status
./opn worker start
```

---

## 🛠️ CLI Usage (`opn`)

Operon provides dual binary identifiers for command-line convenience:
- `opn <command>`: Ergonomic short command.
- `operon <command>`: Canonical command for automation and CI/CD.

```bash
# Check runtime and mesh status
opn status

# Start a worker node
opn worker start --port 8765

# Generate synthetic personas/identities
opn faker identity --count 5
```

---

## 📄 License
This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
