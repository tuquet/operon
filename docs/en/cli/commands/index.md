# CLI Commands Catalog

The `opn` CLI is architected around **6 focused command families** and an AI Agent MCP gateway. Every command provides sub-millisecond execution, structured JSON output via `--json`, and interactive diagnostics.

---

## 1. `opn auth` — Cloud Identity & Multi-Tenancy

Manages operator credentials, device authorization, and multi-tenant workspace switching.

```bash
opn auth <subcommand> [options]
```

### Subcommands & Options

| Command | Arguments / Flags | Description |
| :--- | :--- | :--- |
| `opn auth login` | `--otp <code>`, `--token <jwt>`, `--email <addr>` | Authenticate operator session via interactive prompt or token |
| `opn auth logout` | `--all` | Revoke local stored session and purge active device tokens |
| `opn auth whoami` | `--json` | Display current authenticated user, active tenant ID, and pairing status |
| `opn auth tenant list` | `--json` | List all organizations/tenants accessible to the current operator |
| `opn auth tenant switch <id>` | `<tenant-id>` | Switch the active workspace tenant context |
| `opn auth tenant current` | `--json` | Print the current active tenant UUID |

---

## 2. `opn worker` — Distributed Compute Daemon

Autonomous background worker engine responsible for cloud fleet polling, workflow execution, and telemetry streaming.

```bash
opn worker <subcommand> [options]
```

### Subcommands & Options

| Command | Arguments / Flags | Description |
| :--- | :--- | :--- |
| `opn worker start` | `--daemon`, `--port <port>` | Start the local worker daemon process (default port: `9090`) |
| `opn worker worker` | `--poll-interval <sec>` | Run as an autonomous fleet worker executing jobs from Supabase Cloud |
| `opn worker stop` | `--graceful` | Send graceful shutdown signal to running worker daemon |
| `opn worker restart` | — | Gracefully restart the active worker process |
| `opn worker status` | `--json` | Inspect worker health, PID, process tree, and cloud sync status |
| `opn worker logs` | `-f` (tail), `-n <lines>` | Stream worker execution logs and telemetry events in real time |
| `opn worker probe` | `--json` | Probe local worker capabilities and return runtime manifest JSON |
| `opn worker config` | `--edit`, `--show` | Display, inspect, or edit worker configuration (`~/.operon/automation/worker.json`) |

---

## 3. `opn automation` — Workflow Orchestration Engine

Validates, executes, and coordinates headless browser automation workflows with Zero-Extension CDP stealth.

```bash
opn automation <subcommand> [options]
```

### Subcommands & Options

| Command | Arguments / Flags | Description |
| :--- | :--- | :--- |
| `opn automation run <path/id>` | `--headless`, `--browser <id>`, `--vars <k=v>` | Execute an automation workflow by JSON path or stored database ID |
| `opn automation workflow list` | `--json` | List stored automation workflows in the local database or cloud vault |
| `opn automation workflow info <id>` | `<id>` | Display detailed metadata and steps of a stored workflow |
| `opn automation inspect <file>` | `<file.json>` | Validate workflow JSON syntax, schema compliance, and action blocks |
| `opn automation studio` | `--port <port>` | Launch the visual Automa Web Studio in the default system browser |
| `opn automation probe` | `--json` | Probe automation engine capabilities, active plugins, and execution blocks |
| `opn automation config` | `--edit`, `--show` | Display or edit Automa configuration (`~/.operon/automation/automation.json`) |

---

## 4. `opn gateway` — Network Mesh & Proxy Supervisor

Controls the encrypted VPS tunnel mesh, embedded HTTP forwarder, and WebRTC leak shield.

```bash
opn gateway <subcommand> [options]
```

### Subcommands & Options

| Command | Arguments / Flags | Description |
| :--- | :--- | :--- |
| `opn gateway start` | `--http`, `--ssh`, `[server-id]` | Start SOCKS5 dynamic proxy (`1080`) and embedded HTTP forwarder (`8118`) |
| `opn gateway stop` | `[server-id]` | Gracefully stop running gateway tunnels and proxy daemons |
| `opn gateway status` | `--json` | Display health dashboard of all configured VPSs, ports, and workloads |
| `opn gateway probe` | `--target <url>`, `--json` | Probe egress connectivity, latency, public IP, and WebRTC leak protection |
| `opn gateway check` | — | Validate gateway configuration schema (`~/.operon/gateway/gateway.json`) and keys |
| `opn gateway enable <server>` | `<server-id>` | Enable a VPS node in the gateway mesh configuration |
| `opn gateway disable <server>` | `<server-id>` | Disable a VPS node without deleting its configuration credentials |
| `opn gateway config` | `--edit`, `--show` | View or edit canonical gateway configuration (`~/.operon/gateway/gateway.json`) |

---

## 5. `opn browser` — Anti-Detect Browser Runtime & Sandbox

Controls dedicated stealth Chromium instances, deterministic hardware PRNG seeds, and profile storage.

```bash
opn browser <subcommand> [options]
```

### Subcommands & Options

| Command | Arguments / Flags | Description |
| :--- | :--- | :--- |
| `opn browser install [engine]` | `[148]` | Download and provision isolated Chromium / Golden LTS runtime binaries |
| `opn browser status` | `--json` | Inspect installed browser engines and active sandboxes |
| `opn browser launch <profile>` | `--headless`, `--url <url>` | Launch browser profile with assigned fingerprint, hardware spoofing & proxy |
| `opn browser ps` | `--json` | List active browser processes, assigned CDP debugging ports, and PIDs |
| `opn browser stop [pid/id]` | `--force` | Terminate running browser instances gracefully |
| `opn browser profile list` | `--json` | List all local and cloud browser profiles |
| `opn browser profile create <name>` | `--proxy <url>`, `--ua <str>` | Create an anti-detect profile with unique hardware seeds & proxy binding |
| `opn browser profile delete <id>` | `<id>` | Delete local browser profile and purge sandbox cache |
| `opn browser profile test-proxy <id>` | `<id>` | Test proxy connectivity, latency, IP rotation, and WebRTC leak for profile |
| `opn browser ext list` | — | List installed Chrome extensions in the browser sandbox |

---

## 6. AI Agent MCP Protocol Bridge (`opn mcp`)

Exposes all Operonengine capabilities to AI coding agents (such as Antigravity, Claude Code, Cursor) via the standard Model Context Protocol.

```bash
opn mcp
```

- **Protocol**: JSON-RPC 2.0 over `stdio`.
- **Exported Tools**: `status`, `workflow_list`, `workflow_inspect`, `workflow_run`, `runner_probe`, `cloud_whoami`, `browser_status`, `faker_generate`, `inbox_otp`, `inbox_status`.

---

## 7. `opn secret` — Encrypted Secret Store

Tenant-scoped encrypted credential store. Values are referenced in workflows as `\{\{secrets.<name>\}\}` and **never** persisted in the workflow graph, job payload, or logs.

```bash
opn secret <subcommand> [options]
```

### Subcommands & Options

| Command | Arguments / Flags | Description |
| :--- | :--- | :--- |
| `opn secret init` | — | Create the local store key + device X25519 keypair |
| `opn secret set <name> <value>` | `<name>`, `<value>` | Store/update a secret (AES-256-GCM at rest) |
| `opn secret list` | `--format json` | List secret names (values are never printed) |
| `opn secret rm <name>` | `<name>` | Remove a local secret |
| `opn secret remote` | — | List secrets stored in Cloud (names only) |
| `opn secret push` | — | Register device key, then upload **client-side encrypted** secrets |
| `opn secret pull` | — | Receive the sealed DEK, fetch ciphertext, decrypt locally (no re-entry) |
| `opn secret rotate` | — | Rotate the tenant DEK (re-encrypts values, re-seals for all devices) |
| `opn secret path` | — | Print the local store path |

> See [`SPEC-secret-store`](/en/cloud/specs/SPEC-secret-store) for the envelope-encryption model (Vault KEK → per-tenant DEK) and device-portable provisioning.
